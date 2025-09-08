/**
 * Company Data Enrichment Script
 * 
 * This script enriches company data by fetching information from multiple sources:
 * - Wikipedia API for company background
 * - Website content analysis (meta tags, about pages)
 * - Public business registry APIs
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { companies } from '../db/schema.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

const CONFIG = {
    DATABASE_URL: process.env.DATABASE_URL,
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 5,
    DELAY_BETWEEN_REQUESTS: parseInt(process.env.DELAY_MS) || 3000,
    OUTPUT_DIR: './enriched-data',
    TIMEOUT_MS: 10000,
    USER_AGENT: 'Minnesota-Directory-Bot/1.0 (https://minnesotadirectory.org; research purposes)'
};

class CompanyDataEnricher {
    constructor() {
        if (!CONFIG.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        const sql = neon(CONFIG.DATABASE_URL);
        this.db = drizzle(sql);
        
        this.stats = {
            processed: 0,
            enriched: 0,
            failed: 0,
            wikipediaFound: 0,
            websiteAnalyzed: 0
        };
        
        // Create axios instance with common settings
        this.httpClient = axios.create({
            timeout: CONFIG.TIMEOUT_MS,
            headers: {
                'User-Agent': CONFIG.USER_AGENT
            }
        });
    }
    
    async fetchWikipediaData(companyName) {
        try {
            console.log(`🔍 Searching Wikipedia for: ${companyName}`);
            
            // First, search for the company
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName)}`;
            
            const response = await this.httpClient.get(searchUrl);
            
            if (response.data && response.data.extract) {
                this.stats.wikipediaFound++;
                
                return {
                    title: response.data.title,
                    extract: response.data.extract,
                    url: response.data.content_urls?.desktop?.page,
                    thumbnail: response.data.thumbnail?.source,
                    coordinates: response.data.coordinates,
                    type: response.data.type,
                    description: response.data.description
                };
            }
            
        } catch (error) {
            // Try alternative search patterns
            const variations = [
                `${companyName} company`,
                `${companyName} corporation`,
                `${companyName} inc`,
                companyName.replace(/\s+(Inc|LLC|Corp|Company|Co)\.?$/i, '')
            ];
            
            for (const variation of variations) {
                try {
                    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(variation)}`;
                    const response = await this.httpClient.get(searchUrl);
                    
                    if (response.data && response.data.extract) {
                        console.log(`✅ Found Wikipedia data for ${companyName} using variation: ${variation}`);
                        this.stats.wikipediaFound++;
                        
                        return {
                            title: response.data.title,
                            extract: response.data.extract,
                            url: response.data.content_urls?.desktop?.page,
                            thumbnail: response.data.thumbnail?.source,
                            searchVariation: variation
                        };
                    }
                } catch (variationError) {
                    // Continue to next variation
                }
            }
            
            console.log(`❌ Wikipedia data not found for: ${companyName}`);
        }
        
        return null;
    }
    
    async analyzeWebsite(websiteUrl) {
        if (!websiteUrl || !websiteUrl.startsWith('http')) {
            return null;
        }
        
        try {
            console.log(`🌐 Analyzing website: ${websiteUrl}`);
            
            const response = await this.httpClient.get(websiteUrl);
            const $ = cheerio.load(response.data);
            
            // Extract meta information
            const metaData = {
                title: $('title').text().trim(),
                description: $('meta[name="description"]').attr('content') || 
                           $('meta[property="og:description"]').attr('content'),
                keywords: $('meta[name="keywords"]').attr('content'),
                ogTitle: $('meta[property="og:title"]').attr('content'),
                ogDescription: $('meta[property="og:description"]').attr('content'),
                ogImage: $('meta[property="og:image"]').attr('content')
            };
            
            // Look for about page content
            const aboutLinks = $('a[href*="about"], a[href*="About"], a[href*="company"], a[href*="Company"]')
                .map((i, el) => $(el).attr('href'))
                .get()
                .slice(0, 3); // Limit to first 3 about links
            
            // Extract main content text (simplified)
            const mainContent = $('main, .main, #main, .content, #content')
                .first()
                .text()
                .trim()
                .substring(0, 1000); // Limit content length
            
            this.stats.websiteAnalyzed++;
            
            return {
                metaData,
                aboutLinks,
                mainContent,
                analyzedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.log(`❌ Failed to analyze website ${websiteUrl}: ${error.message}`);
            return null;
        }
    }
    
    async fetchCompanyRegistryData(companyName, state = 'Minnesota') {
        // This is a placeholder for business registry APIs
        // Minnesota Secretary of State or other business registry APIs could be integrated here
        
        try {
            // Example: Search Minnesota business registry (would need actual API)
            console.log(`📋 Searching business registry for: ${companyName} in ${state}`);
            
            // Placeholder - would implement actual registry API calls here
            return {
                registrySource: 'minnesota_sos',
                status: 'active', // placeholder
                registrationDate: null, // placeholder
                businessType: null, // placeholder
                note: 'Business registry integration not yet implemented'
            };
            
        } catch (error) {
            console.log(`❌ Failed to fetch registry data for ${companyName}: ${error.message}`);
            return null;
        }
    }
    
    async enrichCompanyData(company) {
        console.log(`🔄 Enriching data for: ${company.name}`);
        
        const enrichmentData = {
            companyId: company.id,
            companyName: company.name,
            enrichedAt: new Date().toISOString(),
            sources: {}
        };
        
        // Fetch Wikipedia data
        const wikipediaData = await this.fetchWikipediaData(company.name);
        if (wikipediaData) {
            enrichmentData.sources.wikipedia = wikipediaData;
        }
        
        // Add delay between requests
        await this.delay(1000);
        
        // Analyze company website
        if (company.website) {
            const websiteData = await this.analyzeWebsite(company.website);
            if (websiteData) {
                enrichmentData.sources.website = websiteData;
            }
            
            await this.delay(1000);
        }
        
        // Fetch business registry data
        const registryData = await this.fetchCompanyRegistryData(company.name, company.state);
        if (registryData) {
            enrichmentData.sources.registry = registryData;
        }
        
        return enrichmentData;
    }
    
    async saveEnrichmentData(enrichmentData) {
        try {
            // Save to files for backup and review
            if (CONFIG.OUTPUT_DIR) {
                await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
                
                const filename = `${enrichmentData.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_enriched.json`;
                const filepath = `${CONFIG.OUTPUT_DIR}/${filename}`;
                
                await fs.writeFile(filepath, JSON.stringify(enrichmentData, null, 2));
                console.log(`💾 Saved enrichment data to: ${filename}`);
            }
            
            // Optionally store in database (would need additional schema)
            // For now, we'll just return the data for use in description generation
            
            return enrichmentData;
            
        } catch (error) {
            console.error(`❌ Failed to save enrichment data for ${enrichmentData.companyName}: ${error.message}`);
            return null;
        }
    }
    
    async getCompaniesToEnrich(limit = CONFIG.BATCH_SIZE) {
        // Get companies that don't have enriched data yet
        // For now, we'll just get companies with websites
        
        return await this.db
            .select()
            .from(companies)
            .where(
                and(
                    sql`${companies.website} IS NOT NULL`,
                    sql`${companies.website} != ''`,
                    sql`${companies.name} IS NOT NULL`
                )
            )
            .limit(limit);
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async generateEnrichmentReport(enrichedData) {
        const report = `# Company Data Enrichment Report
Generated: ${new Date().toISOString()}

## Summary
- Companies Processed: ${this.stats.processed}
- Successfully Enriched: ${this.stats.enriched}
- Failed: ${this.stats.failed}
- Wikipedia Data Found: ${this.stats.wikipediaFound}
- Websites Analyzed: ${this.stats.websiteAnalyzed}

## Data Sources Used
1. **Wikipedia API** - Company background and basic information
2. **Website Analysis** - Meta tags, content extraction, about pages
3. **Business Registry** - Corporate registration data (placeholder)

## Enriched Companies

`;
        
        // Add details for each enriched company
        for (const data of enrichedData) {
            report += `### ${data.companyName}\n`;
            report += `**Enriched:** ${data.enrichedAt}\n\n`;
            
            if (data.sources.wikipedia) {
                report += `**Wikipedia:** ${data.sources.wikipedia.title}\n`;
                report += `*Extract:* ${data.sources.wikipedia.extract.substring(0, 200)}...\n\n`;
            }
            
            if (data.sources.website) {
                report += `**Website Analysis:**\n`;
                report += `- Title: ${data.sources.website.metaData.title || 'Not found'}\n`;
                report += `- Description: ${data.sources.website.metaData.description?.substring(0, 100) || 'Not found'}...\n\n`;
            }
            
            report += `---\n\n`;
        }
        
        // Save report
        await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
        const reportFile = `${CONFIG.OUTPUT_DIR}/enrichment-report-${new Date().toISOString().split('T')[0]}.md`;
        await fs.writeFile(reportFile, report);
        
        console.log(`📊 Enrichment report saved to: ${reportFile}`);
        return reportFile;
    }
    
    async run() {
        console.log('🚀 Starting Company Data Enrichment');
        console.log('Configuration:', {
            batchSize: CONFIG.BATCH_SIZE,
            delay: CONFIG.DELAY_BETWEEN_REQUESTS,
            timeout: CONFIG.TIMEOUT_MS,
            outputDir: CONFIG.OUTPUT_DIR
        });
        
        try {
            const companies = await this.getCompaniesToEnrich();
            
            if (companies.length === 0) {
                console.log('✅ No companies found to enrich');
                return;
            }
            
            console.log(`📊 Found ${companies.length} companies to enrich`);
            
            const enrichedData = [];
            
            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                this.stats.processed++;
                
                console.log(`\n[${i + 1}/${companies.length}] Processing ${company.name}...`);
                
                try {
                    const enrichment = await this.enrichCompanyData(company);
                    const saved = await this.saveEnrichmentData(enrichment);
                    
                    if (saved) {
                        enrichedData.push(saved);
                        this.stats.enriched++;
                    }
                    
                } catch (error) {
                    console.error(`❌ Failed to enrich ${company.name}: ${error.message}`);
                    this.stats.failed++;
                }
                
                // Add delay between companies
                if (i < companies.length - 1) {
                    await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS);
                }
            }
            
            // Generate report
            await this.generateEnrichmentReport(enrichedData);
            
            console.log('\n🎉 Data enrichment complete!');
            console.log('📊 Final Statistics:');
            console.log(`  • Processed: ${this.stats.processed}`);
            console.log(`  • Enriched: ${this.stats.enriched}`);
            console.log(`  • Failed: ${this.stats.failed}`);
            console.log(`  • Wikipedia Found: ${this.stats.wikipediaFound}`);
            console.log(`  • Websites Analyzed: ${this.stats.websiteAnalyzed}`);
            console.log(`  • Success Rate: ${((this.stats.enriched / this.stats.processed) * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const enricher = new CompanyDataEnricher();
    enricher.run().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

export default CompanyDataEnricher;
