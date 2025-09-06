#!/usr/bin/env python3
"""
PHASE 3: SCALED DEPLOYMENT - Fix All 1,142 Companies
Process all companies with XML sitemap URLs and replace with real business pages
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import sys
import time
from datetime import datetime
sys.path.insert(0, '.')
from server import get_db_pool

async def phase3_scaled_deployment():
    print('🚀 PHASE 3: SCALED DEPLOYMENT - FIXING ALL COMPANIES')
    print('=' * 60)
    
    start_time = time.time()
    pool = await get_db_pool()
    
    # Get all companies that need fixing
    async with pool.acquire() as conn:
        problem_companies = await conn.fetch('''
            SELECT DISTINCT 
                c.id, c.name, c.website, c.employees,
                ws.id as structure_id, ws.domain, ws.total_pages
            FROM companies c
            JOIN website_structures ws ON c.id = ws.company_id
            JOIN website_pages wp ON ws.id = wp.website_structure_id
            WHERE wp.url LIKE '%sitemap%' OR wp.url LIKE '%.xml%'
            ORDER BY c.employees DESC NULLS LAST, ws.total_pages ASC
        ''')
    
    total_companies = len(problem_companies)
    print(f'📊 Processing {total_companies:,} companies with XML sitemap issues')
    
    # Process in batches
    batch_size = 20
    batches = [problem_companies[i:i + batch_size] for i in range(0, len(problem_companies), batch_size)]
    
    stats = {
        'processed': 0,
        'successful': 0,
        'failed': 0,
        'total_pages_before': 0,
        'total_pages_after': 0,
        'start_time': start_time
    }
    
    print(f'🔄 Processing {len(batches)} batches of {batch_size} companies each')
    print('=' * 60)
    
    for batch_num, batch in enumerate(batches, 1):
        print(f'\\n📦 BATCH {batch_num}/{len(batches)} ({len(batch)} companies)')
        print('-' * 40)
        
        # Process batch concurrently (but with limits)
        batch_tasks = []
        for company in batch:
            task = fix_single_company(pool, company, stats)
            batch_tasks.append(task)
        
        # Execute batch with concurrency limit
        semaphore = asyncio.Semaphore(5)  # Max 5 concurrent
        
        async def limited_fix(task):
            async with semaphore:
                return await task
        
        batch_results = await asyncio.gather(*[limited_fix(task) for task in batch_tasks], return_exceptions=True)
        
        # Process batch results
        batch_successes = sum(1 for r in batch_results if r is True)
        stats['processed'] += len(batch)
        stats['successful'] += batch_successes
        stats['failed'] += len(batch) - batch_successes
        
        # Progress update
        elapsed = time.time() - start_time
        progress_pct = (batch_num / len(batches)) * 100
        estimated_remaining = (elapsed / batch_num) * (len(batches) - batch_num) if batch_num > 0 else 0
        
        print(f'\\n📈 BATCH {batch_num} SUMMARY:')
        print(f'   Successful: {batch_successes}/{len(batch)}')
        print(f'   Overall Progress: {progress_pct:.1f}% ({stats["processed"]}/{total_companies})')
        print(f'   Success Rate: {stats["successful"]/stats["processed"]*100:.1f}%')
        print(f'   Elapsed: {elapsed/60:.1f}m | Estimated Remaining: {estimated_remaining/60:.1f}m')
        
        # Small delay between batches
        if batch_num < len(batches):
            await asyncio.sleep(2)
    
    # Final summary
    total_time = time.time() - start_time
    print(f'\\n🏁 PHASE 3 COMPLETE!')
    print('=' * 30)
    print(f'✅ Successfully processed: {stats["successful"]:,}/{total_companies:,} companies')
    print(f'❌ Failed: {stats["failed"]:,} companies')
    print(f'⏱️ Total time: {total_time/60:.1f} minutes')
    print(f'⚡ Processing rate: {stats["processed"]/(total_time/60):.1f} companies/minute')
    print(f'📄 Page transformation: {stats["total_pages_before"]:,} → {stats["total_pages_after"]:,}')
    
    success_rate = stats["successful"] / total_companies * 100
    if success_rate >= 80:
        print(f'🎉 EXCELLENT: {success_rate:.1f}% success rate!')
    elif success_rate >= 60:
        print(f'✅ GOOD: {success_rate:.1f}% success rate')
    else:
        print(f'⚠️ PARTIAL: {success_rate:.1f}% success rate - may need refinement')
    
    return stats

async def fix_company_with_real_pages(pool, company, stats):
    """Fix a single company's sitemap data"""
    try:
        company_name = company['name']
        domain = company['domain']
        structure_id = company['structure_id']
        
        print(f'   🔧 {company_name} ({domain})')
        
        # Count current fake pages
        async with pool.acquire() as conn:
            current_count = await conn.fetchval('''
                SELECT COUNT(*) FROM website_pages WHERE website_structure_id = $1
            ''', structure_id)
            
            stats['total_pages_before'] += current_count
        
        # Extract real pages
        real_pages = await extract_company_real_pages(domain)
        
        if len(real_pages) < 5:
            print(f'      ⚠️ Only {len(real_pages)} real pages found, skipping')
            return False
        
        # Limit to first 300 pages for performance
        pages_to_insert = real_pages[:300]
        
        async with pool.acquire() as conn:
            # Replace fake with real
            await conn.execute('DELETE FROM website_pages WHERE website_structure_id = $1', structure_id)
            
            # Insert real pages
            inserted = 0
            for page in pages_to_insert:
                try:
                    await conn.execute('''
                        INSERT INTO website_pages (
                            website_structure_id, url, path, title, page_type,
                            bi_classification, business_value_tier, intelligence_value
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ''', 
                    structure_id, page['url'], page['path'], page['title'],
                    page['page_type'], page['bi_classification'], 
                    page['business_value_tier'], page['intelligence_value']
                    )
                    inserted += 1
                except:
                    continue  # Skip problematic URLs
            
            # Update structure stats
            await conn.execute('''
                UPDATE website_structures 
                SET total_pages = $1, updated_at = NOW()
                WHERE id = $2
            ''', inserted, structure_id)
            
            stats['total_pages_after'] += inserted
            
            print(f'      ✅ {inserted} real pages inserted')
            return True
    
    except Exception as e:
        print(f'      ❌ Error: {str(e)[:50]}...')
        return False

async def extract_company_real_pages(domain):
    """Extract real pages for any company domain"""
    real_pages = []
    
    sitemap_urls = [
        f'https://{domain}/sitemap.xml',
        f'https://www.{domain}/sitemap.xml'
    ]
    
    timeout = aiohttp.ClientTimeout(total=20)
    
    async with aiohttp.ClientSession(timeout=timeout) as session:
        for sitemap_url in sitemap_urls:
            try:
                async with session.get(sitemap_url) as response:
                    if response.status == 200:
                        xml_content = await response.text()
                        
                        # Handle both sitemap index and direct sitemap
                        if 'sitemapindex' in xml_content or '<sitemap>' in xml_content:
                            pages = await parse_sitemap_index_for_real_pages(session, xml_content, domain)
                        else:
                            pages = parse_sitemap_for_real_pages(xml_content, domain)
                        
                        real_pages.extend(pages)
                        
                        if len(pages) > 0:
                            break  # Found working sitemap
                            
            except Exception:
                continue  # Try next sitemap URL
    
    return real_pages

async def parse_sitemap_index_for_real_pages(session, xml_content, domain):
    """Parse sitemap index and extract real pages from sub-sitemaps"""
    all_pages = []
    
    try:
        root = ET.fromstring(xml_content)
        sitemap_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
        
        # Limit to first 10 sub-sitemaps for performance
        for sitemap_elem in sitemap_elements[:10]:
            loc_elem = sitemap_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None:
                sub_sitemap_url = loc_elem.text
                
                try:
                    async with session.get(sub_sitemap_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        if response.status == 200:
                            sub_xml = await response.text()
                            pages = parse_sitemap_for_real_pages(sub_xml, domain)
                            all_pages.extend(pages)
                            
                            if len(all_pages) >= 300:  # Performance limit
                                break
                except:
                    continue
    
    except ET.ParseError:
        pass
    
    return all_pages

def parse_sitemap_for_real_pages(xml_content, domain):
    """Parse sitemap XML and extract only real business page URLs"""
    pages = []
    
    try:
        root = ET.fromstring(xml_content)
        url_elements = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        
        for url_elem in url_elements:
            loc_elem = url_elem.find('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc_elem is not None and loc_elem.text:
                url = loc_elem.text.strip()
                
                # Filter: Only real business content (not sitemap files)
                if (domain in url and 
                    'sitemap' not in url.lower() and 
                    '.xml' not in url.lower() and
                    not url.endswith('.xml') and
                    url.startswith(('http://', 'https://'))):
                    
                    # Create page with BI classification
                    path = url.replace(f'https://www.{domain}', '').replace(f'https://{domain}', '')
                    if not path:
                        path = '/'
                    
                    bi_info = get_enhanced_bi_classification(url)
                    
                    pages.append({
                        'url': url,
                        'path': path,
                        'title': create_title_from_path(path),
                        'depth': len([x for x in path.split('/') if x]),
                        **bi_info
                    })
    
    except ET.ParseError:
        pass
    
    return pages

def get_enhanced_bi_classification(url):
    """Enhanced BI classification with CAREERS FIRST priority"""
    url_lower = url.lower()
    
    # TIER 1: CRITICAL BUSINESS INTELLIGENCE (CAREERS FIRST!)
    if any(keyword in url_lower for keyword in ['/career', '/job', '/hiring', '/employment', '/opportunity']):
        return {
            'page_type': 'careers',
            'bi_classification': 'careers',
            'business_value_tier': 1,
            'intelligence_value': 'Hiring activity, growth indicators, business expansion signals'
        }
    elif any(keyword in url_lower for keyword in ['/service', '/solution', '/offering', '/capability']):
        return {
            'page_type': 'services',
            'bi_classification': 'services',
            'business_value_tier': 1,
            'intelligence_value': 'Revenue streams, core competencies, competitive positioning'
        }
    elif any(keyword in url_lower for keyword in ['/product', '/catalog', '/shop', '/store', '/brand']):
        return {
            'page_type': 'products',
            'bi_classification': 'products',
            'business_value_tier': 1,
            'intelligence_value': 'Product portfolio, market focus, innovation pipeline'
        }
    elif any(keyword in url_lower for keyword in ['/about', '/company', '/who-we-are', '/overview']):
        return {
            'page_type': 'about',
            'bi_classification': 'about',
            'business_value_tier': 1,
            'intelligence_value': 'Mission, history, size, business model, values'
        }
    
    # TIER 2: HIGH-VALUE INTELLIGENCE
    elif any(keyword in url_lower for keyword in ['/team', '/leadership', '/people', '/staff', '/management']):
        return {
            'page_type': 'team',
            'bi_classification': 'team',
            'business_value_tier': 2,
            'intelligence_value': 'Leadership depth, expertise, company culture, decision makers'
        }
    elif any(keyword in url_lower for keyword in ['/news', '/blog', '/insight', '/article', '/press', '/media']):
        return {
            'page_type': 'news',
            'bi_classification': 'news',
            'business_value_tier': 2,
            'intelligence_value': 'Market activity, thought leadership, PR activity, company momentum'
        }
    
    # TIER 3: BUSINESS OPERATIONS
    elif any(keyword in url_lower for keyword in ['/location', '/office', '/facility', '/branch']):
        return {
            'page_type': 'locations',
            'bi_classification': 'locations',
            'business_value_tier': 3,
            'intelligence_value': 'Market reach, geographic expansion, operational footprint'
        }
    elif any(keyword in url_lower for keyword in ['/contact', '/reach-us', '/get-in-touch']):
        return {
            'page_type': 'contact',
            'bi_classification': 'contact',
            'business_value_tier': 3,
            'intelligence_value': 'Geographic presence, contact channels, business accessibility'
        }
    
    # DEFAULT: Unclassified
    else:
        return {
            'page_type': 'other',
            'bi_classification': 'unclassified',
            'business_value_tier': 7,
            'intelligence_value': 'Unknown business intelligence value'
        }

def create_title_from_path(path):
    """Create meaningful title from URL path"""
    if path == '/':
        return 'Home'
    
    segments = [s for s in path.split('/') if s]
    if segments:
        last_segment = segments[-1]
        # Clean and format
        title = last_segment.replace('-', ' ').replace('_', ' ')
        # Remove file extensions
        title = title.replace('.html', '').replace('.htm', '').replace('.php', '')
        return title.title()
    
    return 'Page'

if __name__ == '__main__':
    result = asyncio.run(phase3_scaled_deployment())
    
    if result and result['successful'] >= 800:
        print('\\n🎉 PHASE 3 SUCCESS - Ready for Phase 4!')
    else:
        print('\\n⚠️ PHASE 3 PARTIAL - Some issues encountered')
