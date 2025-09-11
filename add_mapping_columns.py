#!/usr/bin/env python3
"""
Add mapping columns to the companies table
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('NETLIFY_DATABASE_URL')

async def add_mapping_columns():
    """Add the latitude/longitude columns for mapping"""
    
    print("🗺️ Adding mapping columns to companies table...")
    print("=" * 50)
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Add mapping columns
        await conn.execute("""
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
            ADD COLUMN IF NOT EXISTS geocodedAt TIMESTAMP,
            ADD COLUMN IF NOT EXISTS geocodingSource VARCHAR(50),
            ADD COLUMN IF NOT EXISTS geocodingAccuracy VARCHAR(20),
            ADD COLUMN IF NOT EXISTS standardized_address TEXT
        """)
        
        print("✅ Added mapping columns:")
        print("   • latitude (DECIMAL)")
        print("   • longitude (DECIMAL)")
        print("   • geocodedAt (TIMESTAMP)")
        print("   • geocodingSource (VARCHAR)")
        print("   • geocodingAccuracy (VARCHAR)")
        print("   • standardized_address (TEXT)")
        
        # Add indexes for performance
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_companies_coordinates 
            ON companies (latitude, longitude) 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """)
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_companies_standardized_address 
            ON companies (standardized_address) 
            WHERE standardized_address IS NOT NULL
        """)
        
        print("✅ Added indexes for performance")
        
        # Check current status
        total = await conn.fetchval("SELECT COUNT(*) FROM companies")
        with_coords = await conn.fetchval("SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL")
        
        print(f"\n📊 DATABASE STATUS:")
        print(f"   Total companies: {total}")
        print(f"   With coordinates: {with_coords}")
        print(f"   Need geocoding: {total - with_coords}")
        
        await conn.close()
        
        print(f"\n🎯 READY FOR GEOCODING!")
        print(f"   Database now has mapping columns")
        print(f"   Run geocoding to add coordinates to all {total} companies")
        
    except Exception as e:
        print(f"❌ Failed to add columns: {e}")

if __name__ == "__main__":
    asyncio.run(add_mapping_columns())





