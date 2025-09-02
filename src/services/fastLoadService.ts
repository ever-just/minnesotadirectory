import { Company, IndustryOption } from '../lib/types';
import { CompanyService } from './companyService';

interface FastLoadResult {
  companies: Company[];
  hasMore: boolean;
  total: number;
  loadTime: number;
}

interface FastIndustriesResult {
  industries: IndustryOption[];
  loadTime: number;
}

export class FastLoadService {
  /**
   * Get first 500 companies immediately (optimized for speed)
   * This replaces the slow "load all companies" approach
   */
  static async getInitialCompanies(): Promise<FastLoadResult> {
    const startTime = Date.now();
    
    try {
      console.log('⚡ Fast loading first 500 companies...');
      
      const response = await CompanyService.fetchCompanies({ 
        page: 1, 
        limit: 500
      });
      
      if (!response.companies) {
        throw new Error('No companies data received from fast load API');
      }
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Fast load complete: ${response.companies.length} companies in ${loadTime}ms`);
      
      return {
        companies: response.companies,
        hasMore: response.pagination.total > 500,
        total: response.pagination.total,
        loadTime: loadTime
      };
      
    } catch (error) {
      console.error('Fast load failed:', error);
      throw error;
    }
  }
  
  /**
   * Get industries quickly from a smaller dataset (faster than 5000 companies)
   */
  static async getInitialIndustries(): Promise<FastIndustriesResult> {
    const startTime = Date.now();
    
    try {
      console.log('🏭 Fast loading industries...');
      
      // Get industries from first 1000 companies only (much faster)
      const response = await CompanyService.fetchCompanies({ limit: 1000 });
      
      if (!response.companies) {
        throw new Error('No companies data received for industries');
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
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Fast industries loaded: ${industryOptions.length} industries in ${loadTime}ms`);
      
      return {
        industries: industryOptions,
        loadTime: loadTime
      };
      
    } catch (error) {
      console.error('Fast industry load failed:', error);
      throw error;
    }
  }
  
  /**
   * Load remaining companies in background (after user sees initial results)
   */
  static async loadRemainingCompanies(
    currentCompanies: Company[], 
    totalCount: number,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Company[]> {
    try {
      console.log('🔄 Loading remaining companies in background...');
      
      const remainingCompanies: Company[] = [...currentCompanies];
      let page = 2; // Start from page 2 (page 1 already loaded)
      const limit = 1000;
      
      while (remainingCompanies.length < totalCount) {
        const response = await CompanyService.fetchCompanies({ page, limit });
        
        if (response.companies && response.companies.length > 0) {
          remainingCompanies.push(...response.companies);
          
          // Report progress
          onProgress?.(remainingCompanies.length, totalCount);
          console.log(`📦 Background loaded: ${remainingCompanies.length}/${totalCount} companies`);
        }
        
        if (!response.companies || response.companies.length < limit) break;
        page++;
        
        // Add small delay to prevent blocking UI
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`✅ Background loading complete: ${remainingCompanies.length} total companies`);
      return remainingCompanies;
      
    } catch (error) {
      console.warn('Background loading failed:', error);
      // Return what we have - non-critical failure
      return currentCompanies;
    }
  }
  
  /**
   * Test fast loading performance
   */
  static async testFastLoad(): Promise<{
    success: boolean;
    loadTime: number;
    companiesLoaded: number;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await this.getInitialCompanies();
      const loadTime = Date.now() - startTime;
      
      return {
        success: true,
        loadTime: loadTime,
        companiesLoaded: result.companies.length
      };
    } catch (error) {
      return {
        success: false,
        loadTime: Date.now() - startTime,
        companiesLoaded: 0
      };
    }
  }
}

// Export types
export type { FastLoadResult, FastIndustriesResult };
