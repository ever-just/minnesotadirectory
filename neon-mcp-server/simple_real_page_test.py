#!/usr/bin/env python3
import asyncio
import requests
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0, '.')
from server import get_db_pool

async def check_mann_lake_real_vs_fake():
    print('MANN LAKE: REAL vs FAKE PAGE INVESTIGATION')
    print('=' * 50)
    
    # Test the product sitemap directly
    sitemap_url = 'https://www.mannlakeltd.com/xmlsitemap.php?type=products&page=1'
    
    try:
        print(f'Fetching: {sitemap_url}')
        response = requests.get(sitemap_url, timeout=10)
        
        if response.status_code == 200:
            xml_content = response.text
            print(f'✅ SUCCESS: Got XML ({len(xml_content)} chars)')
            
            # Parse to count real URLs
            root = ET.fromstring(xml_content)
            urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
            
            real_urls = []
            for url_elem in urls[:20]:  # First 20 as test
                loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if loc_elem is not None and loc_elem.text:
                    url = loc_elem.text
                    if 'mannlakeltd.com' in url and 'sitemap' not in url:
                        real_urls.append(url)
            
            print(f'\\n🎯 REAL PRODUCT PAGES FOUND: {len(real_urls)}')
            print('Sample real pages:')
            for i, url in enumerate(real_urls[:5], 1):
                print(f'   {i}. {url}')
            
            # Check what is in database  
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                db_pages = await conn.fetch('''
                    SELECT url FROM website_pages wp
                    JOIN website_structures ws ON wp.website_structure_id = ws.id
                    WHERE ws.domain = 'mannlakeltd.com'
                ''')
                
                print(f'\\n❌ FAKE PAGES IN DATABASE: {len(db_pages)}')
                for page in db_pages:
                    print(f'   • {page["url"]}')
                
                print('\\n🚨 CONCLUSION:')
                print(f'   Real pages available: {len(urls)} (from XML parsing)')
                print(f'   Database has: {len(db_pages)} sitemap file URLs')
                print(f'   FIX NEEDED: Replace XML URLs with real content pages!')
                
                return len(urls), db_pages
        
    except Exception as e:
        print(f'❌ ERROR: {e}')

    return 0, []

asyncio.run(check_mann_lake_real_vs_fake())
