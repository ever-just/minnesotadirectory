#!/usr/bin/env python3
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Use the same database URL
DATABASE_URL = os.getenv('NETLIFY_DATABASE_URL', "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Get total companies
    cur.execute("SELECT COUNT(*) FROM companies")
    total = cur.fetchone()[0]
    
    # Get geocoded companies
    cur.execute("SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
    geocoded = cur.fetchone()[0]
    
    # Get companies without coordinates
    remaining = total - geocoded
    
    # Calculate percentage
    percentage = (geocoded / total * 100) if total > 0 else 0
    
    print("🗺️  MINNESOTA DIRECTORY GEOCODING STATUS")
    print("=" * 50)
    print(f"📊 Total Companies: {total:,}")
    print(f"✅ Geocoded Companies: {geocoded:,} ({percentage:.1f}%)")
    print(f"❌ Remaining Companies: {remaining:,} ({100-percentage:.1f}%)")
    print("=" * 50)
    
    if percentage >= 50:
        print("🎯 MILESTONE: Over 50% of companies geocoded!")
    if percentage >= 75:
        print("🏆 ACHIEVEMENT: Over 75% of companies geocoded!")
    if percentage >= 90:
        print("🚀 EXCELLENT: Over 90% of companies geocoded!")
    if percentage == 100:
        print("🎉 COMPLETE: All companies geocoded!")
        
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
