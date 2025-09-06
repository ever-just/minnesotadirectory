#!/usr/bin/env python3
"""
FIXED Sitemap Parser - Properly handles dynamic sitemaps and sitemap indexes
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0, '.')
from server import get_db_pool

class AdvancedSitemapParser:
    @staticmethod
    async def fetch_and_parse_real_pages(domain):
        """
        Fetch Mann Lake's sitemaps and extract REAL page URLs
        """
        print(f'🔍 ADVANCED SITEMAP PARSING: {domain}')
        print('=' * 40)
        
        base_url = f'https://{domain}'
        sitemap_urls = [f'{base_url}/sitemap.xml']
        real_pages = []
        
        async with aiohttp.ClientSession() as session:
            # Step 1: Get main sitemap
            print('📄 Step 1: Fetching main sitemap...')
            try:
                async with session.get(f'{base_url}/sitemap.xml') as response:
                    if response.status == 200:
                        xml_content = await response.text()
                        print('✅ Got main sitemap')
                        
                        # Parse XML
                        root = ET.fromstring(xml_content)
                        
                        # Check if it's a sitemap index
                        sitemap_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
                        
                        if sitemap_elements:
                            print(f'📋 Found sitemap index with {len(sitemap_elements)} sub-sitemaps')
                            
                            # Step 2: Parse each sub-sitemap
                            for i, sitemap_elem in enumerate(sitemap_elements):
                                loc_elem = sitemap_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                                if loc_elem is not None:
                                    sub_sitemap_url = loc_elem.text
                                    print(f'   🔗 Sub-sitemap {i+1}: {sub_sitemap_url}')
                                    
                                    # Step 3: Get actual pages from sub-sitemap
                                    try:
                                        async with session.get(sub_sitemap_url) as sub_response:
                                            if sub_response.status == 200:
                                                sub_xml = await sub_response.text()
                                                
                                                # Extract real page URLs from this sitemap
                                                sub_pages = AdvancedSitemapParser.extract_pages_from_xml(sub_xml, base_url)
                                                print(f'      📄 Found {len(sub_pages)} real pages')
                                                
                                                # Show first few examples
                                                for j, page in enumerate(sub_pages[:3]):
                                                    print(f'         • {page[\"url\"]}')
                                                    
                                                real_pages.extend(sub_pages)
                                            else:
                                                print(f'      ❌ Failed to fetch: Status {sub_response.status}')
                                    except Exception as e:
                                        print(f'      ❌ Error fetching sub-sitemap: {e}')
                        else:
                            # Direct sitemap with URLs
                            print('📄 Direct sitemap found (not an index)')
                            pages = AdvancedSitemapParser.extract_pages_from_xml(xml_content, base_url)
                            real_pages.extend(pages)
                            
            except Exception as e:
                print(f'❌ Failed to fetch main sitemap: {e}')
        
        print(f'\\n🎯 FINAL RESULT: {len(real_pages)} real pages discovered!')
        return real_pages
    
    @staticmethod
    def extract_pages_from_xml(xml_content, base_url):
        """Extract actual page URLs from sitemap XML"""
        pages = []
        
        try:
            root = ET.fromstring(xml_content)
            
            # Find all URL elements
            url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
            
            for url_elem in url_elements:
                loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if loc_elem is not None:
                    url = loc_elem.text
                    
                    # Skip sitemap files themselves
                    if 'sitemap' not in url.lower() and 'xml' not in url.lower():
                        pages.append({
                            'url': url,
                            'title': AdvancedSitemapParser.generate_title_from_url(url),
                            'page_type': AdvancedSitemapParser.classify_url(url)
                        })
            
        except ET.ParseError as e:
            print(f'❌ XML Parse Error: {e}')
        except Exception as e:
            print(f'❌ General Error: {e}')
        
        return pages
    
    @staticmethod
    def generate_title_from_url(url):
        \"\"\"Generate a reasonable title from URL\"\"\"
        try:
            path = url.split('/')[-1] if '/' in url else url
            path = path.split('?')[0]  # Remove query parameters
            path = path.replace('-', ' ').replace('_', ' ')
            return path.title() if path else 'Page'
        except:
            return 'Page'
    
    @staticmethod
    def classify_url(url):
        \"\"\"Classify URL by business intelligence value\"\"\"
        url_lower = url.lower()
        
        if any(x in url_lower for x in ['/career', '/job', '/hiring']):
            return 'careers'
        elif any(x in url_lower for x in ['/service', '/solution']):
            return 'services'  
        elif any(x in url_lower for x in ['/product', '/shop', '/catalog']):
            return 'products'
        elif any(x in url_lower for x in ['/about', '/company']):
            return 'about'
        elif any(x in url_lower for x in ['/news', '/blog', '/press']):
            return 'news'
        elif any(x in url_lower for x in ['/team', '/leadership', '/staff']):
            return 'team'
        else:
            return 'other'

# Test the fixed parser on Mann Lake
if __name__ == '__main__':
    asyncio.run(AdvancedSitemapParser.fetch_and_parse_real_pages('mannlakeltd.com'))
