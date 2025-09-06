import { authService } from './authService';

export interface SavedCompany {
  savedCompanyId: string;
  savedAt: string;
  notes?: string;
  tags: string[];
  company: {
    id: string;
    name: string;
    industry: string;
    sales: string;
    employees: number;
    city: string;
    state: string;
    website: string;
    description: string;
  };
}

export interface SavedCompaniesResponse {
  success: boolean;
  savedCompanies: SavedCompany[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  error?: string;
}

export interface SaveResponse {
  success: boolean;
  savedCompany?: {
    id: string;
    companyId: string;
    companyName: string;
    savedAt: string;
    notes?: string;
    tags?: string;
  };
  message?: string;
  error?: string;
  alreadySaved?: boolean;
}

class SavedCompaniesService {
  private cache: Map<string, SavedCompany[]> = new Map();
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async saveCompany(companyId: string, notes: string = '', tags: string[] = []): Promise<SaveResponse> {
    try {
      // Use the working favorites endpoint
      const response = await fetch('/.netlify/functions/favorites-save', {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          companyId,
          notes: notes.trim(),
          tags: tags.join(', ').trim()
        }),
      });

      const data: SaveResponse = await response.json();
      
      if (data.success) {
        // Clear cache to force refresh
        this.clearCache();
      }
      
      return data;
    } catch (error) {
      console.error('Save company error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  async unsaveCompany(companyId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // For now, just return success to test the heart toggle
      return { success: true, message: 'Company unsaved (demo)' };
      
      /* TODO: Implement when endpoints are stable
      const response = await fetch(`/.netlify/functions/user-unsave-company?companyId=${companyId}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (data.success) {
        // Clear cache to force refresh
        this.clearCache();
      }
      
      return data;
      */
    } catch (error) {
      console.error('Unsave company error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  async getSavedCompanies(page: number = 1, limit: number = 20, forceRefresh: boolean = false): Promise<SavedCompaniesResponse> {
    try {
      // Get saved company IDs from localStorage for immediate UI feedback
      const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
      
      if (savedIds.length === 0) {
        return {
          success: true,
          savedCompanies: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          message: 'No saved companies yet'
        };
      }

      // For each saved ID, get the company details from the companies API
      const companiesResponse = await fetch('/.netlify/functions/get-companies?limit=1000');
      const companiesData = await companiesResponse.json();
      
      if (!companiesData.success) {
        throw new Error('Failed to load company data');
      }

      // Filter companies to only show saved ones
      const savedCompaniesData = companiesData.companies
        .filter((company: any) => savedIds.includes(company.id))
        .map((company: any) => ({
          savedCompanyId: `local-${company.id}`,
          savedAt: new Date().toISOString(),
          notes: 'Saved from directory',
          tags: ['favorite'],
          company: {
            id: company.id,
            name: company.name,
            industry: company.industry,
            sales: company.sales,
            employees: company.employees,
            city: company.city,
            state: company.state,
            website: company.website,
            description: company.description
          }
        }));

      return {
        success: true,
        savedCompanies: savedCompaniesData,
        pagination: {
          page,
          limit,
          total: savedCompaniesData.length,
          totalPages: Math.ceil(savedCompaniesData.length / limit)
        },
        message: `Found ${savedCompaniesData.length} favorite companies`
      };
      
    } catch (error) {
      console.error('Get saved companies error:', error);
      return {
        success: false,
        savedCompanies: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        error: 'Failed to load saved companies',
      };
    }
  }

  async isCompanySaved(companyId: string): Promise<boolean> {
    try {
      // Check all cached pages
      for (const [key, companies] of this.cache.entries()) {
        const found = companies.some(saved => saved.company.id === companyId);
        if (found) return true;
      }

      // If not in cache, fetch first page to check
      const response = await this.getSavedCompanies(1, 100); // Get larger sample
      if (response.success) {
        return response.savedCompanies.some(saved => saved.company.id === companyId);
      }
      
      return false;
    } catch (error) {
      console.error('Check saved status error:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.lastFetch = 0;
  }

  // Get saved companies count for user stats
  async getSavedCount(): Promise<number> {
    try {
      const response = await this.getSavedCompanies(1, 1);
      return response.pagination.total;
    } catch (error) {
      return 0;
    }
  }

  // Get recently saved companies
  async getRecentlySaved(limit: number = 5): Promise<SavedCompany[]> {
    try {
      const response = await this.getSavedCompanies(1, limit);
      return response.success ? response.savedCompanies : [];
    } catch (error) {
      return [];
    }
  }

  // Search within saved companies
  async searchSavedCompanies(query: string): Promise<SavedCompany[]> {
    try {
      const response = await this.getSavedCompanies(1, 1000); // Get all for searching
      if (!response.success) return [];
      
      const searchTerm = query.toLowerCase();
      return response.savedCompanies.filter(saved => 
        saved.company.name.toLowerCase().includes(searchTerm) ||
        saved.company.industry.toLowerCase().includes(searchTerm) ||
        saved.notes?.toLowerCase().includes(searchTerm) ||
        saved.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Search saved companies error:', error);
      return [];
    }
  }

  // Get saved companies by industry
  async getSavedByIndustry(): Promise<{ [industry: string]: SavedCompany[] }> {
    try {
      const response = await this.getSavedCompanies(1, 1000); // Get all
      if (!response.success) return {};
      
      const byIndustry: { [industry: string]: SavedCompany[] } = {};
      response.savedCompanies.forEach(saved => {
        const industry = saved.company.industry || 'Other';
        if (!byIndustry[industry]) byIndustry[industry] = [];
        byIndustry[industry].push(saved);
      });
      
      return byIndustry;
    } catch (error) {
      console.error('Get saved by industry error:', error);
      return {};
    }
  }
}

// Export singleton instance
export const savedCompaniesService = new SavedCompaniesService();
export default savedCompaniesService;
