#!/usr/bin/env python3
"""
Fast batch geocoding for ALL Minnesota companies
Uses multiple strategies for maximum success rate
"""
import asyncio
import asyncpg
import aiohttp
import os
import time
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Minnesota bounds for validation
MN_BOUNDS = {'north': 49.384358, 'south': 43.499356, 'east': -89.491897, 'west': -97.239209}

# Common Minnesota city centers as fallbacks
MN_CITY_CENTERS = {
    'minneapolis': (44.9778, -93.2650),
    'st paul': (44.9537, -93.0900),
    'saint paul': (44.9537, -93.0900),
    'rochester': (44.0121, -92.4802),
    'duluth': (46.7867, -92.1005),
    'bloomington': (44.8408, -93.2983),
    'plymouth': (45.0105, -93.4555),
    'eden prairie': (44.8547, -93.4708),
    'minnetonka': (44.9211, -93.4687),
    'edina': (44.8897, -93.3501),
    'maple grove': (45.0724, -93.4557),
    'woodbury': (44.9239, -92.9594),
    'blaine': (45.1608, -93.2348),
    'lakeville': (44.6496, -93.2427),
    'burnsville': (44.7677, -93.2777),
    'wayzata': (44.9706, -93.5117),
}

class BatchGeocoder:
    def __init__(self, database_url):
        self.database_url = database_url
        self.session = None
        self.stats = {
            'total': 0,
            'already_geocoded': 0,
            'geocoded_exact': 0,
            'geocoded_company_name': 0,
            'geocoded_city_center': 0,
            'failed': 0,
            'start_time': time.time()
        }
        
    async def geocode_with_nominatim(self, query):
        """Try to geocode using Nominatim"""
        try:
            params = {
                'q': query,
                'format': 'json',
                'limit': 1,
                'countrycodes': 'us',
                'viewbox': f"{MN_BOUNDS['west']},{MN_BOUNDS['south']},{MN_BOUNDS['east']},{MN_BOUNDS['north']}",
                'bounded': 1
            }
            
            async with self.session.get(
                'https://nominatim.openstreetmap.org/search',
                params=params,
                headers={'User-Agent': 'MinnesotaDirectory/1.0'}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if data and len(data) > 0:
                        lat = float(data[0]['lat'])
                        lon = float(data[0]['lon'])
                        
                        # Validate within Minnesota
                        if (MN_BOUNDS['south'] <= lat <= MN_BOUNDS['north'] and
                            MN_BOUNDS['west'] <= lon <= MN_BOUNDS['east']):
                            return lat, lon, data[0].get('display_name', '')
                        
        except Exception as e:
            print(f"  ⚠️ Geocoding error: {str(e)}")
        
        return None, None, None
        
    async def geocode_company(self, company):
        """Try multiple geocoding strategies for a company"""
        company_id = company['id']
        name = company['name']
        address = company['address']
        city = company['city']
        state = company['state']
        postal = company['postal_code']
        
        # Strategy 1: Try exact address
        if address and address != 'N/A':
            full_address = f"{address}, {city}, {state}, {postal}, USA"
            lat, lon, display = await self.geocode_with_nominatim(full_address)
            if lat:
                return lat, lon, 'exact_address', 'high', display
                
        # Wait between attempts to respect rate limits
        await asyncio.sleep(1.1)
        
        # Strategy 2: Try company name + city
        company_query = f"{name}, {city}, Minnesota, USA"
        lat, lon, display = await self.geocode_with_nominatim(company_query)
        if lat:
            return lat, lon, 'company_name', 'medium', display
            
        # Strategy 3: Use city center as fallback
        city_lower = city.lower() if city else ''
        if city_lower in MN_CITY_CENTERS:
            lat, lon = MN_CITY_CENTERS[city_lower]
            return lat, lon, 'city_center', 'low', f"City center of {city}"
            
        return None, None, None, None, None
        
    async def process_batch(self, conn, companies):
        """Process a batch of companies"""
        results = []
        
        for company in companies:
            try:
                # Check if already geocoded
                if company['latitude'] is not None:
                    self.stats['already_geocoded'] += 1
                    continue
                    
                print(f"\n🏢 Geocoding {company['name'][:50]}...")
                print(f"   📍 {company['address']}, {company['city']}")
                
                lat, lon, source, accuracy, display = await self.geocode_company(company)
                
                if lat:
                    # Update database
                    await conn.execute("""
                        UPDATE companies 
                        SET latitude = $1, 
                            longitude = $2, 
                            geocodedat = $3,
                            geocodingsource = $4,
                            geocodingaccuracy = $5
                        WHERE id = $6
                    """, lat, lon, datetime.now(), source, accuracy, company['id'])
                    
                    results.append({
                        'name': company['name'],
                        'lat': lat,
                        'lon': lon,
                        'source': source
                    })
                    
                    # Update stats
                    if source == 'exact_address':
                        self.stats['geocoded_exact'] += 1
                    elif source == 'company_name':
                        self.stats['geocoded_company_name'] += 1
                    elif source == 'city_center':
                        self.stats['geocoded_city_center'] += 1
                        
                    print(f"   ✅ Success! ({lat:.4f}, {lon:.4f}) via {source}")
                else:
                    self.stats['failed'] += 1
                    print(f"   ❌ Failed to geocode")
                    
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
                self.stats['failed'] += 1
                
        return results
        
    async def run(self):
        """Run the batch geocoding process"""
        print("🚀 Starting batch geocoding for ALL Minnesota companies...")
        print("⚡ Using multiple strategies for maximum success\n")
        
        conn = await asyncpg.connect(self.database_url)
        
        async with aiohttp.ClientSession() as session:
            self.session = session
            
            try:
                # Get total count
                total_count = await conn.fetchval("SELECT COUNT(*) FROM companies")
                self.stats['total'] = total_count
                
                # Process in batches
                batch_size = 50
                offset = 0
                
                while offset < total_count:
                    print(f"\n📦 Processing batch {offset//batch_size + 1} ({offset} - {offset + batch_size})")
                    
                    # Fetch batch
                    companies = await conn.fetch("""
                        SELECT id, name, address, city, state, postal_code, latitude, longitude
                        FROM companies
                        ORDER BY sales DESC NULLS LAST
                        LIMIT $1 OFFSET $2
                    """, batch_size, offset)
                    
                    # Process batch
                    results = await self.process_batch(conn, companies)
                    
                    # Show progress
                    elapsed = time.time() - self.stats['start_time']
                    rate = (offset + batch_size) / elapsed if elapsed > 0 else 0
                    eta = (total_count - offset - batch_size) / rate if rate > 0 else 0
                    
                    print(f"\n📊 Progress: {offset + batch_size}/{total_count} ({(offset + batch_size)/total_count*100:.1f}%)")
                    print(f"⏱️ Rate: {rate:.1f} companies/sec, ETA: {eta/60:.1f} minutes")
                    
                    offset += batch_size
                    
                    # Optional: Stop after certain number for testing
                    # if offset >= 200:  # Uncomment to test with first 200 companies
                    #     break
                    
            finally:
                await conn.close()
                
        # Print final stats
        self.print_stats()
        
    def print_stats(self):
        """Print final statistics"""
        elapsed = time.time() - self.stats['start_time']
        newly_geocoded = (self.stats['geocoded_exact'] + 
                         self.stats['geocoded_company_name'] + 
                         self.stats['geocoded_city_center'])
        
        print("\n" + "="*60)
        print("🎯 BATCH GEOCODING COMPLETE!")
        print("="*60)
        print(f"📊 Total companies: {self.stats['total']}")
        print(f"✅ Already geocoded: {self.stats['already_geocoded']}")
        print(f"🆕 Newly geocoded: {newly_geocoded}")
        print(f"   - Exact address: {self.stats['geocoded_exact']}")
        print(f"   - Company name: {self.stats['geocoded_company_name']}")
        print(f"   - City center: {self.stats['geocoded_city_center']}")
        print(f"❌ Failed: {self.stats['failed']}")
        print(f"⏱️ Total time: {elapsed/60:.1f} minutes")
        print(f"🚀 Rate: {self.stats['total']/elapsed:.1f} companies/sec")
        print("="*60)


async def main():
    database_url = os.getenv('NETLIFY_DATABASE_URL')
    if not database_url:
        print("❌ Error: NETLIFY_DATABASE_URL not set!")
        print("💡 Set it with: export NETLIFY_DATABASE_URL='your-connection-string'")
        return
        
    geocoder = BatchGeocoder(database_url)
    await geocoder.run()


if __name__ == "__main__":
    asyncio.run(main())
