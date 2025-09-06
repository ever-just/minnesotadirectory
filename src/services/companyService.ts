import { Company, IndustryOption } from '../lib/types';

interface CompanyFilters {
  industry?: string;
  search?: string;
  page?: number;
  limit?: number;
  loadType?: 'paginated' | 'smart-chunk' | 'all';
}

interface APIResponse {
  companies: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    isSmartChunk?: boolean;
    industriesCovered?: number;
  };
  filters: {
    industry: string;
    search: string;
  };
}

interface IndustryWithCount extends IndustryOption {
  count?: number;
}

export class CompanyService {
  private static readonly API_BASE = '/.netlify/functions';
  
  /**
   * Fetch companies with filters and pagination
   */
  static async fetchCompanies(filters: CompanyFilters = {}): Promise<APIResponse> {
    const params = new URLSearchParams();
    
    if (filters.industry && filters.industry !== 'All Industries') {
      params.append('industry', filters.industry);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.loadType) {
      params.append('loadType', filters.loadType);
    }

    // Use real database API (get-companies endpoint)
    let url = `${this.API_BASE}/get-companies?${params}`;
    console.log(`🌐 API Request (Real Database): ${url}`);
    
    try {
      let response;
      try {
        response = await fetch(url);
        if (!response.ok) throw new Error('Database API failed');
      } catch (databaseError) {
        console.log('🔄 Real database API failed, trying fallback...');
        url = `${this.API_BASE}/companies-api-local?${params}`;
        console.log(`🌐 API Request (Local Mock): ${url}`);
        response = await fetch(url);
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📊 API Response: ${data.companies?.length} companies loaded`);
      
      // Normalize response format for get-companies endpoint
      if (!data.pagination && data.total) {
        console.log(`🔧 COMPANY SERVICE: Normalizing response - total=${data.total}, returned=${data.returned}`);
        
        return {
          companies: data.companies || [],
          total: data.total,  // ✅ Pass through the real total
          hasMore: data.total > (data.returned || data.companies?.length || 0),
          pagination: {
            page: parseInt(filters.page || '1'),
            limit: parseInt(filters.limit || '50'),
            total: data.total || 0,
            totalPages: Math.ceil((data.total || 0) / parseInt(filters.limit || '50'))
          },
          filters: {
            industry: filters.industry || 'All Industries',
            search: filters.search || ''
          }
        };
      }
      
      // If data already has the right structure, ensure it has total and hasMore
      if (data.total) {
        data.hasMore = data.total > (data.returned || data.companies?.length || 0);
        console.log(`🔧 COMPANY SERVICE: Enhanced response - total=${data.total}, hasMore=${data.hasMore}`);
      }
      
      return data;
    } catch (error) {
      console.error('CompanyService.fetchCompanies error:', error);
      throw error;
    }
  }
  
  /**
   * Fetch all companies in large batches (replaces CSV loading)
   */
  static async fetchAllCompanies(): Promise<Company[]> {
    console.log('🚀 Loading all companies from database API...');
    
    try {
      const allCompanies: Company[] = [];
      let page = 1;
      const limit = 1000; // Large batches for initial load
      
      while (true) {
        const response = await this.fetchCompanies({ page, limit });
        
        if (response.companies && response.companies.length > 0) {
          allCompanies.push(...response.companies);
          console.log(`📦 Loaded batch ${page}: ${response.companies.length} companies (${allCompanies.length} total)`);
        }
        
        // Break if we got fewer companies than requested (last page)
        if (!response.companies || response.companies.length < limit) {
          break;
        }
        
        page++;
        
        // Safety break to prevent infinite loops
        if (page > 10) {
          console.warn('⚠️ Breaking after 10 pages to prevent infinite loop');
          break;
        }
      }
      
      console.log(`✅ All companies loaded: ${allCompanies.length} total`);
      return allCompanies;
      
    } catch (error) {
      console.error('Failed to fetch all companies:', error);
      throw error;
    }
  }
  
  /**
   * Extract unique industries from API response (for filter dropdown)
   */
  static async fetchIndustries(): Promise<IndustryOption[]> {
    try {
      console.log('🏭 Loading industries from database...');
      
      // Get a large sample to extract all unique industries
      const response = await this.fetchCompanies({ limit: 5000 });
      
      if (!response.companies) {
        throw new Error('No companies data received from API');
      }
      
      const uniqueIndustries = [...new Set(
        response.companies
          .map(c => c.industry)
          .filter(Boolean) // Remove null/undefined/empty values
      )].sort();
      
      const industryOptions = uniqueIndustries.map(industry => ({
        value: industry,
        label: industry
      }));
      
      console.log(`✅ Industries loaded: ${industryOptions.length} unique industries`);
      return industryOptions;
      
    } catch (error) {
      console.error('Failed to fetch industries:', error);
      throw error;
    }
  }
  
  /**
   * Fetch industries with company counts (for enhanced filtering)
   */
  static async fetchIndustriesWithCounts(): Promise<IndustryWithCount[]> {
    try {
      // This would require a specialized endpoint, for now use basic method
      const industries = await this.fetchIndustries();
      return industries.map(industry => ({
        ...industry,
        label: industry.label // Could enhance with counts later
      }));
    } catch (error) {
      console.error('Failed to fetch industries with counts:', error);
      throw error;
    }
  }
  
  /**
   * Test API connectivity
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connection...');
      const response = await this.fetchCompanies({ limit: 1 });
      const isConnected = response.companies && response.companies.length > 0;
      console.log(isConnected ? '✅ API connection successful' : '❌ API connection failed');
      return isConnected;
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  }
}

// Export types for use in other files
export type { CompanyFilters, APIResponse, IndustryWithCount };
