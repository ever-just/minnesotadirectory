#!/usr/bin/env python3
import asyncio
import asyncpg

async def check_status():
    database_url = "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    
    try:
        conn = await asyncpg.connect(database_url)
        
        total = await conn.fetchval('SELECT COUNT(*) FROM companies')
        with_coords = await conn.fetchval('SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL')
        without_coords = total - with_coords
        percent = (with_coords / total) * 100
        
        print(f'📊 MINNESOTA DIRECTORY GEOCODING STATUS:')
        print(f'=' * 50)
        print(f'✅ Companies WITH coordinates: {with_coords:,} ({percent:.1f}%)')
        print(f'❌ Companies WITHOUT coordinates: {without_coords:,}')
        print(f'🎯 Total companies: {total:,}')
        
        if without_coords == 0:
            print(f'\n🎉 GEOCODING COMPLETE!')
            print(f'🗺️ ALL {total:,} companies now have coordinates!')
        else:
            print(f'\n⚡ Google API Error Analysis:')
            print(f'📊 API Dashboard shows: 1,919 requests, 1,919 errors (100% failure)')
            print(f'🔧 Issue: API key configuration problem')
            
        await conn.close()
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")

if __name__ == "__main__":
    asyncio.run(check_status())

