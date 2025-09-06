#!/usr/bin/env python3
"""
Interactive script to get the database URL
"""
print("🔍 Let's get your Neon database URL")
print("=" * 40)
print()
print("Your Netlify functions use process.env.NETLIFY_DATABASE_URL")
print("This is typically a Neon PostgreSQL connection string that looks like:")
print("postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/database?sslmode=require")
print()
print("You can find this in:")
print("1. Your Netlify dashboard > Site settings > Environment variables")
print("2. Your Neon dashboard > Connection details")
print("3. Your local development environment")
print()

# Ask user to paste the URL
database_url = input("Please paste your NETLIFY_DATABASE_URL here: ").strip()

if not database_url:
    print("❌ No URL provided!")
    exit(1)

if not database_url.startswith('postgresql://'):
    print("❌ This doesn't look like a PostgreSQL URL!")
    exit(1)

# Update the .env file
with open('.env', 'w') as f:
    f.write(f"NETLIFY_DATABASE_URL={database_url}\n")

print("✅ Updated .env file with your database URL")
print()
print("🧪 Testing the connection now...")
