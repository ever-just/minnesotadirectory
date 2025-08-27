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
}
