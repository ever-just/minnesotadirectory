#!/usr/bin/env python3
"""
PHASE 2: PILOT IMPLEMENTATION - Fix Mann Lake + 2 other companies
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import requests
import sys
sys.path.insert(0, '.')
from server import get_db_pool

async def phase2_pilot_implementation():
    print('🚀 PHASE 2: PILOT IMPLEMENTATION')
    print('=' * 40)
    
    pool = await get_db_pool()
    
    # Step 1: Fix Mann Lake (our test case)
    print('\\n🎯 STEP 2.1: FIXING MANN LAKE LTD')
    success1 = await fix_company_sitemap(pool, 'Mann Lake Holding, Inc.')
    
    # Step 2: Fix another large company 
    print('\\n🎯 STEP 2.2: FIXING ESSENTIA HEALTH')
    success2 = await fix_company_sitemap(pool, 'Essentia Health')
    
    # Step 3: Fix a smaller company
    print('\\n🎯 STEP 2.3: FIXING CARDINAL GLASS')  
    success3 = await fix_company_sitemap(pool, 'Cardinal Glass Industries, Inc.')
    
    # Summary
    fixes = sum([success1, success2, success3])
    print(f'\\n📊 PILOT RESULTS: {fixes}/3 companies successfully fixed')
    
    return fixes >= 2  # Success if at least 2 companies fixed

async def fix_company_sitemap(pool, company_name):
    """Fix a specific company's sitemap data"""
    
    async with pool.acquire() as conn:
        # Get company info
        company = await conn.fetchrow('''
            SELECT c.id, c.name, c.website, ws.id as structure_id, ws.domain
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            WHERE c.name = $1
        ''', company_name)
        
        if not company:
            print(f'   ❌ {company_name} not found')
            return False
        
        print(f'   📊 Company: {company["name"]}')
        print(f'      Domain: {company["domain"]}')
        
        # Get current fake pages count
        current_pages = await conn.fetchval('''
            SELECT COUNT(*) FROM website_pages 
            WHERE website_structure_id = $1
        ''', company['structure_id'])
        
        print(f'   Current pages in DB: {current_pages}')
        
        # Extract real pages
        real_pages = await extract_real_pages_for_company(company['domain'])
        
        if len(real_pages) < 10:
            print(f'   ⚠️ Only found {len(real_pages)} real pages, skipping')
            return False
        
        print(f'   🎯 Found {len(real_pages)} real pages!')
        
        # Replace fake with real (use first 200 pages for pilot)
        pilot_pages = real_pages[:200]
        
        try:
            # Delete current fake pages
            await conn.execute('''
                DELETE FROM website_pages WHERE website_structure_id = $1
            ''', company['structure_id'])
            
            # Insert real pages
            inserted = 0
            for page in pilot_pages:
                try:
                    await conn.execute('''
                        INSERT INTO website_pages (
                            website_structure_id, url, path, title, page_type,
                            bi_classification, business_value_tier, intelligence_value
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ''', 
                    company['structure_id'], page['url'], page['path'],
                    page['title'], page['page_type'], page['bi_classification'],
                    page['business_value_tier'], page['intelligence_value']
                    )
                    inserted += 1
                except Exception as e:
                    continue  # Skip problematic URLs
            
            # Update structure
            await conn.execute('''
                UPDATE website_structures 
                SET total_pages = $1, updated_at = NOW()
                WHERE id = $2  
            ''', inserted, company['structure_id'])
            
            print(f'   ✅ SUCCESS: {inserted} real pages inserted!')
            
            # Show sample results
            sample = await conn.fetch('''
                SELECT url, bi_classification, business_value_tier
                FROM website_pages 
                WHERE website_structure_id = $1
                ORDER BY business_value_tier, url
                LIMIT 5
            ''', company['structure_id'])
            
            print(f'   📋 Sample real pages:')
            for page in sample:
                tier = page['business_value_tier']
                tier_name = 'CRITICAL' if tier == 1 else 'HIGH VALUE' if tier == 2 else f'Tier {tier}'
                print(f'     • {page["bi_classification"]} ({tier_name}): {page["url"]}')
            
            return True
            
        except Exception as e:
            print(f'   ❌ Database error: {e}')
            return False

async def extract_real_pages_for_company(domain):
    """Extract real pages from company sitemaps"""
    real_pages = []
    
    # Try common sitemap URLs
    sitemap_urls = [
        f'https://{domain}/sitemap.xml',
        f'https://www.{domain}/sitemap.xml'
    ]
    
    for sitemap_url in sitemap_urls:
        try:
            response = requests.get(sitemap_url, timeout=15)
            if response.status_code == 200:
                xml_content = response.text
                
                # Check if sitemap index or direct sitemap
                if 'sitemapindex' in xml_content or '<sitemap>' in xml_content:
                    # Parse sitemap index
                    pages = await parse_sitemap_index(xml_content, domain)
                    real_pages.extend(pages)
                else:
                    # Direct sitemap
                    pages = parse_direct_sitemap(xml_content, domain)
                    real_pages.extend(pages)
                
                break  # Found working sitemap
                
        except Exception as e:
            continue
    
    return real_pages

async def parse_sitemap_index(xml_content, domain):
    """Parse sitemap index to get real pages from sub-sitemaps"""
    all_pages = []
    
    try:
        root = ET.fromstring(xml_content)
        sitemap_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
        
        # Limit to first 5 sub-sitemaps for pilot
        for sitemap_elem in sitemap_elements[:5]:
            loc_elem = sitemap_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None:
                sub_sitemap_url = loc_elem.text
                
                try:
                    response = requests.get(sub_sitemap_url, timeout=10)
                    if response.status_code == 200:
                        sub_xml = response.text
                        pages = parse_direct_sitemap(sub_xml, domain)
                        all_pages.extend(pages)
                except:
                    continue
    
    except ET.ParseError:
        pass
    
    return all_pages

def parse_direct_sitemap(xml_content, domain):
    """Parse direct sitemap to extract real page URLs"""
    pages = []
    
    try:
        root = ET.fromstring(xml_content)
        url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        for url_elem in url_elements:
            loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None and loc_elem.text:
                url = loc_elem.text.strip()
                
                # Only real business pages
                if (domain in url and 'sitemap' not in url.lower() and '.xml' not in url.lower()):
                    path = url.replace(f'https://www.{domain}', '').replace(f'https://{domain}', '')
                    if not path:
                        path = '/'
                    
                    # Classify page
                    classification = classify_business_page(url)
                    
                    pages.append({
                        'url': url,
                        'path': path,
                        'title': make_title_from_path(path),
                        **classification
                    })
    
    except ET.ParseError:
        pass
    
    return pages

def classify_business_page(url):
    """Classify page for business intelligence"""
    url_lower = url.lower()
    
    # Enhanced product detection (Mann Lake specific)
    if (any(x in url_lower for x in ['/product', '/catalog', '/shop']) or
        any(x in url_lower for x in ['varroa', 'beekeeping', 'poultry', 'honey', 'supplies'])):
        return {
            'page_type': 'products',
            'bi_classification': 'products',
            'business_value_tier': 1,
            'intelligence_value': 'Product portfolio, market focus, innovation pipeline'
        }
    elif any(x in url_lower for x in ['/career', '/job', '/hiring']):
        return {
            'page_type': 'careers',
            'bi_classification': 'careers', 
            'business_value_tier': 1,
            'intelligence_value': 'Hiring activity, growth indicators, business expansion signals'
        }
    elif any(x in url_lower for x in ['/about', '/company']):
        return {
            'page_type': 'about',
            'bi_classification': 'about',
            'business_value_tier': 1,
            'intelligence_value': 'Mission, history, size, business model, values'
        }
    elif any(x in url_lower for x in ['/service', '/solution']):
        return {
            'page_type': 'services',
            'bi_classification': 'services',
            'business_value_tier': 1,
            'intelligence_value': 'Revenue streams, core competencies, competitive positioning'
        }
    else:
        return {
            'page_type': 'other',
            'bi_classification': 'unclassified',
            'business_value_tier': 7,
            'intelligence_value': 'Unknown business intelligence value'
        }

def make_title_from_path(path):
    """Make title from path"""
    if path == '/':
        return 'Home'
    segments = [s for s in path.split('/') if s]
    if segments:
        return segments[-1].replace('-', ' ').replace('_', ' ').title()
    return 'Page'

if __name__ == '__main__':
    asyncio.run(phase2_pilot_implementation())
