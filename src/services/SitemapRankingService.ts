/**
 * Sitemap Ranking Service
 * Analyzes and ranks website pages by importance and relevance
 */

interface PageRankingFactors {
  priority: number;           // From sitemap.xml (0.0-1.0)
  urlDepth: number;          // Number of path segments
  pageType: string;          // home, about, services, products, etc.
  titleLength: number;       // Length of page title
  hasKeywords: boolean;      // Contains important keywords
  changeFrequency: string;   // daily, weekly, monthly
  lastModified: string | null;
}

interface RankedPage {
  url: string;
  title: string;
  priority: number;
  changeFreq: string;
  lastModified?: string;
  pageType: string;
  importanceScore: number;   // Calculated ranking score (0-100)
  rankingFactors: {
    sitemapPriority: number;
    urlScore: number;
    contentScore: number;
    freshnessScore: number;
    typeScore: number;
  };
}

interface RankedSitemapStructure {
  domain: string;
  companyName: string;
  totalPages: number;
  topPages: RankedPage[];        // Top 20 pages
  remainingPages: RankedPage[];  // All other pages
  pagesByCategory: {
    [category: string]: RankedPage[];
  };
  rankingStats: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    categoryCounts: { [category: string]: number };
  };
}

export class SitemapRankingService {
  
  // Page type importance weights
  private static readonly PAGE_TYPE_WEIGHTS = {
    'homepage': 100,
    'about': 85,
    'services': 90,
    'products': 88,
    'contact': 75,
    'careers': 70,
    'news': 65,
    'investors': 80,
    'locations': 78,
    'support': 72,
    'legal': 45,
    'privacy': 40,
    'terms': 35,
    'sitemap': 20,
    'search': 25,
    'default': 60
  };

  // Important keywords that boost page ranking
  private static readonly IMPORTANT_KEYWORDS = [
    'about', 'services', 'products', 'solutions', 'contact', 'locations',
    'careers', 'jobs', 'team', 'leadership', 'management', 'board',
    'investors', 'financial', 'annual report', 'sustainability',
    'innovation', 'research', 'technology', 'news', 'press',
    'patient', 'medical', 'treatment', 'care', 'specialty',
    'banking', 'loans', 'investment', 'insurance',
    'manufacturing', 'industrial', 'supply chain'
  ];

  /**
   * Rank all pages and return top 20 + categorized structure
   */
  static async rankSitemapPages(
    companyName: string, 
    domain: string, 
    allPages: any[]
  ): Promise<RankedSitemapStructure> {
    
    console.log(`🎯 Ranking ${allPages.length} pages for ${companyName}...`);
    
    // Calculate importance score for each page
    const rankedPages: RankedPage[] = allPages.map(page => {
      const factors = this.calculateRankingFactors(page, domain, companyName);
      const importanceScore = this.calculateImportanceScore(factors);
      
      return {
        url: page.url,
        title: page.title || 'Untitled',
        priority: page.priority || 0.5,
        changeFreq: page.changeFreq || 'monthly',
        lastModified: page.lastModified,
        pageType: this.determinePageType(page.url, page.title),
        importanceScore,
        rankingFactors: factors
      };
    }).sort((a, b) => b.importanceScore - a.importanceScore); // Sort by importance (highest first)
    
    // Split into top 20 and remaining
    const topPages = rankedPages.slice(0, 20);
    const remainingPages = rankedPages.slice(20);
    
    // Categorize pages
    const pagesByCategory = this.categorizePages(rankedPages);
    
    // Calculate stats
    const scores = rankedPages.map(p => p.importanceScore);
    const rankingStats = {
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      categoryCounts: Object.fromEntries(
        Object.entries(pagesByCategory).map(([cat, pages]) => [cat, pages.length])
      )
    };
    
    console.log(`📊 Ranking complete: Top score ${rankingStats.highestScore.toFixed(1)}, Avg ${rankingStats.averageScore.toFixed(1)}`);
    console.log(`📋 Categories: ${Object.keys(pagesByCategory).join(', ')}`);
    
    return {
      domain,
      companyName,
      totalPages: allPages.length,
      topPages,
      remainingPages,
      pagesByCategory,
      rankingStats
    };
  }
  
  /**
   * Calculate ranking factors for a page
   */
  private static calculateRankingFactors(page: any, domain: string, companyName: string): any {
    const url = page.url || '';
    const title = (page.title || '').toLowerCase();
    
    // URL depth score (shallower = better)
    const urlPath = url.replace(`https://${domain}`, '').replace(`http://${domain}`, '');
    const urlDepth = (urlPath.match(/\//g) || []).length;
    const urlScore = Math.max(0, 100 - (urlDepth * 15)); // Penalize deep URLs
    
    // Content relevance score
    const hasImportantKeywords = this.IMPORTANT_KEYWORDS.some(keyword => 
      title.includes(keyword) || url.toLowerCase().includes(keyword)
    );
    const contentScore = hasImportantKeywords ? 85 : 50;
    
    // Freshness score (recent updates = better)
    let freshnessScore = 60; // Default
    if (page.lastModified) {
      const daysSinceUpdate = (Date.now() - new Date(page.lastModified).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) freshnessScore = 90;
      else if (daysSinceUpdate < 90) freshnessScore = 75;
      else if (daysSinceUpdate < 365) freshnessScore = 60;
      else freshnessScore = 40;
    }
    
    // Page type score
    const pageType = this.determinePageType(url, title);
    const typeScore = this.PAGE_TYPE_WEIGHTS[pageType] || this.PAGE_TYPE_WEIGHTS.default;
    
    return {
      sitemapPriority: (page.priority || 0.5) * 100,
      urlScore,
      contentScore,
      freshnessScore,
      typeScore
    };
  }
  
  /**
   * Calculate final importance score (0-100)
   */
  private static calculateImportanceScore(factors: any): number {
    // Weighted combination of factors
    const score = (
      factors.sitemapPriority * 0.3 +  // 30% - Original sitemap priority
      factors.typeScore * 0.25 +       // 25% - Page type importance
      factors.contentScore * 0.20 +    // 20% - Content relevance
      factors.urlScore * 0.15 +        // 15% - URL structure
      factors.freshnessScore * 0.10    // 10% - Content freshness
    );
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }
  
  /**
   * Determine page type from URL and title
   */
  private static determinePageType(url: string, title: string): string {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    if (urlLower.endsWith('/') && urlLower.split('/').length <= 4) return 'homepage';
    if (urlLower.includes('/about') || titleLower.includes('about')) return 'about';
    if (urlLower.includes('/service') || titleLower.includes('service')) return 'services';
    if (urlLower.includes('/product') || titleLower.includes('product')) return 'products';
    if (urlLower.includes('/contact') || titleLower.includes('contact')) return 'contact';
    if (urlLower.includes('/career') || urlLower.includes('/job') || titleLower.includes('career')) return 'careers';
    if (urlLower.includes('/news') || urlLower.includes('/press') || titleLower.includes('news')) return 'news';
    if (urlLower.includes('/investor') || titleLower.includes('investor')) return 'investors';
    if (urlLower.includes('/location') || titleLower.includes('location')) return 'locations';
    if (urlLower.includes('/support') || urlLower.includes('/help')) return 'support';
    if (urlLower.includes('/legal') || urlLower.includes('/terms') || urlLower.includes('/privacy')) return 'legal';
    if (urlLower.includes('/patient') || titleLower.includes('patient')) return 'healthcare';
    if (urlLower.includes('/provider') || titleLower.includes('provider')) return 'healthcare';
    
    return 'default';
  }
  
  /**
   * Categorize pages by type
   */
  private static categorizePages(pages: RankedPage[]): { [category: string]: RankedPage[] } {
    const categories: { [key: string]: RankedPage[] } = {};
    
    pages.forEach(page => {
      const category = page.pageType;
      if (!categories[category]) categories[category] = [];
      categories[category].push(page);
    });
    
    // Sort each category by importance score
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => b.importanceScore - a.importanceScore);
    });
    
    return categories;
  }
  
  /**
   * Generate realistic ranked pages for testing (simulates database)
   */
  static async generateRealisticRankedPages(companyName: string, domain: string): Promise<RankedSitemapStructure> {
    console.log(`🎯 Generating realistic RANKED sitemap for ${companyName}`);
    
    const name = companyName.toLowerCase();
    let mockPages = [];
    
    if (name.includes('fairview')) {
      // Simulate Fairview's actual 1,924 pages with realistic ranking
      mockPages = [
        { url: `https://${domain}/`, title: 'Fairview Health Services', priority: 1.0, changeFreq: 'daily', lastModified: '2025-01-05' },
        { url: `https://${domain}/services`, title: 'Medical Services', priority: 0.95, changeFreq: 'weekly', lastModified: '2025-01-04' },
        { url: `https://${domain}/services/emergency-care`, title: 'Emergency Care', priority: 0.9, changeFreq: 'weekly', lastModified: '2025-01-03' },
        { url: `https://${domain}/about/mission-vision-values`, title: 'Mission Vision Values', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-12-15' },
        { url: `https://${domain}/about/leadership-team`, title: 'Leadership Team', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-12-10' },
        { url: `https://${domain}/about/board-of-directors`, title: 'Board of Directors', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-11-20' },
        { url: `https://${domain}/locations`, title: 'Hospital Locations', priority: 0.85, changeFreq: 'monthly', lastModified: '2025-01-02' },
        { url: `https://${domain}/patients`, title: 'Patient Resources', priority: 0.85, changeFreq: 'weekly', lastModified: '2025-01-04' },
        { url: `https://${domain}/about/our-community-commitment/community-impact-report`, title: 'Community Impact Report', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-12-01' },
        { url: `https://${domain}/about/our-community-commitment/local-health-needs`, title: 'Local Health Needs Assessment', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-11-15' },
        { url: `https://${domain}/about/our-community-commitment/anchor-strategy/supplier-diversity-program`, title: 'Supplier Diversity Program', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-10-30' },
        { url: `https://${domain}/about/sustainability`, title: 'Sustainability Initiatives', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-12-20' },
        { url: `https://${domain}/services/primary-care`, title: 'Primary Care Services', priority: 0.8, changeFreq: 'weekly', lastModified: '2025-01-03' },
        { url: `https://${domain}/services/specialty-care`, title: 'Specialty Care', priority: 0.8, changeFreq: 'weekly', lastModified: '2025-01-02' },
        { url: `https://${domain}/services/surgical-services`, title: 'Surgical Services', priority: 0.8, changeFreq: 'weekly', lastModified: '2024-12-28' },
        { url: `https://${domain}/providers`, title: 'Healthcare Providers', priority: 0.75, changeFreq: 'weekly', lastModified: '2025-01-01' },
        { url: `https://${domain}/patients/billing`, title: 'Patient Billing & Insurance', priority: 0.7, changeFreq: 'monthly', lastModified: '2024-12-15' },
        { url: `https://${domain}/patients/medical-records`, title: 'Medical Records Access', priority: 0.7, changeFreq: 'monthly', lastModified: '2024-12-10' },
        { url: `https://${domain}/careers`, title: 'Careers at Fairview', priority: 0.7, changeFreq: 'weekly', lastModified: '2025-01-04' },
        { url: `https://${domain}/about/privacy`, title: 'Privacy Policy', priority: 0.6, changeFreq: 'monthly', lastModified: '2024-11-01' }
      ];
      
      // Add more realistic pages to reach closer to 1,924
      for (let i = 0; i < 30; i++) {
        mockPages.push({
          url: `https://${domain}/services/specialty/department-${i + 1}`,
          title: `Specialty Department ${i + 1}`,
          priority: 0.6 - (i * 0.01),
          changeFreq: 'monthly',
          lastModified: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
      
    } else if (name.includes('mayo')) {
      mockPages = [
        { url: `https://${domain}/`, title: 'Mayo Clinic', priority: 1.0, changeFreq: 'daily', lastModified: '2025-01-05' },
        { url: `https://${domain}/departments-centers`, title: 'Departments & Centers', priority: 0.95, changeFreq: 'weekly', lastModified: '2025-01-04' },
        { url: `https://${domain}/patient-visitor-guide`, title: 'Patient & Visitor Guide', priority: 0.9, changeFreq: 'weekly', lastModified: '2025-01-03' },
        { url: `https://${domain}/medical-professionals`, title: 'For Medical Professionals', priority: 0.85, changeFreq: 'weekly', lastModified: '2025-01-02' },
        { url: `https://${domain}/research`, title: 'Research & Clinical Trials', priority: 0.85, changeFreq: 'weekly', lastModified: '2025-01-01' },
        { url: `https://${domain}/education`, title: 'Medical Education', priority: 0.8, changeFreq: 'monthly', lastModified: '2024-12-20' },
        { url: `https://${domain}/locations`, title: 'Mayo Clinic Locations', priority: 0.8, changeFreq: 'monthly', lastModified: '2024-12-15' },
        { url: `https://${domain}/about-mayo-clinic`, title: 'About Mayo Clinic', priority: 0.85, changeFreq: 'monthly', lastModified: '2024-12-10' },
        { url: `https://${domain}/giving`, title: 'Philanthropy & Giving', priority: 0.75, changeFreq: 'monthly', lastModified: '2024-12-01' },
        { url: `https://${domain}/jobs`, title: 'Careers at Mayo Clinic', priority: 0.7, changeFreq: 'weekly', lastModified: '2025-01-04' }
      ];
      
    } else if (name.includes('target')) {
      mockPages = [
        { url: `https://${domain}/`, title: 'Target Corporation', priority: 1.0, changeFreq: 'daily', lastModified: '2025-01-05' },
        { url: `https://${domain}/about`, title: 'About Target', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-12-15' },
        { url: `https://${domain}/investors`, title: 'Investor Relations', priority: 0.85, changeFreq: 'weekly', lastModified: '2025-01-03' },
        { url: `https://${domain}/team-members`, title: 'Team Member Resources', priority: 0.8, changeFreq: 'weekly', lastModified: '2025-01-04' },
        { url: `https://${domain}/sustainability`, title: 'Sustainability & Governance', priority: 0.8, changeFreq: 'monthly', lastModified: '2024-12-20' },
        { url: `https://${domain}/news`, title: 'News & Features', priority: 0.75, changeFreq: 'daily', lastModified: '2025-01-05' },
        { url: `https://${domain}/suppliers`, title: 'Supplier Information', priority: 0.7, changeFreq: 'monthly', lastModified: '2024-11-30' },
        { url: `https://${domain}/corporate-responsibility`, title: 'Corporate Responsibility', priority: 0.8, changeFreq: 'monthly', lastModified: '2024-12-10' }
      ];
      
    } else if (name.includes('3m')) {
      mockPages = [
        { url: `https://${domain}/`, title: '3M Global', priority: 1.0, changeFreq: 'daily', lastModified: '2025-01-05' },
        { url: `https://${domain}/products`, title: '3M Products & Solutions', priority: 0.95, changeFreq: 'weekly', lastModified: '2025-01-04' },
        { url: `https://${domain}/innovation`, title: 'Innovation & Technology', priority: 0.9, changeFreq: 'monthly', lastModified: '2024-12-20' },
        { url: `https://${domain}/industries`, title: 'Industries We Serve', priority: 0.85, changeFreq: 'monthly', lastModified: '2024-12-15' },
        { url: `https://${domain}/sustainability`, title: 'Sustainability', priority: 0.8, changeFreq: 'monthly', lastModified: '2024-12-10' },
        { url: `https://${domain}/investors`, title: 'Investor Relations', priority: 0.8, changeFreq: 'weekly', lastModified: '2025-01-02' },
        { url: `https://${domain}/careers`, title: 'Careers at 3M', priority: 0.75, changeFreq: 'weekly', lastModified: '2025-01-03' },
        { url: `https://${domain}/about`, title: 'About 3M', priority: 0.85, changeFreq: 'monthly', lastModified: '2024-11-25' }
      ];
      
    } else {
      // Generic realistic business pages
      mockPages = [
        { url: `https://${domain}/`, title: companyName, priority: 1.0, changeFreq: 'daily', lastModified: '2025-01-05' },
        { url: `https://${domain}/about`, title: `About ${companyName}`, priority: 0.9, changeFreq: 'monthly', lastModified: '2024-12-15' },
        { url: `https://${domain}/services`, title: 'Services', priority: 0.85, changeFreq: 'weekly', lastModified: '2025-01-03' },
        { url: `https://${domain}/contact`, title: 'Contact Us', priority: 0.8, changeFreq: 'monthly', lastModified: '2024-12-20' },
        { url: `https://${domain}/careers`, title: 'Careers', priority: 0.7, changeFreq: 'weekly', lastModified: '2025-01-04' }
      ];
    }
    
    return mockPages;
  }
  
  private static categorizePages(pages: RankedPage[]): { [category: string]: RankedPage[] } {
    const categories: { [key: string]: RankedPage[] } = {
      'High Priority': [],
      'Core Business': [],
      'Information': [],
      'Support': [],
      'Legal & Compliance': []
    };
    
    pages.forEach(page => {
      if (page.importanceScore >= 85) {
        categories['High Priority'].push(page);
      } else if (page.pageType === 'services' || page.pageType === 'products' || page.pageType === 'healthcare') {
        categories['Core Business'].push(page);
      } else if (page.pageType === 'about' || page.pageType === 'news' || page.pageType === 'careers') {
        categories['Information'].push(page);
      } else if (page.pageType === 'support' || page.pageType === 'contact' || page.pageType === 'locations') {
        categories['Support'].push(page);
      } else {
        categories['Legal & Compliance'].push(page);
      }
    });
    
    return categories;
  }
}
