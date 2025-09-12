/**
 * Real Pages Service - Uses actual extracted database pages
 * This replaces the simulator with REAL company-specific sitemap data
 */

// Lazy load the large JSON data to reduce bundle size
let realPagesData: any = null;

async function loadRealPagesData(domain?: string) {
  if (domain) {
    // Fetch specific domain data
    const response = await fetch(`/.netlify/functions/get-real-pages?domain=${encodeURIComponent(domain)}`);
    const data = await response.json();
    return data;
  }
  
  if (!realPagesData) {
    // This shouldn't be called without a domain anymore
    throw new Error('Domain parameter is required');
  }
  return realPagesData;
}

interface RealPage {
  id: string;
  url: string;
  title: string;
  priority: number;
  changeFreq: string;
  lastModified?: string;
  importanceScore: number;
  category: string;
  rankingFactors?: any;
}

interface RealCompanyInfo {
  domain: string;
  totalPages: number;
  lastAnalyzed: string;
}

interface RealPagesResponse {
  success: boolean;
  pages: RealPage[];
  company: {
    name: string;
    domain: string;
    totalPages: number;
    lastAnalyzed?: string;
  };
  message?: string;
}

export class RealPagesService {
  
  /**
   * Get real top pages for a company from actual database extract
   */
  static async getRealTopPages(companyName: string, domain: string): Promise<RealPagesResponse> {
    console.log(`🎯 Loading REAL pages for ${companyName} (${domain}) from database extract...`);
    
    try {
      // Load the data dynamically for this specific domain
      const data = await loadRealPagesData(domain);
      
      // Look up the domain in our real data
      const domainData = data[domain];
      
      if (!domainData || !domainData.pages || domainData.pages.length === 0) {
        console.log(`❌ No real pages found for ${domain} in database`);
        return {
          success: false,
          message: `No real sitemap data found for ${domain}`,
          pages: [],
          company: { name: companyName, domain, totalPages: 0 }
        };
      }
      
      console.log(`✅ Found ${domainData.pages.length} REAL pages for ${domain}`);
      
      // Return the actual pages from the database
      const realPages: RealPage[] = domainData.pages.map((page: any) => ({
        id: page.id,
        url: page.url,
        title: page.title,
        priority: parseFloat(page.priority) || 1.0,
        changeFreq: page.changeFreq || 'monthly',
        lastModified: page.lastModified,
        importanceScore: parseInt(page.importanceScore) || 50,
        category: page.category || 'general',
        rankingFactors: page.rankingFactors
      }));
      
      // Sort by importance score (highest first)
      realPages.sort((a, b) => b.importanceScore - a.importanceScore);
      
      console.log(`🏆 Top real page for ${domain}: "${realPages[0].title}" (Score: ${realPages[0].importanceScore})`);
      console.log(`📊 Real URLs for ${domain}:`);
      realPages.slice(0, 3).forEach(p => console.log(`   • ${p.url}`));
      
      return {
        success: true,
        pages: realPages,
        company: {
          name: companyName,
          domain: domainData.company.domain,
          totalPages: domainData.company.totalPages || realPages.length,
          lastAnalyzed: domainData.company.lastAnalyzed
        }
      };
      
    } catch (error) {
      console.error(`❌ Error loading real pages for ${domain}:`, error);
      return {
        success: false,
        message: `Error loading real pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pages: [],
        company: { name: companyName, domain, totalPages: 0 }
      };
    }
  }
  
  /**
   * Check if a domain has real data available
   */
  static async hasRealData(domain: string): Promise<boolean> {
    try {
      const data = await loadRealPagesData(domain);
      return !!(data[domain]?.pages?.length);
    } catch {
      return false;
    }
  }
  
  /**
   * Get list of all domains with real data
   */
  static async getDomainsWithData(): Promise<string[]> {
    try {
      const response = await fetch('/.netlify/functions/get-real-pages');
      const data = await response.json();
      return data.availableDomains || [];
    } catch {
      return [];
    }
  }
  
  /**
   * Get stats about the real data
   */
  static async getDataStats(): Promise<{ totalDomains: number; totalPages: number; avgPagesPerDomain: number }> {
    try {
      const response = await fetch('/.netlify/functions/get-real-pages');
      const data = await response.json();
      return {
        totalDomains: data.totalDomains || 0,
        totalPages: 0, // Would need to iterate through all domains
        avgPagesPerDomain: 0
      };
    } catch {
      return {
        totalDomains: 0,
        totalPages: 0,
        avgPagesPerDomain: 0
      };
    }
  }
}
