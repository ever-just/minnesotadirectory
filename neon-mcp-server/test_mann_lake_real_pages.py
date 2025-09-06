#!/usr/bin/env python3
"""
Test what REAL pages Mann Lake actually has
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET

async def get_mann_lake_real_pages():
    print('🎯 DISCOVERING MANN LAKE REAL PAGES')
    print('=' * 40)
    
    domain = 'mannlakeltd.com'
    base_url = f'https://{domain}'
    
    async with aiohttp.ClientSession() as session:
        # Get the xmlsitemap.php?type=products file (should contain real product pages)
        product_sitemap_url = 'https://www.mannlakeltd.com/xmlsitemap.php?type=products&page=1'
        
        print(f'📦 Fetching product sitemap: {product_sitemap_url}')
        
        try:
            async with session.get(product_sitemap_url) as response:
                if response.status == 200:
                    xml_content = await response.text()
                    print(f'✅ Got XML content ({len(xml_content)} chars)')
                    
                    # Show first part of content
                    print('�� Content preview:')
                    print(xml_content[:500])
                    print('...')
                    
                    # Parse it to extract real URLs
                    try:
                        root = ET.fromstring(xml_content)
                        
                        # Find all URL elements
                        urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
                        print(f'🔍 Found {len(urls)} URL elements')
                        
                        real_pages = []
                        for url_elem in urls[:10]:  # First 10 as example
                            loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                            if loc_elem is not None:
                                url = loc_elem.text
                                real_pages.append(url)
                        
                        print(f'🎯 REAL PRODUCT PAGES DISCOVERED ({len(real_pages)}):')
                        for i, page in enumerate(real_pages[:8], 1):
                            print(f'   {i}. {page}')
                            
                        return real_pages
                        
                    except ET.ParseError as e:
                        print(f'❌ XML Parse Error: {e}')
                        
                else:
                    print(f'❌ Failed to fetch: Status {response.status}')
                    
        except Exception as e:
            print(f'❌ Error: {e}')
    
    return []

if __name__ == '__main__':
    asyncio.run(get_mann_lake_real_pages())
