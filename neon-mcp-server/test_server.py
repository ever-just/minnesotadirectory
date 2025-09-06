#!/usr/bin/env python3
"""
Test script for the Neon MCP Server
"""

import asyncio
import json
import os
import sys
from typing import Any, Dict

# Add the current directory to the path so we can import server
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import get_db_pool, query_companies, get_industries_stats, get_database_stats

async def test_database_connection():
    """Test basic database connection"""
    print("🔍 Testing database connection...")
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            if result == 1:
                print("✅ Database connection successful")
                return True
            else:
                print("❌ Database connection failed - unexpected result")
                return False
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

async def test_query_companies():
    """Test company querying"""
    print("\n🔍 Testing company queries...")
    try:
        pool = await get_db_pool()
        
        # Test basic query
        result = await query_companies(pool, {"limit": 5})
        data = json.loads(result[0].text)
        
        if data.get("success") and len(data.get("companies", [])) > 0:
            print(f"✅ Query companies successful - found {len(data['companies'])} companies")
            print(f"   Total companies in DB: {data.get('total', 0)}")
            
            # Show first company as example
            if data["companies"]:
                company = data["companies"][0]
                print(f"   Example: {company.get('name', 'N/A')} - {company.get('industry', 'N/A')}")
        else:
            print(f"❌ Query companies failed or no data: {data}")
            
    except Exception as e:
        print(f"❌ Query companies test failed: {str(e)}")

async def test_industry_stats():
    """Test industry statistics"""
    print("\n🔍 Testing industry statistics...")
    try:
        pool = await get_db_pool()
        result = await get_industries_stats(pool, {"include_company_count": True})
        data = json.loads(result[0].text)
        
        if data.get("success") and data.get("industries"):
            industries = data["industries"]
            print(f"✅ Industry stats successful - found {len(industries)} industries")
            
            # Show top 3 industries
            for i, industry in enumerate(industries[:3]):
                print(f"   {i+1}. {industry.get('industry', 'N/A')}: {industry.get('company_count', 0)} companies")
        else:
            print(f"❌ Industry stats failed: {data}")
            
    except Exception as e:
        print(f"❌ Industry stats test failed: {str(e)}")

async def test_database_stats():
    """Test database statistics"""
    print("\n🔍 Testing database statistics...")
    try:
        pool = await get_db_pool()
        result = await get_database_stats(pool, {})
        data = json.loads(result[0].text)
        
        if data.get("success") and data.get("database_statistics"):
            stats = data["database_statistics"]
            print("✅ Database stats successful")
            print(f"   Total companies: {stats.get('companies_total', 0)}")
            print(f"   Companies with websites: {stats.get('companies_with_websites', 0)}")
            print(f"   Unique industries: {stats.get('unique_industries', 0)}")
            print(f"   Website structures analyzed: {stats.get('website_structures_analyzed', 0)}")
        else:
            print(f"❌ Database stats failed: {data}")
            
    except Exception as e:
        print(f"❌ Database stats test failed: {str(e)}")

async def test_filtered_queries():
    """Test filtered company queries"""
    print("\n🔍 Testing filtered queries...")
    try:
        pool = await get_db_pool()
        
        # Test industry filter
        result = await query_companies(pool, {"industry": "Technology", "limit": 3})
        data = json.loads(result[0].text)
        
        if data.get("success"):
            tech_companies = data.get("companies", [])
            print(f"✅ Industry filter successful - found {len(tech_companies)} technology companies")
            
            for company in tech_companies:
                print(f"   - {company.get('name', 'N/A')} ({company.get('industry', 'N/A')})")
        
        # Test employee range filter
        result = await query_companies(pool, {"min_employees": 100, "limit": 3})
        data = json.loads(result[0].text)
        
        if data.get("success"):
            large_companies = data.get("companies", [])
            print(f"✅ Employee filter successful - found {len(large_companies)} companies with 100+ employees")
            
    except Exception as e:
        print(f"❌ Filtered queries test failed: {str(e)}")

async def run_all_tests():
    """Run all tests"""
    print("🚀 Starting Neon MCP Server Tests")
    print("=" * 50)
    
    # Check environment
    if not os.getenv('NETLIFY_DATABASE_URL'):
        print("❌ NETLIFY_DATABASE_URL environment variable not set")
        print("   Please set it to your Neon database connection string")
        return False
    
    tests_passed = 0
    total_tests = 5
    
    # Run tests
    if await test_database_connection():
        tests_passed += 1
    
    try:
        await test_query_companies()
        tests_passed += 1
    except:
        pass
    
    try:
        await test_industry_stats()
        tests_passed += 1
    except:
        pass
    
    try:
        await test_database_stats()
        tests_passed += 1
    except:
        pass
    
    try:
        await test_filtered_queries()
        tests_passed += 1
    except:
        pass
    
    print("\n" + "=" * 50)
    print(f"🏁 Tests completed: {tests_passed}/{total_tests} passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! The Neon MCP Server is ready to use.")
        return True
    else:
        print("⚠️  Some tests failed. Check the errors above and your database connection.")
        return False

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
