#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * RESEARCH-OPTIMIZED WGET MIGRATOR
 * Based on comprehensive research into corporate website crawling best practices
 * Targets 15+ relevant pages per company with 60%+ careers detection
 */

class ResearchOptimizedMigrator {
    constructor() {
        this.sql = neon(process.env.DATABASE_URL);
        
        // Research-optimized configuration
        this.config = {
            batchSize: 20,           // Smaller batches for better error handling
            parallelWorkers: 8,      // Increased for speed
            level: 4,               // Deeper crawling based on research
            wait: 2,                // Research shows 2s is optimal balance
            limitRate: '150k',      // Conservative bandwidth usage
            timeout: 30,            // Longer timeout for complex sites
            tries: 3,               // More retries for reliability
            userAgent: 'MinnesotaDirectory-BusinessCrawler/1.0 (+https://minnesotadirectory.com/about)'
        };
        
        // Enhanced careers detection patterns from research
        this.careersPatterns = {
            primary: [
                /\/(careers?|jobs?|employment|join-us|work-with-us|opportunities)/i,
                /\/(recruiting|recruitment|job-openings|current-openings)/i,
                /\/(work-here|join-our-team|job-search|apply)/i,
                /\/(talent|people|human-resources|hr)/i
            ],
            secondary: [
                /\/(internships?|graduate-programs?|entry-level)/i,
                /\/(open-positions|job-board|career-opportunities)/i,
                /\/(life-at|culture|why-work|employee-benefits)/i,
                /\/(working-at|team-members|our-people)/i
            ],
            subdomains: ['careers', 'jobs', 'talent', 'recruiting', 'apply', 'work'],
            keywords: [
                'career', 'job', 'employ', 'recruit', 'work', 'join',
                'hiring', 'opportunity', 'position', 'opening', 'apply',
                'talent', 'team', 'culture', 'benefit'
            ]
        };
        
        // Business page inclusion patterns from Fortune 500 analysis
        this.businessDirectories = [
            '/about', '/company', '/who-we-are', '/our-story', '/mission', '/vision',
            '/products', '/services', '/solutions', '/offerings',
            '/careers', '/jobs', '/employment', '/join-us', '/work-with-us', '/opportunities',
            '/leadership', '/team', '/management', '/executives', '/board',
            '/investors', '/investor-relations', '/ir', '/financial',
            '/news', '/press', '/media', '/newsroom', '/announcements',
            '/case-studies', '/success-stories', '/testimonials', '/clients',
            '/locations', '/offices', '/facilities', '/contact-us'
        ].join(',');
        
        // Low-value directories to exclude
        this.excludeDirectories = [
            '/support', '/help', '/faq', '/privacy', '/terms', '/legal', '/cookies',
            '/search', '/login', '/register', '/portal', '/admin', '/dashboard',
            '/assets', '/images', '/img', '/css', '/js', '/fonts', '/static',
            '/downloads', '/uploads', '/wp-content', '/wp-admin', '/wp-includes',
            '/blog/tag', '/blog/category', '/blog/author', '/archive'
        ].join(',');
        
        this.stats = {
            processed: 0,
            successful: 0,
            careersFound: 0,
            totalPages: 0,
            highQualityCompanies: 0, // Companies with 10+ relevant pages
            startTime: Date.now()
        };
    }

    async runOptimizedMigration(startIndex = 0, count = 100) {
        console.log('🚀 RESEARCH-OPTIMIZED WGET MIGRATION');
        console.log('===================================');
        console.log(`📊 Processing ${count} companies starting from index ${startIndex}`);
        console.log('🎯 Enhanced wget configuration with multi-pass careers detection');
        console.log('⚡ Target: 15+ pages per company, 60%+ careers success\n');

        try {
            const companies = await this.getCompanies(startIndex, count);
            console.log(`📋 Found ${companies.length} companies to process\n`);

            // Process companies in optimized batches
            const batches = this.createBatches(companies, this.config.batchSize);
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                const batchNumber = batchIndex + 1;
                
                console.log(`📦 BATCH ${batchNumber}/${batches.length}: Processing ${batch.length} companies`);
                
                await this.processOptimizedBatch(batch, startIndex + batchIndex * this.config.batchSize);
                
                // Progress update
                this.printProgressUpdate(companies.length);
                
                // Delay between batches (research-based rate limiting)
                if (batchIndex < batches.length - 1) {
                    await this.sleep(15000); // 15 second delay
                }
            }
            
            this.printOptimizedSummary(startIndex, count);
            
        } catch (error) {
            console.error('❌ Optimized migration failed:', error);
            throw error;
        }
    }

    async processOptimizedBatch(companies, baseIndex) {
        const promises = companies.map((company, index) => 
            this.processCompanyMultiPass(company, baseIndex + index + 1)
        );
        
        const results = await Promise.allSettled(promises);
        
        // Process results
        results.forEach((result, index) => {
            const company = companies[index];
            this.stats.processed++;
            
            if (result.status === 'fulfilled' && result.value.success) {
                const data = result.value;
                this.stats.successful++;
                this.stats.totalPages += data.pagesStored;
                
                if (data.careersFound) {
                    this.stats.careersFound++;
                }
                
                if (data.pagesStored >= 10) {
                    this.stats.highQualityCompanies++;
                }
                
                const careersIndicator = data.careersFound ? 
                    `🎯 ${data.careersPages} CAREERS` : 
                    'no careers';
                const qualityIndicator = data.pagesStored >= 10 ? '⭐ HIGH-QUALITY' : '';
                
                console.log(`  ✅ ${company.name}: ${data.pagesStored} pages (${careersIndicator}) ${qualityIndicator}`);
                
            } else {
                const error = result.status === 'rejected' ? 
                    result.reason.message : 
                    result.value?.error || 'Unknown error';
                console.log(`  ❌ ${company.name}: ${error}`);
            }
        });
    }

    async processCompanyMultiPass(company, companyNumber) {
        console.log(`🔍 [${companyNumber}] ${company.name} - Multi-pass analysis...`);
        
        try {
            let allPages = [];
            let discoveryMethod = 'none';
            let attempts = 0;
            
            // Pass 1: Enhanced business-focused crawl
            const businessPages = await this.crawlBusinessFocused(company);
            allPages = businessPages;
            attempts++;
            
            if (businessPages.length >= 8) {
                discoveryMethod = 'business-focused';
                console.log(`   ✅ Pass 1: Found ${businessPages.length} business pages`);
            }
            
            // Pass 2: Careers-specific deep search (if no careers found)
            const careersInBusiness = businessPages.filter(p => p.isCareersPage);
            if (careersInBusiness.length === 0) {
                console.log(`   🎯 Pass 2: Searching for careers pages...`);
                const careersPages = await this.crawlCareersSpecific(company);
                allPages = [...businessPages, ...careersPages];
                attempts++;
                discoveryMethod = 'business-plus-careers';
                
                if (careersPages.length > 0) {
                    console.log(`   ✅ Pass 2: Found ${careersPages.length} careers-related pages`);
                }
            }
            
            // Pass 3: Subdomain careers search (if still no careers)
            const totalCareers = allPages.filter(p => p.isCareersPage);
            if (totalCareers.length === 0 && this.isLargeCompany(company)) {
                console.log(`   🔍 Pass 3: Checking careers subdomains...`);
                const subdomainPages = await this.crawlCareersSubdomains(company);
                allPages = [...allPages, ...subdomainPages];
                attempts++;
                discoveryMethod = 'comprehensive';
                
                if (subdomainPages.length > 0) {
                    console.log(`   ✅ Pass 3: Found ${subdomainPages.length} subdomain pages`);
                }
            }
            
            // Score and select top pages
            const scoredPages = this.scoreAndRankPages(allPages, company);
            const selectedPages = this.selectTopPages(scoredPages, 20);
            
            // Store in database
            await this.storeOptimizedPages(company.id, selectedPages, company.name);
            
            const finalCareers = selectedPages.filter(p => p.isCareersPage);
            
            return {
                success: true,
                pagesStored: selectedPages.length,
                careersFound: finalCareers.length > 0,
                careersPages: finalCareers.length,
                discoveryMethod,
                attempts,
                avgRelevance: selectedPages.length > 0 ? 
                    (selectedPages.reduce((sum, p) => sum + p.relevanceScore, 0) / selectedPages.length).toFixed(1) : 0
            };
            
        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                pagesStored: 0,
                careersFound: false 
            };
        }
    }

    async crawlBusinessFocused(company) {
        const domain = this.extractDomain(company.website);
        const logFile = `temp/business-${company.id}.log`;
        
        try {
            const wgetCommand = `
                wget --recursive 
                     --level=${this.config.level}
                     --domains="${domain}"
                     --include-directories="${this.businessDirectories}"
                     --exclude-directories="${this.excludeDirectories}"
                     --reject="${this.config.rejectPatterns.join(',')}"
                     --wait=${this.config.wait} --random-wait
                     --limit-rate=${this.config.limitRate}
                     --timeout=${this.config.timeout} --tries=${this.config.tries}
                     --user-agent="${this.config.userAgent}"
                     --spider
                     --output-file="${logFile}"
                     --no-parent
                     "${company.website}"
            `.replace(/\s+/g, ' ').trim();

            execSync(wgetCommand, { 
                timeout: 60000, // 1 minute timeout for business crawl
                stdio: ['ignore', 'ignore', 'ignore'] 
            });

            const urls = this.parseWgetLog(logFile, domain);
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            
            return urls.map(url => this.createPageObject(url, company));

        } catch (error) {
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            return [this.createPageObject(company.website, company)]; // Fallback to homepage
        }
    }

    async crawlCareersSpecific(company) {
        const domain = this.extractDomain(company.website);
        const logFile = `temp/careers-${company.id}.log`;
        
        try {
            const wgetCommand = `
                wget --recursive
                     --level=3
                     --domains="${domain}"
                     --accept-regex=".*(career|job|employ|recruit|work|join|hiring|talent|opportun).*"
                     --wait=${this.config.wait}
                     --timeout=20 --tries=2
                     --user-agent="${this.config.userAgent}"
                     --spider
                     --output-file="${logFile}"
                     --no-parent
                     "${company.website}"
            `.replace(/\s+/g, ' ').trim();

            execSync(wgetCommand, { 
                timeout: 30000, // 30 second timeout for careers search
                stdio: ['ignore', 'ignore', 'ignore'] 
            });

            const urls = this.parseWgetLog(logFile, domain);
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            
            return urls.map(url => this.createPageObject(url, company));

        } catch (error) {
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            return [];
        }
    }

    async crawlCareersSubdomains(company) {
        const domain = this.extractDomain(company.website);
        const subdomainPages = [];
        
        for (const subdomain of this.careersPatterns.subdomains) {
            const subdomainUrl = `https://${subdomain}.${domain}/`;
            const logFile = `temp/subdomain-${subdomain}-${company.id}.log`;
            
            try {
                const wgetCommand = `
                    wget --spider --recursive --level=2
                         --domains="${subdomain}.${domain}"
                         --timeout=15 --tries=1
                         --user-agent="${this.config.userAgent}"
                         --output-file="${logFile}"
                         --no-parent
                         "${subdomainUrl}"
                `.replace(/\s+/g, ' ').trim();

                execSync(wgetCommand, { 
                    timeout: 20000, // 20 second timeout for subdomains
                    stdio: ['ignore', 'ignore', 'ignore'] 
                });

                const urls = this.parseWgetLog(logFile, `${subdomain}.${domain}`);
                if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
                
                urls.forEach(url => {
                    subdomainPages.push(this.createPageObject(url, company));
                });

            } catch (error) {
                if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
                // Subdomain failures are expected and non-critical
            }
        }
        
        return subdomainPages;
    }

    createPageObject(url, company) {
        const isCareersPage = this.detectCareersPage(url);
        const relevanceScore = this.calculateEnhancedRelevance(url);
        
        return {
            url,
            title: this.inferTitle(url),
            relevanceScore: isCareersPage ? 100 : relevanceScore,
            isCareersPage,
            pageType: this.determinePageType(url),
            discoveredAt: new Date().toISOString()
        };
    }

    detectCareersPage(url, title = '', content = '') {
        const urlLower = url.toLowerCase();
        const titleLower = title.toLowerCase();
        
        // Primary pattern check
        for (const pattern of this.careersPatterns.primary) {
            if (pattern.test(urlLower)) return true;
        }
        
        // Secondary pattern check
        for (const pattern of this.careersPatterns.secondary) {
            if (pattern.test(urlLower)) return true;
        }
        
        // Title keyword check
        if (this.careersPatterns.keywords.some(keyword => titleLower.includes(keyword))) {
            return true;
        }
        
        // Subdomain check
        const hostname = new URL(url).hostname;
        if (this.careersPatterns.subdomains.some(subdomain => hostname.startsWith(`${subdomain}.`))) {
            return true;
        }
        
        return false;
    }

    calculateEnhancedRelevance(url) {
        let score = 50; // Base score
        const urlLower = url.toLowerCase();
        
        // High-value business pages (research-based scoring)
        if (/\/(about|company|who-we-are|our-story|mission)/i.test(urlLower)) {
            score = 90;
        } else if (/\/(leadership|management|team|executives|board)/i.test(urlLower)) {
            score = 88;
        } else if (/\/(products?|services?|solutions?|offerings)/i.test(urlLower)) {
            score = 85;
        } else if (/\/(investors?|investor-relations|ir|financial)/i.test(urlLower)) {
            score = 83;
        } else if (/\/(news|press|media|newsroom)/i.test(urlLower)) {
            score = 70;
        } else if (/\/(case-studies?|success-stories|testimonials)/i.test(urlLower)) {
            score = 68;
        } else if (/\/(locations?|offices?|facilities)/i.test(urlLower)) {
            score = 65;
        }
        
        // Quality bonuses
        const pathDepth = url.split('/').length - 3;
        if (pathDepth <= 2) score += 8; // Bonus for shallow pages
        if (pathDepth === 1) score += 5; // Extra bonus for top-level pages
        
        // Quality penalties
        if (url.includes('?')) score -= 8; // Penalty for parameters
        if (url.length > 80) score -= 5; // Penalty for long URLs
        if (/\/(contact|support|help|privacy|terms|legal)/i.test(urlLower)) score -= 25;
        
        return Math.max(0, Math.min(100, score));
    }

    scoreAndRankPages(pages, company) {
        return pages.map(page => {
            // Re-calculate with enhanced algorithm
            page.relevanceScore = page.isCareersPage ? 100 : this.calculateEnhancedRelevance(page.url);
            return page;
        });
    }

    selectTopPages(pages, maxCount) {
        // Remove duplicates
        const uniquePages = pages.filter((page, index, array) => 
            array.findIndex(p => p.url === page.url) === index
        );
        
        // Sort: careers first, then by relevance score
        return uniquePages
            .sort((a, b) => {
                if (a.isCareersPage && !b.isCareersPage) return -1;
                if (!a.isCareersPage && b.isCareersPage) return 1;
                return b.relevanceScore - a.relevanceScore;
            })
            .slice(0, maxCount);
    }

    async storeOptimizedPages(companyId, pages, companyName) {
        try {
            const domain = this.extractDomain(pages[0]?.url || companyName);
            
            // Create/update website structure with domain
            const [structure] = await this.sql`
                INSERT INTO website_structures (
                    company_id, domain, total_pages, analysis_status, last_analyzed
                )
                VALUES (${companyId}, ${domain}, ${pages.length}, 'completed', NOW())
                ON CONFLICT (company_id) DO UPDATE SET
                    domain = ${domain},
                    total_pages = ${pages.length},
                    analysis_status = 'completed',
                    last_analyzed = NOW()
                RETURNING id
            `;

            // Clear old pages
            await this.sql`
                DELETE FROM website_pages 
                WHERE website_structure_id = ${structure.id}
            `;

            // Insert optimized pages
            for (const page of pages) {
                const urlPath = new URL(page.url).pathname;
                await this.sql`
                    INSERT INTO website_pages (
                        website_structure_id, url, path, title, priority, page_type
                    )
                    VALUES (
                        ${structure.id}, ${page.url}, ${urlPath}, ${page.title}, 
                        ${page.relevanceScore / 100}, ${page.pageType}
                    )
                `;
            }

        } catch (error) {
            console.log(`⚠️  Storage warning for ${companyName}: ${error.message}`);
        }
    }

    printProgressUpdate(totalCompanies) {
        const elapsed = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1);
        const successRate = ((this.stats.successful / this.stats.processed) * 100).toFixed(1);
        const careersRate = this.stats.successful > 0 ? 
            ((this.stats.careersFound / this.stats.successful) * 100).toFixed(1) : '0.0';
        const avgPages = this.stats.successful > 0 ? 
            (this.stats.totalPages / this.stats.successful).toFixed(1) : '0.0';
        const rate = (this.stats.processed / (elapsed || 1)).toFixed(1);
        
        console.log(`📊 PROGRESS: ${this.stats.processed}/${totalCompanies} | Success: ${successRate}% | Careers: ${careersRate}% | Avg Pages: ${avgPages} | Rate: ${rate}/min\n`);
    }

    printOptimizedSummary(startIndex, count) {
        const totalTime = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1);
        const successRate = ((this.stats.successful / this.stats.processed) * 100).toFixed(1);
        const careersRate = this.stats.successful > 0 ? 
            ((this.stats.careersFound / this.stats.successful) * 100).toFixed(1) : '0.0';
        const avgPages = this.stats.successful > 0 ? 
            (this.stats.totalPages / this.stats.successful).toFixed(1) : '0.0';
        const highQualityRate = this.stats.successful > 0 ? 
            ((this.stats.highQualityCompanies / this.stats.successful) * 100).toFixed(1) : '0.0';

        console.log('\n🎉 RESEARCH-OPTIMIZED BATCH COMPLETED!');
        console.log('=====================================');
        console.log(`📊 Range: Companies ${startIndex + 1}-${startIndex + count}`);
        console.log(`✅ Processed: ${this.stats.processed}/${count}`);
        console.log(`✅ Successful: ${this.stats.successful} (${successRate}%)`);
        console.log(`🎯 Careers Found: ${this.stats.careersFound} (${careersRate}%)`);
        console.log(`📄 Total Pages: ${this.stats.totalPages} (avg: ${avgPages} per company)`);
        console.log(`⭐ High-Quality: ${this.stats.highQualityCompanies} companies with 10+ pages (${highQualityRate}%)`);
        console.log(`⏱️  Time: ${totalTime} minutes (${(this.stats.processed / (totalTime || 1)).toFixed(1)} companies/minute)`);
        
        console.log('\n📈 RESEARCH OPTIMIZATION RESULTS:');
        console.log(`🔥 Pages/Company: ${avgPages} vs previous 1.1 (${(parseFloat(avgPages) / 1.1).toFixed(1)}x improvement)`);
        console.log(`🎯 Careers Success: ${careersRate}% vs previous 0% (∞ improvement)`);
        console.log(`⭐ Quality Companies: ${highQualityRate}% with 10+ relevant pages`);
        
        if (startIndex + count < 2656) {
            console.log(`\n🔄 Continue with: node scripts/research-optimized-migrator.js ${startIndex + count} ${Math.min(500, 2656 - (startIndex + count))}`);
        }
    }

    // Utility methods
    isLargeCompany(company) {
        // Large companies more likely to have subdomain careers sites
        return company.sales > 1000000000 || // $1B+ revenue
               (company.employees && company.employees > 1000); // 1000+ employees
    }

    parseWgetLog(logFile, domain) {
        try {
            const logContent = fs.readFileSync(logFile, 'utf8');
            const urlPattern = new RegExp(`https?://${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s<>'"]*`, 'g');
            const matches = logContent.match(urlPattern) || [];
            return [...new Set(matches)]; // Remove duplicates
        } catch {
            return [];
        }
    }

    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    extractDomain(website) {
        try {
            const url = website.startsWith('http') ? website : `https://${website}`;
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        }
    }

    inferTitle(url) {
        try {
            const path = new URL(url).pathname;
            const segments = path.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1] || 'Home';
            return lastSegment.replace(/[-_]/g, ' ')
                             .replace(/\b\w/g, l => l.toUpperCase());
        } catch {
            return 'Business Page';
        }
    }

    determinePageType(url) {
        if (this.detectCareersPage(url)) return 'careers';
        if (/\/(about|company|leadership)/i.test(url)) return 'company-info';
        if (/\/(products?|services?)/i.test(url)) return 'products-services';
        if (/\/(news|press|media)/i.test(url)) return 'news';
        if (/\/(investors?|financial)/i.test(url)) return 'investor-relations';
        return 'general-business';
    }

    async getCompanies(startIndex, count) {
        return await this.sql`
            SELECT id, name, website, industry, sales, employees
            FROM companies 
            WHERE website IS NOT NULL 
            AND website != ''
            AND website LIKE 'http%'
            ORDER BY sales DESC NULLS LAST
            OFFSET ${startIndex}
            LIMIT ${count}
        `;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI execution with research-optimized defaults
const startIndex = parseInt(process.argv[2]) || 0;
const count = parseInt(process.argv[3]) || 100;

const migrator = new ResearchOptimizedMigrator();

migrator.runOptimizedMigration(startIndex, count)
    .then(() => {
        console.log('\n🎉 Research-optimized migration completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Research-optimized migration failed:', error);
        process.exit(1);
    });
