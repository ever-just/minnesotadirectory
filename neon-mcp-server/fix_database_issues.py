#!/usr/bin/env python3
"""
Fix the duplicate companies and missing coordinates issues
This script will run once the database is accessible
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('NETLIFY_DATABASE_URL')

async def fix_database_issues():
    """Fix the main issues: duplicates and missing coordinates"""
    
    if not DATABASE_URL:
        print("❌ NETLIFY_DATABASE_URL not set")
        return
    
    try:
        print("🔗 Connecting to database...")
        conn = await asyncpg.connect(DATABASE_URL)
        
        # 1. Check current status
        print("\n📊 CURRENT DATABASE STATUS:")
        print("=" * 40)
        
        total_companies = await conn.fetchval("SELECT COUNT(*) FROM companies")
        print(f"Total companies: {total_companies}")
        
        with_coords = await conn.fetchval("SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL")
        print(f"With coordinates: {with_coords}")
        
        without_coords = total_companies - with_coords
        print(f"Need geocoding: {without_coords}")
        
        # 2. Find duplicates
        duplicates = await conn.fetch("""
            SELECT name, COUNT(*) as count
            FROM companies
            GROUP BY name
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 10
        """)
        
        print(f"\n🔄 DUPLICATE COMPANIES: {len(duplicates)} groups")
        for dup in duplicates:
            print(f"   {dup['name']}: {dup['count']} times")
        
        # 3. Fix duplicates (keep oldest record)
        if duplicates:
            print(f"\n🧹 REMOVING DUPLICATES...")
            removed_count = 0
            
            for dup in duplicates:
                # Get all IDs for this company name, ordered by creation date
                ids = await conn.fetch("""
                    SELECT id, "createdAt"
                    FROM companies 
                    WHERE name = $1
                    ORDER BY "createdAt" ASC
                """, dup['name'])
                
                if len(ids) > 1:
                    # Keep the first (oldest), remove the rest
                    keep_id = ids[0]['id']
                    remove_ids = [row['id'] for row in ids[1:]]
                    
                    for remove_id in remove_ids:
                        await conn.execute("DELETE FROM companies WHERE id = $1", remove_id)
                        removed_count += 1
                    
                    print(f"   ✅ {dup['name']}: kept {keep_id}, removed {len(remove_ids)} duplicates")
            
            print(f"\n✅ Removed {removed_count} duplicate companies")
        
        # 4. Check final status
        final_total = await conn.fetchval("SELECT COUNT(*) FROM companies")
        print(f"\n📈 FINAL STATUS:")
        print(f"   Companies remaining: {final_total}")
        print(f"   Companies with coordinates: {with_coords}")
        print(f"   Companies needing geocoding: {final_total - with_coords}")
        
        await conn.close()
        
        if final_total <= 3000:  # Expected range
            print(f"\n✅ Database cleaned successfully!")
            print(f"   Ready for geocoding remaining {final_total - with_coords} companies")
        else:
            print(f"\n⚠️  Still have {final_total} companies - may need more cleanup")
        
    except Exception as e:
        print(f"❌ Database operation failed: {e}")
        print("   Make sure database is awake in Neon Console")

if __name__ == "__main__":
    asyncio.run(fix_database_issues())





