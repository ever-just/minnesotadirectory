#!/usr/bin/env python3
"""
Business Intelligence-Focused Page Classification System
Enhanced taxonomy for Minnesota Directory business intelligence
"""

# Business Intelligence Page Taxonomy (Priority Order)
BI_PAGE_TAXONOMY = {
    # TIER 1: Core Business Intelligence (Highest Priority)
    'services': {
        'priority': 1,
        'business_value': 'Very High',
        'description': 'Core service offerings and capabilities',
        'url_patterns': ['/services', '/solutions', '/offerings', '/capabilities', '/expertise'],
        'title_patterns': ['services', 'solutions', 'what we do', 'capabilities', 'offerings']
    },
    
    'products': {
        'priority': 1,
        'business_value': 'Very High', 
        'description': 'Product catalog and offerings',
        'url_patterns': ['/products', '/catalog', '/portfolio', '/brands'],
        'title_patterns': ['products', 'catalog', 'portfolio', 'brands', 'offerings']
    },
    
    'about': {
        'priority': 1,
        'business_value': 'Very High',
        'description': 'Company overview and business model',
        'url_patterns': ['/about', '/company', '/who-we-are', '/overview'],
        'title_patterns': ['about', 'company', 'who we are', 'overview', 'our story']
    },
    
    # TIER 2: People & Relationship Intelligence (High Priority)
    'team': {
        'priority': 2,
        'business_value': 'High',
        'description': 'Leadership, team members, and key personnel',
        'url_patterns': ['/team', '/leadership', '/people', '/staff', '/management', '/executives', '/board'],
        'title_patterns': ['team', 'leadership', 'people', 'staff', 'management', 'executives', 'our team', 'meet the team', 'board of directors']
    },
    
    'news': {
        'priority': 2,
        'business_value': 'High',
        'description': 'Company news, updates, and thought leadership',
        'url_patterns': ['/news', '/blog', '/insights', '/updates', '/press', '/media', '/articles'],
        'title_patterns': ['news', 'blog', 'insights', 'updates', 'press releases', 'media', 'articles', 'thought leadership']
    },
    
    # TIER 3: Business Operations Intelligence (Medium-High Priority)
    'locations': {
        'priority': 3,
        'business_value': 'Medium-High',
        'description': 'Geographic presence and facility information',
        'url_patterns': ['/locations', '/offices', '/facilities', '/branches', '/stores'],
        'title_patterns': ['locations', 'offices', 'facilities', 'branches', 'stores', 'find us']
    },
    
    'careers': {
        'priority': 3,
        'business_value': 'Medium-High',
        'description': 'Hiring activity and growth indicators',
        'url_patterns': ['/careers', '/jobs', '/employment', '/opportunities', '/hiring'],
        'title_patterns': ['careers', 'jobs', 'employment', 'opportunities', 'join us', 'work with us']
    },
    
    'contact': {
        'priority': 3,
        'business_value': 'Medium',
        'description': 'Contact information and business accessibility',
        'url_patterns': ['/contact', '/reach-us', '/get-in-touch'],
        'title_patterns': ['contact', 'reach us', 'get in touch', 'contact us']
    },
    
    # TIER 4: Market Intelligence (Medium Priority)
    'case-studies': {
        'priority': 4,
        'business_value': 'Medium',
        'description': 'Client work and project examples',
        'url_patterns': ['/case-studies', '/portfolio', '/work', '/projects', '/clients', '/success-stories'],
        'title_patterns': ['case studies', 'portfolio', 'our work', 'projects', 'success stories', 'client stories']
    },
    
    'industries': {
        'priority': 4,
        'business_value': 'Medium',
        'description': 'Industry focus and market segments',
        'url_patterns': ['/industries', '/sectors', '/markets', '/verticals'],
        'title_patterns': ['industries', 'sectors', 'markets', 'verticals', 'who we serve']
    },
    
    # TIER 5: Financial & Investor Intelligence (Low-Medium Priority)
    'investors': {
        'priority': 5,
        'business_value': 'Low-Medium',
        'description': 'Financial information and investor relations',
        'url_patterns': ['/investors', '/investor-relations', '/financials', '/sec-filings'],
        'title_patterns': ['investors', 'investor relations', 'financials', 'sec filings']
    },
    
    # TIER 6: Administrative/Legal (Low Priority)
    'legal': {
        'priority': 6,
        'business_value': 'Low',
        'description': 'Legal, compliance, and administrative pages',
        'url_patterns': ['/terms', '/privacy', '/legal', '/compliance', '/gdpr', '/ccpa'],
        'title_patterns': ['terms', 'privacy', 'legal', 'compliance', 'gdpr', 'ccpa']
    }
}

def classify_page_by_business_value(url, title='', current_classification='other'):
    """
    Enhanced classification focusing on business intelligence value
    """
    url_lower = url.lower() if url else ''
    title_lower = title.lower() if title else ''
    
    # Check each taxonomy category
    for page_type, config in BI_PAGE_TAXONOMY.items():
        # Check URL patterns
        for pattern in config['url_patterns']:
            if pattern in url_lower:
                return {
                    'page_type': page_type,
                    'priority': config['priority'],
                    'business_value': config['business_value'],
                    'matched_on': f'URL pattern: {pattern}'
                }
        
        # Check title patterns
        for pattern in config['title_patterns']:
            if pattern in title_lower:
                return {
                    'page_type': page_type,
                    'priority': config['priority'],
                    'business_value': config['business_value'],
                    'matched_on': f'Title pattern: {pattern}'
                }
    
    # Default classification
    return {
        'page_type': current_classification,
        'priority': 7,
        'business_value': 'Unknown',
        'matched_on': 'No pattern match'
    }

# Example usage and testing
if __name__ == "__main__":
    # Test URLs
    test_urls = [
        ("https://mortenson.com/about/our-team", "Our Team - Leadership"),
        ("https://mortenson.com/insights/blog", "Latest Insights and News"),
        ("https://mortenson.com/services/construction", "Construction Services"),
        ("https://mortenson.com/careers", "Join Our Team - Careers"),
        ("https://mortenson.com/privacy-policy", "Privacy Policy"),
        ("https://company.com/leadership/ceo", "Chief Executive Officer"),
        ("https://company.com/news/press-releases", "Press Releases"),
    ]
    
    print("🧪 Testing Business Intelligence Page Classification:")
    print("=" * 60)
    
    for url, title in test_urls:
        result = classify_page_by_business_value(url, title)
        print(f"URL: {url}")
        print(f"Title: {title}")
        print(f"Classification: {result['page_type']} (Priority: {result['priority']}, Value: {result['business_value']})")
        print(f"Matched on: {result['matched_on']}")
        print()

    # Print taxonomy overview
    print("📋 BUSINESS INTELLIGENCE PAGE TAXONOMY:")
    print("=" * 50)
    for i in range(1, 8):
        tier_pages = [name for name, config in BI_PAGE_TAXONOMY.items() if config['priority'] == i]
        if tier_pages:
            if i == 1:
                print(f"🎯 TIER {i} - CORE BUSINESS INTELLIGENCE:")
            elif i == 2:
                print(f"👥 TIER {i} - PEOPLE & RELATIONSHIP INTELLIGENCE:")
            elif i == 3:
                print(f"�� TIER {i} - BUSINESS OPERATIONS:")
            elif i == 4:
                print(f"📊 TIER {i} - MARKET INTELLIGENCE:")
            elif i == 5:
                print(f"💰 TIER {i} - FINANCIAL INTELLIGENCE:")
            elif i == 6:
                print(f"⚖️ TIER {i} - ADMINISTRATIVE/LEGAL:")
            
            for page_type in tier_pages:
                config = BI_PAGE_TAXONOMY[page_type]
                print(f"   • {page_type}: {config['description']}")
            print()
