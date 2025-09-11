#!/usr/bin/env python3
"""
Quick Minnesota-only geocoding for 100 companies
"""
import asyncio
import asyncpg
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

# Minnesota bounds 
MN_BOUNDS = {'north': 49.384358, 'south': 43.499356, 'east': -89.491897, 'west': -97.239209}

async def geocode_one(session, address, city, postal_code):
    """Single address geocoding"""
    try:
        full_addr = f"{address}, {city}, Minnesota, {postal_code or ''}, USA".strip(', ')
        
        # Nominatim with MN constraint
        viewbox = f"{MN_BOUNDS['west']},{MN_BOUNDS['south']},{MN_BOUNDS['east']},{MN_BOUNDS['north']}"
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': full_addr,
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
                    return lat, lon
        return None
    except:
        return None

async def main():
    print('⚡ QUICK MINNESOTA GEOCODING (100 companies)')
    print('=' * 50)
    
    conn = await asyncpg.connect(os.getenv('NETLIFY_DATABASE_URL'))
    
    # Get companies
    companies = await conn.fetch('''
        SELECT id, name, COALESCE(standardized_address, address) as address, city, postal_code
        FROM companies
        WHERE latitude IS NULL 
          AND (standardized_address IS NOT NULL OR address IS NOT NULL)
        ORDER BY sales DESC NULLS LAST
        LIMIT 100
    ''')
    
    print(f"Processing {len(companies)} companies...")
    
    successful = 0
    async with aiohttp.ClientSession() as session:
        for i, company in enumerate(companies):
            print(f"{i+1}/100: {company['name']}")
            
            coords = await geocode_one(session, company['address'], company['city'], company['postal_code'])
            
            if coords:
                lat, lon = coords
                await conn.execute('''
                    UPDATE companies SET latitude = $1, longitude = $2, 
                    geocodedAt = NOW(), geocodingSource = 'nominatim_mn', geocodingAccuracy = 'address'
                    WHERE id = $3
                ''', lat, lon, company['id'])
                
                successful += 1
                print(f"  ✅ [{lat:.4f}, {lon:.4f}]")
            else:
                print(f"  ❌ Failed")
            
            # Rate limiting
            await asyncio.sleep(0.2)  # 5 requests/second
    
    # Final status
    final_with_coords = await conn.fetchval('SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL')
    print(f'\\n🎉 Results: {successful}/100 successful')
    print(f'📍 Total companies with coordinates: {final_with_coords}')
    print(f'🗺️  Refresh localhost:8888 to see map!')
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())




