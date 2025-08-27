import { 
  LogoSource, 
  LogoMetadata, 
  LogoCacheEntry, 
  LogoServiceOptions 
} from '../lib/types';

export class LogoService {
  private cache: Map<string, LogoCacheEntry> = new Map();
  private defaultOptions: LogoServiceOptions = {
    enableCache: true,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxRetries: 2, // Reduced from 3 to 2 for faster failure
    timeout: 2500, // Reduced from 5000ms to 2.5s for faster loading
    preferredFormats: ['svg', 'png', 'webp'],
    minQuality: 20,
    enableBatch: true
  };
  
  private readonly BATCH_SIZE = 50;

  constructor(options: Partial<LogoServiceOptions> = {}) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    this.loadCacheFromStorage();
  }

  // Main entry point - Get company logo with FAST-FIRST strategy
  async getCompanyLogo(domain: string | null, companyName: string, fastFirst: boolean = true): Promise<LogoMetadata> {
    if (!domain) {
      return this.generateFallbackMetadata(companyName, 'No domain available');
    }

    const cacheKey = this.getCacheKey(domain, companyName);
    
    // IMMEDIATE cache check - return instantly if cached
    if (this.defaultOptions.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Discover all logo sources
      const sources = await this.discoverLogoSources(domain, companyName);
      
      // Test sources with FAST-FIRST strategy (returns on first success)
      const scoredSources = await this.testAndScoreSources(sources, fastFirst);
      
      // Create metadata
      const metadata: LogoMetadata = {
        sources: scoredSources,
        bestSource: scoredSources[0] || undefined,
        fallbackSource: scoredSources.find(s => s.name === 'google') || scoredSources[1],
        qualityScore: scoredSources[0]?.quality || 0,
        lastUpdated: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + this.defaultOptions.cacheTTL).toISOString(),
        fetchAttempts: 1,
        errors: []
      };

      // Cache the result for next time
      if (this.defaultOptions.enableCache) {
        this.saveToCache(cacheKey, metadata);
      }

      return metadata;
    } catch (error) {
      console.warn(`Logo discovery failed for ${companyName}:`, error);
      return this.generateFallbackMetadata(companyName, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Batch processing for multiple companies
  async batchGetLogos(companies: Array<{ domain: string | null; name: string }>): Promise<LogoMetadata[]> {
    const promises = companies.map(company => 
      this.getCompanyLogo(company.domain, company.name)
    );
    
    // Process in chunks to avoid overwhelming the browser
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

  // Discover all possible logo sources for a domain
  private async discoverLogoSources(domain: string, companyName: string): Promise<LogoSource[]> {
    const sources: LogoSource[] = [];
    
    const currentTime = new Date().toISOString();
    
    // 1. Clearbit Logo API (highest quality)
    sources.push({
      name: 'clearbit',
      url: `https://logo.clearbit.com/${domain}`,
      priority: 100,
      quality: 0, // Will be tested
      format: 'png',
      lastTested: currentTime
    });

    // 2. Google Favicon Service (most reliable)
    sources.push({
      name: 'google',
      url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      priority: 80,
      quality: 0,
      format: 'png',
      lastTested: currentTime
    });

    // 3. Direct favicon discovery
    const faviconUrls = this.generateFaviconUrls(domain);
    faviconUrls.forEach((url, index) => {
      sources.push({
        name: 'direct',
        url,
        priority: 70 - index * 5,
        quality: 0,
        format: this.detectFormat(url),
        lastTested: currentTime
      });
    });

    // 4. Apple touch icon
    sources.push({
      name: 'apple-touch',
      url: `https://${domain}/apple-touch-icon.png`,
      priority: 60,
      quality: 0,
      format: 'png',
      lastTested: currentTime
    });

    // 5. Generated placeholder (always works)
    sources.push({
      name: 'generated',
      url: this.generatePlaceholderDataUrl(companyName),
      priority: 10,
      quality: 30, // Decent quality for placeholder
      format: 'svg',
      lastTested: currentTime
    });

    return sources;
  }

  // Test sources with FAST-FIRST strategy - return immediately when first good source found
  private async testAndScoreSources(sources: LogoSource[], fastFirst: boolean = true): Promise<LogoSource[]> {
    if (!fastFirst) {
      // Original behavior: test all sources
      const testPromises = sources.map(async (source) => {
        try {
          const startTime = Date.now();
          const result = await this.testLogoUrl(source.url);
          const responseTime = Date.now() - startTime;
          
          return {
            ...source,
            quality: this.calculateQualityScore(source, result, responseTime),
            responseTime,
            lastTested: new Date().toISOString(),
            size: result.size
          };
        } catch (error) {
          return {
            ...source,
            quality: source.name === 'generated' ? 30 : 0,
            lastTested: new Date().toISOString()
          };
        }
      });

      const results = await Promise.allSettled(testPromises);
      const validSources = results
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter((source): source is LogoSource => {
          return source !== null && 
                 typeof source.quality === 'number' && 
                 source.quality >= this.defaultOptions.minQuality;
        })
        .sort((a, b) => b.quality - a.quality);

      return validSources;
    }

    // FAST-FIRST: Test sources in priority order, return immediately when first succeeds
    const sortedSources = [...sources].sort((a, b) => b.priority - a.priority);
    const validSources: LogoSource[] = [];
    
    // Always include generated placeholder as guaranteed fallback
    const placeholder = sources.find(s => s.name === 'generated');
    if (placeholder) {
      validSources.push({
        ...placeholder,
        quality: 30,
        lastTested: new Date().toISOString()
      });
    }

    // Test high-priority sources first (Clearbit, Google)
    for (const source of sortedSources) {
      if (source.name === 'generated') continue; // Already added
      
      try {
        const startTime = Date.now();
        const result = await this.testLogoUrl(source.url);
        const responseTime = Date.now() - startTime;
        
        const testedSource = {
          ...source,
          quality: this.calculateQualityScore(source, result, responseTime),
          responseTime,
          lastTested: new Date().toISOString(),
          size: result.size
        };

        if (testedSource.quality >= this.defaultOptions.minQuality) {
          validSources.unshift(testedSource); // Add to front
          
          // Return immediately with first successful logo + placeholder fallback
          if (source.name === 'clearbit' || source.name === 'google') {
            return validSources;
          }
        }
      } catch (error) {
        // Source failed, continue to next
        continue;
      }
    }

    return validSources.sort((a, b) => b.quality - a.quality);
  }

  // Test if a logo URL is accessible and get metadata
  private async testLogoUrl(url: string): Promise<{ size?: { width: number; height: number } }> {
    if (url.startsWith('data:')) {
      return {}; // Data URLs always work
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, this.defaultOptions.timeout);

      img.onload = () => {
        clearTimeout(timeout);
        resolve({
          size: {
            width: img.naturalWidth,
            height: img.naturalHeight
          }
        });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load'));
      };

      img.src = url;
    });
  }

  // Calculate quality score based on multiple factors
  private calculateQualityScore(source: LogoSource, result: any, responseTime: number): number {
    let score = source.priority;

    // Format bonuses
    const formatBonus = {
      'svg': 20,
      'png': 15,
      'webp': 15,
      'ico': 5,
      'jpg': 3
    };
    score += formatBonus[source.format as keyof typeof formatBonus] || 0;

    // Size bonuses
    if (result.size) {
      const { width, height } = result.size;
      if (width >= 512 || height >= 512) score += 15;
      else if (width >= 256 || height >= 256) score += 10;
      else if (width >= 128 || height >= 128) score += 5;
      else if (width < 32 || height < 32) score -= 5;
    }

    // Response time penalties
    if (responseTime > 3000) score -= 10;
    else if (responseTime > 1000) score -= 5;
    else if (responseTime < 500) score += 5;

    // Source-specific adjustments
    if (source.name === 'clearbit') score += 10; // Premium service
    if (source.name === 'google') score += 5;    // Reliable service
    if (source.name === 'generated') score = 30; // Consistent placeholder

    return Math.max(0, Math.min(100, score));
  }

  // Generate possible favicon URLs for a domain
  private generateFaviconUrls(domain: string): string[] {
    return [
      `https://${domain}/favicon.svg`,
      `https://${domain}/favicon.png`,
      `https://${domain}/favicon.ico`,
      `https://${domain}/assets/favicon.png`,
      `https://${domain}/static/favicon.png`,
      `https://${domain}/img/favicon.png`
    ];
  }

  // Detect image format from URL
  private detectFormat(url: string): LogoSource['format'] {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'svg': return 'svg';
      case 'png': return 'png';
      case 'ico': return 'ico';
      case 'jpg':
      case 'jpeg': return 'jpg';
      case 'webp': return 'webp';
      default: return 'unknown';
    }
  }

  // Generate SVG placeholder as data URL
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

  // Cache management
  private getCacheKey(domain: string, companyName: string): string {
    return `logo_${domain}_${companyName.replace(/\s+/g, '_').toLowerCase()}`;
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
      const stored = localStorage.getItem('logoServiceCache');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value as LogoCacheEntry);
        });
      }
    } catch (error) {
      console.warn('Failed to load logo cache from storage:', error);
    }
  }

  private saveCacheToStorage(): void {
    try {
      // Limit cache size to prevent localStorage overflow
      const MAX_CACHE_ENTRIES = 1000;
      if (this.cache.size > MAX_CACHE_ENTRIES) {
        // Remove oldest entries
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
        toRemove.forEach(([key]) => this.cache.delete(key));
      }

      const cacheData = Object.fromEntries(this.cache.entries());
      localStorage.setItem('logoServiceCache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save logo cache to storage:', error);
    }
  }

  // Public cache management methods
  public clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('logoServiceCache');
  }

  public getCacheStats(): { size: number; hits: number; totalEntries: number } {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      hits: entries.reduce((sum, entry) => sum + entry.hits, 0),
      totalEntries: entries.length
    };
  }
}

// Export singleton instance
export const logoService = new LogoService();
