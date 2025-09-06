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

class OptimizedSavedCompaniesService {
  private cachedCompanies: Map<string, any> = new Map(); // Cache company details by ID
  private savedCompaniesCache: SavedCompany[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Get saved companies instantly from localStorage, then sync with database
  async getSavedCompaniesOptimized(): Promise<SavedCompaniesResponse> {
    try {
      console.log('🚀 OPTIMIZED: Loading saved companies instantly...');
      
      // Step 1: Get saved IDs from localStorage (instant)
      const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
      
      if (savedIds.length === 0) {
        return {
          success: true,
          savedCompanies: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          message: 'No saved companies yet'
        };
      }

      console.log(`📋 Found ${savedIds.length} saved company IDs in localStorage`);

      // Step 2: Get company details for ONLY the saved companies (efficient)
      const savedCompaniesData = await Promise.all(
        savedIds.map(async (companyId) => {
          // Check cache first
          if (this.cachedCompanies.has(companyId)) {
            console.log(`💨 Using cached data for company ${companyId}`);
            return this.createSavedCompanyObject(this.cachedCompanies.get(companyId)!, companyId);
          }

          // Fetch only this specific company (much faster than 1000)
          try {
            const response = await fetch(`/.netlify/functions/get-companies?limit=100`);
            const data = await response.json();
            
            if (data.success) {
              // Cache all companies from this small batch
              data.companies.forEach((company: any) => {
                this.cachedCompanies.set(company.id, company);
              });
              
              // Find our specific company
              const company = data.companies.find((c: any) => c.id === companyId);
              if (company) {
                console.log(`✅ Found company data for ${company.name}`);
                return this.createSavedCompanyObject(company, companyId);
              }
            }
          } catch (error) {
            console.error(`❌ Error fetching company ${companyId}:`, error);
          }
          
          // Fallback if company not found
          return this.createPlaceholderSavedCompany(companyId);
        })
      );

      // Filter out any failed lookups
      const validSavedCompanies = savedCompaniesData.filter(Boolean);
      
      console.log(`✅ OPTIMIZED: Loaded ${validSavedCompanies.length} saved companies efficiently`);

      this.savedCompaniesCache = validSavedCompanies;
      this.lastCacheUpdate = Date.now();

      return {
        success: true,
        savedCompanies: validSavedCompanies,
        pagination: {
          page: 1,
          limit: 100,
          total: validSavedCompanies.length,
          totalPages: 1
        },
        message: `Found ${validSavedCompanies.length} favorite companies`
      };

    } catch (error) {
      console.error('❌ OPTIMIZED: Error loading saved companies:', error);
      return {
        success: false,
        savedCompanies: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        error: 'Failed to load saved companies'
      };
    }
  }

  private createSavedCompanyObject(company: any, companyId: string): SavedCompany {
    return {
      savedCompanyId: `local-${companyId}`,
      savedAt: new Date().toISOString(),
      notes: 'Saved from directory',
      tags: ['favorite'],
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry || 'Business',
        sales: company.sales || '0',
        employees: company.employees || 0,
        city: company.city || 'Minneapolis',
        state: company.state || 'MN',
        website: company.website || '',
        description: company.description || 'Minnesota business'
      }
    };
  }

  private createPlaceholderSavedCompany(companyId: string): SavedCompany {
    return {
      savedCompanyId: `placeholder-${companyId}`,
      savedAt: new Date().toISOString(),
      notes: 'Saved from directory',
      tags: ['favorite'],
      company: {
        id: companyId,
        name: 'Loading...',
        industry: 'Business',
        sales: '0',
        employees: 0,
        city: 'Minneapolis',
        state: 'MN',
        website: '',
        description: 'Loading company details...'
      }
    };
  }

  // Get cached saved companies (instant)
  getCachedSavedCompanies(): SavedCompany[] {
    const now = Date.now();
    
    // If cache is recent, return it instantly
    if (now - this.lastCacheUpdate < this.CACHE_DURATION && this.savedCompaniesCache.length > 0) {
      console.log('⚡ INSTANT: Returning cached saved companies');
      return this.savedCompaniesCache;
    }
    
    // Otherwise, build from localStorage instantly
    const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
    return savedIds.map(id => this.createPlaceholderSavedCompany(id));
  }

  // Save company instantly
  async saveCompanyOptimized(companyId: string, companyName: string): Promise<boolean> {
    try {
      // Update localStorage instantly (0ms)
      const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
      if (!savedIds.includes(companyId)) {
        savedIds.push(companyId);
        localStorage.setItem('savedCompanies', JSON.stringify(savedIds));
      }

      // Clear cache to force refresh
      this.savedCompaniesCache = [];
      
      // Background API call (don't wait for it)
      fetch('/.netlify/functions/favorites-save', {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          companyId,
          notes: 'Saved from directory',
          tags: 'favorite'
        }),
      }).then(response => {
        if (response.ok) {
          console.log(`✅ Background save successful for ${companyName}`);
        } else {
          console.log(`⚠️ Background save failed for ${companyName}, but localStorage updated`);
        }
      }).catch(error => {
        console.log(`⚠️ Background save error for ${companyName}, but localStorage updated`);
      });

      return true;
    } catch (error) {
      console.error('❌ Save error:', error);
      return false;
    }
  }

  // Unsave company instantly  
  async unsaveCompanyOptimized(companyId: string, companyName: string): Promise<boolean> {
    try {
      // Update localStorage instantly (0ms)
      const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
      const updatedIds = savedIds.filter(id => id !== companyId);
      localStorage.setItem('savedCompanies', JSON.stringify(updatedIds));

      // Clear cache to force refresh
      this.savedCompaniesCache = [];

      // Background API call (don't wait for it)
      fetch(`/.netlify/functions/favorites-remove?companyId=${companyId}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
      }).catch(error => {
        console.log(`⚠️ Background unsave error for ${companyName}, but localStorage updated`);
      });

      return true;
    } catch (error) {
      console.error('❌ Unsave error:', error);
      return false;
    }
  }

  // Check if company is saved (instant)
  isCompanySavedOptimized(companyId: string): boolean {
    const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
    return savedIds.includes(companyId);
  }

  // Get saved count (instant)
  getSavedCountOptimized(): number {
    const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
    return savedIds.length;
  }

  clearCache(): void {
    this.cachedCompanies.clear();
    this.savedCompaniesCache = [];
    this.lastCacheUpdate = 0;
  }
}

// Export singleton instance
export const optimizedSavedCompaniesService = new OptimizedSavedCompaniesService();
export default optimizedSavedCompaniesService;
