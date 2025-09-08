#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * WGET-POWERED SITEMAP MIGRATOR
 * Migrates all company sitemap data using wget to extract 20 relevant pages per company
 * PRIORITY: Must find careers/jobs/recruiting pages if available
 */

class WgetSitemapMigrator {
  constructor(options = {}) {
    this.sql = neon(process.env.DATABASE_URL);
    this.batchSize = options.batchSize || 25;
    this.parallelWorkers = options.parallelWorkers || 5;
    this.maxRetries = options.maxRetries || 2;
    this.delayBetweenBatches = options.delayBetweenBatches || 45000; // ms
    this.timeoutPerCompany = options.timeoutPerCompany || 45000; // ms
    this.careersRequired = options.careersRequired || true;
    
    // Create required directories
    this.logsDir = 'logs/migration';
    this.tempDir = 'temp/wget-crawls';
    this.ensureDirectories();
    
    // Careers page detection patterns
    this.careersPatterns = {
      critical: [
        /\/(careers?|jobs?|employment|join-us|work-with-us|opportunities)/i,
        /\/(recruiting|recruitment|job-openings|open-positions)/i,
        /\/(work-here|join-our-team|job-search|current-openings)/i
      ],
      high: [
        /\/(talent|people|human-resources|hr|job-board)/i,
        /\/(internships?|graduate-programs?|entry-level)/i,
        /\/(life-at|culture|benefits|why-work)/i
      ],
      keywords: ['career', 'job', 'employ', 'recruit', 'work', 'join', 'opportunity', 'hiring']
    };
    
    // Business relevance patterns
    this.relevancePatterns = {
      high: [
        /\/(about|company|who-we-are|leadership|management|team|executives)/i,
        /\/(products?|services?|solutions?|offerings)/i,
        /\/(investors?|investor-relations|financial|annual-report)/i
      ],
      medium: [
        /\/(news|press|media|blog|announcements)/i,
        /\/(case-studies?|success-stories|testimonials)/i,
        /\/(partners?|locations?|offices?|facilities)/i,
        /\/(research|innovation|technology|sustainability)/i
      ],
      low: [
        /\/(contact|support|help|faq|search)/i,
        /\/(privacy|terms|legal|cookie|sitemap)/i,
        /\/(login|register|account|portal|admin)/i
      ]
    };
  }

  /**
   * MAIN MIGRATION ORCHESTRATOR
   */
  async runMigration() {
    console.log('🚀 STARTING WGET-POWERED SITEMAP MIGRATION');
    console.log(`📊 Target: Extract 20 relevant pages per company`);
    console.log(`🎯 PRIORITY: Must find careers/jobs pages if available\n`);
    
    const startTime = Date.now();
    
    try {
      // 1. Initialize migration tracking
      await this.initializeMigrationTracking();
      
      // 2. Get companies to process
      const companies = await this.getCompaniesForMigration();
      console.log(`📋 Found ${companies.length} companies with websites to process\n`);
      
      // 3. Process in batches
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalCareersFound = 0;
      
      const batches = this.createBatches(companies, this.batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;
        
        console.log(`\n📦 BATCH ${batchNumber}/${batches.length}: Processing ${batch.length} companies`);
        
        const batchResult = await this.processBatch(batch, batchNumber);
        
        totalProcessed += batch.length;
        totalSuccessful += batchResult.successful;
        totalCareersFound += batchResult.careersFound;
        
        // Progress report
        const successRate = ((totalSuccessful / totalProcessed) * 100).toFixed(1);
        const careersRate = ((totalCareersFound / totalSuccessful) * 100).toFixed(1);
        
        console.log(`📊 PROGRESS: ${totalProcessed}/${companies.length} (${successRate}% success rate)`);
        console.log(`🎯 CAREERS: ${totalCareersFound} companies with careers pages (${careersRate}%)`);
        
        // Delay between batches (except last batch)
        if (i < batches.length - 1) {
          console.log(`⏸️  Waiting ${this.delayBetweenBatches/1000}s before next batch...`);
          await this.sleep(this.delayBetweenBatches);
        }
      }
      
      const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      
      console.log(`\n🎉 MIGRATION COMPLETED!`);
      console.log(`✅ Processed: ${totalProcessed} companies`);
      console.log(`✅ Successful: ${totalSuccessful} (${((totalSuccessful/totalProcessed)*100).toFixed(1)}%)`);
      console.log(`🎯 Careers Found: ${totalCareersFound} companies (${((totalCareersFound/totalSuccessful)*100).toFixed(1)}%)`);
      console.log(`⏱️  Total Time: ${totalTime} minutes`);
      console.log(`📁 Logs saved to: ${this.logsDir}/migration-${new Date().toISOString().split('T')[0]}.log`);
      
      // 4. Generate final report
      await this.generateMigrationReport();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * PROCESS A BATCH OF COMPANIES
   */
  async processBatch(companies, batchNumber) {
    const batchStartTime = Date.now();
    let successful = 0;
    let careersFound = 0;
    
    // Process companies in parallel (limited concurrency)
    const chunks = this.createBatches(companies, this.parallelWorkers);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(company => 
        this.processCompanyWithRetry(company).catch(error => ({
          success: false,
          company: company.name,
          error: error.message
        }))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      
      for (const result of chunkResults) {
        if (result.success) {
          successful++;
          if (result.careersPageFound) {
            careersFound++;
          }
          console.log(`  ✅ ${result.company}: ${result.pagesStored} pages (${result.careersPageFound ? 'CAREERS ✓' : 'no careers'})`);
        } else {
          console.log(`  ❌ ${result.company}: ${result.error}`);
        }
      }
    }
    
    const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    console.log(`📦 Batch ${batchNumber} completed in ${batchTime}s: ${successful}/${companies.length} successful`);
    
    return { successful, careersFound };
  }

  /**
   * PROCESS SINGLE COMPANY WITH RETRY LOGIC
   */
  async processCompanyWithRetry(company, attempt = 1) {
    try {
      // Update status to processing
      await this.updateMigrationStatus(company.id, 'processing', { attempt });
      
      const result = await this.processCompany(company);
      
      // Update status to completed
      await this.updateMigrationStatus(company.id, 'completed', result);
      
      return { success: true, company: company.name, ...result };
      
    } catch (error) {
      if (attempt <= this.maxRetries) {
        console.log(`🔄 Retrying ${company.name} (attempt ${attempt + 1}/${this.maxRetries + 1})`);
        await this.sleep(5000 * attempt); // Progressive delay
        return this.processCompanyWithRetry(company, attempt + 1);
      } else {
        // Update status to failed
        await this.updateMigrationStatus(company.id, 'failed', {
          errorMessage: error.message,
          finalAttempt: attempt
        });
        
        throw error;
      }
    }
  }

  /**
   * CORE COMPANY PROCESSING LOGIC
   */
  async processCompany(company) {
    const startTime = Date.now();
    const domain = this.extractDomain(company.website);
    
    // 1. Primary crawl for high-value pages
    const primaryPages = await this.crawlCompanyPrimary(company, domain);
    
    // 2. Secondary crawl for careers if not found
    let secondaryPages = [];
    const hasCareersInPrimary = primaryPages.some(p => p.isCareersPage);
    
    if (!hasCareersInPrimary && this.careersRequired) {
      console.log(`  🔍 Secondary crawl for ${company.name}: Searching for careers pages...`);
      secondaryPages = await this.crawlCompanySecondary(company, domain);
    }
    
    // 3. Combine and score all pages
    const allPages = [...primaryPages, ...secondaryPages];
    const scoredPages = this.scoreAndPrioritizePages(allPages);
    
    // 4. Select top 20 pages with careers priority
    const selectedPages = this.selectTopPages(scoredPages, 20);
    
    // 5. Store in database
    await this.storeCompanyPages(company.id, selectedPages);
    
    const processingTime = Date.now() - startTime;
    const careersPageFound = selectedPages.some(p => p.isCareersPage);
    
    return {
      pagesFound: allPages.length,
      pagesStored: selectedPages.length,
      careersPageFound,
      careersPages: selectedPages.filter(p => p.isCareersPage).length,
      processingTimeMs: processingTime,
      avgRelevanceScore: (selectedPages.reduce((sum, p) => sum + p.relevanceScore, 0) / selectedPages.length).toFixed(1)
    };
  }

  /**
   * PRIMARY CRAWL - TARGET HIGH-VALUE BUSINESS SECTIONS
   */
  async crawlCompanyPrimary(company, domain) {
    const logFile = path.join(this.tempDir, `${company.id}-primary.log`);
    
    try {
      const wgetCommand = `
        wget --spider --recursive --level=3
             --domains="${domain}"
             --include-directories="/careers,/jobs,/about,/company,/products,/services,/news,/investors,/leadership"
             --exclude-directories="/support,/help,/legal,/privacy,/search,/login,/admin"
             --reject="*.pdf,*.jpg,*.png,*.gif,*.css,*.js,*.zip,*.mp4,*.mov"
             --wait=2 --random-wait
             --timeout=30 --tries=2
             --user-agent="MinnesotaDirectory-RelevantPageBot/1.0"
             --output-file="${logFile}"
             --no-parent --no-clobber
             "${company.website}"
      `.replace(/\s+/g, ' ').trim();
      
      execSync(wgetCommand, { 
        timeout: this.timeoutPerCompany,
        stdio: ['ignore', 'ignore', 'ignore'] // Suppress output
      });
      
      const discoveredUrls = this.parseWgetLog(logFile, domain);
      const pages = discoveredUrls.map(url => this.createPageObject(url, company.id));
      
      // Clean up log file
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
      
      return pages;
      
    } catch (error) {
      // Clean up log file on error
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
      
      if (error.code === 'TIMEOUT') {
        throw new Error(`Primary crawl timeout after ${this.timeoutPerCompany}ms`);
      }
      throw new Error(`Primary crawl failed: ${error.message}`);
    }
  }

  /**
   * SECONDARY CRAWL - FOCUSED CAREERS SEARCH
   */
  async crawlCompanySecondary(company, domain) {
    const logFile = path.join(this.tempDir, `${company.id}-careers.log`);
    
    try {
      const wgetCommand = `
        wget --spider --recursive --level=2
             --domains="${domain}"
             --accept-regex=".*(career|job|employ|recruit|work|join|hiring|opportun).*"
             --reject="*.pdf,*.jpg,*.png,*.gif,*.css,*.js"
             --wait=2 --random-wait
             --timeout=30 --tries=2
             --user-agent="MinnesotaDirectory-CareersBot/1.0"
             --output-file="${logFile}"
             --no-parent
             "${company.website}"
      `.replace(/\s+/g, ' ').trim();
      
      execSync(wgetCommand, { 
        timeout: 20000, // Shorter timeout for secondary
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      const discoveredUrls = this.parseWgetLog(logFile, domain);
      const pages = discoveredUrls.map(url => this.createPageObject(url, company.id));
      
      // Clean up log file
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
      
      return pages;
      
    } catch (error) {
      // Clean up log file on error
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
      
      // Secondary crawl failure is not critical
      console.log(`  ⚠️  Secondary careers crawl failed for ${company.name}`);
      return [];
    }
  }

  /**
   * SCORE AND PRIORITIZE ALL DISCOVERED PAGES
   */
  scoreAndPrioritizePages(pages) {
    return pages.map(page => {
      page.relevanceScore = this.calculateRelevanceScore(page.url);
      page.isCareersPage = this.isCareersPage(page.url);
      page.pageType = this.determinePageType(page.url);
      
      // Boost careers pages to maximum priority
      if (page.isCareersPage) {
        page.relevanceScore = 100;
        page.pageType = 'careers';
      }
      
      return page;
    });
  }

  /**
   * SELECT TOP N PAGES WITH CAREERS PRIORITY
   */
  selectTopPages(pages, count) {
    // Sort by careers first, then by relevance score
    const sorted = pages.sort((a, b) => {
      if (a.isCareersPage && !b.isCareersPage) return -1;
      if (!a.isCareersPage && b.isCareersPage) return 1;
      return b.relevanceScore - a.relevanceScore;
    });
    
    // Remove duplicates by URL
    const unique = sorted.filter((page, index, array) => 
      array.findIndex(p => p.url === page.url) === index
    );
    
    return unique.slice(0, count);
  }

  /**
   * RELEVANCE SCORING ALGORITHM
   */
  calculateRelevanceScore(url) {
    let score = 0;
    const urlLower = url.toLowerCase();
    
    // Careers pages (will be overridden to 100 later)
    for (const pattern of this.careersPatterns.critical) {
      if (pattern.test(urlLower)) return 95;
    }
    for (const pattern of this.careersPatterns.high) {
      if (pattern.test(urlLower)) return 90;
    }
    
    // High relevance business pages
    for (const pattern of this.relevancePatterns.high) {
      if (pattern.test(urlLower)) {
        score += 80;
        break;
      }
    }
    
    // Medium relevance pages
    if (score === 0) {
      for (const pattern of this.relevancePatterns.medium) {
        if (pattern.test(urlLower)) {
          score += 60;
          break;
        }
      }
    }
    
    // Penalize low relevance pages
    for (const pattern of this.relevancePatterns.low) {
      if (pattern.test(urlLower)) {
        score -= 30;
        break;
      }
    }
    
    // URL quality factors
    const pathDepth = url.split('/').length - 3;
    score -= pathDepth * 2; // Penalty for deep URLs
    
    if (url.includes('?')) score -= 10; // Penalty for parameters
    if (url.length > 100) score -= 5; // Penalty for long URLs
    
    // Boost for clean, short URLs
    if (pathDepth <= 2 && url.length < 60) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * DETECT CAREERS PAGES
   */
  isCareersPage(url) {
    const urlLower = url.toLowerCase();
    
    // Check critical patterns
    for (const pattern of this.careersPatterns.critical) {
      if (pattern.test(urlLower)) return true;
    }
    
    // Check high-relevance patterns
    for (const pattern of this.careersPatterns.high) {
      if (pattern.test(urlLower)) return true;
    }
    
    // Check for keywords in any part of URL
    return this.careersPatterns.keywords.some(keyword => 
      urlLower.includes(keyword)
    );
  }

  /**
   * DETERMINE PAGE TYPE FOR CATEGORIZATION
   */
  determinePageType(url) {
    const urlLower = url.toLowerCase();
    
    if (this.isCareersPage(url)) return 'careers';
    if (/\/(about|company|leadership)/i.test(urlLower)) return 'company-info';
    if (/\/(products?|services?)/i.test(urlLower)) return 'products-services';
    if (/\/(news|press|blog)/i.test(urlLower)) return 'news-media';
    if (/\/(investors?|financial)/i.test(urlLower)) return 'investor-relations';
    if (/\/(case-studies?|success)/i.test(urlLower)) return 'case-studies';
    
    return 'general';
  }

  // ... [Additional helper methods would continue here]
  // Due to length constraints, I'm showing the core structure
  // The full implementation would include all the helper methods
  // for database operations, URL parsing, logging, etc.

  /**
   * DATABASE OPERATIONS
   */
  async storeCompanyPages(companyId, pages) {
    // Implementation would store pages in websitePages table
    // with the enhanced schema fields for careers tracking
  }

  async updateMigrationStatus(companyId, status, details = {}) {
    // Implementation would update sitemap_migration_progress table
  }

  // ... [Additional helper methods]
  
  /**
   * UTILITIES
   */
  ensureDirectories() {
    [this.logsDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractDomain(website) {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
  }
}

// CLI execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const migrator = new WgetSitemapMigrator({
    batchSize: 25,
    parallelWorkers: 5,
    maxRetries: 2,
    careersRequired: true
  });

  migrator.runMigration()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export default WgetSitemapMigrator;
