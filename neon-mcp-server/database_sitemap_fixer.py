#!/usr/bin/env python3
"""
DATABASE SITEMAP FIXER
Replace XML sitemap URLs with REAL page URLs for proper business intelligence
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0, '.')
from server import get_db_pool

async def fix_sitemap_database():
    print('🔧 DATABASE SITEMAP FIXER - FIXING FUNDAMENTAL ISSUE')
    print('=' * 60)
    
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Find companies with XML sitemap URLs instead of real pages
        problem_companies = await conn.fetch('''
            SELECT DISTINCT 
                c.id, c.name, c.website, ws.id as structure_id, ws.domain
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            JOIN website_pages wp ON ws.id = wp.website_structure_id
            WHERE wp.url LIKE '%xmlsitemap.php%' OR wp.url LIKE '%sitemap%'
            LIMIT 5
        ''')
        
        print(f'🎯 Found {len(problem_companies)} companies with sitemap file URLs instead of real pages')
        
        for company in problem_companies:
            print(f'\\n🏢 FIXING: {company["name"]} ({company["domain"]})')
            
            # Get current fake pages
            fake_pages = await conn.fetch('''
                SELECT id, url FROM website_pages 
                WHERE website_structure_id = $1
            ''', company['structure_id'])
            
            print(f'   Current fake pages: {len(fake_pages)}')
            for page in fake_pages[:3]:
                print(f'     • {page["url"]}')
            
            # Parse the sitemap files to get real URLs
            real_pages = await parse_company_real_pages(company['domain'])
            
            if len(real_pages) > 20:  # Only fix if we find substantial real pages
                print(f'   🎯 Found {len(real_pages)} REAL pages!')
                
                # DELETE fake pages
                deleted = await conn.fetchval('''
                    DELETE FROM website_pages 
                    WHERE website_structure_id = $1
                    RETURNING COUNT(*)
                ''', company['structure_id'])
                print(f'   🗑️ Deleted {deleted} fake XML pages')
                
                # INSERT real pages (first 100 for testing)
                real_pages_sample = real_pages[:100]  # Start with sample
                
                for page in real_pages_sample:
                    try:
                        await conn.execute('''
                            INSERT INTO website_pages (
                                website_structure_id, url, path, title, page_type,
                                bi_classification, business_value_tier, intelligence_value
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ''', 
                        company['structure_id'],
                        page['url'],
                        page.get('path', '/'),
                        page.get('title', 'Page'),
                        page.get('page_type', 'other'),
                        page.get('bi_classification', 'unclassified'),
                        page.get('tier', 7),
                        page.get('intelligence_value', 'Unknown')
                        )
                    except Exception as e:
                        print(f'     ⚠️ Failed to insert {page["url"]}: {e}')
                
                # Update website structure
                await conn.execute('''
                    UPDATE website_structures 
                    SET total_pages = $1, updated_at = NOW()
                    WHERE id = $2
                ''', len(real_pages_sample), company['structure_id'])
                
                print(f'   ✅ FIXED: {company["name"]} now has {len(real_pages_sample)} REAL pages!')
            else:
                print(f'   ⚠️ Only found {len(real_pages)} real pages, keeping current data')

async def parse_company_real_pages(domain):
    """Parse all sitemap files for a domain to get real pages"""
    real_pages = []
    
    # Common sitemap patterns
    sitemap_patterns = [
        f'https://{domain}/sitemap.xml',
        f'https://www.{domain}/sitemap.xml'
    ]
    
    async with aiohttp.ClientSession() as session:
        for sitemap_url in sitemap_patterns:
            try:
                async with session.get(sitemap_url, timeout=15) as response:
                    if response.status == 200:
                        xml_content = await response.text()
                        
                        # Parse main sitemap
                        root = ET.fromstring(xml_content)
                        
                        # Check if it is a sitemap index
                        sitemap_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
                        
                        if sitemap_elements:
                            # Parse each sub-sitemap
                            for sitemap_elem in sitemap_elements:
                                loc_elem = sitemap_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                                if loc_elem is not None:
                                    sub_sitemap_url = loc_elem.text
                                    
                                    # Fetch and parse sub-sitemap
                                    try:
                                        async with session.get(sub_sitemap_url, timeout=10) as sub_response:
                                            if sub_response.status == 200:
                                                sub_xml = await sub_response.text()
                                                sub_pages = extract_urls_from_sitemap_xml(sub_xml, domain)
                                                real_pages.extend(sub_pages)
                                    except:
                                        continue
                        else:
                            # Direct sitemap
                            pages = extract_urls_from_sitemap_xml(xml_content, domain)
                            real_pages.extend(pages)
                        
                        break  # Found working sitemap
                        
            except Exception as e:
                continue
    
    return real_pages

def extract_urls_from_sitemap_xml(xml_content, domain):
    """Extract real page URLs from sitemap XML"""
    pages = []
    
    try:
        root = ET.fromstring(xml_content)
        url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        for url_elem in url_elements:
            loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None and loc_elem.text:
                url = loc_elem.text
                
                # Skip sitemap files themselves
                if domain in url and 'sitemap' not in url.lower():
                    # Extract path and classify
                    path = url.replace(f'https://{domain}', '').replace(f'http://{domain}', '')
                    if not path.startswith('/'):
                        path = '/' + path
                    
                    page_type = classify_real_page(url)
                    bi_class, tier, intelligence = get_bi_classification(page_type)
                    
                    pages.append({
                        'url': url,
                        'path': path,
                        'title': generate_title_from_path(path),
                        'page_type': page_type,
                        'bi_classification': bi_class,
                        'tier': tier,
                        'intelligence_value': intelligence
                    })
    
    except ET.ParseError:
        pass  # Skip invalid XML
    
    return pages

def classify_real_page(url):
    """Classify a real page URL"""
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
    elif any(x in url_lower for x in ['/team', '/leadership']):
        return 'team'
    elif any(x in url_lower for x in ['/contact']):
        return 'contact'
    else:
        return 'other'

def get_bi_classification(page_type):
    """Get BI classification for a page type"""
    bi_map = {
        'careers': ('careers', 1, 'Hiring activity, growth indicators, business expansion signals'),
        'services': ('services', 1, 'Revenue streams, core competencies, competitive positioning'),
        'products': ('products', 1, 'Product portfolio, market focus, innovation pipeline'),
        'about': ('about', 1, 'Mission, history, size, business model, values'),
        'team': ('team', 2, 'Leadership depth, expertise, company culture, decision makers'),
        'news': ('news', 2, 'Market activity, thought leadership, PR activity, company momentum'),
        'contact': ('contact', 3, 'Geographic presence, contact channels, business accessibility'),
        'other': ('unclassified', 7, 'Unknown business intelligence value')
    }
    
    return bi_map.get(page_type, bi_map['other'])

def generate_title_from_path(path):
    """Generate title from URL path"""
    if path == '/':
        return 'Home'
    
    segments = [s for s in path.split('/') if s]
    if segments:
        last_segment = segments[-1].replace('-', ' ').replace('_', ' ')
        return last_segment.title()
    
    return 'Page'

if __name__ == '__main__':
    asyncio.run(fix_sitemap_database())
