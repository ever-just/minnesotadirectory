# Sitemap Component Implementation Guide

## Overview
This guide explains how to implement a comprehensive sitemap discovery and display component for a company database web application. The implementation includes both backend sitemap parsing services and a React frontend component with intelligent page categorization and relevance scoring.

## Architecture Overview
The sitemap system consists of:
1. **Backend Service** (`SitemapService`) - Discovers, parses, and scores sitemap pages
2. **API Endpoint** - RESTful API for accessing sitemap data
3. **Frontend Component** (`CompanySitemap`) - Interactive React component for displaying sitemap data
4. **Type Definitions** - TypeScript interfaces for type safety
5. **Integration** - Component integration into existing detail pages

## Prerequisites
- Node.js project with Express.js backend
- React/TypeScript frontend
- PostgreSQL database with company data
- UI component library (shadcn/ui in this example)

## Backend Implementation

### Step 1: Install Required Dependencies
Add these dependencies to your server's `package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "xml2js": "^0.6.2"
  }
}
```

### Step 2: Create the SitemapService Class
Create `server/sitemap-service.js` with the following comprehensive service:

**Key Features:**
- Discovers sitemaps from main domain and common subdomains
- Parses XML sitemaps and sitemap indexes
- Extracts sitemap references from robots.txt
- Intelligent relevance scoring based on URL patterns and company name
- Memory caching with 24-hour expiration
- Support for WordPress and other CMS sitemap formats

**Core Methods:**
1. `getRelevantPages(companyUrl, companyName, limit)` - Main entry point
2. `discoverAllSitemaps(baseUrl)` - Finds sitemaps across domains/subdomains
3. `extractAllPages(sitemapUrls)` - Parses XML to extract page data
4. `scorePageRelevance(pages, companyName)` - Scores pages by relevance
5. `categorizeUrl(url)` - Categorizes pages (About, Services, Contact, etc.)

**Relevance Scoring Algorithm:**
- Base score from sitemap priority (0-10 points)
- URL pattern bonuses: About (+15), Services (+12), Contact (+10), Homepage (+20)
- Company name mentions: URL (+5), Title (+3)
- Recency bonuses: <30 days (+3), <90 days (+1), >365 days (-2)
- Penalties: Privacy/Terms (-8), Admin pages (-15), File downloads (-5)

### Step 3: Add API Endpoint
In your `server/index.js`, add the sitemap endpoint:

```javascript
const SitemapService = require('./sitemap-service');
const sitemapService = new SitemapService();

// Get sitemap pages for a company
app.get('/api/companies/:name/sitemap', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 10 } = req.query;
    const decodedName = decodeURIComponent(name);
    
    // Get company details from database
    const companyResult = await pool.query(
      'SELECT company_name, website FROM companies WHERE company_name = $1', 
      [decodedName]
    );
    
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const company = companyResult.rows[0];
    const companyUrl = company.website;
    const companyName = company.company_name;
    
    if (!companyUrl) {
      return res.json({ 
        pages: [], 
        error: 'No website URL available for this company',
        totalFound: 0,
        subdomainsChecked: 0
      });
    }
    
    // Get relevant sitemap pages
    const result = await sitemapService.getRelevantPages(
      companyUrl, 
      companyName, 
      parseInt(limit)
    );
    
    res.json(result);

  } catch (error) {
    console.error('Error fetching sitemap:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sitemap',
      message: error.message,
      pages: [],
      totalFound: 0,
      subdomainsChecked: 0
    });
  }
});

// Optional: Clear sitemap cache endpoint
app.post('/api/sitemap/clear-cache', (req, res) => {
  sitemapService.clearCache();
  res.json({ message: 'Cache cleared successfully' });
});
```

## Frontend Implementation

### Step 4: Add Type Definitions
In your `src/lib/types.ts`, add:

```typescript
export interface SitemapPage {
  url: string;
  title: string;
  category: string;
  relevanceScore: number;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface SitemapResponse {
  pages: SitemapPage[];
  error?: string;
  totalFound: number;
  subdomainsChecked: number;
}
```

### Step 5: Create CompanySitemap Component
Create `src/components/CompanySitemap.tsx`:

**Key Features:**
- Auto-fetches sitemap on mount when URL is available
- Loading states with skeleton placeholders
- Error handling with informative messages
- Category icons and color-coded badges
- Relevance score display with visual indicators
- "Show More/Less" functionality for large result sets
- Manual refresh capability
- Responsive design with proper mobile support

**Component Props:**
```typescript
interface CompanySitemapProps {
  companyName: string;
  companyUrl?: string;
}
```

**State Management:**
- `sitemapData` - Stores fetched sitemap response
- `loading` - Loading state for UI feedback
- `error` - Error state for display
- `showAll` - Toggle for showing all vs limited results

**UI Elements:**
- Card layout with header and refresh button
- Category icons: Globe (homepage), Info (about), TrendingUp (services), etc.
- Color-coded category badges with tailwind classes
- Relevance scores with color gradients (green for high, gray for low)
- External link buttons for each page
- Loading skeletons during fetch

### Step 6: Integration Styles (Optional)
Add CSS for better integration in your detail component (`CompanyDetail.css`):

```css
.sitemap-section {
  margin-top: 2rem;
  padding: 0; /* Let the CompanySitemap component handle its own padding */
}
```

### Step 7: Integrate Component
In your detail component (`CompanyDetail.tsx`):

```typescript
import CompanySitemap from './CompanySitemap';

// Inside your component JSX:
<div className="sitemap-section">
  <CompanySitemap 
    companyName={company.name} 
    companyUrl={company.url} 
  />
</div>
```

## Required UI Components
The implementation assumes you're using shadcn/ui or similar. Required components:
- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`
- `Button`
- `Badge`
- `Skeleton`
- `Alert`, `AlertDescription`
- Icons from `lucide-react`: `ExternalLink`, `Globe`, `Star`, `Clock`, `RefreshCw`, etc.

## Database Requirements
Your companies table should have at minimum:
```sql
CREATE TABLE companies (
  company_name VARCHAR(255),
  website VARCHAR(500), -- Company website URL
  -- other company fields...
);
```

## Performance Considerations

### Caching Strategy
- **Service-level caching**: 24-hour cache to avoid repeated sitemap fetches
- **Cache key format**: `{normalizedUrl}_{companyName}`
- **Automatic cache invalidation**: Expired entries removed automatically

### Rate Limiting
- **Subdomain discovery**: Limited to common subdomains to avoid excessive requests
- **Concurrent requests**: Uses `Promise.allSettled` for parallel processing
- **Timeouts**: Configurable timeouts (5s for HEAD requests, 10-15s for sitemap fetching)

### Error Handling
- **Graceful degradation**: Shows appropriate messages when sitemaps unavailable
- **Network failures**: Handles timeout and connection errors gracefully
- **Malformed XML**: Robust XML parsing with fallbacks

## Customization Options

### Scoring Algorithm
Modify the `scorePageRelevance` method to adjust:
- Importance weights for different page types
- Company name matching sensitivity
- Recency bonuses/penalties
- URL pattern recognition

### Category System
Extend the `categorizeUrl` method to add:
- Industry-specific page categories
- Custom URL pattern recognition
- Localized category names

### UI Customization
Modify the component to:
- Change color schemes for categories
- Adjust the number of initially displayed items
- Add additional metadata display (changefreq, priority)
- Implement different layout styles (grid vs list)

## Testing
Test your implementation with companies that have:
1. **Standard sitemaps**: `domain.com/sitemap.xml`
2. **Sitemap indexes**: Multiple sitemap files
3. **WordPress sites**: `wp-sitemap.xml` format
4. **Subdomain sitemaps**: `blog.domain.com/sitemap.xml`
5. **No sitemaps**: Graceful error handling
6. **Robots.txt sitemaps**: Sitemap references in robots.txt

## Security Considerations
- **Input validation**: All URLs are validated and normalized
- **User-Agent headers**: Professional bot identification
- **Timeout limits**: Prevent hanging requests
- **Error information**: Don't expose internal server details in error messages

## Monitoring
Consider adding:
- **Cache hit/miss metrics**: Track cache effectiveness
- **Response time logging**: Monitor sitemap fetch performance
- **Error rate monitoring**: Track failed requests
- **Popular domains**: Monitor which sites are frequently accessed

## Deployment Notes
1. **Environment variables**: Consider making cache timeout configurable
2. **Memory usage**: Monitor cache size in production
3. **Network egress**: Be aware of outbound HTTP requests for sitemap fetching
4. **DNS resolution**: Some subdomains may not exist or resolve slowly

This comprehensive implementation provides a robust, user-friendly sitemap discovery system that enhances company profile pages with relevant website content discovery.
