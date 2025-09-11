#!/usr/bin/env python3
"""
Smart geocoding using existing database addresses with multiple fallback strategies
"""
import asyncio
import asyncpg
import aiohttp
import os
import time
from dotenv import load_dotenv

load_dotenv()

# Minnesota bounds 
MN_BOUNDS = {'north': 49.384358, 'south': 43.499356, 'east': -89.491897, 'west': -97.239209}

async def try_geocode_variations(session, company_name, address, city, state, postal_code):
    """Try multiple geocoding strategies for a company"""
    
    # Strategy 1: Exact address as provided
    variations = [
        f"{address}, {city}, {state}, {postal_code}, USA",
        f"{address}, {city}, {state}, USA", 
        f"{address}, {city}, Minnesota, USA",
    ]
    
    # Strategy 2: Company name + city (for corporate headquarters)
    if company_name and not any(x in company_name.lower() for x in ['county', 'school', 'district', 'city of']):
        variations.extend([
            f"{company_name}, {city}, Minnesota, USA",
            f"{company_name.split(',')[0].split(' Inc')[0].split(' Corp')[0]}, {city}, Minnesota"
        ])
    
    # Strategy 3: Just city center as last resort (with small offset to avoid exact duplicates)
    variations.append(f"{city}, Minnesota, USA")
    
    for i, query in enumerate(variations):
        try:
            viewbox = f"{MN_BOUNDS['west']},{MN_BOUNDS['south']},{MN_BOUNDS['east']},{MN_BOUNDS['north']}"
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': query,
                'format': 'json', 
                'limit': 1,
                'countrycodes': 'us',
                'viewbox': viewbox,
                'bounded': 1
            }
            
            async with session.get(url, params=params) as response:
                data = await response.json()
                if data:
                    lat, lon = float(data[0]['lat']), float(data[0]['lon'])
                    if (lat >= MN_BOUNDS['south'] and lat <= MN_BOUNDS['north'] and 
                        lon >= MN_BOUNDS['west'] and lon <= MN_BOUNDS['east']):
                        
                        # Determine accuracy based on which strategy worked
                        accuracy = ['address', 'address', 'address', 'company', 'company', 'city'][i]
                        source = f"nominatim_strategy_{i+1}"
                        
                        return lat, lon, accuracy, source, query
            
            # Rate limiting between attempts
            await asyncio.sleep(0.1)
            
        except Exception as e:
            print(f"    ⚠️ Strategy {i+1} failed: {str(e)[:50]}")
            continue
    
    return None

async def main():
    print('🎯 SMART GEOCODING WITH EXISTING ADDRESSES')
    print('=' * 55)
    
    try:
        conn = await asyncpg.connect(os.getenv('NETLIFY_DATABASE_URL'))
        
        # Get companies without coordinates that have addresses
        companies = await conn.fetch('''
            SELECT id, name, address, city, state, postal_code
            FROM companies
            WHERE latitude IS NULL 
              AND address IS NOT NULL 
              AND city IS NOT NULL
              AND state = 'Minnesota'
            ORDER BY CAST(COALESCE(NULLIF(sales::text, ''), '0') AS NUMERIC) DESC
            LIMIT 50
        ''')
        
        print(f"🏢 Processing {len(companies)} companies with existing addresses...")
        
        successful = 0
        failed = 0
        
        async with aiohttp.ClientSession() as session:
            for i, company in enumerate(companies):
                print(f"\n{i+1:2d}/50: {company['name'][:45]:45}")
                print(f"      📍 {company['address']}, {company['city']}")
                
                result = await try_geocode_variations(
                    session, 
                    company['name'], 
                    company['address'], 
                    company['city'], 
                    company['state'], 
                    company['postal_code']
                )
                
                if result:
                    lat, lon, accuracy, source, used_query = result
                    
                    # Update database
                    await conn.execute('''
                        UPDATE companies 
                        SET latitude = $1, longitude = $2, 
                            geocodedAt = NOW(), geocodingSource = $3, geocodingAccuracy = $4
                        WHERE id = $5
                    ''', lat, lon, source, accuracy, company['id'])
                    
                    successful += 1
                    print(f"      ✅ [{lat:.4f}, {lon:.4f}] via {accuracy} lookup")
                    print(f"         Used: {used_query[:60]}{'...' if len(used_query) > 60 else ''}")
                else:
                    failed += 1
                    print(f"      ❌ All geocoding strategies failed")
                
                # Rate limiting - respect Nominatim's limits
                await asyncio.sleep(1.0)  # 1 request per second to be safe
        
        # Final status
        total_coords = await conn.fetchval('SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL')
        print(f'\n🎉 BATCH RESULTS:')
        print(f'✅ Successfully geocoded: {successful}/50')
        print(f'❌ Failed: {failed}/50')
        print(f'🗺️  Total companies with coordinates: {total_coords}')
        print(f'📈 Success rate this batch: {successful/50*100:.1f}%')
        
        await conn.close()
        
    except Exception as e:
        print(f"💥 Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())



