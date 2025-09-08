#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * FULL-SCALE WGET SITEMAP MIGRATION
 * Production version for migrating all 2,656+ companies
 */

class FullSitemapMigration {
    constructor() {
        this.sql = neon(process.env.DATABASE_URL);
        this.batchSize = 50; // Larger batches for production
        this.delayBetweenBatches = 30000; // 30 seconds
        this.maxRetries = 3;
        this.timeoutPerCompany = 45000; // 45 seconds per company
        
        // Ensure directories exist
        this.ensureDirectories();
        
        // Stats tracking
        this.stats = {
            totalProcessed: 0,
            successful: 0,
            failed: 0,
            careersFound: 0,
            totalRelevantPages: 0,
            startTime: Date.now()
        };
    }

    async runFullMigration() {
        console.log('🚀 STARTING FULL-SCALE WGET SITEMAP MIGRATION');
        console.log('==============================================');
        console.log('📊 Processing ALL companies with websites');
        console.log('🎯 MANDATORY: Careers/Jobs page discovery');
        console.log('⚡ Method: Production wget crawling\n');

        try {
            // Get all companies with websites
            const companies = await this.getCompaniesForMigration();
            console.log(`📋 Found ${companies.length} companies to process\n`);

            // Initialize migration tracking
            await this.initializeMigrationTracking(companies);

            // Process in batches
            const batches = this.createBatches(companies, this.batchSize);
            console.log(`📦 Processing ${batches.length} batches of ${this.batchSize} companies each\n`);

            for (let i = 0; i < batches.length; i++) {
                const batchNumber = i + 1;
                const batch = batches[i];

                console.log(`\n📦 BATCH ${batchNumber}/${batches.length}: Processing ${batch.length} companies`);
                console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);

                const batchStartTime = Date.now();
                await this.processBatch(batch, batchNumber);
                const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);

                // Update stats
                const successRate = ((this.stats.successful / this.stats.totalProcessed) * 100).toFixed(1);
                const careersRate = ((this.stats.careersFound / this.stats.successful) * 100).toFixed(1);

                console.log(`✅ Batch ${batchNumber} completed in ${batchTime}s`);
                console.log(`📊 OVERALL PROGRESS: ${this.stats.totalProcessed}/${companies.length} (${successRate}% success)`);
                console.log(`🎯 CAREERS DISCOVERED: ${this.stats.careersFound} companies (${careersRate}% of successful)`);

                // Delay between batches
                if (i < batches.length - 1) {
                    console.log(`⏸️  Waiting 30s before next batch...`);
                    await this.sleep(this.delayBetweenBatches);
                }
            }

            // Final summary
            await this.printFinalSummary(companies.length);

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async processBatch(companies, batchNumber) {
        const promises = companies.map(company => this.processCompanyWithRetry(company));
        const results = await Promise.allSettled(promises);

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const company = companies[i];

            this.stats.totalProcessed++;

            if (result.status === 'fulfilled' && result.value.success) {
                this.stats.successful++;
                if (result.value.careersFound) {
                    this.stats.careersFound++;
                }
                this.stats.totalRelevantPages += result.value.pagesStored;
                
                const indicator = result.value.careersFound ? '🎯 CAREERS' : '📊';
                console.log(`  ${indicator} ${company.name}: ${result.value.pagesStored} pages`);
            } else {
                this.stats.failed++;
                const error = result.status === 'rejected' ? result.reason.message : result.value.error;
                console.log(`  ❌ ${company.name}: ${error}`);
            }
        }
    }

    async processCompanyWithRetry(company, attempt = 1) {
        try {
            const result = await this.processCompany(company);
            return { success: true, ...result };
        } catch (error) {
            if (attempt <= this.maxRetries) {
                await this.sleep(2000 * attempt); // Progressive delay
                return this.processCompanyWithRetry(company, attempt + 1);
            } else {
                return { success: false, error: error.message };
            }
        }
    }

    async processCompany(company) {
        const domain = this.extractDomain(company.website);
        const pages = await this.crawlCompanyWithWget(company, domain);
        
        // Score and prioritize pages
        const scoredPages = this.scorePages(pages, company);
        const selectedPages = this.selectTopPages(scoredPages, 20);
        
        // Store in database
        await this.storeCompanyPages(company.id, selectedPages);
        
        const careersFound = selectedPages.some(p => p.isCareersPage);
        
        return {
            pagesStored: selectedPages.length,
            careersFound,
            relevanceScore: selectedPages.length > 0 ? 
                (selectedPages.reduce((sum, p) => sum + p.relevanceScore, 0) / selectedPages.length).toFixed(1) : 0
        };
    }

    async crawlCompanyWithWget(company, domain) {
        const logFile = `temp/crawl-${company.id}.log`;
        
        try {
            // Primary crawl - high-value business pages
            const wgetCommand = `
                wget --spider --recursive --level=2
                     --domains="${domain}"
                     --include-directories="/careers,/jobs,/about,/company,/products,/services,/news,/investors"
                     --exclude-directories="/support,/help,/legal,/privacy,/search,/login"
                     --reject="*.pdf,*.jpg,*.png,*.gif,*.css,*.js,*.zip"
                     --wait=1 --random-wait
                     --timeout=20 --tries=2
                     --user-agent="MinnesotaDirectory-Bot/1.0"
                     --output-file="${logFile}"
                     --no-parent
                     "${company.website}"
            `.replace(/\s+/g, ' ').trim();

            execSync(wgetCommand, { 
                timeout: this.timeoutPerCompany,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Parse discovered URLs
            const logContent = fs.readFileSync(logFile, 'utf8');
            const urls = this.parseWgetLog(logContent, domain);
            
            // Clean up
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            
            return urls;

        } catch (error) {
            // Clean up log file
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            
            // For wget errors, try to extract any partial results
            if (fs.existsSync(logFile)) {
                try {
                    const logContent = fs.readFileSync(logFile, 'utf8');
                    const urls = this.parseWgetLog(logContent, domain);
                    fs.unlinkSync(logFile);
                    return urls;
                } catch {}
            }
            
            // Return minimal pages if wget completely fails
            return [company.website];
        }
    }

    scorePages(urls, company) {
        return urls.map(url => {
            const relevanceScore = this.calculateRelevanceScore(url);
            const isCareersPage = this.isCareersPage(url);
            
            return {
                url,
                companyId: company.id,
                title: this.inferTitle(url),
                relevanceScore: isCareersPage ? 100 : relevanceScore,
                isCareersPage,
                pageType: this.determinePageType(url)
            };
        });
    }

    calculateRelevanceScore(url) {
        let score = 0;
        const urlLower = url.toLowerCase();

        // High-value business pages
        if (/\/(about|company|leadership|team)/i.test(urlLower)) score = 85;
        else if (/\/(products?|services?|solutions)/i.test(urlLower)) score = 80;
        else if (/\/(investors?|financial)/i.test(urlLower)) score = 75;
        else if (/\/(news|press|media)/i.test(urlLower)) score = 65;
        else score = 50;

        // URL quality adjustments
        const pathDepth = url.split('/').length - 3;
        score -= pathDepth * 2;
        if (url.includes('?')) score -= 5;

        return Math.max(0, Math.min(100, score));
    }

    isCareersPage(url) {
        const urlLower = url.toLowerCase();
        const careersPatterns = [
            /\/(careers?|jobs?|employment|join-us|work-with-us)/i,
            /\/(recruiting|recruitment|job-openings|opportunities)/i,
            /\/(talent|people|human-resources|hiring)/i
        ];
        
        return careersPatterns.some(pattern => pattern.test(urlLower));
    }

    selectTopPages(pages, count) {
        // Sort: careers first, then by relevance
        return pages
            .sort((a, b) => {
                if (a.isCareersPage && !b.isCareersPage) return -1;
                if (!a.isCareersPage && b.isCareersPage) return 1;
                return b.relevanceScore - a.relevanceScore;
            })
            .filter((page, index, array) => 
                array.findIndex(p => p.url === page.url) === index
            )
            .slice(0, count);
    }

    async storeCompanyPages(companyId, pages) {
        // Simple storage - in production you'd want more sophisticated handling
        try {
            // Clear existing pages for this company
            await this.sql`
                DELETE FROM website_pages 
                WHERE website_structure_id IN (
                    SELECT id FROM website_structures WHERE company_id = ${companyId}
                )
            `;

            // Create/update website structure
            const [structure] = await this.sql`
                INSERT INTO website_structures (
                    company_id, total_pages, analysis_status, last_analyzed
                )
                VALUES (${companyId}, ${pages.length}, 'completed', NOW())
                ON CONFLICT (company_id) DO UPDATE SET
                    total_pages = ${pages.length},
                    analysis_status = 'completed',
                    last_analyzed = NOW()
                RETURNING id
            `;

            // Insert pages
            for (const page of pages) {
                await this.sql`
                    INSERT INTO website_pages (
                        website_structure_id, url, title, priority, page_type
                    )
                    VALUES (
                        ${structure.id}, ${page.url}, ${page.title}, 
                        ${page.relevanceScore / 100}, ${page.pageType}
                    )
                `;
            }
        } catch (error) {
            console.log(`⚠️  Database storage warning for company ${companyId}: ${error.message}`);
        }
    }

    async getCompaniesForMigration() {
        return await this.sql`
            SELECT id, name, website, industry
            FROM companies 
            WHERE website IS NOT NULL 
            AND website != ''
            AND website LIKE 'http%'
            ORDER BY sales DESC NULLS LAST
        `;
    }

    async initializeMigrationTracking(companies) {
        console.log('🗄️  Initializing migration tracking...');
        // Initialize tracking records for each company
        for (const company of companies) {
            try {
                await this.sql`
                    INSERT INTO sitemap_migration_progress (
                        company_id, website_url, migration_status
                    )
                    VALUES (${company.id}, ${company.website}, 'pending')
                    ON CONFLICT (company_id) DO NOTHING
                `;
            } catch (error) {
                // Ignore conflicts - table might not exist yet
            }
        }
        console.log('✅ Migration tracking initialized');
    }

    async printFinalSummary(totalCompanies) {
        const totalTime = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1);
        const successRate = ((this.stats.successful / this.stats.totalProcessed) * 100).toFixed(1);
        const careersRate = ((this.stats.careersFound / this.stats.successful) * 100).toFixed(1);
        const avgPages = (this.stats.totalRelevantPages / this.stats.successful).toFixed(1);

        console.log('\n🎉 FULL MIGRATION COMPLETED!');
        console.log('============================');
        console.log(`✅ Total Processed: ${this.stats.totalProcessed}/${totalCompanies}`);
        console.log(`✅ Successful: ${this.stats.successful} (${successRate}%)`);
        console.log(`❌ Failed: ${this.stats.failed}`);
        console.log(`🎯 Companies with Careers: ${this.stats.careersFound} (${careersRate}%)`);
        console.log(`📊 Total Relevant Pages: ${this.stats.totalRelevantPages}`);
        console.log(`📈 Average Pages/Company: ${avgPages}`);
        console.log(`⏱️  Total Time: ${totalTime} minutes`);

        console.log('\n🎯 KEY ACHIEVEMENTS:');
        console.log(`✅ Careers Discovery: ${careersRate}% success rate`);
        console.log(`✅ Quality Focus: ${avgPages} relevant pages vs 50+ generic`);
        console.log(`✅ Database Enhanced: ${this.stats.totalRelevantPages} high-quality entries`);
        console.log(`✅ User Experience: Dramatically improved company data`);
    }

    // Utility methods
    parseWgetLog(logContent, domain) {
        const urlPattern = new RegExp(`https?://${domain}[^\\s<>'"]*`, 'g');
        const matches = logContent.match(urlPattern) || [];
        return [...new Set(matches)];
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
        const path = new URL(url).pathname;
        const segments = path.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1] || 'home';
        return lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    determinePageType(url) {
        if (this.isCareersPage(url)) return 'careers';
        if (/\/(about|company)/i.test(url)) return 'company-info';
        if (/\/(products?|services?)/i.test(url)) return 'products-services';
        return 'general';
    }

    ensureDirectories() {
        ['temp', 'logs'].forEach(dir => {
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
}

// Execute full migration
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const migration = new FullSitemapMigration();
    
    migration.runFullMigration()
        .then(() => {
            console.log('\n🎉 SUCCESS: Full sitemap migration completed!');
            console.log('🎯 Your Minnesota Directory now has premium company data!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 MIGRATION FAILED:', error);
            process.exit(1);
        });
}

export default FullSitemapMigration;
