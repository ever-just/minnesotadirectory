import { 
  LogoSource, 
  LogoMetadata, 
  LogoCacheEntry, 
  LogoServiceOptions,
  CompanyLogo,
  LogoApiResponse,
  BatchLogoResponse,
  Company
} from '../lib/types';

/**
 * Database-driven Logo Service
 * 
 * This service fetches logos from the database instead of external APIs.
 * It maintains the same interface as the original LogoService for compatibility,
 * but uses the new database endpoints for much faster and more reliable logo loading.
 */
export class DatabaseLogoService {
  private cache: Map<string, LogoCacheEntry> = new Map();
  private defaultOptions: LogoServiceOptions = {
    enableCache: true,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxRetries: 2,
    timeout: 5000, // Longer timeout for database calls
    preferredFormats: ['svg', 'png', 'webp'],
    minQuality: 10, // Lower minimum since we have high-quality database logos
    enableBatch: true
  };
  
  private readonly BATCH_SIZE = 50; // Increased since database is faster
  private readonly API_BASE_URL = '/.netlify/functions';

  constructor(options: Partial<LogoServiceOptions> = {}) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    this.loadCacheFromStorage();
  }

  // Main entry point - Get company logo from database
  async getCompanyLogo(
    domain: string | null, 
    companyName: string, 
    fastFirst: boolean = true,
    companyId?: string
  ): Promise<LogoMetadata> {
    if (!companyId && !domain) {
      console.log(`🔧 Database Logo Service: No company ID or domain for ${companyName}, generating placeholder`);
      return this.generateFallbackMetadata(companyName, 'No company ID or domain available');
    }
    
    console.log(`🔧 Database Logo Service: Fetching logo for ${companyName} (ID: ${companyId}, domain: ${domain})`);

    const cacheKey = this.getCacheKey(companyId || domain || companyName, companyName);
    
    // IMMEDIATE cache check - return instantly if cached
    if (this.defaultOptions.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`🎯 Cache hit for ${companyName}`);
        return cached;
      }
    }

    try {
      let logoResponse: LogoApiResponse | null = null;

      // Try database first if we have company ID
      if (companyId) {
        logoResponse = await this.fetchLogoFromDatabase(companyId);
      }
      
      // If no logo in database, fallback to external APIs (migration period)
      if (!logoResponse?.success || !logoResponse.logo) {
        console.log(`📡 No database logo for ${companyName}, checking external APIs...`);
        return await this.fallbackToExternalAPIs(domain, companyName);
      }

      const logo = logoResponse.logo;
      
      // Convert database logo to LogoMetadata format
      const metadata = this.convertDatabaseLogoToMetadata(logo, companyName);
      
      // Cache the result for next time
      if (this.defaultOptions.enableCache) {
        this.saveToCache(cacheKey, metadata);
      }

      console.log(`✅ Database logo loaded for ${companyName}: ${logo.source} (${logo.qualityScore}/100)`);
      return metadata;

    } catch (error) {
      console.warn(`Database logo fetch failed for ${companyName}:`, error);
      
      // Fallback to external APIs on error
      if (domain) {
        return await this.fallbackToExternalAPIs(domain, companyName);
      } else {
        return this.generateFallbackMetadata(companyName, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  // Batch processing for multiple companies - much faster with database
  async batchGetLogos(
    companies: Array<{ 
      id?: string;
      domain: string | null; 
      name: string;
    }>
  ): Promise<LogoMetadata[]> {
    console.log(`🔧 Database Logo Service: Batch fetching ${companies.length} logos`);
    
    const startTime = Date.now();
    
    try {
      // Separate companies with IDs from those without
      const companiesWithIds = companies.filter(c => c.id);
      const companiesWithoutIds = companies.filter(c => !c.id);
      
      const results: LogoMetadata[] = [];
      
      // Batch fetch for companies with IDs
      if (companiesWithIds.length > 0) {
        const batchResponse = await this.batchFetchFromDatabase(companiesWithIds);
        
        companies.forEach(company => {
          if (company.id && batchResponse.logos[company.id]) {
            const logo = batchResponse.logos[company.id];
            const metadata = this.convertDatabaseLogoToMetadata(logo, company.name);
            
            // Cache individual results
            if (this.defaultOptions.enableCache) {
              const cacheKey = this.getCacheKey(company.id, company.name);
              this.saveToCache(cacheKey, metadata);
            }
            
            results.push(metadata);
          } else if (company.id && batchResponse.errors[company.id]) {
            // Logo not found in database, fallback to external or placeholder
            if (company.domain) {
              results.push(this.generateFallbackMetadata(company.name, 'Not in database, will load externally'));
            } else {
              results.push(this.generateFallbackMetadata(company.name, 'No logo available'));
            }
          }
        });
      }
      
      // Handle companies without IDs (fallback to external APIs)
      companiesWithoutIds.forEach(company => {
        results.push(this.generateFallbackMetadata(company.name, 'No company ID available'));
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Batch logo fetch completed: ${results.length} logos in ${loadTime}ms`);
      
      return results;
      
    } catch (error) {
      console.error('Batch database logo fetch failed:', error);
      
      // Fallback to individual fetching
      return await this.fallbackBatchProcessing(companies);
    }
  }

  // Enhanced method that works with Company objects
  async getCompanyLogoById(company: Company): Promise<LogoMetadata> {
    return await this.getCompanyLogo(
      company.domain || null,
      company.name,
      true,
      company.id
    );
  }

  // Batch processing with Company objects
  async batchGetLogosForCompanies(companies: Company[]): Promise<LogoMetadata[]> {
    return await this.batchGetLogos(companies.map(c => ({
      id: c.id,
      domain: c.domain || null,
      name: c.name
    })));
  }

  // Private methods

  private async fetchLogoFromDatabase(companyId: string): Promise<LogoApiResponse | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/company-logo/${companyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.defaultOptions.timeout)
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Logo not found in database' };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`Database logo fetch failed for company ${companyId}:`, error);
      return null;
    }
  }

  private async batchFetchFromDatabase(
    companies: Array<{ id?: string; name: string }>
  ): Promise<BatchLogoResponse> {
    try {
      const companyIds = companies.map(c => c.id).filter(Boolean) as string[];
      
      const response = await fetch(`${this.API_BASE_URL}/company-logos-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyIds,
          options: {
            size: 'medium',
            quality: this.defaultOptions.minQuality,
            includeMetadata: false
          }
        }),
        signal: AbortSignal.timeout(this.defaultOptions.timeout * 2) // Longer timeout for batch
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Batch database fetch failed:', error);
      throw error;
    }
  }

  private convertDatabaseLogoToMetadata(logo: CompanyLogo, companyName: string): LogoMetadata {
    const logoSource: LogoSource = {
      name: 'database',
      url: logo.logoUrl || `data:${logo.contentType};base64,${logo.logoData}`,
      priority: 100, // Highest priority for database logos
      quality: logo.qualityScore,
      format: this.mapFileExtensionToFormat(logo.fileExtension),
      lastTested: logo.updatedAt,
      size: logo.width && logo.height ? {
        width: logo.width,
        height: logo.height
      } : undefined,
      responseTime: 0 // Instant from database
    };

    // Add fallback source for reliability
    const fallbackSource: LogoSource = {
      name: 'generated',
      url: this.generatePlaceholderDataUrl(companyName),
      priority: 10,
      quality: 30,
      format: 'svg',
      lastTested: new Date().toISOString()
    };

    return {
      sources: [logoSource, fallbackSource],
      bestSource: logoSource,
      fallbackSource: fallbackSource,
      qualityScore: logo.qualityScore,
      lastUpdated: logo.updatedAt,
      cacheExpiry: new Date(Date.now() + this.defaultOptions.cacheTTL).toISOString(),
      fetchAttempts: 1,
      errors: []
    };
  }

  private mapFileExtensionToFormat(extension: string): LogoSource['format'] {
    const formatMap: { [key: string]: LogoSource['format'] } = {
      'svg': 'svg',
      'png': 'png',
      'jpg': 'jpg',
      'jpeg': 'jpg',
      'webp': 'webp',
      'ico': 'ico'
    };
    return formatMap[extension.toLowerCase()] || 'unknown';
  }

  // Fallback to external APIs (for migration period)
  private async fallbackToExternalAPIs(domain: string | null, companyName: string): Promise<LogoMetadata> {
    if (!domain) {
      return this.generateFallbackMetadata(companyName, 'No domain available for external API fallback');
    }

    console.log(`🔄 Falling back to external APIs for ${companyName}`);
    
    // Import the original LogoService for fallback
    const { LogoService } = await import('./LogoService');
    const externalService = new LogoService(this.defaultOptions);
    
    return await externalService.getCompanyLogo(domain, companyName, true);
  }

  private async fallbackBatchProcessing(
    companies: Array<{ id?: string; domain: string | null; name: string }>
  ): Promise<LogoMetadata[]> {
    console.log(`🔄 Falling back to individual processing for ${companies.length} companies`);
    
    const promises = companies.map(company => 
      this.getCompanyLogo(company.domain, company.name, true, company.id)
    );
    
    // Process in chunks to avoid overwhelming the system
    const results: LogoMetadata[] = [];
    for (let i = 0; i < promises.length; i += this.BATCH_SIZE) {
      const chunk = promises.slice(i, i + this.BATCH_SIZE);
      const chunkResults = await Promise.allSettled(chunk);
      
      results.push(...chunkResults.map(result => 
        result.status === 'fulfilled' 
          ? result.value 
          : this.generateFallbackMetadata('Unknown', 'Batch processing failed')
      ));
    }
    
    return results;
  }

  // Generate SVG placeholder as data URL (same as original)
  private generatePlaceholderDataUrl(companyName: string): string {
    const initial = companyName.charAt(0).toUpperCase();
    const colors = [
      '#667eea,#764ba2', '#f093fb,#f5576c', '#4facfe,#00f2fe',
      '#43e97b,#38f9d7', '#ffecd2,#fcb69f', '#a8edea,#fed6e3'
    ];
    
    const colorIndex = companyName.charCodeAt(0) % colors.length;
    const [color1, color2] = colors[colorIndex].split(',');
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grad)" rx="15"/>
        <text x="50" y="65" font-family="Arial, sans-serif" font-size="45" font-weight="600" text-anchor="middle" fill="white">
          ${initial}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Generate fallback metadata for failed cases
  private generateFallbackMetadata(companyName: string, error: string): LogoMetadata {
    const fallbackSource: LogoSource = {
      name: 'generated',
      url: this.generatePlaceholderDataUrl(companyName),
      priority: 10,
      quality: 30,
      format: 'svg',
      lastTested: new Date().toISOString()
    };

    return {
      sources: [fallbackSource],
      bestSource: fallbackSource,
      fallbackSource: fallbackSource,
      qualityScore: 30,
      lastUpdated: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + this.defaultOptions.cacheTTL).toISOString(),
      fetchAttempts: 1,
      errors: [error]
    };
  }

  // Cache management (same as original)
  private getCacheKey(identifier: string, companyName: string): string {
    return `db_logo_${identifier}_${companyName.replace(/\s+/g, '_').toLowerCase()}`;
  }

  private getFromCache(key: string): LogoMetadata | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();

    return entry.metadata;
  }

  private saveToCache(key: string, metadata: LogoMetadata): void {
    this.cache.set(key, {
      metadata,
      timestamp: Date.now(),
      ttl: this.defaultOptions.cacheTTL,
      hits: 0,
      lastAccessed: Date.now()
    });

    // Persist to localStorage (with size limit)
    this.saveCacheToStorage();
  }

  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem('databaseLogoServiceCache');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value as LogoCacheEntry);
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load database logo cache from storage:', error);
      }
    }
  }

  private saveCacheToStorage(): void {
    try {
      // Limit cache size to prevent localStorage overflow
      const MAX_CACHE_ENTRIES = 2000; // Increased since database logos are more valuable to cache
      if (this.cache.size > MAX_CACHE_ENTRIES) {
        // Remove oldest entries
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
        toRemove.forEach(([key]) => this.cache.delete(key));
      }

      const cacheData = Object.fromEntries(this.cache.entries());
      localStorage.setItem('databaseLogoServiceCache', JSON.stringify(cacheData));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save database logo cache to storage:', error);
      }
    }
  }

  // Public cache management methods
  public clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('databaseLogoServiceCache');
  }

  public getCacheStats(): { size: number; hits: number; totalEntries: number } {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      hits: entries.reduce((sum, entry) => sum + entry.hits, 0),
      totalEntries: entries.length
    };
  }

  // Migration helper - check if logo exists in database
  public async hasLogoInDatabase(companyId: string): Promise<boolean> {
    try {
      const response = await this.fetchLogoFromDatabase(companyId);
      return response?.success && !!response.logo;
    } catch {
      return false;
    }
  }

  // Fallback to external APIs (for migration period)
  private async fallbackToExternalAPIs(domain: string | null, companyName: string): Promise<LogoMetadata> {
    if (!domain) {
      return this.generateFallbackMetadata(companyName, 'No domain available for external API fallback');
    }

    console.log(`🔄 Falling back to external APIs for ${companyName}`);
    
    // Import the original LogoService for fallback
    const { LogoService } = await import('./LogoService');
    const externalService = new LogoService(this.defaultOptions);
    
    return await externalService.getCompanyLogo(domain, companyName, true);
  }
}

// Export singleton instance
export const databaseLogoService = new DatabaseLogoService();
