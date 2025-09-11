#!/usr/bin/env python3
"""
Ultra-fast Minnesota-constrained geocoding using standardized addresses
"""
import asyncio
import asyncpg
import aiohttp
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Minnesota geographic bounds - STRICT constraints
MN_BOUNDS = {
    'north': 49.384358,
    'south': 43.499356, 
    'east': -89.491897,
    'west': -97.239209
}

async def geocode_address(session, address, city, state, postal_code):
    """Fast geocoding with Minnesota constraints"""
    try:
        # Build clean address
        full_address = f"{address}, {city}, Minnesota, {postal_code or ''}, USA".strip(', ')
        
        # Nominatim with Minnesota viewbox constraint
        viewbox = f"{MN_BOUNDS['west']},{MN_BOUNDS['south']},{MN_BOUNDS['east']},{MN_BOUNDS['north']}"
        
        url = f"https://nominatim.openstreetmap.org/search"
        params = {
            'q': full_address,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'us',
            'viewbox': viewbox,
            'bounded': 1,  # FORCE results within viewbox
            'addressdetails': 1
        }
        
        headers = {'User-Agent': 'MinnesotaDirectory/3.0 (support@minnesotadirectory.com)'}
        
        async with session.get(url, params=params, headers=headers) as response:
            if response.status != 200:
                return None
                
            data = await response.json()
            if not data:
                return None
                
            result = data[0]
            lat = float(result['lat'])
            lon = float(result['lon'])
            
            # VERIFY within Minnesota bounds
            if (lat >= MN_BOUNDS['south'] and lat <= MN_BOUNDS['north'] and
                lon >= MN_BOUNDS['west'] and lon <= MN_BOUNDS['east']):
                
                accuracy = 'city'
                if result.get('address', {}).get('house_number') and result.get('address', {}).get('road'):
                    accuracy = 'exact'
                elif result.get('address', {}).get('road'):
                    accuracy = 'street'
                
                return {
                    'latitude': lat,
                    'longitude': lon,
                    'accuracy': accuracy,
                    'source': 'nominatim_mn_constrained'
                }
            
            # Reject coordinates outside Minnesota
            return None
            
    except Exception:
        return None

async def process_batch(session, conn, companies):
    """Process a batch of companies in parallel"""
    
    tasks = []
    for company in companies:
        address = company.get('standardized_address') or company.get('address', '')
        if address and address.strip():
            task = geocode_address(
                session, 
                address.strip(),
                company.get('city', ''),
                company.get('state', 'Minnesota'),
                company.get('postal_code', '')
            )
            tasks.append((company['id'], company['name'], task))
    
    # Execute all geocoding requests in parallel
    results = []
    for company_id, name, task in tasks:
        result = await task
        if result:
            # Update database immediately
            await conn.execute('''
                UPDATE companies 
                SET latitude = $1, longitude = $2, geocodedAt = NOW(), 
                    geocodingSource = $3, geocodingAccuracy = $4
                WHERE id = $5
            ''', result['latitude'], result['longitude'], result['source'], 
                result['accuracy'], company_id)
            
            results.append(f"✅ {name}: [{result['latitude']:.4f}, {result['longitude']:.4f}] ({result['accuracy']})")
        else:
            results.append(f"❌ {name}: No valid MN coordinates")
    
    return results

async def ultra_fast_geocoding():
    """Main geocoding function - processes all companies quickly"""
    
    print('⚡ ULTRA-FAST MINNESOTA GEOCODING')
    print('=' * 50)
    
    try:
        # Database connection
        conn = await asyncpg.connect(os.getenv('NETLIFY_DATABASE_URL'))
        
        # HTTP session for parallel requests
        async with aiohttp.ClientSession() as session:
            
            # Get all companies needing geocoding (use standardized if available)
            companies = await conn.fetch('''
                SELECT id, name, address, standardized_address, city, state, postal_code
                FROM companies
                WHERE latitude IS NULL
                  AND (standardized_address IS NOT NULL OR address IS NOT NULL)
                ORDER BY sales DESC NULLS LAST
                LIMIT 100  -- Start with 100 companies
            ''')
            
            print(f"🎯 Processing {len(companies)} companies...")
            
            if not companies:
                print("✅ All companies already geocoded!")
                return
            
            # Process in batches for speed
            BATCH_SIZE = 20
            successful = 0
            
            for i in range(0, len(companies), BATCH_SIZE):
                batch = companies[i:i + BATCH_SIZE]
                batch_num = (i // BATCH_SIZE) + 1
                total_batches = (len(companies) + BATCH_SIZE - 1) // BATCH_SIZE
                
                print(f"\\n📦 Batch {batch_num}/{total_batches} ({len(batch)} companies)")
                
                # Process batch in parallel
                results = await process_batch(session, conn, batch)
                
                batch_successful = len([r for r in results if r.startswith('✅')])
                successful += batch_successful
                
                # Show first few results
                for result in results[:3]:
                    print(f"   {result}")
                
                if len(results) > 3:
                    remaining_success = len([r for r in results[3:] if r.startswith('✅')])
                    remaining_fail = len([r for r in results[3:] if r.startswith('❌')])
                    print(f"   ... +{remaining_success} more successful, {remaining_fail} failed")
                
                print(f"   Batch success: {batch_successful}/{len(batch)} ({100*batch_successful//len(batch)}%)")
                
                # Rate limiting - respect Nominatim limits
                await asyncio.sleep(2)  # 2-second delay between batches
        
        # Final status
        final_with_coords = await conn.fetchval('SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL')
        final_total = await conn.fetchval('SELECT COUNT(*) FROM companies')
        
        print(f'\\n🎉 GEOCODING COMPLETE!')
        print(f'   Total companies: {final_total}')
        print(f'   Successfully geocoded: {successful}')
        print(f'   Overall with coordinates: {final_with_coords}')
        print(f'   Success rate: {100*successful//len(companies)}%')
        
        await conn.close()
        
        print(f'\\n🗺️  REFRESH YOUR MAP!')
        print(f'   localhost:8888 should now show {final_with_coords} companies on the map')
        
    except Exception as e:
        print(f'❌ Error: {e}')

asyncio.run(ultra_fast_geocoding())
"




