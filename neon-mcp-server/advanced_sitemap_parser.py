#!/usr/bin/env python3
"""
PHASE 1.2: ADVANCED SITEMAP PARSER
Robust XML parser that handles all sitemap patterns found in database
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import re
from urllib.parse import urljoin, urlparse
import time

class AdvancedSitemapParser:
    
    @staticmethod
    async def parse_company_real_pages(domain, limit_pages=500):
        """
        Parse all sitemaps for a domain to extract real business pages
        Handles: sitemap indexes, numbered sitemaps, dynamic sitemaps
        """
        print(f'🔍 Parsing real pages for: {domain}')
        
        real_pages = []
        base_url = f'https://{domain}'
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            # Step 1: Try to find main sitemap
            main_sitemap_url = await AdvancedSitemapParser.find_main_sitemap(session, domain)
            
            if not main_sitemap_url:
                print(f'   ❌ No main sitemap found for {domain}')
                return []
            
            print(f'   ✅ Found main sitemap: {main_sitemap_url}')
            
            # Step 2: Parse main sitemap
            try:
                async with session.get(main_sitemap_url) as response:
                    if response.status == 200:
                        xml_content = await response.text()
                        
                        # Parse XML
                        root = ET.fromstring(xml_content)
                        
                        # Check if it's a sitemap index
                        sitemap_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
                        
                        if sitemap_elements:
                            print(f'   📋 Sitemap index found - {len(sitemap_elements)} sub-sitemaps')
                            
                            # Parse each sub-sitemap
                            for i, sitemap_elem in enumerate(sitemap_elements):
                                if len(real_pages) >= limit_pages:
                                    break
                                    
                                loc_elem = sitemap_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                                if loc_elem is not None:
                                    sub_sitemap_url = loc_elem.text
                                    
                                    print(f'     🔗 Parsing sub-sitemap {i+1}: {sub_sitemap_url}')
                                    
                                    try:
                                        async with session.get(sub_sitemap_url, timeout=aiohttp.ClientTimeout(total=15)) as sub_response:
                                            if sub_response.status == 200:
                                                sub_xml = await sub_response.text()
                                                sub_pages = AdvancedSitemapParser.extract_real_pages_from_xml(sub_xml, domain)
                                                
                                                # Apply BI classification
                                                for page in sub_pages:
                                                    if len(real_pages) >= limit_pages:
                                                        break
                                                    page.update(AdvancedSitemapParser.classify_page_for_bi(page['url']))
                                                    real_pages.append(page)
                                                
                                                print(f'       ✅ Found {len(sub_pages)} real pages')
                                            else:
                                                print(f'       ❌ Failed: Status {sub_response.status}')
                                    except Exception as e:
                                        print(f'       ❌ Error: {str(e)[:50]}...')
                                        continue
                        else:
                            # Direct sitemap with URLs
                            print(f'   📄 Direct sitemap detected')
                            pages = AdvancedSitemapParser.extract_real_pages_from_xml(xml_content, domain)
                            
                            for page in pages[:limit_pages]:
                                page.update(AdvancedSitemapParser.classify_page_for_bi(page['url']))
                                real_pages.append(page)
            
            except Exception as e:
                print(f'   ❌ Error parsing main sitemap: {e}')
        
        print(f'   🎯 Total real pages extracted: {len(real_pages)}')
        return real_pages
    
    @staticmethod
    async def find_main_sitemap(session, domain):
        """Find the main sitemap for a domain"""
        common_paths = [
            f'https://{domain}/sitemap.xml',
            f'https://www.{domain}/sitemap.xml',
            f'https://{domain}/sitemap_index.xml',
            f'https://{domain}/sitemaps.xml'
        ]
        
        for sitemap_url in common_paths:
            try:
                async with session.get(sitemap_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        return sitemap_url
            except:
                continue
        
        return None
    
    @staticmethod
    def extract_real_pages_from_xml(xml_content, domain):
        """Extract real page URLs from sitemap XML"""
        pages = []
        
        try:
            root = ET.fromstring(xml_content)
            url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
            
            for url_elem in url_elements:
                loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if loc_elem is not None and loc_elem.text:
                    url = loc_elem.text.strip()
                    
                    # Skip sitemap files themselves - only get real content pages
                    if (domain in url and 
                        'sitemap' not in url.lower() and 
                        '.xml' not in url.lower() and
                        url.startswith(('http://', 'https://'))):
                        
                        # Extract additional XML data
                        lastmod_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod')
                        priority_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}priority')
                        changefreq_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}changefreq')
                        
                        # Create page data
                        path = urlparse(url).path if url.startswith('http') else url
                        
                        pages.append({
                            'url': url,
                            'path': path,
                            'title': AdvancedSitemapParser.generate_title_from_url(url),
                            'lastModified': lastmod_elem.text if lastmod_elem is not None else None,
                            'priority': float(priority_elem.text) if priority_elem is not None else None,
                            'changeFreq': changefreq_elem.text if changefreq_elem is not None else None,
                            'depth': len([x for x in path.split('/') if x])
                        })
        
        except ET.ParseError as e:
            print(f'❌ XML Parse Error: {e}')
        except Exception as e:
            print(f'❌ General Error: {e}')
        
        return pages
    
    @staticmethod
    def classify_page_for_bi(url):
        """Enhanced BI classification for real pages"""
        url_lower = url.lower()
        
        # TIER 1: CRITICAL BUSINESS INTELLIGENCE
        if any(x in url_lower for x in ['/career', '/job', '/hiring', '/employment', '/work-with-us', '/join-us']):
            return {
                'page_type': 'careers',
                'bi_classification': 'careers',
                'business_value_tier': 1,
                'intelligence_value': 'Hiring activity, growth indicators, business expansion signals'
            }
        elif any(x in url_lower for x in ['/service', '/solution', '/offering', '/capability', '/what-we-do']):
            return {
                'page_type': 'services',
                'bi_classification': 'services', 
                'business_value_tier': 1,
                'intelligence_value': 'Revenue streams, core competencies, competitive positioning'
            }
        elif any(x in url_lower for x in ['/product', '/shop', '/catalog', '/store', '/brands']):
            return {
                'page_type': 'products',
                'bi_classification': 'products',
                'business_value_tier': 1, 
                'intelligence_value': 'Product portfolio, market focus, innovation pipeline'
            }
        elif any(x in url_lower for x in ['/about', '/company', '/who-we-are', '/overview', '/our-story']):
            return {
                'page_type': 'about',
                'bi_classification': 'about',
                'business_value_tier': 1,
                'intelligence_value': 'Mission, history, size, business model, values'
            }
        
        # TIER 2: HIGH-VALUE INTELLIGENCE  
        elif any(x in url_lower for x in ['/team', '/leadership', '/people', '/staff', '/management', '/executives']):
            return {
                'page_type': 'team',
                'bi_classification': 'team',
                'business_value_tier': 2,
                'intelligence_value': 'Leadership depth, expertise, company culture, decision makers'
            }
        elif any(x in url_lower for x in ['/news', '/blog', '/insight', '/article', '/press', '/media']):
            return {
                'page_type': 'news',
                'bi_classification': 'news',
                'business_value_tier': 2,
                'intelligence_value': 'Market activity, thought leadership, PR activity, company momentum'
            }
        
        # TIER 3: BUSINESS OPERATIONS
        elif any(x in url_lower for x in ['/location', '/office', '/facility', '/branch', '/store']):
            return {
                'page_type': 'locations',
                'bi_classification': 'locations',
                'business_value_tier': 3,
                'intelligence_value': 'Market reach, geographic expansion, operational footprint'
            }
        elif any(x in url_lower for x in ['/contact', '/reach-us', '/get-in-touch']):
            return {
                'page_type': 'contact',
                'bi_classification': 'contact',
                'business_value_tier': 3,
                'intelligence_value': 'Geographic presence, contact channels, business accessibility'
            }
        
        # DEFAULT: Lower priority
        else:
            return {
                'page_type': 'other',
                'bi_classification': 'unclassified',
                'business_value_tier': 7,
                'intelligence_value': 'Unknown business intelligence value'
            }
    
    @staticmethod
    def generate_title_from_url(url):
        """Generate meaningful title from URL"""
        try:
            parsed = urlparse(url)
            path = parsed.path.strip('/')
            
            if not path:
                return 'Home'
            
            # Get last segment
            segments = [s for s in path.split('/') if s]
            if segments:
                last_segment = segments[-1]
                
                # Clean up the segment
                title = re.sub(r'[_-]', ' ', last_segment)
                title = re.sub(r'\.html?$', '', title, flags=re.IGNORECASE)
                
                # Capitalize
                return title.title()
            
            return 'Page'
        except:
            return 'Page'

# Test the parser
if __name__ == '__main__':
    async def test_parser():
        # Test on Mann Lake
        pages = await AdvancedSitemapParser.parse_company_real_pages('mannlakeltd.com', limit_pages=100)
        print(f'\\n�� TEST RESULTS:')
        print(f'   Real pages found: {len(pages)}')
        
        # Show by BI classification
        by_bi = {}
        for page in pages:
            bi_class = page['bi_classification']
            if bi_class not in by_bi:
                by_bi[bi_class] = []
            by_bi[bi_class].append(page)
        
        print(f'\\n📊 BY BUSINESS INTELLIGENCE TYPE:')
        for bi_class, classified_pages in sorted(by_bi.items(), key=lambda x: x[1][0]['business_value_tier']):
            tier = classified_pages[0]['business_value_tier']
            tier_name = 'CRITICAL' if tier == 1 else 'HIGH VALUE' if tier == 2 else f'TIER {tier}'
            print(f'   • {bi_class.upper()} (Tier {tier} - {tier_name}): {len(classified_pages)} pages')
            
            # Show first 2 examples
            for page in classified_pages[:2]:
                print(f'     - {page[\"title\"]}: {page[\"url\"]}')
    
    asyncio.run(test_parser())
