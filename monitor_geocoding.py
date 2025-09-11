#!/usr/bin/env python3
import asyncio
import asyncpg
import time

async def monitor():
    database_url = "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    
    print("📊 LIVE GEOCODING MONITOR")
    print("=" * 60)
    
    while True:
        try:
            conn = await asyncpg.connect(database_url)
            
            total = await conn.fetchval('SELECT COUNT(*) FROM companies')
            with_coords = await conn.fetchval('SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL')
            without_coords = total - with_coords
            percent = (with_coords / total) * 100
            
            # Clear screen and show update
            print(f"\r🗺️ Progress: {with_coords:,}/{total:,} ({percent:.1f}%) | ❌ Remaining: {without_coords:,} | ⏱️ ETA: {without_coords/60:.0f} min", end='', flush=True)
            
            await conn.close()
            
            if without_coords == 0:
                print("\n\n✅ GEOCODING COMPLETE! All companies now have coordinates!")
                break
                
            await asyncio.sleep(5)  # Update every 5 seconds
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await asyncio.sleep(5)

asyncio.run(monitor())

