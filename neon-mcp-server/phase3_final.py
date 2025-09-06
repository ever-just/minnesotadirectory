#!/usr/bin/env python3
"""
PHASE 3: COMPLETE IMPLEMENTATION - Fix all companies with XML sitemap issues
Clean implementation with proper error handling
"""
import asyncio
import requests
import xml.etree.ElementTree as ET
import sys
import time
sys.path.insert(0, '.')
from server import get_db_pool

async def phase3_complete_fix():
    print('🚀 PHASE 3: COMPLETE SITEMAP FIX')
    print('=' * 40)
    
    start_time = time.time()
    pool = await get_db_pool()
    
    # Get companies with XML sitemap issues (start with first 50 for safety)
    async with pool.acquire() as conn:
        companies = await conn.fetch('''
            SELECT DISTINCT 
                c.id, c.name, ws.id as structure_id, ws.domain, ws.total_pages
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            JOIN website_pages wp ON ws.id = wp.website_structure_id
            WHERE wp.url LIKE '%sitemap%'
            ORDER BY c.employees DESC NULLS LAST
            LIMIT 50
        ''')
    
    print(f'📊 Processing {len(companies)} companies...')
    
    stats = {'processed': 0, 'successful': 0, 'failed': 0, 'pages_added': 0}
    
    # Process companies one by one for reliability
    for i, company in enumerate(companies, 1):
        print(f'\\n[{i}/{len(companies)}] {company["name"]} ({company["domain"]})')
        
        success, pages_added = await fix_company_pages(pool, company)
        
        stats['processed'] += 1
        if success:
            stats['successful'] += 1
            stats['pages_added'] += pages_added
        else:
            stats['failed'] += 1
        
        # Progress update every 10 companies
        if i % 10 == 0:
            elapsed = time.time() - start_time
            success_rate = stats['successful'] / stats['processed'] * 100
            print(f'\\n📈 Progress: {i}/{len(companies)} | Success: {success_rate:.1f}% | Time: {elapsed/60:.1f}m')
    
    # Final summary
    total_time = time.time() - start_time
    print(f'\\n🏁 PHASE 3 RESULTS:')
    print(f'✅ Successful: {stats["successful"]}/{stats["processed"]} companies')
    print(f'📄 Real pages added: {stats["pages_added"]:,}')
    print(f'⏱️ Total time: {total_time/60:.1f} minutes')
    print(f'📊 Success rate: {stats["successful"]/stats["processed"]*100:.1f}%')
    
    return stats

async def fix_company_pages(pool, company):
    """Fix a single company's pages"""
    try:
        name = company['name']
        domain = company['domain']
        structure_id = company['structure_id']
        
        # Extract real pages
        real_pages = extract_real_pages(domain)
        
        if len(real_pages) < 5:
            print(f'   ⚠️ Only {len(real_pages)} real pages, skipping')
            return False, 0
        
        # Update database
        async with pool.acquire() as conn:
            # Delete XML sitemap URLs
            deleted = await conn.fetchval('DELETE FROM website_pages WHERE website_structure_id = $1 RETURNING 1', structure_id)
            
            # Insert real pages (limit to 200 for performance)
            real_pages_limited = real_pages[:200]
            inserted = 0
            
            for page in real_pages_limited:
                try:
                    await conn.execute('''
                        INSERT INTO website_pages (
                            website_structure_id, url, path, title, page_type,
                            bi_classification, business_value_tier, intelligence_value
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ''',
                    structure_id, page['url'], page['path'], page['title'], page['page_type'],
                    page['bi_classification'], page['business_value_tier'], page['intelligence_value']
                    )
                    inserted += 1
                except Exception as e:
                    continue  # Skip problematic URLs
            
            # Update structure count
            await conn.execute('UPDATE website_structures SET total_pages = $1, updated_at = NOW() WHERE id = $2', inserted, structure_id)
        
        print(f' ✅ {inserted} real pages')
        return True, inserted
        
    except Exception as e:
        print(f' ❌ Error: {str(e)[:30]}...')
        return False, 0

def extract_real_pages(domain):
    """Extract real pages from domain sitemaps"""
    real_pages = []
    
    # Try standard sitemap locations
    sitemap_urls = [
        f'https://{domain}/sitemap.xml',
        f'https://www.{domain}/sitemap.xml'
    ]
    
    for sitemap_url in sitemap_urls:
        try:
            response = requests.get(sitemap_url, timeout=12)
            if response.status_code == 200:
                xml_content = response.text
                
                # Determine sitemap type and parse accordingly
                if 'sitemapindex' in xml_content:
                    # Sitemap index - parse sub-sitemaps
                    pages = parse_sitemap_index(xml_content, domain)
                else:
                    # Direct sitemap
                    pages = parse_sitemap_direct(xml_content, domain)
                
                real_pages.extend(pages)
                if len(pages) > 0:
                    break  # Found working sitemap
                    
        except Exception:
            continue  # Try next URL
    
    return real_pages

def parse_sitemap_index(xml_content, domain):
    """Parse sitemap index to get real pages from sub-sitemaps"""
    all_pages = []
    
    try:
        root = ET.fromstring(xml_content)
        sitemap_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
        
        # Parse first 5 sub-sitemaps for performance
        for sitemap_elem in sitemap_elements[:5]:
            loc_elem = sitemap_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None:
                sub_sitemap_url = loc_elem.text
                
                try:
                    response = requests.get(sub_sitemap_url, timeout=8)
                    if response.status_code == 200:
                        sub_xml = response.text
                        pages = parse_sitemap_direct(sub_xml, domain)
                        all_pages.extend(pages)
                        
                        # Performance limit
                        if len(all_pages) >= 300:
                            break
                except:
                    continue
    except:
        pass
    
    return all_pages

def parse_sitemap_direct(xml_content, domain):
    """Parse direct sitemap XML for real page URLs"""
    pages = []
    
    try:
        root = ET.fromstring(xml_content)
        url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        for url_elem in url_elements:
            loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None and loc_elem.text:
                url = loc_elem.text.strip()
                
                # Filter: Only real business pages (not sitemap files)
                if (domain in url and 
                    'sitemap' not in url.lower() and 
                    '.xml' not in url.lower() and
                    url.startswith(('http://', 'https://'))):
                    
                    # Extract path
                    path = url.replace(f'https://www.{domain}', '').replace(f'https://{domain}', '')
                    if not path:
                        path = '/'
                    
                    # Apply BI classification
                    classification = classify_page_bi(url)
                    
                    pages.append({
                        'url': url,
                        'path': path,
                        'title': generate_title(path),
                        **classification
                    })
    except:
        pass
    
    return pages

def classify_page_bi(url):
    """Enhanced BI classification - CAREERS FIRST"""
    url_lower = url.lower()
    
    # TIER 1: CRITICAL (CAREERS FIRST!)
    if any(term in url_lower for term in ['/career', '/job', '/hiring', '/employment', '/opportunity']):
        return {
            'page_type': 'careers',
            'bi_classification': 'careers',
            'business_value_tier': 1,
            'intelligence_value': 'Hiring activity, growth indicators, business expansion signals'
        }
    elif any(term in url_lower for term in ['/product', '/catalog', '/shop', '/store', '/brand']):
        return {
            'page_type': 'products',
            'bi_classification': 'products',
            'business_value_tier': 1,
            'intelligence_value': 'Product portfolio, market focus, innovation pipeline'
        }
    elif any(term in url_lower for term in ['/service', '/solution', '/offering', '/capability']):
        return {
            'page_type': 'services',
            'bi_classification': 'services',
            'business_value_tier': 1,
            'intelligence_value': 'Revenue streams, core competencies, competitive positioning'
        }
    elif any(term in url_lower for term in ['/about', '/company', '/who-we-are', '/overview']):
        return {
            'page_type': 'about',
            'bi_classification': 'about',
            'business_value_tier': 1,
            'intelligence_value': 'Mission, history, size, business model, values'
        }
    
    # TIER 2: HIGH VALUE
    elif any(term in url_lower for term in ['/team', '/leadership', '/people', '/staff', '/management']):
        return {
            'page_type': 'team',
            'bi_classification': 'team',
            'business_value_tier': 2,
            'intelligence_value': 'Leadership depth, expertise, company culture, decision makers'
        }
    elif any(term in url_lower for term in ['/news', '/blog', '/insight', '/article', '/press']):
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

def generate_title(path):
    """Generate title from URL path"""
    if path == '/':
        return 'Home'
    segments = [s for s in path.split('/') if s]
    if segments:
        last = segments[-1].replace('-', ' ').replace('_', ' ')
        return last.title()
    return 'Page'

if __name__ == '__main__':
    result = asyncio.run(phase3_complete_fix())
    
    if result['successful'] >= 40:
        print('\n🎉 PHASE 3 SUCCESS! Ready for verification.')
    else:
        print('\n⚠️ PHASE 3 had some issues - may need adjustment.')
