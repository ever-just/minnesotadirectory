export interface WebsitePage {
  url: string;
  title?: string;
  lastModified?: string;
  priority?: number;
}

export interface Subdomain {
  domain: string;
  isActive: boolean;
  lastChecked?: string;
}

export interface WebsiteStructure {
  domain: string;
  pages: WebsitePage[];
  subdomains: Subdomain[];
  totalPages: number;
  sitemapUrl?: string;
  lastUpdated: string;
  error?: string;
}

export interface ProgressCallback {
  onPageFound: (page: WebsitePage) => void;
  onSubdomainFound: (subdomain: Subdomain) => void;
  onSitemapFound: (sitemapUrl: string) => void;
  onProgress: (status: string, completed: number, total?: number) => void;
  onError: (error: string) => void;
}

export interface SiteMapNode {
  name: string;
  path: string;
  url: string;
  children: SiteMapNode[];
  isExpanded: boolean;
  level: number;
  page: WebsitePage | null;
  priority?: number;
  lastModified?: string;
}

interface PageDiscoverySource {
  type: 'navigation' | 'homepage' | 'sitemap' | 'footer';
  priority: number;
  method: string;
}

interface PriorityPage extends WebsitePage {
  source: PageDiscoverySource;
  discoveredAt: string;
}

export class WebsiteStructureService {
  private static COMMON_SITEMAP_PATHS = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemaps.xml',
    '/sitemap1.xml',
    '/sitemap-index.xml'
  ];

  private static COMMON_SUBDOMAINS = [
    'www',
    'blog',
    'news',
    'shop',
    'store',
    'support',
    'help',
    'docs',
    'api',
    'developer',
    'dev',
    'staging',
    'test',
    'admin',
    'mail',
    'careers',
    'jobs',
    'investors',
    'ir'
  ];

  static async analyzeWebsite(url: string): Promise<WebsiteStructure> {
    const domain = this.extractDomain(url);
    
    const structure: WebsiteStructure = {
      domain,
      pages: [],
      subdomains: [],
      totalPages: 0,
      lastUpdated: new Date().toISOString()
    };

    try {
      // Try to fetch sitemap
      const sitemapResult = await this.fetchSitemap(domain);
      structure.pages = sitemapResult.pages;
      structure.sitemapUrl = sitemapResult.sitemapUrl;
      structure.totalPages = sitemapResult.pages.length;

      // Try to discover subdomains (limited by CORS)
      structure.subdomains = await this.discoverSubdomains(domain);

    } catch (error) {
      structure.error = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    return structure;
  }

  static async analyzeWebsiteRealTime(url: string, callbacks: ProgressCallback): Promise<WebsiteStructure> {
    const domain = this.extractDomain(url);
    
    const structure: WebsiteStructure = {
      domain,
      pages: [],
      subdomains: [],
      totalPages: 0,
      lastUpdated: new Date().toISOString()
    };

    try {
      callbacks.onProgress('🚀 Starting priority discovery...', 5);
      
      // PHASE 1: PARALLEL HIGH-PRIORITY DISCOVERY
      const discoveryPromises = [
        this.parseNavigationLinks(url).catch((error) => {
          console.warn('🚨 Navigation parsing failed:', error);
          return [];
        }),
        this.parseHomepageContent(url).catch((error) => {
          console.warn('🚨 Homepage parsing failed:', error);
          return [];
        }),
        this.quickSitemapScan(domain, 25).catch((error) => {
          console.warn('🚨 Quick sitemap scan failed:', error);
          return [];
        })
      ];
      
      const results = await Promise.allSettled(discoveryPromises);
      
      // Process results with detailed logging
      const allPages: PriorityPage[] = [];
      results.forEach((result, index) => {
        const source = ['navigation', 'homepage', 'sitemap'][index];
        if (result.status === 'fulfilled') {
          console.log(`🔍 ${source} discovered ${result.value.length} pages:`, result.value.map(p => p.url));
          allPages.push(...result.value);
          callbacks.onProgress(`✅ ${source} discovery complete (${result.value.length} pages)`, 20 + (index * 15));
        } else {
          console.error(`❌ ${source} discovery rejected:`, result.reason);
          callbacks.onProgress(`⚠️ ${source} discovery failed`, 20 + (index * 15));
        }
      });
      
      console.log(`🔧 Total raw pages before dedup: ${allPages.length}`);
      
      // Sort, deduplicate, and prioritize
      const dedupedPages = this.deduplicatePages(allPages);
      console.log(`🔧 Pages after dedup: ${dedupedPages.length}`);
      
      const sortedPages = this.sortByPriority(dedupedPages);
      console.log(`🔧 Pages after priority sort: ${sortedPages.length}`);
      
      const finalPages = sortedPages.map(page => ({
        url: page.url,
        title: page.title,
        priority: page.priority,
        lastModified: page.lastModified
      }));
      
      console.log(`🎯 FINAL PAGES TO UI:`, finalPages);
      
      structure.pages = finalPages;
      structure.totalPages = finalPages.length;
      
      callbacks.onProgress(`🎯 Found ${finalPages.length} priority pages`, 70);
      
      // Real-time page reporting
      finalPages.forEach(page => callbacks.onPageFound(page));
      
      // Continue with subdomain discovery
      structure.subdomains = await this.discoverSubdomainsRealTime(domain, callbacks);
      
      callbacks.onProgress('🏁 Discovery complete!', 100);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Discovery failed';
      structure.error = errorMsg;
      callbacks.onError(errorMsg);
      
      // Fallback to sitemap-only approach
      try {
        console.warn('Phase 1 failed, using sitemap fallback:', error);
        const fallback = await this.fetchSitemapRealTime(domain, callbacks);
        structure.pages = fallback.pages;
        structure.totalPages = fallback.pages.length;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }

    return structure;
  }

  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
  }

  private static async fetchSitemap(domain: string): Promise<{pages: WebsitePage[], sitemapUrl?: string}> {
    const baseUrl = `https://${domain}`;
    
    // Try common sitemap locations
    for (const path of this.COMMON_SITEMAP_PATHS) {
      try {
        const sitemapUrl = `${baseUrl}${path}`;
        const response = await this.fetchWithProxy(sitemapUrl);
        
        if (response.ok) {
          const xmlText = await response.text();
          const pages = await this.parseSitemap(xmlText, baseUrl);
          return { pages, sitemapUrl };
        }
      } catch (error) {
        console.log(`Failed to fetch ${path} for ${domain}:`, error);
        continue;
      }
    }

    throw new Error('No accessible sitemap found');
  }

  private static async fetchSitemapRealTime(domain: string, callbacks: ProgressCallback): Promise<{pages: WebsitePage[], sitemapUrl?: string}> {
    const baseUrl = `https://${domain}`;
    
    callbacks.onProgress('Searching for sitemap files...', 10);
    
    // Try common sitemap locations
    for (let i = 0; i < this.COMMON_SITEMAP_PATHS.length; i++) {
      const path = this.COMMON_SITEMAP_PATHS[i];
      try {
        const sitemapUrl = `${baseUrl}${path}`;
        callbacks.onProgress(`Trying ${path}...`, 10 + (i * 5));
        
        const response = await this.fetchWithProxy(sitemapUrl);
        
        if (response.ok) {
          callbacks.onSitemapFound(sitemapUrl);
          callbacks.onProgress('Parsing sitemap...', 40);
          
          const xmlText = await response.text();
          const pages = await this.parseSitemapRealTime(xmlText, baseUrl, callbacks);
          return { pages, sitemapUrl };
        }
      } catch (error) {
        console.log(`Failed to fetch ${path} for ${domain}:`, error);
        continue;
      }
    }

    throw new Error('No accessible sitemap found');
  }

  private static async fetchWithProxy(url: string): Promise<Response> {
    // In a real implementation, you'd use a CORS proxy or backend service
    // For now, we'll try direct fetch (will likely fail due to CORS)
    try {
      return await fetch(url);
    } catch (error) {
      // Fallback: use a public CORS proxy (use with caution in production)
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetch(proxyUrl);
      
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        return new Response(data.contents, {
          status: 200,
          headers: { 'content-type': 'application/xml' }
        });
      }
      
      throw new Error('Failed to fetch via proxy');
    }
  }

  private static async parseSitemap(xmlText: string, baseUrl: string): Promise<WebsitePage[]> {
    const pages: WebsitePage[] = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check if it's a sitemap index
      const sitemapElements = xmlDoc.querySelectorAll('sitemap > loc');
      if (sitemapElements.length > 0) {
        // This is a sitemap index, fetch individual sitemaps
        for (const sitemapLoc of Array.from(sitemapElements)) {
          try {
            const sitemapUrl = sitemapLoc.textContent?.trim();
            if (sitemapUrl) {
              const response = await this.fetchWithProxy(sitemapUrl);
              if (response.ok) {
                const subSitemapXml = await response.text();
                const subPages = await this.parseSitemap(subSitemapXml, baseUrl);
                pages.push(...subPages);
              }
            }
          } catch (error) {
            console.log('Failed to fetch subsitemap:', error);
          }
        }
      } else {
        // Regular sitemap with URL entries
        const urlElements = xmlDoc.querySelectorAll('url');
        
        for (const urlElement of Array.from(urlElements)) {
          const loc = urlElement.querySelector('loc')?.textContent?.trim();
          const lastmod = urlElement.querySelector('lastmod')?.textContent?.trim();
          const priority = urlElement.querySelector('priority')?.textContent?.trim();
          
          if (loc) {
            pages.push({
              url: loc,
              lastModified: lastmod || undefined,
              priority: priority ? parseFloat(priority) : undefined
            });
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse sitemap: ${error}`);
    }

    return pages;
  }

  private static async parseSitemapRealTime(xmlText: string, baseUrl: string, callbacks: ProgressCallback): Promise<WebsitePage[]> {
    const pages: WebsitePage[] = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check if it's a sitemap index
      const sitemapElements = xmlDoc.querySelectorAll('sitemap > loc');
      if (sitemapElements.length > 0) {
        callbacks.onProgress(`Found sitemap index with ${sitemapElements.length} sitemaps`, 45);
        
        // This is a sitemap index, fetch individual sitemaps
        for (let i = 0; i < sitemapElements.length; i++) {
          const sitemapLoc = sitemapElements[i];
          try {
            const sitemapUrl = sitemapLoc.textContent?.trim();
            if (sitemapUrl) {
              callbacks.onProgress(`Fetching subsitemap ${i + 1}/${sitemapElements.length}...`, 45 + (i * 15));
              
              const response = await this.fetchWithProxy(sitemapUrl);
              if (response.ok) {
                const subSitemapXml = await response.text();
                const subPages = await this.parseSitemapRealTime(subSitemapXml, baseUrl, callbacks);
                pages.push(...subPages);
              }
            }
          } catch (error) {
            console.log('Failed to fetch subsitemap:', error);
          }
        }
      } else {
        // Regular sitemap with URL entries
        const urlElements = xmlDoc.querySelectorAll('url');
        callbacks.onProgress(`Found ${urlElements.length} pages in sitemap`, 50);
        
        for (let i = 0; i < urlElements.length; i++) {
          const urlElement = urlElements[i];
          const loc = urlElement.querySelector('loc')?.textContent?.trim();
          const lastmod = urlElement.querySelector('lastmod')?.textContent?.trim();
          const priority = urlElement.querySelector('priority')?.textContent?.trim();
          
          if (loc) {
            const page: WebsitePage = {
              url: loc,
              lastModified: lastmod || undefined,
              priority: priority ? parseFloat(priority) : undefined
            };
            
            pages.push(page);
            callbacks.onPageFound(page);
            
            // Update progress every 10 pages or on last page
            if (i % 10 === 0 || i === urlElements.length - 1) {
              const progress = 50 + Math.round((i / urlElements.length) * 30);
              callbacks.onProgress(`Processed ${i + 1}/${urlElements.length} pages`, progress);
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse sitemap: ${error}`);
    }

    return pages;
  }

  private static async discoverSubdomains(domain: string): Promise<Subdomain[]> {
    const subdomains: Subdomain[] = [];
    
    // Note: This approach is limited by CORS policies
    // In a production app, you'd use a backend service or third-party API
    
    for (const subdomain of this.COMMON_SUBDOMAINS) {
      try {
        const fullDomain = `${subdomain}.${domain}`;
        
        // Simple DNS resolution check (limited by browser security)
        const isActive = await this.checkSubdomainExists(fullDomain);
        
        subdomains.push({
          domain: fullDomain,
          isActive,
          lastChecked: new Date().toISOString()
        });
      } catch (error) {
        // Subdomain check failed, mark as inactive
        subdomains.push({
          domain: `${subdomain}.${domain}`,
          isActive: false,
          lastChecked: new Date().toISOString()
        });
      }
    }

    return subdomains.filter(sub => sub.isActive);
  }

  private static async discoverSubdomainsRealTime(domain: string, callbacks: ProgressCallback): Promise<Subdomain[]> {
    const subdomains: Subdomain[] = [];
    
    callbacks.onProgress('Discovering subdomains...', 85);
    
    // Note: This approach is limited by CORS policies
    // In a production app, you'd use a backend service or third-party API
    
    for (let i = 0; i < this.COMMON_SUBDOMAINS.length; i++) {
      const subdomain = this.COMMON_SUBDOMAINS[i];
      try {
        const fullDomain = `${subdomain}.${domain}`;
        callbacks.onProgress(`Checking ${fullDomain}...`, 85 + Math.round((i / this.COMMON_SUBDOMAINS.length) * 10));
        
        // Simple DNS resolution check (limited by browser security)
        const isActive = await this.checkSubdomainExists(fullDomain);
        
        const subdomainObj: Subdomain = {
          domain: fullDomain,
          isActive,
          lastChecked: new Date().toISOString()
        };
        
        subdomains.push(subdomainObj);
        
        if (isActive) {
          callbacks.onSubdomainFound(subdomainObj);
        }
        
      } catch (error) {
        // Subdomain check failed, mark as inactive
        subdomains.push({
          domain: `${subdomain}.${domain}`,
          isActive: false,
          lastChecked: new Date().toISOString()
        });
      }
    }

    return subdomains.filter(sub => sub.isActive);
  }

  private static async checkSubdomainExists(domain: string): Promise<boolean> {
    try {
      // Try to fetch the subdomain (will fail due to CORS, but that's OK)
      await fetch(`https://${domain}`, { 
        method: 'HEAD', 
        mode: 'no-cors',
        signal: AbortSignal.timeout(3000)
      });
      
      // If we get here without error, subdomain likely exists
      return true;
    } catch (error) {
      // For now, we'll return false for all due to CORS limitations
      // In production, use a backend service or third-party API
      return false;
    }
  }

  static formatUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Simplify common patterns
      if (path === '/' || path === '') return 'Homepage';
      
      // Remove file extensions and clean up path
      return path
        .replace(/\/$/, '') // Remove trailing slash
        .replace(/\.(html|php|aspx?)$/, '') // Remove common extensions
        .split('/')
        .filter(Boolean)
        .map(segment => segment.replace(/[-_]/g, ' '))
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' › ');
    } catch {
      return url;
    }
  }

  static buildSiteMap(pages: WebsitePage[]): SiteMapNode {
    const root: SiteMapNode = {
      name: 'Website Root',
      path: '/',
      url: '',
      children: [],
      isExpanded: true,
      level: 0,
      page: null
    };

    // Sort pages by URL path depth and alphabetically
    const sortedPages = pages.sort((a, b) => {
      const depthA = (a.url.match(/\//g) || []).length;
      const depthB = (b.url.match(/\//g) || []).length;
      if (depthA !== depthB) return depthA - depthB;
      return a.url.localeCompare(b.url);
    });

    sortedPages.forEach(page => {
      this.insertPageIntoTree(root, page);
    });

    // Sort all children recursively
    this.sortTreeChildren(root);
    
    return root;
  }

  private static insertPageIntoTree(root: SiteMapNode, page: WebsitePage) {
    try {
      const url = new URL(page.url);
      const pathParts = url.pathname.split('/').filter(part => part !== '');
      
      let currentNode = root;
      let currentPath = '';

      // Handle root/home page
      if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0].match(/^(index|home|default)\.(html|htm|php|aspx?)$/i))) {
        const homeNode: SiteMapNode = {
          name: 'Home',
          path: '/',
          url: page.url,
          children: [],
          isExpanded: false,
          level: 1,
          page: page,
          priority: page.priority,
          lastModified: page.lastModified
        };
        
        // Check if home page already exists
        const existingHome = root.children.find(child => child.path === '/');
        if (!existingHome) {
          root.children.unshift(homeNode);
        }
        return;
      }

      // Build the path tree
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath += '/' + part;
        
        let existingChild = currentNode.children.find(child => child.path === currentPath);
        
        if (!existingChild) {
          // Create new node
          const isLastPart = i === pathParts.length - 1;
          const nodeName = isLastPart ? this.formatPageName(part) : this.formatDirectoryName(part);
          
          const newNode: SiteMapNode = {
            name: nodeName,
            path: currentPath,
            url: isLastPart ? page.url : '',
            children: [],
            isExpanded: false,
            level: i + 1,
            page: isLastPart ? page : null,
            priority: isLastPart ? page.priority : undefined,
            lastModified: isLastPart ? page.lastModified : undefined
          };
          
          currentNode.children.push(newNode);
          currentNode = newNode;
        } else {
          // Update existing node if this is a page (leaf node)
          if (i === pathParts.length - 1 && !existingChild.page) {
            existingChild.page = page;
            existingChild.url = page.url;
            existingChild.priority = page.priority;
            existingChild.lastModified = page.lastModified;
          }
          currentNode = existingChild;
        }
      }
    } catch (error) {
      console.warn('Failed to parse URL for page:', page.url, error);
    }
  }

  private static sortTreeChildren(node: SiteMapNode) {
    // Sort children: directories first, then pages, both alphabetically
    node.children.sort((a, b) => {
      const aIsDirectory = a.children.length > 0 || !a.page;
      const bIsDirectory = b.children.length > 0 || !b.page;
      
      if (aIsDirectory && !bIsDirectory) return -1;
      if (!aIsDirectory && bIsDirectory) return 1;
      
      return a.name.localeCompare(b.name);
    });

    // Recursively sort children
    node.children.forEach(child => this.sortTreeChildren(child));
  }

  private static formatDirectoryName(segment: string): string {
    return segment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\.(html|htm|php|aspx?)$/i, '');
  }

  private static formatPageName(segment: string): string {
    // Remove file extensions
    const nameWithoutExt = segment.replace(/\.(html|htm|php|aspx?)$/i, '');
    
    // Handle common page patterns
    if (nameWithoutExt === 'index') return 'Index Page';
    if (nameWithoutExt === 'default') return 'Default Page';
    
    // Format the name
    return nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  static countTotalNodes(root: SiteMapNode): { directories: number; pages: number } {
    let directories = 0;
    let pages = 0;

    const traverse = (node: SiteMapNode) => {
      if (node.page) {
        pages++;
      } else if (node.children.length > 0) {
        directories++;
      }

      node.children.forEach(child => traverse(child));
    };

    traverse(root);
    return { directories, pages };
  }

  static getMaxDepth(root: SiteMapNode): number {
    let maxDepth = 0;

    const traverse = (node: SiteMapNode) => {
      maxDepth = Math.max(maxDepth, node.level);
      node.children.forEach(child => traverse(child));
    };

    traverse(root);
    return maxDepth;
  }

  // ===== PHASE 1: PRIORITY-FIRST DISCOVERY METHODS =====

  private static async parseNavigationLinks(url: string): Promise<PriorityPage[]> {
    console.log(`🧭 Starting navigation parsing for: ${url}`);
    const pages: PriorityPage[] = [];
    
    try {
      const { parseHTML } = await import('linkedom');
      console.log(`✅ LinkedOM imported successfully`);
      
      const response = await this.fetchWithProxy(url);
      console.log(`✅ Fetch response status: ${response.status}`);
      
      const html = await response.text();
      console.log(`✅ HTML content length: ${html.length} chars`);
      
      const { document } = parseHTML(html);
      console.log(`✅ LinkedOM document created`);
      
      // High-priority navigation selectors
      const navSelectors = [
        { selector: 'nav ul li a', priority: 0.9 },
        { selector: '.main-nav a, .primary-nav a', priority: 0.85 },  
        { selector: 'header nav a', priority: 0.8 },
        { selector: '.nav-menu a', priority: 0.75 }
      ];
      
      navSelectors.forEach(({ selector, priority }) => {
        const links = document.querySelectorAll(selector);
        console.log(`🔍 Selector "${selector}" found ${links.length} links`);
        
        Array.from(links).forEach((link: any) => {
          const href = link.getAttribute('href');
          const title = link.textContent?.trim();
          
          console.log(`🔗 Processing link: href="${href}", title="${title}"`);
          
          if (href && this.isValidInternalLink(href, url)) {
            const resolvedUrl = this.resolveUrl(href, url);
            console.log(`✅ Valid link added: ${resolvedUrl}`);
            pages.push({
              url: resolvedUrl,
              title: title || undefined,
              priority,
              source: { type: 'navigation', priority, method: selector },
              discoveredAt: new Date().toISOString()
            });
          } else {
            console.log(`❌ Link rejected: href="${href}" (${!href ? 'no href' : 'not valid internal link'})`);
          }
        });
      });
      
    } catch (error) {
      console.warn('Navigation parsing failed for', url, error);
    }
    
    const dedupedPages = this.deduplicatePages(pages);
    console.log(`🧭 Navigation parsing complete: ${pages.length} raw -> ${dedupedPages.length} deduped pages`);
    return dedupedPages;
  }

  private static async parseHomepageContent(url: string): Promise<PriorityPage[]> {
    console.log(`🏠 Starting homepage parsing for: ${url}`);
    const pages: PriorityPage[] = [];
    
    try {
      const { parseHTML } = await import('linkedom');
      const response = await this.fetchWithProxy(url);
      const html = await response.text();
      const { document } = parseHTML(html);
      
      // Content area selectors with priority
      const contentSelectors = [
        { selector: '.cta a, .call-to-action a', priority: 0.7 },
        { selector: 'main a', priority: 0.6 },
        { selector: '.content a, .page-content a', priority: 0.55 },
        { selector: 'footer nav a, .footer-links a', priority: 0.5 }
      ];
      
      contentSelectors.forEach(({ selector, priority }) => {
        const links = document.querySelectorAll(selector);
        Array.from(links).forEach((link: any) => {
          const href = link.getAttribute('href');
          const title = link.textContent?.trim();
          
          if (href && this.isValidInternalLink(href, url)) {
            pages.push({
              url: this.resolveUrl(href, url),
              title: title || undefined,
              priority: this.calculateSmartPriority(href, priority),
              source: { type: 'homepage', priority, method: selector },
              discoveredAt: new Date().toISOString()
            });
          }
        });
      });
      
    } catch (error) {
      console.warn('Homepage content parsing failed for', url, error);
    }
    
    const dedupedPages = this.deduplicatePages(pages);
    console.log(`🏠 Homepage parsing complete: ${pages.length} raw -> ${dedupedPages.length} deduped pages`);
    return dedupedPages;
  }

  private static calculateSmartPriority(url: string, basePriority: number): number {
    let priority = basePriority;
    
    // URL pattern bonuses
    const urlPatterns = [
      { pattern: /\/(about|company|who-we-are)/i, bonus: 0.25 },
      { pattern: /\/(products|services|solutions)/i, bonus: 0.2 },
      { pattern: /\/(contact|get-in-touch)/i, bonus: 0.15 },
      { pattern: /\/(careers|jobs|hiring)/i, bonus: 0.1 },
      { pattern: /\/(news|blog|press)/i, bonus: 0.05 }
    ];
    
    urlPatterns.forEach(({ pattern, bonus }) => {
      if (pattern.test(url)) priority += bonus;
    });
    
    // Depth penalty (deeper = lower priority)
    const depth = (url.match(/\//g) || []).length - 2;
    priority -= Math.min(depth * 0.05, 0.2);
    
    return Math.max(0.1, Math.min(1.0, priority));
  }

  private static isValidInternalLink(href: string, baseUrl: string): boolean {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return false;
    }
    
    try {
      const url = new URL(href, baseUrl);
      const baseDomain = this.extractDomain(baseUrl);
      
      return url.hostname.includes(baseDomain) && 
             !href.match(/\.(pdf|doc|jpg|png|gif|zip)$/i);
    } catch {
      return false;
    }
  }

  private static resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }



  private static deduplicatePages<T extends { url: string, priority?: number }>(pages: T[]): T[] {
    const seen = new Map<string, T>();
    
    pages.forEach(page => {
      const normalizedUrl = page.url.toLowerCase().replace(/\/$/, '').replace(/\/index\.(html?|php)$/, '');
      
      if (!seen.has(normalizedUrl) || (page.priority || 0) > (seen.get(normalizedUrl)?.priority || 0)) {
        seen.set(normalizedUrl, page);
      }
    });
    
    return Array.from(seen.values());
  }

  private static sortByPriority<T extends { priority?: number }>(pages: T[]): T[] {
    return pages.sort((a, b) => {
      const priorityA = a.priority || 0.5;
      const priorityB = b.priority || 0.5;
      return priorityB - priorityA; // High to low
    });
  }

  private static async quickSitemapScan(domain: string, maxEntries: number): Promise<PriorityPage[]> {
    console.log(`🗺️ Starting quick sitemap scan for: ${domain} (max ${maxEntries} entries)`);
    try {
      const baseUrl = `https://${domain}`;
      
      for (const path of this.COMMON_SITEMAP_PATHS) {
        try {
          const response = await this.fetchWithProxy(`${baseUrl}${path}`);
          if (response.ok) {
            console.log(`✅ Sitemap found at: ${baseUrl}${path}`);
            const xml = await response.text();
            const pages = await this.parseSitemap(xml, baseUrl);
            console.log(`🗺️ Sitemap contains ${pages.length} pages, taking first ${maxEntries}`);
            
            const result = pages.slice(0, maxEntries).map(page => ({
              ...page,
              source: { type: 'sitemap' as const, priority: 0.4, method: 'xml_sitemap' },
              discoveredAt: new Date().toISOString()
            }));
            
            console.log(`🗺️ Quick sitemap scan complete: ${result.length} pages returned`);
            return result;
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.warn('Quick sitemap scan failed:', error);
    }
    
    console.log(`🗺️ Quick sitemap scan complete: 0 pages found (no accessible sitemap)`);
    return [];
  }
}
