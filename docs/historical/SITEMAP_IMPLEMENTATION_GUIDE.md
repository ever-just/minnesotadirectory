# Sitemap Implementation Guide

## Understanding Minnesota Directory's Structure

### Current Route Structure
Based on the React Router setup in `App.tsx`:

```typescript
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/directory" element={<DirectoryPage />} />
  <Route path="/company/:id" element={<DetailPageWrapper />} />
</Routes>
```

### Dynamic Content Analysis
- **Static Routes**: `/`, `/directory`
- **Dynamic Routes**: `/company/:id` (based on company data)
- **Data Source**: CSV file with 2,762 company records

## Sitemap Implementation Strategies

### Option 1: Static XML Sitemap (Basic)

Create `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://minnesotadirectory.com/</loc>
    <lastmod>2025-01-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://minnesotadirectory.com/directory</loc>
    <lastmod>2025-01-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Company pages would be added here -->
</urlset>
```

### Option 2: Dynamic Sitemap Generation (Recommended)

#### Step 1: Create Sitemap Generation Script

Create `scripts/generate-sitemap.mjs`:

```javascript
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const DOMAIN = 'https://minnesotadirectory.com';
const OUTPUT_PATH = 'public/sitemap.xml';

async function generateSitemap() {
  const urls = [];
  
  // Static routes
  urls.push({
    loc: `${DOMAIN}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '1.0'
  });
  
  urls.push({
    loc: `${DOMAIN}/directory`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '0.8'
  });
  
  // Dynamic company routes
  try {
    const csvPath = 'public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv';
    const csvData = fs.readFileSync(csvPath, 'utf8');
    
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((company, index) => {
          if (company['Company Name']) {
            urls.push({
              loc: `${DOMAIN}/company/${index}`,
              lastmod: new Date().toISOString().split('T')[0],
              changefreq: 'monthly',
              priority: '0.6'
            });
          }
        });
        
        // Generate XML
        const xml = generateXML(urls);
        fs.writeFileSync(OUTPUT_PATH, xml);
        console.log(`✅ Sitemap generated with ${urls.length} URLs`);
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

function generateXML(urls) {
  const urlElements = urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

generateSitemap();
```

#### Step 2: Add Script to package.json

```json
{
  "scripts": {
    "convert": "node scripts/csv-to-json.mjs",
    "generate-sitemap": "node scripts/generate-sitemap.mjs",
    "build": "npm run generate-sitemap && tsc -b && vite build"
  }
}
```

### Option 3: Build-time Integration with Vite

Create `vite-plugin-sitemap.ts`:

```typescript
import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface SitemapOptions {
  hostname: string;
  routes: string[];
  dynamicRoutes?: () => Promise<string[]>;
}

export function sitemapPlugin(options: SitemapOptions): Plugin {
  return {
    name: 'sitemap-generator',
    async buildEnd() {
      const { hostname, routes, dynamicRoutes } = options;
      let allRoutes = [...routes];
      
      if (dynamicRoutes) {
        const dynamic = await dynamicRoutes();
        allRoutes = [...allRoutes, ...dynamic];
      }
      
      const xml = generateSitemapXML(hostname, allRoutes);
      
      const outputDir = path.resolve('dist');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), xml);
      console.log(`✅ Sitemap generated with ${allRoutes.length} URLs`);
    }
  };
}

function generateSitemapXML(hostname: string, routes: string[]): string {
  const urls = routes.map(route => `  <url>
    <loc>${hostname}${route}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { sitemapPlugin } from './vite-plugin-sitemap';

export default defineConfig({
  plugins: [
    react(),
    sitemapPlugin({
      hostname: 'https://minnesotadirectory.com',
      routes: ['/', '/directory'],
      dynamicRoutes: async () => {
        // Generate dynamic routes from CSV data
        const fs = await import('fs');
        const Papa = await import('papaparse');
        
        const csvPath = 'public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv';
        const csvData = fs.readFileSync(csvPath, 'utf8');
        
        return new Promise((resolve) => {
          Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const routes = results.data
                .filter(company => company['Company Name'])
                .map((_, index) => `/company/${index}`);
              resolve(routes);
            }
          });
        });
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## SEO Enhancements

### robots.txt
Create `public/robots.txt`:

```
User-agent: *
Allow: /

# Sitemap
Sitemap: https://minnesotadirectory.com/sitemap.xml

# Optional: Block certain paths
# Disallow: /admin/
# Disallow: /api/
```

### Meta Tags Enhancement

Update `index.html` with better SEO:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- SEO Meta Tags -->
    <title>Minnesota Business Directory - Discover Local Companies</title>
    <meta name="description" content="Comprehensive directory of Minnesota businesses. Discover local companies, explore opportunities, and connect with mid-market organizations across Minnesota." />
    <meta name="keywords" content="Minnesota businesses, local companies, business directory, Minnesota corporations" />
    <meta name="author" content="Minnesota Directory" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://minnesotadirectory.com/" />
    <meta property="og:title" content="Minnesota Business Directory" />
    <meta property="og:description" content="Discover and connect with Minnesota businesses" />
    <meta property="og:image" content="https://minnesotadirectory.com/og-image.png" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://minnesotadirectory.com/" />
    <meta property="twitter:title" content="Minnesota Business Directory" />
    <meta property="twitter:description" content="Discover and connect with Minnesota businesses" />
    <meta property="twitter:image" content="https://minnesotadirectory.com/twitter-image.png" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://minnesotadirectory.com/" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <!-- ... -->
</html>
```

## Implementation Checklist

### Phase 1: Basic Implementation
- [ ] Create basic sitemap.xml with static routes
- [ ] Add robots.txt file
- [ ] Update HTML meta tags
- [ ] Test sitemap validation

### Phase 2: Dynamic Generation
- [ ] Create sitemap generation script
- [ ] Integrate with build process
- [ ] Include all company pages
- [ ] Add lastmod dates based on data updates

### Phase 3: Advanced SEO
- [ ] Add structured data (JSON-LD)
- [ ] Implement dynamic meta tags per route
- [ ] Add social media preview images
- [ ] Set up Google Search Console

## Search Engine Submission

### Google Search Console
1. Verify website ownership
2. Submit sitemap: `https://minnesotadirectory.com/sitemap.xml`
3. Monitor indexing status

### Bing Webmaster Tools
1. Add and verify site
2. Submit sitemap URL
3. Monitor crawl stats

## Monitoring and Maintenance

### Regular Updates
- Update sitemap when new companies are added
- Regenerate sitemap monthly or when CSV data changes
- Monitor search console for crawl errors

### Performance Tracking
- Track indexed pages count
- Monitor search impressions
- Check for duplicate content issues

## Tools and Resources

- [Google Search Console](https://search.google.com/search-console/)
- [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- [Structured Data Testing Tool](https://search.google.com/test/structured-data)
- [Bing Webmaster Tools](https://www.bing.com/webmasters/)

## Expected Results

After implementation:
- **2,764+ pages indexed** (2 static + 2,762 company pages)
- **Improved search visibility** for Minnesota business searches
- **Better crawl efficiency** for search engines
- **Enhanced user discovery** of company profiles
