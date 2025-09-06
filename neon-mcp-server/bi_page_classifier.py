#!/usr/bin/env python3
"""
Business Intelligence Page Classifier - CAREERS FIRST IMPLEMENTATION
Reclassifies website pages with business intelligence priority
"""
import asyncio
import sys
sys.path.insert(0, '.')
from server import get_db_pool

# Business Intelligence Taxonomy (CAREERS FIRST)
BI_TAXONOMY = {
    # TIER 1: CRITICAL BUSINESS INTELLIGENCE 
    'careers': {
        'tier': 1,
        'intelligence': 'Hiring activity, growth indicators, business expansion signals',
        'url_patterns': ['/careers', '/jobs', '/employment', '/opportunities', '/hiring', '/work-with-us', '/join-us'],
        'title_patterns': ['careers', 'jobs', 'employment', 'opportunities', 'join us', 'work with us', 'hiring', 'open positions']
    },
    'services': {
        'tier': 1, 
        'intelligence': 'Revenue streams, core competencies, competitive positioning',
        'url_patterns': ['/services', '/solutions', '/offerings', '/capabilities', '/expertise', '/what-we-do'],
        'title_patterns': ['services', 'solutions', 'what we do', 'capabilities', 'offerings', 'expertise']
    },
    'products': {
        'tier': 1,
        'intelligence': 'Product portfolio, market focus, innovation pipeline',
        'url_patterns': ['/products', '/catalog', '/portfolio', '/brands', '/shop'],
        'title_patterns': ['products', 'catalog', 'portfolio', 'brands', 'offerings', 'shop']
    },
    'about': {
        'tier': 1,
        'intelligence': 'Mission, history, size, business model, values',
        'url_patterns': ['/about', '/company', '/who-we-are', '/overview', '/our-story'],
        'title_patterns': ['about', 'company', 'who we are', 'overview', 'our story', 'about us']
    },
    
    # TIER 2: HIGH-VALUE INTELLIGENCE
    'team': {
        'tier': 2,
        'intelligence': 'Leadership depth, expertise, company culture, decision makers',
        'url_patterns': ['/team', '/leadership', '/people', '/staff', '/management', '/executives', '/board', '/founders'],
        'title_patterns': ['team', 'leadership', 'people', 'staff', 'management', 'executives', 'our team', 'meet the team', 'board of directors', 'founders']
    },
    'news': {
        'tier': 2,
        'intelligence': 'Market activity, thought leadership, PR activity, company momentum',
        'url_patterns': ['/news', '/blog', '/insights', '/updates', '/press', '/media', '/articles', '/resources'],
        'title_patterns': ['news', 'blog', 'insights', 'updates', 'press releases', 'media', 'articles', 'thought leadership', 'resources']
    },
    
    # TIER 3: BUSINESS OPERATIONS
    'locations': {
        'tier': 3,
        'intelligence': 'Market reach, geographic expansion, operational footprint',
        'url_patterns': ['/locations', '/offices', '/facilities', '/branches', '/stores', '/find-us'],
        'title_patterns': ['locations', 'offices', 'facilities', 'branches', 'stores', 'find us', 'where we are']
    },
    'contact': {
        'tier': 3,
        'intelligence': 'Geographic presence, contact channels, business accessibility',
        'url_patterns': ['/contact', '/reach-us', '/get-in-touch', '/connect'],
        'title_patterns': ['contact', 'reach us', 'get in touch', 'contact us', 'connect']
    },
    
    # TIER 4: MARKET INTELLIGENCE
    'case-studies': {
        'tier': 4,
        'intelligence': 'Client quality, project scale, market positioning, success metrics',
        'url_patterns': ['/case-studies', '/portfolio', '/work', '/projects', '/clients', '/success-stories', '/testimonials'],
        'title_patterns': ['case studies', 'portfolio', 'our work', 'projects', 'success stories', 'client stories', 'testimonials']
    },
    'industries': {
        'tier': 4,
        'intelligence': 'Market segments, vertical expertise, industry positioning',
        'url_patterns': ['/industries', '/sectors', '/markets', '/verticals', '/who-we-serve'],
        'title_patterns': ['industries', 'sectors', 'markets', 'verticals', 'who we serve', 'market focus']
    },
    
    # TIER 5: FINANCIAL INTELLIGENCE
    'investors': {
        'tier': 5,
        'intelligence': 'Financial health, public company status, growth metrics',
        'url_patterns': ['/investors', '/investor-relations', '/financials', '/sec-filings', '/earnings'],
        'title_patterns': ['investors', 'investor relations', 'financials', 'sec filings', 'earnings']
    },
    
    # TIER 6: ADMINISTRATIVE (FILTER OUT)
    'legal': {
        'tier': 6,
        'intelligence': 'Compliance status (minimal business intelligence)',
        'url_patterns': ['/terms', '/privacy', '/legal', '/compliance', '/gdpr', '/ccpa', '/cookies'],
        'title_patterns': ['terms', 'privacy', 'legal', 'compliance', 'gdpr', 'ccpa', 'cookie policy']
    }
}

def classify_page_bi(url, title=''):
    """Enhanced BI classification - CAREERS FIRST"""
    url_lower = url.lower() if url else ''
    title_lower = title.lower() if title else ''
    
    # Check each taxonomy category (careers checked first due to tier 1 priority)
    for classification, config in BI_TAXONOMY.items():
        # Check URL patterns first (more reliable)
        for pattern in config['url_patterns']:
            if pattern in url_lower:
                return classification, config['tier'], config['intelligence']
        
        # Check title patterns
        for pattern in config['title_patterns']:
            if pattern in title_lower:
                return classification, config['tier'], config['intelligence']
    
    # Default: unclassified, tier 7 (lowest priority)
    return 'unclassified', 7, 'Unknown business intelligence value'

async def migrate_existing_pages():
    """Migrate all existing pages to new BI classification"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        
        print('🔄 MIGRATING EXISTING PAGES TO BI CLASSIFICATION')
        print('=' * 50)
        
        # Get total count
        total_pages = await conn.fetchval('SELECT COUNT(*) FROM website_pages')
        print(f'📊 Processing {total_pages:,} website pages...')
        
        # Process in batches for better performance
        batch_size = 1000
        processed = 0
        
        while processed < total_pages:
            # Get batch of pages
            pages = await conn.fetch('''
                SELECT id, url, title 
                FROM website_pages 
                ORDER BY id
                OFFSET $1 LIMIT $2
            ''', processed, batch_size)
            
            if not pages:
                break
                
            # Classify each page in the batch
            updates = []
            for page in pages:
                bi_class, tier, intelligence = classify_page_bi(page['url'], page['title'])
                updates.append({
                    'id': page['id'],
                    'bi_classification': bi_class,
                    'tier': tier,
                    'intelligence': intelligence
                })
            
            # Batch update
            if updates:
                await conn.executemany('''
                    UPDATE website_pages 
                    SET 
                        bi_classification = $2,
                        business_value_tier = $3,
                        intelligence_value = $4
                    WHERE id = $1
                ''', [(u['id'], u['bi_classification'], u['tier'], u['intelligence']) for u in updates])
            
            processed += len(pages)
            if processed % 5000 == 0:
                print(f'   Processed: {processed:,}/{total_pages:,} pages...')
        
        print(f'✅ Migration complete: {processed:,} pages classified')
        
        # Show results
        print('\\n📊 BUSINESS INTELLIGENCE CLASSIFICATION RESULTS:')
        results = await conn.fetch('''
            SELECT 
                bi_classification,
                business_value_tier,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / $1, 1) as percentage
            FROM website_pages 
            WHERE bi_classification != 'unclassified'
            GROUP BY bi_classification, business_value_tier
            ORDER BY business_value_tier, count DESC
        ''', total_pages)
        
        tier_names = {
            1: 'TIER 1 - CRITICAL',
            2: 'TIER 2 - HIGH VALUE', 
            3: 'TIER 3 - OPERATIONS',
            4: 'TIER 4 - MARKET INTEL',
            5: 'TIER 5 - FINANCIAL',
            6: 'TIER 6 - ADMINISTRATIVE'
        }
        
        current_tier = None
        for result in results:
            tier = result['business_value_tier']
            if tier != current_tier:
                print(f'\\n🎯 {tier_names.get(tier, f"TIER {tier}")}:')
                current_tier = tier
            
            print(f'   • {result["bi_classification"].upper()}: {result["count"]:,} pages ({result["percentage"]}%)')

if __name__ == "__main__":
    asyncio.run(migrate_existing_pages())
