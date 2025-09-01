#!/usr/bin/env python3
"""
Simple test script for the logo fetcher MCP server
"""

import asyncio
import os
import sys
sys.path.append('.')

from server import fetch_logo_from_google, fetch_logo_from_freelogo, clean_domain, get_company_name
import aiohttp

async def test_logo_fetching():
    """Test the logo fetching functionality"""
    print("Testing Logo Fetcher MCP Server...")
    print("=" * 50)
    
    # Test domains
    test_domains = ["microsoft.com", "apple.com", "acme.com"]
    
    async with aiohttp.ClientSession() as session:
        for domain in test_domains:
            print(f"\nTesting domain: {domain}")
            print(f"Clean domain: {clean_domain(domain)}")
            print(f"Company name: {get_company_name(domain)}")
            
            # Test Free Logo API
            print("  Trying Free Logo API...")
            logo_data, ext = await fetch_logo_from_freelogo(session, domain, 128)
            if logo_data:
                print(f"  ✓ Found logo via Free Logo API ({len(logo_data)} bytes, {ext})")
            else:
                print("  ✗ No logo found via Free Logo API")
            
            # Test Google Favicon
            print("  Trying Google Favicon...")
            logo_data_google, ext_google = await fetch_logo_from_google(session, domain, 128)
            if logo_data_google:
                print(f"  ✓ Found logo via Google Favicon ({len(logo_data_google)} bytes, {ext_google})")
            else:
                print("  ✗ No logo found via Google Favicon")
    
    print("\nTest completed!")

if __name__ == "__main__":
    asyncio.run(test_logo_fetching())
