#!/usr/bin/env python3
"""
Business Intelligence Page Taxonomy - CAREERS PRIORITY VERSION
Jobs/Careers elevated to Tier 1 for maximum business intelligence value
"""

# Enhanced Business Intelligence Page Taxonomy (CAREERS FIRST)
BI_PAGE_TAXONOMY = {
    # TIER 1: CRITICAL BUSINESS INTELLIGENCE (Highest Priority)
    'careers': {
        'priority': 1,
        'business_value': 'CRITICAL',
        'description': 'Hiring activity, growth indicators, and business expansion signals',
        'intelligence_value': 'Company growth, expansion plans, skill demands, business health',
        'url_patterns': ['/careers', '/jobs', '/employment', '/opportunities', '/hiring', '/work-with-us', '/join-us'],
        'title_patterns': ['careers', 'jobs', 'employment', 'opportunities', 'join us', 'work with us', 'hiring', 'open positions']
    },
    
    'services': {
        'priority': 1,
        'business_value': 'CRITICAL',
        'description': 'Core service offerings and capabilities',
        'intelligence_value': 'Revenue streams, core competencies, competitive positioning',
        'url_patterns': ['/services', '/solutions', '/offerings', '/capabilities', '/expertise', '/what-we-do'],
        'title_patterns': ['services', 'solutions', 'what we do', 'capabilities', 'offerings', 'expertise']
    },
    
    'products': {
        'priority': 1,
        'business_value': 'CRITICAL', 
        'description': 'Product catalog and offerings',
        'intelligence_value': 'Product portfolio, market focus, innovation pipeline',
        'url_patterns': ['/products', '/catalog', '/portfolio', '/brands', '/shop'],
        'title_patterns': ['products', 'catalog', 'portfolio', 'brands', 'offerings', 'shop']
    },
    
    'about': {
        'priority': 1,
        'business_value': 'CRITICAL',
        'description': 'Company overview and business model',
        'intelligence_value': 'Mission, history, size, business model, values',
        'url_patterns': ['/about', '/company', '/who-we-are', '/overview', '/our-story'],
        'title_patterns': ['about', 'company', 'who we are', 'overview', 'our story', 'about us']
    },
    
    # TIER 2: HIGH-VALUE INTELLIGENCE (Very High Priority)
    'team': {
        'priority': 2,
        'business_value': 'Very High',
        'description': 'Leadership, team members, and key personnel',
        'intelligence_value': 'Leadership depth, expertise, company culture, decision makers',
        'url_patterns': ['/team', '/leadership', '/people', '/staff', '/management', '/executives', '/board', '/founders'],
        'title_patterns': ['team', 'leadership', 'people', 'staff', 'management', 'executives', 'our team', 'meet the team', 'board of directors', 'founders']
    },
    
    'news': {
        'priority': 2,
        'business_value': 'Very High',
        'description': 'Company news, updates, and thought leadership',
        'intelligence_value': 'Market activity, thought leadership, PR activity, company momentum',
        'url_patterns': ['/news', '/blog', '/insights', '/updates', '/press', '/media', '/articles', '/resources'],
        'title_patterns': ['news', 'blog', 'insights', 'updates', 'press releases', 'media', 'articles', 'thought leadership', 'resources']
    },
    
    # TIER 3: BUSINESS OPERATIONS INTELLIGENCE (High Priority)
    'locations': {
        'priority': 3,
        'business_value': 'High',
        'description': 'Geographic presence and facility information',
        'intelligence_value': 'Market reach, geographic expansion, operational footprint',
        'url_patterns': ['/locations', '/offices', '/facilities', '/branches', '/stores', '/find-us'],
        'title_patterns': ['locations', 'offices', 'facilities', 'branches', 'stores', 'find us', 'where we are']
    },
    
    'contact': {
        'priority': 3,
        'business_value': 'High',
        'description': 'Contact information and business accessibility',
        'intelligence_value': 'Geographic presence, contact channels, business accessibility',
        'url_patterns': ['/contact', '/reach-us', '/get-in-touch', '/connect'],
        'title_patterns': ['contact', 'reach us', 'get in touch', 'contact us', 'connect']
    },
    
    # TIER 4: MARKET INTELLIGENCE (Medium Priority)
    'case-studies': {
        'priority': 4,
        'business_value': 'Medium',
        'description': 'Client work and project examples',
        'intelligence_value': 'Client quality, project scale, market positioning, success metrics',
        'url_patterns': ['/case-studies', '/portfolio', '/work', '/projects', '/clients', '/success-stories', '/testimonials'],
        'title_patterns': ['case studies', 'portfolio', 'our work', 'projects', 'success stories', 'client stories', 'testimonials']
    },
    
    'industries': {
        'priority': 4,
        'business_value': 'Medium',
        'description': 'Industry focus and market segments',
        'intelligence_value': 'Market segments, vertical expertise, industry positioning',
        'url_patterns': ['/industries', '/sectors', '/markets', '/verticals', '/who-we-serve'],
        'title_patterns': ['industries', 'sectors', 'markets', 'verticals', 'who we serve', 'market focus']
    },
    
    # TIER 5: FINANCIAL INTELLIGENCE (Low-Medium Priority)
    'investors': {
        'priority': 5,
        'business_value': 'Low-Medium',
        'description': 'Financial information and investor relations',
        'intelligence_value': 'Financial health, public company status, growth metrics',
        'url_patterns': ['/investors', '/investor-relations', '/financials', '/sec-filings', '/earnings'],
        'title_patterns': ['investors', 'investor relations', 'financials', 'sec filings', 'earnings']
    },
    
    # TIER 6: ADMINISTRATIVE (Low Priority - Filter Out)
    'legal': {
        'priority': 6,
        'business_value': 'Low',
        'description': 'Legal, compliance, and administrative pages',
        'intelligence_value': 'Compliance status (minimal business intelligence)',
        'url_patterns': ['/terms', '/privacy', '/legal', '/compliance', '/gdpr', '/ccpa', '/cookies'],
        'title_patterns': ['terms', 'privacy', 'legal', 'compliance', 'gdpr', 'ccpa', 'cookie policy']
    }
}

def get_career_intelligence_metrics():
    """
    Define what makes careers/jobs pages so valuable for business intelligence
    """
    return {
        'growth_indicators': [
            'Number of open positions',
            'Frequency of job postings', 
            'Geographic expansion (new office hiring)',
            'Department growth (new teams being built)'
        ],
        'skill_intelligence': [
            'In-demand technical skills',
            'Industry-specific expertise needs',
            'Leadership hiring (C-level, VP, Director)',
            'Entry-level vs senior hiring ratio'
        ],
        'business_health': [
            'Active hiring = healthy growth',
            'Layoffs/hiring freezes = potential issues',
            'Remote vs on-site policies',
            'Benefits and culture indicators'
        ],
        'competitive_intelligence': [
            'Talent wars (competing for same skills)',
            'Salary ranges and compensation',
            'Company culture and values',
            'Growth trajectory predictions'
        ]
    }

# Test the enhanced taxonomy
if __name__ == "__main__":
    print("🚀 CAREERS-FIRST BUSINESS INTELLIGENCE TAXONOMY")
    print("=" * 55)
    
    # Show the tier structure with careers at the top
    for i in range(1, 7):
        tier_pages = [(name, config) for name, config in BI_PAGE_TAXONOMY.items() if config['priority'] == i]
        if tier_pages:
            if i == 1:
                print(f"🎯 TIER {i} - CRITICAL BUSINESS INTELLIGENCE:")
            elif i == 2:
                print(f"👥 TIER {i} - HIGH-VALUE INTELLIGENCE:")
            elif i == 3:
                print(f"🏢 TIER {i} - BUSINESS OPERATIONS:")
            elif i == 4:
                print(f"📊 TIER {i} - MARKET INTELLIGENCE:")
            elif i == 5:
                print(f"💰 TIER {i} - FINANCIAL INTELLIGENCE:")
            elif i == 6:
                print(f"⚖️ TIER {i} - ADMINISTRATIVE (FILTER OUT):")
            
            for name, config in tier_pages:
                print(f"   • {name.upper()}: {config['description']}")
                print(f"     Intelligence: {config['intelligence_value']}")
            print()
    
    # Show why careers is so valuable
    print("💡 WHY CAREERS/JOBS IS TIER 1 CRITICAL:")
    metrics = get_career_intelligence_metrics()
    for category, indicators in metrics.items():
        print(f"\\n🔍 {category.replace('_', ' ').title()}:")
        for indicator in indicators:
            print(f"   • {indicator}")
