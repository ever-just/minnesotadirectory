#!/usr/bin/env python3
"""
ULTRA-FAST PARALLEL GEOCODING
Geocodes 2,500+ companies in under 30 seconds using massive parallelization
"""
import asyncio
import asyncpg
import aiohttp
import os
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import json
from dotenv import load_dotenv

load_dotenv()

# Minnesota bounds for validation
MN_BOUNDS = {'north': 49.384358, 'south': 43.499356, 'east': -89.491897, 'west': -97.239209}

class UltraFastGeocoder:
    def __init__(self, database_url):
        self.database_url = database_url
        self.stats = {
            'total': 0,
            'geocoded': 0,
            'failed': 0,
            'start_time': time.time()
        }
        
    async def geocode_batch_smarty(self, addresses, api_key):
        """Use Smarty API for ultra-fast batch geocoding (70,000/second capability)"""
        url = "https://us-street.api.smarty.com/street-address"
        
        # Smarty can process 100 addresses per request
        batch_results = []
        
        for i in range(0, len(addresses), 100):
            batch = addresses[i:i+100]
            
            # Prepare batch request
            params = {
                'auth-id': api_key['auth_id'],
                'auth-token': api_key['auth_token'],
                'candidates': 1,
                'match': 'enhanced'
            }
            
            # Send all addresses in one request
            headers = {'Content-Type': 'application/json'}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, params=params, json=batch, headers=headers) as response:
                    if response.status == 200:
                        results = await response.json()
                        batch_results.extend(results)
                        
        return batch_results
        
    async def parallel_geocode_google(self, companies, api_key):
        """Use Google Maps with massive parallelization"""
        
        async def geocode_single(session, company):
            url = 'https://maps.googleapis.com/maps/api/geocode/json'
            params = {
                'address': f"{company['address']}, {company['city']}, MN {company['postal_code']}",
                'key': api_key,
                'region': 'us',
                'components': 'administrative_area:MN|country:US'
            }
            
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data['status'] == 'OK' and data['results']:
                            location = data['results'][0]['geometry']['location']
                            return {
                                'id': company['id'],
                                'lat': location['lat'],
                                'lon': location['lng'],
                                'success': True
                            }
            except:
                pass
                
            return {'id': company['id'], 'success': False}
            
        # Create session with high connection limit
        connector = aiohttp.TCPConnector(limit=100)  # 100 concurrent connections
        async with aiohttp.ClientSession(connector=connector) as session:
            # Process ALL companies in parallel
            tasks = [geocode_single(session, company) for company in companies]
            
            # Execute all requests simultaneously
            print(f"🚀 Launching {len(tasks)} parallel geocoding requests...")
            results = await asyncio.gather(*tasks)
            
        return results
        
    async def parallel_geocode_mapbox(self, companies, api_key):
        """Use Mapbox with massive parallelization"""
        
        async def geocode_single(session, company):
            address = f"{company['address']}, {company['city']}, MN {company['postal_code']}"
            url = f'https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json'
            params = {
                'access_token': api_key,
                'country': 'US',
                'region': 'Minnesota',
                'limit': 1
            }
            
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data['features']:
                            coords = data['features'][0]['geometry']['coordinates']
                            return {
                                'id': company['id'],
                                'lat': coords[1],
                                'lon': coords[0],
                                'success': True
                            }
            except:
                pass
                
            return {'id': company['id'], 'success': False}
            
        # Create session with high connection limit
        connector = aiohttp.TCPConnector(limit=100)
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = [geocode_single(session, company) for company in companies]
            results = await asyncio.gather(*tasks)
            
        return results
        
    async def run_ultra_fast(self, service='google', api_key=None):
        """Run ultra-fast geocoding with chosen service"""
        print(f"⚡ ULTRA-FAST {service.upper()} GEOCODING STARTING...")
        print("🚀 This will geocode ALL companies in under 30 seconds!\n")
        
        conn = await asyncpg.connect(self.database_url)
        
        try:
            # Get ALL companies without coordinates
            companies = await conn.fetch("""
                SELECT id, name, address, city, state, postal_code
                FROM companies
                WHERE latitude IS NULL
                ORDER BY sales DESC NULLS LAST
            """)
            
            self.stats['total'] = len(companies)
            print(f"📊 Found {len(companies)} companies to geocode")
            
            # Convert to list of dicts for easier handling
            company_list = [dict(company) for company in companies]
            
            # Execute based on service
            start_batch = time.time()
            
            if service == 'google':
                results = await self.parallel_geocode_google(company_list, api_key)
            elif service == 'mapbox':
                results = await self.parallel_geocode_mapbox(company_list, api_key)
            elif service == 'smarty':
                # Prepare addresses for Smarty batch format
                addresses = [{
                    'street': company['address'],
                    'city': company['city'],
                    'state': company['state'],
                    'zipcode': company['postal_code']
                } for company in company_list]
                results = await self.geocode_batch_smarty(addresses, api_key)
                
            batch_time = time.time() - start_batch
            print(f"\n⚡ Geocoding completed in {batch_time:.1f} seconds!")
            print(f"🚀 Rate: {len(companies)/batch_time:.0f} companies/second")
            
            # Update database with results
            print("\n💾 Updating database...")
            update_start = time.time()
            
            for result in results:
                if result.get('success'):
                    await conn.execute("""
                        UPDATE companies 
                        SET latitude = $1, longitude = $2, 
                            geocodedat = $3, geocodingsource = $4,
                            geocodingaccuracy = 'high'
                        WHERE id = $5
                    """, result['lat'], result['lon'], datetime.now(), service, result['id'])
                    self.stats['geocoded'] += 1
                else:
                    self.stats['failed'] += 1
                    
            update_time = time.time() - update_start
            print(f"✅ Database updated in {update_time:.1f} seconds")
            
        finally:
            await conn.close()
            
        # Print final stats
        total_time = time.time() - self.stats['start_time']
        print("\n" + "="*60)
        print("🎯 ULTRA-FAST GEOCODING COMPLETE!")
        print("="*60)
        print(f"✅ Successfully geocoded: {self.stats['geocoded']:,} companies")
        print(f"❌ Failed: {self.stats['failed']:,} companies")
        print(f"⚡ Total time: {total_time:.1f} seconds")
        print(f"🚀 Overall rate: {self.stats['total']/total_time:.0f} companies/second")
        print(f"💰 Estimated cost: ${self.stats['geocoded'] * 0.005:.2f}")
        print("="*60)


async def main():
    # Configuration for different services
    SERVICES = {
        'google': {
            'name': 'Google Maps',
            'cost_per_1000': 5.00,
            'speed': '100-500/sec with parallelization',
            'accuracy': 'Excellent'
        },
        'mapbox': {
            'name': 'Mapbox',
            'cost_per_1000': 1.00,
            'speed': '100-500/sec with parallelization',
            'accuracy': 'Very Good'
        },
        'smarty': {
            'name': 'Smarty',
            'cost_per_1000': 0.25,
            'speed': '70,000/sec capability',
            'accuracy': 'Excellent for US addresses'
        }
    }
    
    print("⚡ ULTRA-FAST GEOCODING OPTIONS:")
    print("="*60)
    for key, info in SERVICES.items():
        print(f"\n{key.upper()}:")
        print(f"  Speed: {info['speed']}")
        print(f"  Cost: ${info['cost_per_1000']}/1000 addresses")
        print(f"  Total cost for 2,587: ${2.587 * info['cost_per_1000']:.2f}")
        print(f"  Accuracy: {info['accuracy']}")
    
    print("\n" + "="*60)
    print("\n🚀 To use ultra-fast geocoding:")
    print("1. Choose a service (google/mapbox/smarty)")
    print("2. Get an API key")
    print("3. Run: python ultra_fast_parallel_geocoder.py")
    
    # Check for API keys
    service = os.getenv('GEOCODING_SERVICE', 'google').lower()
    
    if service == 'google':
        api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not api_key:
            print(f"\n❌ Set GOOGLE_MAPS_API_KEY environment variable")
            print("Get one at: https://console.cloud.google.com/")
            return
    elif service == 'mapbox':
        api_key = os.getenv('MAPBOX_ACCESS_TOKEN')
        if not api_key:
            print(f"\n❌ Set MAPBOX_ACCESS_TOKEN environment variable")
            print("Get one at: https://www.mapbox.com/")
            return
    elif service == 'smarty':
        auth_id = os.getenv('SMARTY_AUTH_ID')
        auth_token = os.getenv('SMARTY_AUTH_TOKEN')
        if not auth_id or not auth_token:
            print(f"\n❌ Set SMARTY_AUTH_ID and SMARTY_AUTH_TOKEN")
            print("Get them at: https://www.smarty.com/")
            return
        api_key = {'auth_id': auth_id, 'auth_token': auth_token}
    
    # Run the ultra-fast geocoder
    database_url = os.getenv('NETLIFY_DATABASE_URL')
    geocoder = UltraFastGeocoder(database_url)
    await geocoder.run_ultra_fast(service, api_key)


if __name__ == "__main__":
    asyncio.run(main())

