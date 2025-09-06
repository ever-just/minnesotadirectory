#!/usr/bin/env python3
"""
Fix Mann Lake (and other companies) by extracting REAL pages from sub-sitemaps
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0, '.')
from server import get_db_pool

async def fix_mann_lake():
    print('🔧 FIXING MANN LAKE - EXTRACTING REAL PAGES')
    print('=' * 50)
    
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Get Mann Lake's company info
        company = await conn.fetchrow('''
            SELECT c.id, c.name, c.website, ws.id as structure_id
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            WHERE c.name ILIKE '%mann%lake%'
        ''')
        
        if not company:
            print('❌ Mann Lake not found')
            return
        
        print(f'📊 Found: {company[\"name\"]}')
        print(f'   Company ID: {company[\"id\"]}')
        print(f'   Website: {company[\"website\"]}')
        
        # Get current "fake" pages
        fake_pages = await conn.fetch('''
            SELECT url FROM website_pages 
            WHERE website_structure_id = $1
        ''', company['structure_id'])
        
        print(f'\\n❌ Current FAKE pages ({len(fake_pages)}):')
        for page in fake_pages:
            print(f'   • {page[\"url\"]}')
        
        # Extract real pages from sub-sitemaps
        print(f'\\n🔍 Extracting REAL pages...')
        real_pages = []
        
        # Define the sitemap file URLs we know exist
        sitemap_files = [
            'https://www.mannlakeltd.com/xmlsitemap.php?type=products&page=1',
            'https://www.mannlakeltd.com/xmlsitemap.php?type=news&page=1',
            'https://www.mannlakeltd.com/xmlsitemap.php?type=brands&page=1',
            'https://www.mannlakeltd.com/xmlsitemap.php?type=pages&page=1'
        ]
        
        async with aiohttp.ClientSession() as session:
            for sitemap_url in sitemap_files:
                sitemap_type = 'unknown'
                if 'type=products' in sitemap_url:
                    sitemap_type = 'products'
                elif 'type=news' in sitemap_url:
                    sitemap_type = 'news'  
                elif 'type=pages' in sitemap_url:
                    sitemap_type = 'pages'
                elif 'type=brands' in sitemap_url:
                    sitemap_type = 'brands'
                
                print(f'\\n📄 Parsing {sitemap_type} sitemap...')
                
                try:
                    async with session.get(sitemap_url) as response:
                        if response.status == 200:
                            xml_content = await response.text()
                            
                            # Parse XML to get real URLs
                            root = ET.fromstring(xml_content)
                            urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
                            
                            page_count = 0
                            for url_elem in urls:
                                loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                                if loc_elem is not None:
                                    url = loc_elem.text
                                    if url and 'mannlakeltd.com' in url and 'sitemap' not in url:
                                        
                                        # Determine page type based on URL
                                        page_type = 'other'
                                        if any(x in url.lower() for x in ['/career', '/job', '/hiring']):
                                            page_type = 'careers'
                                        elif 'type=products' in sitemap_url or any(x in url.lower() for x in ['/product', '/shop']):
                                            page_type = 'products'
                                        elif 'type=news' in sitemap_url or any(x in url.lower() for x in ['/news', '/blog']):
                                            page_type = 'news'
                                        elif any(x in url.lower() for x in ['/about', '/company']):
                                            page_type = 'about'
                                        
                                        real_pages.append({
                                            'url': url,
                                            'page_type': page_type,
                                            'sitemap_source': sitemap_type
                                        })
                                        page_count += 1
                            
                            print(f'   ✅ Extracted {page_count} real pages from {sitemap_type} sitemap')
                            
                        else:
                            print(f'   ❌ Failed: Status {response.status}')
                            
                except Exception as e:
                    print(f'   ❌ Error: {e}')
        
        print(f'\\n🎯 TOTAL REAL PAGES DISCOVERED: {len(real_pages)}')
        
        if len(real_pages) > 0:
            # Show sample of real pages by type
            by_type = {}
            for page in real_pages:
                page_type = page['page_type']
                if page_type not in by_type:
                    by_type[page_type] = []
                by_type[page_type].append(page)
            
            print('\\n📊 REAL PAGES BY TYPE:')
            for page_type, pages in by_type.items():
                print(f'   • {page_type.upper()}: {len(pages)} pages')
                # Show first 3 examples
                for page in pages[:3]:
                    print(f'     - {page[\"url\"]}')
                if len(pages) > 3:
                    print(f'     ... and {len(pages) - 3} more')
        
        # Option to update database
        if len(real_pages) > 10:  # Only if we found significant real pages
            print(f'\\n💡 Ready to UPDATE database with REAL pages!')
            print(f'   Would replace {len(fake_pages)} fake XML URLs')
            print(f'   With {len(real_pages)} real business pages')
            return real_pages, company['structure_id']
        
        return [], None

if __name__ == '__main__':
    asyncio.run(fix_mann_lake())
