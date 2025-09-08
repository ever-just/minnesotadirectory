# Wget-Powered Sitemap Data Migration Plan
*Comprehensive plan to update all company sitemap data with 20 relevant pages per company, prioritizing careers pages*

## 🎯 **Migration Goals**
- Extract **20 most relevant pages** per company from 2,765 companies
- **MUST HAVE**: Careers/Jobs/Recruiting pages (highest priority)
- Replace generic sitemap data with high-quality, business-relevant pages
- Maintain data quality and system performance throughout migration

---

## 📊 **Current State Analysis**
- **Companies in Database**: 2,765 total
- **Companies with Websites**: ~2,350 (85% have website field populated)
- **Current Pages per Company**: 50-200+ (mostly irrelevant)
- **Target Pages per Company**: 20 (highly relevant)
- **Expected Data Reduction**: 80-90% smaller database, 95% more relevant

---

## 🗄️ **Phase 1: Database Schema Enhancements**

### **Add New Fields to websitePages Table**
```sql
-- Migration: Add enhanced fields for wget-extracted data
ALTER TABLE website_pages ADD COLUMN relevance_score INTEGER DEFAULT 0;
ALTER TABLE website_pages ADD COLUMN is_careers_page BOOLEAN DEFAULT FALSE;
ALTER TABLE website_pages ADD COLUMN title_text TEXT; -- Full extracted title
ALTER TABLE website_pages ADD COLUMN crawl_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE website_pages ADD COLUMN extraction_method VARCHAR(20) DEFAULT 'wget';
ALTER TABLE website_pages ADD COLUMN careers_keywords TEXT; -- Matched career terms

-- Indexes for performance
CREATE INDEX website_pages_relevance_idx ON website_pages(relevance_score DESC);
CREATE INDEX website_pages_careers_idx ON website_pages(is_careers_page);
CREATE INDEX website_pages_crawl_status_idx ON website_pages(crawl_status);
```

### **Migration Tracking Table**
```sql
-- Track migration progress per company
CREATE TABLE sitemap_migration_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) NOT NULL,
    website_url VARCHAR(500),
    migration_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    pages_found INTEGER DEFAULT 0,
    careers_pages_found INTEGER DEFAULT 0,
    relevant_pages_stored INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX migration_progress_company_idx ON sitemap_migration_progress(company_id);
CREATE INDEX migration_progress_status_idx ON sitemap_migration_progress(migration_status);
```

---

## 🕷️ **Phase 2: Wget Crawling Strategy**

### **Careers Page Priority Detection**
```javascript
const CAREERS_PATTERNS = {
  // HIGHEST PRIORITY - Direct careers indicators
  critical: [
    /\/(careers?|jobs?|employment|join-us|work-with-us|opportunities)/i,
    /\/(recruiting|recruitment|job-openings|open-positions)/i,
    /\/(work-here|join-our-team|job-search|current-openings)/i
  ],
  
  // HIGH PRIORITY - Career-adjacent pages
  high: [
    /\/(talent|people|human-resources|hr|job-board)/i,
    /\/(internships?|graduate-programs?|entry-level)/i,
    /\/(life-at|culture|benefits|why-work)/i
  ],
  
  // Keywords in URL parameters or fragments
  keywords: ['career', 'job', 'employ', 'recruit', 'work', 'join', 'opportunity']
};
```

### **Relevance Scoring Algorithm**
```javascript
function calculatePageRelevance(url, title = '') {
  let score = 0;
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // CAREERS PAGES - HIGHEST PRIORITY (100 points)
  for (const pattern of CAREERS_PATTERNS.critical) {
    if (pattern.test(urlLower)) return 100;
  }
  
  for (const pattern of CAREERS_PATTERNS.high) {
    if (pattern.test(urlLower)) score += 95;
  }
  
  // Check title for careers keywords
  const careersInTitle = CAREERS_PATTERNS.keywords.some(keyword => 
    titleLower.includes(keyword));
  if (careersInTitle) score += 90;
  
  // HIGH VALUE BUSINESS PAGES (80-90 points)
  if (/\/(about|company|leadership|management)/i.test(urlLower)) score += 85;
  if (/\/(products?|services?|solutions?)/i.test(urlLower)) score += 80;
  if (/\/(investors?|financial|annual-report)/i.test(urlLower)) score += 80;
  
  // MEDIUM VALUE PAGES (60-70 points)
  if (/\/(news|press|media|blog)/i.test(urlLower)) score += 65;
  if (/\/(case-studies?|success-stories)/i.test(urlLower)) score += 60;
  if (/\/(partners?|locations?|offices?)/i.test(urlLower)) score += 60;
  
  // URL quality bonuses/penalties
  const pathDepth = url.split('/').length - 3; // Exclude protocol and domain
  score -= pathDepth * 2; // Penalty for deep pages
  
  if (url.includes('?')) score -= 10; // Penalty for parameters
  if (url.length > 100) score -= 5; // Penalty for long URLs
  
  return Math.max(0, Math.min(100, score));
}
```

### **Wget Command Strategy**
```bash
# Primary crawl: Focus on high-value sections
wget --spider --recursive --level=3 \
     --domains=${DOMAIN} \
     --include-directories="/careers,/jobs,/about,/company,/products,/services,/news,/investors" \
     --exclude-directories="/support,/help,/legal,/privacy,/search,/login" \
     --reject="*.pdf,*.jpg,*.png,*.gif,*.css,*.js,*.zip" \
     --wait=2 --random-wait \
     --user-agent="MinnesotaDirectory-RelevantPageBot/1.0" \
     --output-file="${LOG_FILE}" \
     "${COMPANY_URL}"

# Secondary crawl: Broader search if careers not found in primary
if [ $CAREERS_FOUND -eq 0 ]; then
  wget --spider --recursive --level=2 \
       --domains=${DOMAIN} \
       --accept-regex=".*(career|job|employ|recruit|work|join|opportun).*" \
       --output-file="${LOG_FILE_SECONDARY}" \
       "${COMPANY_URL}"
fi
```

---

## ⚡ **Phase 3: Implementation Strategy**

### **Batch Processing System**
```javascript
class WgetSitemapMigration {
  constructor() {
    this.batchSize = 25; // Smaller batches for stability
    this.parallelWorkers = 5; // Conservative parallel processing
    this.delayBetweenBatches = 45; // seconds
    this.maxRetries = 2;
    this.timeoutPerCompany = 45; // seconds
  }

  async processBatch(companies) {
    console.log(`🚀 Processing batch of ${companies.length} companies`);
    
    const results = await Promise.allSettled(
      companies.map(company => this.processCompany(company))
    );
    
    // Log batch results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;
    console.log(`✅ Batch complete: ${successful} success, ${failed} failed`);
    
    return { successful, failed };
  }

  async processCompany(company) {
    const startTime = Date.now();
    
    try {
      // 1. Update migration status
      await this.updateMigrationStatus(company.id, 'processing');
      
      // 2. Extract relevant pages with wget
      const pages = await this.extractRelevantPages(company);
      
      // 3. Prioritize careers pages
      const prioritizedPages = this.prioritizeCareersPages(pages);
      
      // 4. Store top 20 pages in database
      await this.storeRelevantPages(company.id, prioritizedPages.slice(0, 20));
      
      // 5. Update completion status
      await this.updateMigrationStatus(company.id, 'completed', {
        pagesFound: pages.length,
        careersPages: prioritizedPages.filter(p => p.isCareersPage).length,
        relevantPagesStored: Math.min(20, prioritizedPages.length),
        processingTime: Date.now() - startTime
      });
      
      return { success: true, company: company.name, pages: pages.length };
      
    } catch (error) {
      console.error(`❌ Failed processing ${company.name}:`, error.message);
      
      await this.updateMigrationStatus(company.id, 'failed', {
        errorMessage: error.message,
        processingTime: Date.now() - startTime
      });
      
      throw error;
    }
  }
}
```

### **Careers Page Prioritization Logic**
```javascript
prioritizeCareersPages(pages) {
  // 1. Identify careers pages
  pages.forEach(page => {
    page.isCareersPage = this.isCareersPage(page.url, page.title);
    if (page.isCareersPage) {
      page.relevanceScore = 100; // Maximum score
      page.pageType = 'careers';
    }
  });
  
  // 2. Sort by relevance (careers first, then by score)
  return pages.sort((a, b) => {
    if (a.isCareersPage && !b.isCareersPage) return -1;
    if (!a.isCareersPage && b.isCareersPage) return 1;
    return b.relevanceScore - a.relevanceScore;
  });
}

isCareersPage(url, title = '') {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Check URL patterns
  const hasCareersUrl = CAREERS_PATTERNS.critical.some(pattern => pattern.test(urlLower)) ||
                       CAREERS_PATTERNS.high.some(pattern => pattern.test(urlLower));
  
  // Check title keywords
  const hasCareersTitle = CAREERS_PATTERNS.keywords.some(keyword => 
    titleLower.includes(keyword));
  
  return hasCareersUrl || hasCareersTitle;
}
```

---

## 📈 **Phase 4: Execution Timeline**

### **Week 1: Setup & Testing**
- [ ] Deploy database schema changes
- [ ] Create migration tracking table
- [ ] Build wget extraction service
- [ ] Test with 50 companies (sample validation)

### **Week 2-3: Staged Migration**
- [ ] **Stage 1**: Top 500 companies (highest revenue) - 2 days
- [ ] **Stage 2**: Next 1,000 companies - 4 days  
- [ ] **Stage 3**: Remaining 1,265 companies - 6 days
- [ ] Buffer time for retries and error handling

### **Week 4: Validation & Cleanup**
- [ ] Data quality validation
- [ ] Careers page coverage analysis
- [ ] Performance testing with new data
- [ ] Clean up old irrelevant pages

---

## 📊 **Phase 5: Monitoring & Quality Control**

### **Real-time Monitoring Dashboard**
```sql
-- Migration progress query
SELECT 
  migration_status,
  COUNT(*) as companies,
  AVG(relevant_pages_stored) as avg_pages,
  SUM(careers_pages_found) as total_careers_pages,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_minutes
FROM sitemap_migration_progress 
GROUP BY migration_status;

-- Careers page coverage
SELECT 
  CASE 
    WHEN careers_pages_found > 0 THEN 'Has Careers Page'
    ELSE 'No Careers Page'
  END as careers_status,
  COUNT(*) as companies,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM sitemap_migration_progress 
WHERE migration_status = 'completed'
GROUP BY careers_pages_found > 0;
```

### **Quality Metrics to Track**
- **Careers Page Coverage**: % of companies with careers pages found
- **Average Relevance Score**: Quality of extracted pages
- **Success Rate**: % of companies processed successfully
- **Processing Speed**: Companies per hour
- **Error Categories**: Most common failure reasons

### **Alert Thresholds**
- Success rate drops below 80%
- Average processing time > 60 seconds per company
- Careers page coverage < 60%
- More than 5 consecutive failures

---

## 🛠️ **Phase 6: Implementation Scripts**

### **Main Migration Script**
```bash
#!/bin/bash
# run-sitemap-migration.sh

echo "🚀 Starting Wget Sitemap Migration"
echo "Target: 2,765 companies with 20 relevant pages each"
echo "Priority: MUST HAVE careers/jobs pages"

# Setup
mkdir -p logs/migration
mkdir -p temp/wget-crawls

# Start migration process
node scripts/wget-sitemap-migrator.js \
  --batch-size=25 \
  --parallel-workers=5 \
  --max-retries=2 \
  --careers-priority=true \
  --output-dir="logs/migration" \
  --resume-from-failures=true

echo "✅ Migration completed. Check logs/migration for details."
```

### **Progress Monitoring Script**
```javascript
// scripts/monitor-migration.js
setInterval(async () => {
  const progress = await sql`
    SELECT 
      migration_status,
      COUNT(*) as count,
      AVG(relevant_pages_stored) as avg_pages
    FROM sitemap_migration_progress 
    GROUP BY migration_status
  `;
  
  console.log(`📊 Migration Progress:`);
  progress.forEach(row => {
    console.log(`  ${row.migration_status}: ${row.count} companies (avg: ${row.avg_pages} pages)`);
  });
}, 30000); // Update every 30 seconds
```

---

## 🎯 **Expected Outcomes**

### **Data Quality Improvements**
- **Relevance**: 95% of pages will be business-relevant vs current ~20%
- **Careers Coverage**: 75%+ of companies will have careers pages identified
- **Database Size**: 80% reduction in total pages, 10x improvement in quality
- **User Experience**: Much more useful company information

### **Performance Metrics**
- **Total Processing Time**: ~8-12 hours (with parallelization)
- **Success Rate Target**: >85% of companies successfully processed
- **Careers Page Discovery**: >60% of companies with identifiable careers sections
- **Storage Efficiency**: ~40MB total vs current ~200MB+ of sitemap data

### **Business Value**
- **Enhanced Company Profiles**: Users get immediate access to careers, products, leadership info
- **Better Search Results**: More relevant pages improve internal search quality
- **Competitive Advantage**: Most comprehensive careers data for Minnesota companies
- **Reduced Maintenance**: Simpler, more focused dataset requires less ongoing management

---

## ✅ **Success Criteria**
1. ✅ **Careers Page Coverage**: >60% of companies have careers pages identified
2. ✅ **Data Quality**: Average relevance score >75 across all extracted pages
3. ✅ **Processing Efficiency**: Complete migration within 2 weeks
4. ✅ **System Stability**: <5% error rate during migration
5. ✅ **Storage Optimization**: Reduce sitemap data storage by >80%

This plan transforms your sitemap data from generic, low-value pages to a curated collection of the most important business information for each Minnesota company, with special emphasis on career opportunities!
