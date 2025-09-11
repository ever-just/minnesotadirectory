#!/usr/bin/env python3
"""
Try to wake up and reconnect to Neon database using multiple approaches
"""
import asyncio
import asyncpg
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('NETLIFY_DATABASE_URL')

async def test_asyncpg_connection():
    """Test asyncpg connection"""
    try:
        print("🔍 Testing asyncpg connection...")
        conn = await asyncpg.connect(DATABASE_URL)
        result = await conn.fetchval("SELECT 1")
        await conn.close()
        print(f"✅ asyncpg connection successful: {result}")
        return True
    except Exception as e:
        print(f"❌ asyncpg failed: {e}")
        return False

def test_psycopg2_connection():
    """Test psycopg2 connection"""
    try:
        print("🔍 Testing psycopg2 connection...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        print(f"✅ psycopg2 connection successful: {result}")
        return True
    except Exception as e:
        print(f"❌ psycopg2 failed: {e}")
        return False

async def main():
    print("🚀 Attempting to wake up Neon database...")
    print("=" * 50)
    
    if not DATABASE_URL:
        print("❌ NETLIFY_DATABASE_URL not set")
        return
    
    print(f"🔗 Database URL: {DATABASE_URL[:50]}...")
    
    # Test different connection methods
    success_count = 0
    
    if test_psycopg2_connection():
        success_count += 1
        print("📊 Trying to get basic database stats...")
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM companies")
            count = cursor.fetchone()[0]
            print(f"✅ Found {count} companies in database")
            
            cursor.execute("SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL")
            with_coords = cursor.fetchone()[0]
            print(f"📍 {with_coords} companies have coordinates")
            
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"❌ Query failed: {e}")
    
    if await test_asyncpg_connection():
        success_count += 1
    
    if success_count > 0:
        print(f"✅ Database is awake! {success_count}/2 connection methods worked")
        print("🎯 Database should now be accessible to MCP server")
    else:
        print("❌ Database is not responding. Possible issues:")
        print("   1. Database is paused (check Neon console)")
        print("   2. Credentials have changed")
        print("   3. Network connectivity issues")
        print("   4. Database is at connection limit")

if __name__ == "__main__":
    asyncio.run(main())





