/**
 * Real Pages Service - Uses actual extracted database pages
 * This replaces the simulator with REAL company-specific sitemap data
 */

import realPagesData from '../data/real-pages-lookup.json';

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
      // Look up the domain in our real data
      const domainData = (realPagesData as any)[domain];
      
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
  static hasRealData(domain: string): boolean {
    return !!(realPagesData as any)[domain]?.pages?.length;
  }
  
  /**
   * Get list of all domains with real data
   */
  static getDomainsWithData(): string[] {
    return Object.keys(realPagesData);
  }
  
  /**
   * Get stats about the real data
   */
  static getDataStats(): { totalDomains: number; totalPages: number; avgPagesPerDomain: number } {
    const domains = Object.keys(realPagesData);
    const totalPages = domains.reduce((sum, domain) => {
      return sum + ((realPagesData as any)[domain]?.pages?.length || 0);
    }, 0);
    
    return {
      totalDomains: domains.length,
      totalPages,
      avgPagesPerDomain: Math.round(totalPages / domains.length)
    };
  }
}
