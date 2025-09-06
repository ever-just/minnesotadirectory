#!/usr/bin/env python3
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import requests

async def test_mann_lake_extraction():
    print('PHASE 1.2: TESTING REAL PAGE EXTRACTION')
    print('=' * 45)
    
    # Test Mann Lake product sitemap directly
    sitemap_url = 'https://www.mannlakeltd.com/xmlsitemap.php?type=products&page=1'
    
    try:
        print(f'Fetching: {sitemap_url}')
        response = requests.get(sitemap_url, timeout=15)
        
        if response.status_code == 200:
            xml_content = response.text
            print(f'✅ XML content received: {len(xml_content)} chars')
            
            # Parse XML to extract real URLs
            real_pages = extract_real_business_pages(xml_content, 'mannlakeltd.com')
            
            print(f'\\n🎯 REAL PAGES EXTRACTED: {len(real_pages)}')
            
            # Classify by business intelligence
            classified = {}
            for page in real_pages[:50]:  # First 50 for testing
                bi_info = classify_for_business_intelligence(page['url'])
                page_type = bi_info['bi_classification']
                
                if page_type not in classified:
                    classified[page_type] = []
                classified[page_type].append({**page, **bi_info})
            
            print('\\n📊 CLASSIFICATION RESULTS:')
            for page_type, pages in sorted(classified.items(), key=lambda x: x[1][0]['business_value_tier']):
                tier = pages[0]['business_value_tier']
                tier_name = get_tier_name(tier)
                print(f'  • {page_type.upper()} (Tier {tier} - {tier_name}): {len(pages)} pages')
                
                # Show 2 examples
                for page in pages[:2]:
                    print(f'    - {page["title"]}: {page["url"]}')
            
            return len(real_pages), classified
        
    except Exception as e:
        print(f'❌ Error: {e}')
        return 0, {}

def extract_real_business_pages(xml_content, domain):
    """Extract actual business pages (not sitemap files) from XML"""
    pages = []
    
    try:
        root = ET.fromstring(xml_content)
        url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        for url_elem in url_elements:
            loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None and loc_elem.text:
                url = loc_elem.text.strip()
                
                # Only include real business pages (not sitemap files)
                if (domain in url and 
                    'sitemap' not in url.lower() and 
                    '.xml' not in url.lower()):
                    
                    # Extract path and create page data
                    path = url.replace(f'https://www.{domain}', '').replace(f'https://{domain}', '')
                    if not path:
                        path = '/'
                    
                    pages.append({
                        'url': url,
                        'path': path,
                        'title': generate_page_title(path),
                        'depth': len([x for x in path.split('/') if x])
                    })
    
    except ET.ParseError:
        print('❌ XML parsing failed')
    
    return pages

def classify_for_business_intelligence(url):
    """Classify page for business intelligence with CAREERS FIRST priority"""
    url_lower = url.lower()
    
    # TIER 1: CRITICAL (CAREERS FIRST!)
    if any(x in url_lower for x in ['/career', '/job', '/hiring', '/employment']):
        return {
            'page_type': 'careers',
            'bi_classification': 'careers',
            'business_value_tier': 1,
            'intelligence_value': 'Hiring activity, growth indicators, business expansion signals'
        }
    elif any(x in url_lower for x in ['/service', '/solution']):
        return {
            'page_type': 'services', 
            'bi_classification': 'services',
            'business_value_tier': 1,
            'intelligence_value': 'Revenue streams, core competencies, competitive positioning'
        }
    elif any(x in url_lower for x in ['/product', '/catalog', '/shop']):
        return {
            'page_type': 'products',
            'bi_classification': 'products', 
            'business_value_tier': 1,
            'intelligence_value': 'Product portfolio, market focus, innovation pipeline'
        }
    elif any(x in url_lower for x in ['/about', '/company']):
        return {
            'page_type': 'about',
            'bi_classification': 'about',
            'business_value_tier': 1,
            'intelligence_value': 'Mission, history, size, business model, values'
        }
    
    # TIER 2: HIGH VALUE
    elif any(x in url_lower for x in ['/team', '/leadership', '/people', '/staff']):
        return {
            'page_type': 'team',
            'bi_classification': 'team',
            'business_value_tier': 2,
            'intelligence_value': 'Leadership depth, expertise, company culture, decision makers'
        }
    elif any(x in url_lower for x in ['/news', '/blog', '/insight', '/press']):
        return {
            'page_type': 'news',
            'bi_classification': 'news',
            'business_value_tier': 2,
            'intelligence_value': 'Market activity, thought leadership, PR activity, company momentum'
        }
    
    # DEFAULT
    else:
        return {
            'page_type': 'other',
            'bi_classification': 'unclassified',
            'business_value_tier': 7,
            'intelligence_value': 'Unknown business intelligence value'
        }

def generate_page_title(path):
    """Generate title from URL path"""
    if path == '/':
        return 'Home'
    
    segments = [s for s in path.split('/') if s]
    if segments:
        last = segments[-1].replace('-', ' ').replace('_', ' ')
        return last.title()
    return 'Page'

def get_tier_name(tier):
    """Get tier name for display"""
    names = {
        1: 'CRITICAL',
        2: 'HIGH VALUE',
        3: 'OPERATIONS',
        4: 'MARKET INTEL',
        5: 'FINANCIAL',
        6: 'ADMINISTRATIVE',
        7: 'UNCLASSIFIED'
    }
    return names.get(tier, f'TIER {tier}')

if __name__ == '__main__':
    asyncio.run(test_mann_lake_extraction())
