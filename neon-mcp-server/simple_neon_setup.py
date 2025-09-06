#!/usr/bin/env python3
"""
Simple Neon connection setup - direct to dashboard
"""
import webbrowser
import time

print("🚀 Neon Database Connection Setup")
print("=" * 40)
print()
print("✅ We found your Neon project: summer-recipe-90251059")
print()
print("�� Let's get your connection string from Neon Dashboard:")
print()
print("1. Opening your Neon project in browser...")

# Open Neon dashboard
project_url = "https://console.neon.tech/app/projects/summer-recipe-90251059"
webbrowser.open(project_url)

print("2. In the Neon dashboard:")
print("   • Click 'Dashboard' or 'Connection Details'")
print("   • Look for 'Connection String' or 'Database URL'")
print("   • Copy the full PostgreSQL connection string")
print("   • It should look like: postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require")
print()

# Wait a moment then ask for the connection string
time.sleep(2)
print("📋 Once you have the connection string from Neon:")
database_url = input("Paste it here: ").strip()

if database_url and database_url.startswith('postgresql://'):
    # Save to .env
    with open('.env', 'w') as f:
        f.write(f"NETLIFY_DATABASE_URL={database_url}\n")
    
    print("✅ Saved connection string to .env file!")
    print()
    print("�� Testing the connection now...")
    
    # Test the connection
    import os
    os.system("python test_server.py")
    
elif database_url:
    print("❌ That doesn't look like a PostgreSQL connection string.")
    print("   It should start with 'postgresql://'")
else:
    print("❌ No connection string provided.")
    print()
    print("💡 You can manually create the .env file:")
    print("   echo 'NETLIFY_DATABASE_URL=your_connection_string_here' > .env")
    print("   python test_server.py")
