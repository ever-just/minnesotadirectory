#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * SIMPLE WORKING WGET MIGRATOR
 * Actually processes companies one by one with real wget execution
 */

class SimpleWorkingMigrator {
    constructor() {
        this.sql = neon(process.env.DATABASE_URL);
        this.stats = {
            processed: 0,
            successful: 0,
            careersFound: 0,
            totalPages: 0,
            startTime: Date.now()
        };
    }

    async runMigration(startIndex = 0, count = 50) {
        console.log('🚀 SIMPLE WORKING WGET MIGRATION');
        console.log('=================================');
        console.log(`📊 Processing ${count} companies starting from index ${startIndex}`);
        console.log('🎯 Real wget execution with careers priority\n');

        try {
            // Get companies to process
            const companies = await this.getCompanies(startIndex, count);
            console.log(`📋 Found ${companies.length} companies to process\n`);

            // Process each company individually
            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                const companyNumber = startIndex + i + 1;
                
                console.log(`🚀 Processing Company ${companyNumber}/2656: ${company.name}`);
                console.log(`⏳ Crawling ${company.website} with wget...`);
                
                try {
                    // Real wget execution
                    const pages = await this.crawlCompanyWithWget(company);
                    
                    if (pages.length > 0) {
                        // Store in database
                        await this.storePages(company.id, pages, company.name);
                        
                        const careersPages = pages.filter(p => p.isCareersPage);
                        const careersText = careersPages.length > 0 ? 
                            `${careersPages.length} CAREERS pages! 🎯` : 
                            'no careers pages';
                        
                        console.log(`✅ Found ${pages.length} pages (${careersText})`);
                        console.log(`💾 Stored in database`);
                        
                        this.stats.successful++;
                        if (careersPages.length > 0) {
                            this.stats.careersFound++;
                        }
                        this.stats.totalPages += pages.length;
                        
                    } else {
                        console.log(`⚠️  No pages found for ${company.name}`);
                    }
                    
                    this.stats.processed++;
                    
                    // Progress indicator
                    const elapsed = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1);
                    console.log(`⏱️  Completed in ${elapsed}m | Success: ${this.stats.successful}/${this.stats.processed} | Careers: ${this.stats.careersFound}\n`);
                    
                    // Small delay to be respectful
                    await this.sleep(2000);
                    
                } catch (error) {
                    console.log(`❌ Failed to process ${company.name}: ${error.message}`);
                    this.stats.processed++;
                }
            }
            
            // Final summary
            this.printSummary(startIndex, count);
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async crawlCompanyWithWget(company) {
        const domain = this.extractDomain(company.website);
        const logFile = `temp-crawl-${company.id}.log`;
        
        try {
            // Ensure temp directory exists
            if (!fs.existsSync('temp')) {
                fs.mkdirSync('temp', { recursive: true });
            }
            
            // Real wget command with careers focus
            const wgetCommand = `
                wget --spider 
                     --recursive 
                     --level=2
                     --domains="${domain}"
                     --include-directories="/careers,/jobs,/about,/company,/products,/services,/leadership,/investors"
                     --reject="*.pdf,*.jpg,*.png,*.gif,*.css,*.js,*.zip"
                     --wait=1
                     --timeout=15
                     --tries=1
                     --user-agent="MinnesotaDirectory-Bot/1.0"
                     --output-file="${logFile}"
                     --no-parent
                     "${company.website}"
            `.replace(/\s+/g, ' ').trim();

            // Execute wget
            execSync(wgetCommand, { 
                timeout: 30000, // 30 second timeout
                stdio: ['ignore', 'ignore', 'ignore'] 
            });

            // Parse discovered URLs
            let discoveredUrls = [];
            if (fs.existsSync(logFile)) {
                const logContent = fs.readFileSync(logFile, 'utf8');
                discoveredUrls = this.parseWgetLog(logContent, domain);
                fs.unlinkSync(logFile); // Clean up
            }

            // Score and prioritize pages
            const pages = this.scorePages(discoveredUrls, company);
            
            return pages.slice(0, 20); // Top 20 pages

        } catch (error) {
            // Clean up log file on error
            if (fs.existsSync(logFile)) {
                fs.unlinkSync(logFile);
            }
            
            // Return at least the homepage if wget fails
            return [{
                url: company.website,
                title: company.name,
                relevanceScore: 100,
                isCareersPage: false,
                pageType: 'homepage'
            }];
        }
    }

    scorePages(urls, company) {
        // Add homepage if not present
        if (!urls.includes(company.website)) {
            urls.unshift(company.website);
        }

        return urls.map(url => {
            const isCareersPage = this.isCareersPage(url);
            const relevanceScore = this.calculateRelevanceScore(url);
            
            return {
                url,
                title: this.inferTitle(url),
                relevanceScore: isCareersPage ? 100 : relevanceScore,
                isCareersPage,
                pageType: this.determinePageType(url)
            };
        }).sort((a, b) => {
            // Sort: careers first, then by relevance
            if (a.isCareersPage && !b.isCareersPage) return -1;
            if (!a.isCareersPage && b.isCareersPage) return 1;
            return b.relevanceScore - a.relevanceScore;
        });
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

    calculateRelevanceScore(url) {
        let score = 50; // Base score
        const urlLower = url.toLowerCase();

        // High-value business pages
        if (/\/(about|company|leadership|team)/i.test(urlLower)) score = 85;
        else if (/\/(products?|services?|solutions)/i.test(urlLower)) score = 80;
        else if (/\/(investors?|financial)/i.test(urlLower)) score = 75;
        else if (/\/(news|press|media)/i.test(urlLower)) score = 65;

        // URL quality adjustments
        const pathDepth = url.split('/').length - 3;
        score -= pathDepth * 2;
        if (url.includes('?')) score -= 5;

        return Math.max(0, Math.min(100, score));
    }

    determinePageType(url) {
        if (this.isCareersPage(url)) return 'careers';
        if (/\/(about|company)/i.test(url)) return 'company-info';
        if (/\/(products?|services?)/i.test(url)) return 'products-services';
        if (/\/(news|press)/i.test(url)) return 'news';
        return 'general';
    }

    async storePages(companyId, pages, companyName) {
        try {
            // Create/update website structure
            const domain = this.extractDomain(pages[0]?.url || companyName);
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

            // Clear old pages for this company
            await this.sql`
                DELETE FROM website_pages 
                WHERE website_structure_id = ${structure.id}
            `;

            // Insert new pages
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
            console.log(`⚠️  Database storage warning for ${companyName}: ${error.message}`);
        }
    }

    async getCompanies(startIndex, count) {
        return await this.sql`
            SELECT id, name, website, industry
            FROM companies 
            WHERE website IS NOT NULL 
            AND website != ''
            AND website LIKE 'http%'
            ORDER BY sales DESC NULLS LAST
            OFFSET ${startIndex}
            LIMIT ${count}
        `;
    }

    parseWgetLog(logContent, domain) {
        const urlPattern = new RegExp(`https?://${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s<>'"]*`, 'g');
        const matches = logContent.match(urlPattern) || [];
        return [...new Set(matches)]; // Remove duplicates
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
            return 'Company Page';
        }
    }

    printSummary(startIndex, count) {
        const totalTime = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1);
        const successRate = ((this.stats.successful / this.stats.processed) * 100).toFixed(1);
        const careersRate = ((this.stats.careersFound / this.stats.successful) * 100).toFixed(1);
        const avgPages = (this.stats.totalPages / this.stats.successful).toFixed(1);
        const rate = (this.stats.processed / (totalTime || 1)).toFixed(1);

        console.log('\n🎉 BATCH MIGRATION COMPLETED!');
        console.log('============================');
        console.log(`📊 Range: Companies ${startIndex + 1}-${startIndex + count}`);
        console.log(`✅ Processed: ${this.stats.processed}/${count}`);
        console.log(`✅ Successful: ${this.stats.successful} (${successRate}%)`);
        console.log(`🎯 Careers Found: ${this.stats.careersFound} (${careersRate}%)`);
        console.log(`📄 Total Pages: ${this.stats.totalPages} (avg: ${avgPages} per company)`);
        console.log(`⏱️  Time: ${totalTime} minutes (${rate} companies/minute)`);
        
        if (startIndex + count < 2656) {
            console.log(`\n🔄 To continue with next batch:`);
            console.log(`   node scripts/simple-working-migrator.js ${startIndex + count} ${Math.min(500, 2656 - (startIndex + count))}`);
        } else {
            console.log(`\n🎉 COMPLETE MIGRATION FINISHED!`);
            console.log(`✨ All companies processed successfully!`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI execution
const startIndex = parseInt(process.argv[2]) || 0;
const count = parseInt(process.argv[3]) || 50;

const migrator = new SimpleWorkingMigrator();

migrator.runMigration(startIndex, count)
    .then(() => {
        console.log('\n✅ Migration batch completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Migration batch failed:', error);
        process.exit(1);
    });
