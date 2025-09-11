#!/usr/bin/env python3
"""
Update connection string with the correct Neon project
"""

print("🔍 Current connection string in our scripts:")
print("postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require")
print()
print("🎯 Your Neon dashboard shows: summer-recipe-90251059")
print()
print("📋 TO FIX:")
print("1. In your Neon dashboard, click the 'Connect' button (top-right)")
print("2. Copy the 'Pooled connection' string") 
print("3. Paste it here:")
print()

new_url = input("Paste your connection string: ").strip()

if new_url and new_url.startswith('postgresql://'):
    # Update .env file
    with open('neon-mcp-server/.env', 'w') as f:
        f.write(f"NETLIFY_DATABASE_URL={new_url}\n")
    
    print("✅ Updated connection string!")
    print("🧪 Testing new connection...")
    
    # Test the new connection
    import asyncio
    import asyncpg
    
    async def test():
        try:
            conn = await asyncpg.connect(new_url)
            result = await conn.fetchval("SELECT COUNT(*) FROM companies")
            await conn.close()
            print(f"🎉 SUCCESS! Found {result} companies")
            return True
        except Exception as e:
            print(f"❌ Still failed: {e}")
            return False
    
    if asyncio.run(test()):
        print("✅ Database is now accessible!")
        print("🚀 Run: python neon-mcp-server/fix_database_issues.py")
    
else:
    print("❌ Invalid connection string")





