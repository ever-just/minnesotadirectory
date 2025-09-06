#!/usr/bin/env python3
import asyncio
import requests
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0, '.')
from server import get_db_pool

async def fix_all_companies():
    print('🚀 PHASE 3: FIXING ALL COMPANIES')
    print('=' * 40)
    
    pool = await get_db_pool()
    
    # Get companies with sitemap issues (fixed SQL)
    async with pool.acquire() as conn:
        companies = await conn.fetch('''
            SELECT DISTINCT 
                c.id, c.name, ws.id as structure_id, ws.domain
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            JOIN website_pages wp ON ws.id = wp.website_structure_id
            WHERE wp.url LIKE '%sitemap%'
            LIMIT 20
        ''')
    
    print(f'📊 Processing {len(companies)} companies...')
    
    successful = 0
    failed = 0
    total_pages_added = 0
    
    for i, company in enumerate(companies, 1):
        print(f'[{i}/{len(companies)}] {company["name"]} ({company["domain"]})', end=' ')
        
        try:
            # Get real pages
            real_pages = get_real_business_pages(company['domain'])
            
            if len(real_pages) < 3:
                print(f'- Skip ({len(real_pages)} pages)')
                failed += 1
                continue
            
            # Update database
            async with pool.acquire() as conn:
                # Delete fake pages
                await conn.execute('DELETE FROM website_pages WHERE website_structure_id = $1', company['structure_id'])
                
                # Insert real pages
                inserted = 0
                for page in real_pages[:100]:  # Limit for performance
                    try:
                        await conn.execute('''
                            INSERT INTO website_pages (website_structure_id, url, path, title, page_type, bi_classification, business_value_tier, intelligence_value)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ''', 
                        company['structure_id'], page['url'], page['path'], page['title'], 
                        page['page_type'], page['bi_class'], page['tier'], page['intelligence'])
                        inserted += 1
                    except:
                        continue
                
                # Update count
                await conn.execute('UPDATE website_structures SET total_pages = $1 WHERE id = $2', inserted, company['structure_id'])
            
            print(f'- ✅ {inserted} real pages')
            successful += 1
            total_pages_added += inserted
            
        except Exception as e:
            print(f'- ❌ Error')
            failed += 1
    
    print(f'\\n🏁 RESULTS: {successful}/{len(companies)} successful, {total_pages_added:,} real pages added')
    return successful >= len(companies) * 0.7  # Success if 70%+ work

def get_real_business_pages(domain):
    """Get real business pages for domain"""
    pages = []
    
    try:
        # Try main sitemap
        response = requests.get(f'https://{domain}/sitemap.xml', timeout=10)
        if response.status_code != 200:
            response = requests.get(f'https://www.{domain}/sitemap.xml', timeout=10)
        
        if response.status_code == 200:
            xml = response.text
            
            if 'sitemapindex' in xml:
                # Parse sitemap index
                root = ET.fromstring(xml)
                sitemaps = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
                
                for sitemap in sitemaps[:3]:  # First 3 sub-sitemaps
                    loc = sitemap.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if loc is not None:
                        try:
                            sub_response = requests.get(loc.text, timeout=8)
                            if sub_response.status_code == 200:
                                sub_pages = extract_pages_from_sitemap(sub_response.text, domain)
                                pages.extend(sub_pages)
                        except:
                            continue
            else:
                # Direct sitemap
                pages = extract_pages_from_sitemap(xml, domain)
    except:
        pass
    
    return pages

def extract_pages_from_sitemap(xml_content, domain):
    """Extract real page URLs from sitemap XML"""
    pages = []
    
    try:
        root = ET.fromstring(xml_content)
        urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        for url_elem in urls:
            loc = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc is not None and loc.text:
                url = loc.text.strip()
                
                # Only real pages (not sitemap files)
                if domain in url and 'sitemap' not in url.lower() and '.xml' not in url.lower():
                    path = url.replace(f'https://www.{domain}', '').replace(f'https://{domain}', '') or '/'
                    
                    # Classify
                    page_type, bi_class, tier, intelligence = classify_business_page(url)
                    
                    pages.append({
                        'url': url,
                        'path': path, 
                        'title': make_title(path),
                        'page_type': page_type,
                        'bi_class': bi_class,
                        'tier': tier,
                        'intelligence': intelligence
                    })
    except:
        pass
    
    return pages

def classify_business_page(url):
    """Classify page for business intelligence"""
    url_lower = url.lower()
    
    if any(x in url_lower for x in ['/career', '/job', '/hiring']):
        return 'careers', 'careers', 1, 'Hiring activity, growth indicators, business expansion signals'
    elif any(x in url_lower for x in ['/product', '/shop', '/catalog']):
        return 'products', 'products', 1, 'Product portfolio, market focus, innovation pipeline'
    elif any(x in url_lower for x in ['/service', '/solution']):
        return 'services', 'services', 1, 'Revenue streams, core competencies, competitive positioning'
    elif any(x in url_lower for x in ['/about', '/company']):
        return 'about', 'about', 1, 'Mission, history, size, business model, values'
    elif any(x in url_lower for x in ['/team', '/leadership']):
        return 'team', 'team', 2, 'Leadership depth, expertise, company culture, decision makers'
    elif any(x in url_lower for x in ['/news', '/blog']):
        return 'news', 'news', 2, 'Market activity, thought leadership, PR activity, company momentum'
    else:
        return 'other', 'unclassified', 7, 'Unknown business intelligence value'

def make_title(path):
    """Make title from path"""
    if path == '/':
        return 'Home'
    segments = [s for s in path.split('/') if s]
    if segments:
        return segments[-1].replace('-', ' ').title()
    return 'Page'

if __name__ == '__main__':
    success = asyncio.run(fix_all_companies())
    if success:
        print('🎉 Phase 3 SUCCESS!')
    else:
        print('⚠️ Phase 3 had issues')
