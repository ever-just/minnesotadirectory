#!/usr/bin/env python3
"""
Fetch NETLIFY_DATABASE_URL from Netlify deployment
"""
import subprocess
import json
import sys

print("🔍 Fetching NETLIFY_DATABASE_URL from your Netlify deployment...")
print("=" * 60)

try:
    # Try to get site info using netlify CLI if available
    result = subprocess.run(['npx', 'netlify', 'env:list', '--json'], 
                          capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        env_data = json.loads(result.stdout)
        for env_var in env_data:
            if env_var.get('key') == 'NETLIFY_DATABASE_URL':
                database_url = env_var.get('value')
                if database_url:
                    # Update the .env file
                    with open('.env', 'w') as f:
                        f.write(f"NETLIFY_DATABASE_URL={database_url}\n")
                    print("✅ Found and saved NETLIFY_DATABASE_URL!")
                    print("🧪 Testing connection...")
                    sys.exit(0)
        
        print("❌ NETLIFY_DATABASE_URL not found in environment variables")
        
    else:
        print("⚠️  Netlify CLI not available or not logged in")
        
except Exception as e:
    print(f"⚠️  Could not fetch from Netlify CLI: {e}")

print()
print("📋 Manual setup required:")
print("1. Go to your Netlify dashboard")
print("2. Navigate to Site settings > Environment variables") 
print("3. Find NETLIFY_DATABASE_URL")
print("4. Copy the value (should start with postgresql://)")
print("5. Run: echo 'NETLIFY_DATABASE_URL=your_url_here' > .env")
print()

# Ask user to paste it manually
database_url = input("Or paste your NETLIFY_DATABASE_URL here: ").strip()

if database_url and database_url.startswith('postgresql://'):
    with open('.env', 'w') as f:
        f.write(f"NETLIFY_DATABASE_URL={database_url}\n")
    print("✅ Saved NETLIFY_DATABASE_URL to .env file")
    print("🧪 Ready to test connection!")
else:
    print("❌ No valid database URL provided")
    sys.exit(1)
