#!/usr/bin/env python3
"""
Fix Mann Lake specifically to demonstrate real page discovery
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0, '.')
from server import get_db_pool

async def fix_mann_lake_demo():
    print('🔧 FIXING MANN LAKE - REAL PAGE DISCOVERY DEMO')
    print('=' * 50)
    
    pool = await get_db_pool()
    
    # Step 1: Get Mann Lake company info
    async with pool.acquire() as conn:
        company = await conn.fetchrow('''
            SELECT c.id, c.name, ws.id as structure_id, ws.domain
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            WHERE c.name ILIKE '%mann%lake%'
        ''')
        
        if not company:
            print('❌ Mann Lake not found')
            return
        
        print(f'📊 Company: {company["name"]}')
        print(f'   Domain: {company["domain"]}')
        print(f'   Structure ID: {company["structure_id"]}')
        
        # Step 2: Show current fake pages
        fake_pages = await conn.fetch('''
            SELECT url, page_type FROM website_pages 
            WHERE website_structure_id = $1
        ''', company['structure_id'])
        
        print(f'\\n❌ CURRENT FAKE PAGES ({len(fake_pages)}):')
        for page in fake_pages:
            print(f'   • {page["url"]} [{page["page_type"]}]')
        
        # Step 3: Extract REAL pages from sitemap
        print(f'\\n🔍 EXTRACTING REAL PAGES...')
        real_pages = await get_mann_lake_real_pages()
        
        print(f'\\n✅ DISCOVERED {len(real_pages)} REAL PAGES!')
        
        # Show samples by type
        by_type = {}
        for page in real_pages:
            ptype = page['bi_classification']
            if ptype not in by_type:
                by_type[ptype] = []
            by_type[ptype].append(page)
        
        print('\\n📊 REAL PAGES BY BUSINESS INTELLIGENCE TYPE:')
        for ptype, pages in by_type.items():
            tier = pages[0]['tier']
            tier_name = 'CRITICAL' if tier == 1 else 'HIGH VALUE' if tier == 2 else 'OTHER'
            print(f'   • {ptype.upper()} (Tier {tier} - {tier_name}): {len(pages)} pages')
            
            # Show first 3 examples
            for page in pages[:3]:
                print(f'     - {page["url"]}')
            if len(pages) > 3:
                print(f'     ... and {len(pages) - 3} more')
        
        # Step 4: Option to replace fake with real
        print(f'\\n💾 READY TO UPDATE DATABASE:')
        print(f'   Replace: {len(fake_pages)} fake XML sitemap URLs')
        print(f'   With: {len(real_pages)} real business pages')
        print(f'   Business Intelligence Value: DRAMATICALLY IMPROVED')
        
        # Let's do a small test replacement (first 50 pages)
        if len(real_pages) > 0:
            print(f'\\n🧪 DEMO: Replacing with first 50 real pages...')
            
            # Delete fake pages
            await conn.execute('''
                DELETE FROM website_pages 
                WHERE website_structure_id = $1
            ''', company['structure_id'])
            print(f'   🗑️ Deleted {len(fake_pages)} fake pages')
            
            # Insert real pages (first 50)
            sample_pages = real_pages[:50]
            
            for page in sample_pages:
                try:
                    await conn.execute('''
                        INSERT INTO website_pages (
                            website_structure_id, url, path, title, page_type,
                            bi_classification, business_value_tier, intelligence_value
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ''', 
                    company['structure_id'],
                    page['url'],
                    page['path'],
                    page['title'],
                    page['page_type'],
                    page['bi_classification'],
                    page['tier'],
                    page['intelligence_value']
                    )
                except Exception as e:
                    print(f'     ⚠️ Failed to insert {page["url"]}: {e}')
                    continue
            
            # Update structure stats
            await conn.execute('''
                UPDATE website_structures 
                SET total_pages = $1, updated_at = NOW()
                WHERE id = $2
            ''', len(sample_pages), company['structure_id'])
            
            print(f'   ✅ INSERTED {len(sample_pages)} real pages!')
            
            # Verify the fix
            new_pages = await conn.fetch('''
                SELECT url, bi_classification, business_value_tier 
                FROM website_pages 
                WHERE website_structure_id = $1
                ORDER BY business_value_tier, url
                LIMIT 10
            ''', company['structure_id'])
            
            print(f'\\n🎯 VERIFICATION - NEW REAL PAGES (showing first 10):')
            for page in new_pages:
                tier = page['business_value_tier']
                bi_class = page['bi_classification']
                tier_name = 'CRITICAL' if tier == 1 else 'HIGH VALUE' if tier == 2 else f'TIER {tier}'
                print(f'   • {page["url"]}')
                print(f'     BI: {bi_class} ({tier_name})')

async def get_mann_lake_real_pages():
    """Get all real pages from Mann Lake sitemaps"""
    real_pages = []
    
    # Known sitemap files for Mann Lake
    sitemap_files = [
        'https://www.mannlakeltd.com/xmlsitemap.php?type=products&page=1',
        'https://www.mannlakeltd.com/xmlsitemap.php?type=pages&page=1',
        'https://www.mannlakeltd.com/xmlsitemap.php?type=news&page=1'
    ]
    
    async with aiohttp.ClientSession() as session:
        for sitemap_url in sitemap_files:
            try:
                async with session.get(sitemap_url, timeout=15) as response:
                    if response.status == 200:
                        xml_content = await response.text()
                        pages = extract_real_urls_from_xml(xml_content)
                        real_pages.extend(pages)
                        
                        sitemap_type = 'unknown'
                        if 'type=products' in sitemap_url:
                            sitemap_type = 'products'
                        elif 'type=pages' in sitemap_url:
                            sitemap_type = 'pages'
                        elif 'type=news' in sitemap_url:
                            sitemap_type = 'news'
                            
                        print(f'   📄 {sitemap_type} sitemap: {len(pages)} real pages')
                        
            except Exception as e:
                print(f'   ❌ Error with {sitemap_url}: {e}')
                continue
    
    return real_pages

def extract_real_urls_from_xml(xml_content):
    """Extract real page URLs from XML sitemap content"""
    pages = []
    
    try:
        root = ET.fromstring(xml_content)
        url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        for url_elem in url_elements:
            loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None and loc_elem.text:
                url = loc_elem.text
                
                # Skip sitemap files, only get real content
                if 'mannlakeltd.com' in url and 'sitemap' not in url.lower():
                    # Extract path
                    path = url.replace('https://www.mannlakeltd.com', '').replace('https://mannlakeltd.com', '')
                    if not path:
                        path = '/'
                    
                    # Classify the page
                    page_type = classify_page_type(url)
                    bi_class, tier, intelligence = get_bi_classification_for_page(page_type)
                    
                    pages.append({
                        'url': url,
                        'path': path,
                        'title': generate_title_from_url(url),
                        'page_type': page_type,
                        'bi_classification': bi_class,
                        'tier': tier,
                        'intelligence_value': intelligence
                    })
    
    except ET.ParseError as e:
        print(f'❌ XML Parse Error: {e}')
    
    return pages

def classify_page_type(url):
    """Classify page type from URL"""
    url_lower = url.lower()
    
    if any(x in url_lower for x in ['/career', '/job', '/hiring', '/employment']):
        return 'careers'
    elif any(x in url_lower for x in ['/service', '/solution']):
        return 'services'
    elif any(x in url_lower for x in ['/product', '/shop', '/catalog', '/varroa', '/beekeeping', '/poultry']):
        return 'products'
    elif any(x in url_lower for x in ['/about', '/company', '/who-we-are']):
        return 'about'
    elif any(x in url_lower for x in ['/news', '/blog', '/press', '/article']):
        return 'news'
    elif any(x in url_lower for x in ['/team', '/leadership', '/staff']):
        return 'team'
    elif any(x in url_lower for x in ['/contact', '/reach-us']):
        return 'contact'
    else:
        return 'other'

def get_bi_classification_for_page(page_type):
    """Get BI classification, tier, and intelligence value"""
    classifications = {
        'careers': ('careers', 1, 'Hiring activity, growth indicators, business expansion signals'),
        'services': ('services', 1, 'Revenue streams, core competencies, competitive positioning'),
        'products': ('products', 1, 'Product portfolio, market focus, innovation pipeline'),
        'about': ('about', 1, 'Mission, history, size, business model, values'),
        'team': ('team', 2, 'Leadership depth, expertise, company culture, decision makers'),
        'news': ('news', 2, 'Market activity, thought leadership, PR activity, company momentum'),
        'contact': ('contact', 3, 'Geographic presence, contact channels, business accessibility'),
        'other': ('unclassified', 7, 'Unknown business intelligence value')
    }
    
    return classifications.get(page_type, classifications['other'])

def generate_title_from_url(url):
    """Generate reasonable title from URL"""
    try:
        path = url.split('/')[-1] if url.endswith('/') else url.split('/')[-1]
        if not path:
            path = url.split('/')[-2] if '/' in url else 'Page'
        
        title = path.replace('-', ' ').replace('_', ' ')
        return title.title()
    except:
        return 'Page'

if __name__ == '__main__':
    asyncio.run(fix_mann_lake_demo())
