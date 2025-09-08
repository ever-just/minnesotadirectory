/**
 * 🧠 Intelligent Business Description Engine
 * 
 * Leverages existing sitemap infrastructure + Claude 4 Sonnet through Cursor
 * for zero-cost, high-quality, content-rich business descriptions
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import { companies, websiteStructures, websitePages } from '../db/schema.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import readline from 'readline';

const CONFIG = {
    DATABASE_URL: process.env.DATABASE_URL,
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 5,
    TIMEOUT_MS: 8000,
    OUTPUT_DIR: './intelligent-descriptions',
    USER_AGENT: 'Minnesota-Directory-Bot/2.0 (https://minnesotadirectory.org; business research)',
    MAX_PAGES_TO_ANALYZE: 15, // Don't analyze massive sites
    CONTENT_LENGTH_LIMIT: 5000 // Limit content per page
};

class IntelligentDescriptionEngine {
    constructor() {
        if (!CONFIG.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        const sql = neon(CONFIG.DATABASE_URL);
        this.db = drizzle(sql);
        
        this.httpClient = axios.create({
            timeout: CONFIG.TIMEOUT_MS,
            headers: { 'User-Agent': CONFIG.USER_AGENT }
        });
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            pagesAnalyzed: 0,
            contentExtracted: 0
        };
    }
    
    /**
     * Get companies with their sitemap data for intelligent analysis
     */
    async getCompaniesWithSitemapData(limit = CONFIG.BATCH_SIZE) {
        const companiesData = await this.db
            .select({
                // Company data
                companyId: companies.id,
                companyName: companies.name,
                industry: companies.industry,
                website: companies.website,
                city: companies.city,
                state: companies.state,
                sales: companies.sales,
                employees: companies.employees,
                currentDescription: companies.description,
                
                // Website structure data
                websiteId: websiteStructures.id,
                domain: websiteStructures.domain,
                totalPages: websiteStructures.totalPages,
                sitemapUrl: websiteStructures.sitemapUrl,
                lastAnalyzed: websiteStructures.lastAnalyzed,
                analysisStatus: websiteStructures.analysisStatus
            })
            .from(companies)
            .leftJoin(websiteStructures, eq(companies.id, websiteStructures.companyId))
            .where(
                and(
                    isNull(companies.new_description), // Only companies without new descriptions
                    eq(websiteStructures.analysisStatus, 'completed'), // Only analyzed websites
                    sql`${companies.website} IS NOT NULL`,
                    sql`${websiteStructures.totalPages} > 3` // Skip tiny websites
                )
            )
            .limit(limit);
        
        return companiesData;
    }
    
    /**
     * Get and classify website pages for a company
     */
    async getWebsitePages(websiteId) {
        const pages = await this.db
            .select()
            .from(websitePages)
            .where(eq(websitePages.websiteStructureId, websiteId))
            .orderBy(sql`${websitePages.priority} DESC`)
            .limit(CONFIG.MAX_PAGES_TO_ANALYZE);
        
        return this.classifyPages(pages);
    }
    
    /**
     * Intelligent page classification using URL patterns and titles
     */
    classifyPages(pages) {
        const classified = {
            about: [],
            services: [],
            products: [],
            team: [],
            contact: [],
            careers: [],
            case_studies: [],
            news: [],
            other_important: []
        };
        
        const patterns = {
            about: /\b(about|company|story|mission|who-we-are|overview|history)\b/i,
            services: /\b(services|solutions|offerings|what-we-do|capabilities|expertise)\b/i,
            products: /\b(products|portfolio|catalog|software|tools|platforms)\b/i,
            team: /\b(team|leadership|management|staff|people|executives)\b/i,
            contact: /\b(contact|location|office|reach|get-in-touch)\b/i,
            careers: /\b(careers|jobs|hiring|work-with|join|employment)\b/i,
            case_studies: /\b(case-studies|success|clients|portfolio|projects|work)\b/i,
            news: /\b(news|blog|press|media|insights|articles)\b/i
        };
        
        pages.forEach(page => {
            const urlPath = page.path?.toLowerCase() || '';
            const title = page.title?.toLowerCase() || '';
            const combined = `${urlPath} ${title}`;
            
            let categorized = false;
            
            // Check each pattern
            for (const [category, pattern] of Object.entries(patterns)) {
                if (pattern.test(combined)) {
                    classified[category].push(page);
                    categorized = true;
                    break;
                }
            }
            
            // If high priority but uncategorized, add to other_important
            if (!categorized && page.priority && parseFloat(page.priority) > 0.7) {
                classified.other_important.push(page);
            }
        });
        
        return classified;
    }
    
    /**
     * Extract meaningful content from a webpage
     */
    async extractPageContent(url) {
        try {
            console.log(`  📄 Analyzing: ${url}`);
            
            const response = await this.httpClient.get(url);
            const $ = cheerio.load(response.data);
            
            // Remove script, style, and other non-content elements
            $('script, style, nav, header, footer, aside, .menu, .navigation').remove();
            
            const content = {
                title: $('title').text().trim(),
                h1: $('h1').first().text().trim(),
                metaDescription: $('meta[name="description"]').attr('content') || '',
                
                // Extract key content sections
                mainContent: this.extractMainContent($),
                headings: this.extractHeadings($),
                keyPhrases: this.extractKeyPhrases($),
                
                // Business-specific indicators
                valueProps: this.extractValuePropositions($),
                services: this.extractServices($),
                clientIndicators: this.extractClientIndicators($)
            };
            
            this.stats.contentExtracted++;
            return content;
            
        } catch (error) {
            console.log(`    ❌ Failed to analyze ${url}: ${error.message}`);
            return null;
        }
    }
    
    extractMainContent($) {
        // Try to find main content area
        const selectors = [
            'main',
            '.main-content',
            '#content',
            '.content',
            'article',
            '.hero',
            '.about-section',
            '.services-section'
        ];
        
        for (const selector of selectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                const text = element.text().trim();
                if (text.length > 100) {
                    return text.substring(0, CONFIG.CONTENT_LENGTH_LIMIT);
                }
            }
        }
        
        // Fallback to body content
        return $('body').text().trim().substring(0, CONFIG.CONTENT_LENGTH_LIMIT);
    }
    
    extractHeadings($) {
        const headings = [];
        $('h1, h2, h3').each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length < 200) {
                headings.push(text);
            }
        });
        return headings.slice(0, 10); // Limit to 10 headings
    }
    
    extractKeyPhrases($) {
        // Look for emphasized text that might indicate key services/values
        const phrases = [];
        $('strong, b, em, .highlight, .key-point').each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 10 && text.length < 100) {
                phrases.push(text);
            }
        });
        return [...new Set(phrases)].slice(0, 15); // Remove duplicates, limit to 15
    }
    
    extractValuePropositions($) {
        // Look for common value proposition indicators
        const valueIndicators = /\b(we help|we provide|we offer|we specialize|our mission|we deliver|solutions for|expert in)\b/i;
        const paragraphs = [];
        
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (valueIndicators.test(text) && text.length > 50 && text.length < 500) {
                paragraphs.push(text);
            }
        });
        
        return paragraphs.slice(0, 5);
    }
    
    extractServices($) {
        // Look for service lists
        const services = [];
        $('ul li, ol li, .service-item, .service').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 10 && text.length < 150 && !text.includes('©')) {
                services.push(text);
            }
        });
        return services.slice(0, 20);
    }
    
    extractClientIndicators($) {
        // Look for client/customer mentions
        const indicators = [];
        const clientPatterns = /\b(clients include|customers|partners|we work with|fortune|leading)\b/i;
        
        $('p, .client, .customer, .testimonial').each((i, el) => {
            const text = $(el).text().trim();
            if (clientPatterns.test(text) && text.length < 300) {
                indicators.push(text);
            }
        });
        
        return indicators.slice(0, 5);
    }
    
    /**
     * Analyze website content comprehensively
     */
    async analyzeWebsiteIntelligence(companyData) {
        console.log(`\n🔍 Analyzing website intelligence for: ${companyData.companyName}`);
        
        // Get classified pages
        const classifiedPages = await this.getWebsitePages(companyData.websiteId);
        
        console.log(`  📊 Found pages: About(${classifiedPages.about.length}), Services(${classifiedPages.services.length}), Products(${classifiedPages.products.length})`);
        
        // Extract content from key pages
        const websiteIntelligence = {
            company: companyData,
            pageClassification: classifiedPages,
            contentAnalysis: {}
        };
        
        // Analyze key page types in order of importance
        const priorityOrder = ['about', 'services', 'products', 'case_studies', 'other_important'];
        
        for (const pageType of priorityOrder) {
            const pages = classifiedPages[pageType] || [];
            
            if (pages.length > 0) {
                console.log(`  📄 Analyzing ${pageType} pages (${pages.length})`);
                websiteIntelligence.contentAnalysis[pageType] = [];
                
                // Analyze up to 3 pages per type to avoid overload
                for (let i = 0; i < Math.min(3, pages.length); i++) {
                    const page = pages[i];
                    const content = await this.extractPageContent(page.url);
                    
                    if (content) {
                        websiteIntelligence.contentAnalysis[pageType].push({
                            page: page,
                            content: content
                        });
                        this.stats.pagesAnalyzed++;
                    }
                    
                    // Small delay between page requests
                    await this.delay(1000);
                }
            }
        }
        
        return websiteIntelligence;
    }
    
    /**
     * Generate Claude-powered prompt using website intelligence
     */
    generateIntelligentPrompt(websiteIntelligence) {
        const company = websiteIntelligence.company;
        const content = websiteIntelligence.contentAnalysis;
        
        let prompt = `# 🎯 INTELLIGENT BUSINESS DESCRIPTION REQUEST

## Company Overview
- **Name**: ${company.companyName}
- **Industry**: ${company.industry || 'Not specified'}
- **Location**: ${company.city || 'Unknown'}, ${company.state || 'Minnesota'}  
- **Website**: ${company.website}
- **Revenue**: ${company.sales ? `$${company.sales}` : 'Not disclosed'}
- **Employees**: ${company.employees || 'Not specified'}
- **Current Description**: ${company.currentDescription || 'None available'}

## Website Intelligence Analysis
**Total Pages Analyzed**: ${Object.values(content).flat().length}
**Domain**: ${company.domain}
**Last Sitemap Analysis**: ${company.lastAnalyzed}

`;

        // Add content analysis for each page type
        Object.entries(content).forEach(([pageType, pages]) => {
            if (pages && pages.length > 0) {
                prompt += `### ${pageType.toUpperCase().replace('_', ' ')} PAGES ANALYSIS\n\n`;
                
                pages.forEach((pageData, index) => {
                    const { page, content } = pageData;
                    prompt += `**Page ${index + 1}**: ${page.url}\n`;
                    prompt += `**Title**: ${content.title}\n`;
                    if (content.h1) prompt += `**Main Heading**: ${content.h1}\n`;
                    if (content.metaDescription) prompt += `**Meta**: ${content.metaDescription}\n`;
                    
                    if (content.headings.length > 0) {
                        prompt += `**Key Headings**: ${content.headings.slice(0, 5).join(', ')}\n`;
                    }
                    
                    if (content.keyPhrases.length > 0) {
                        prompt += `**Key Phrases**: ${content.keyPhrases.slice(0, 8).join(', ')}\n`;
                    }
                    
                    if (content.valueProps.length > 0) {
                        prompt += `**Value Propositions**: ${content.valueProps.slice(0, 3).join(' | ')}\n`;
                    }
                    
                    if (content.services.length > 0) {
                        prompt += `**Services/Offerings**: ${content.services.slice(0, 10).join(', ')}\n`;
                    }
                    
                    if (content.mainContent) {
                        prompt += `**Main Content Sample**: ${content.mainContent.substring(0, 800)}...\n`;
                    }
                    
                    prompt += '\n---\n\n';
                });
            }
        });
        
        prompt += `
## 🎯 TASK: Create Intelligent Business Description

Based on the comprehensive website analysis above, create a detailed, accurate business description that reflects what this company ACTUALLY does (not generic industry assumptions).

### Required Structure:

## Executive Summary
[2-3 sentences capturing their actual business based on website content]

## Business Intelligence Profile

### Core Business Activities
[What they actually do - derived from services/products pages]

### Target Market & Customer Focus  
[Who they serve - inferred from website language and case studies]

### Value Proposition & Competitive Edge
[Their unique selling points from actual website messaging]

### Service/Product Portfolio
[Specific offerings identified from website analysis]

### Business Model & Approach
[How they operate - consulting, products, services, etc.]

### Market Position & Scale
[Geographic reach, company size indicators, industry position]

### Technology & Capabilities  
[Technical expertise, certifications, tools mentioned]

### Strategic Differentiators
[What makes them unique based on website positioning]

## Key Insights
[Notable observations about their business approach, culture, or market focus]

### 🎯 CRITICAL REQUIREMENTS:
1. **Use ACTUAL website content** - don't make assumptions
2. **Be specific** - reference actual services, capabilities, and approaches found
3. **Professional tone** - suitable for business directory
4. **Accurate representation** - based on evidence from their website
5. **Comprehensive** - but concise (aim for 1000-1500 words)
6. **Industry context** - position within their specific market segment

Generate this description now, ensuring it's a true reflection of their actual business based on the website intelligence provided.`;

        return prompt;
    }
    
    /**
     * Interactive Claude-powered description generation
     */
    async generateDescriptionWithClaude(websiteIntelligence) {
        const prompt = this.generateIntelligentPrompt(websiteIntelligence);
        
        console.log('\n' + '='.repeat(100));
        console.log('🧠 CLAUDE 4 SONNET PROMPT READY');
        console.log('='.repeat(100));
        console.log('\nCompany:', websiteIntelligence.company.companyName);
        console.log('Pages Analyzed:', Object.values(websiteIntelligence.contentAnalysis).flat().length);
        console.log('Website:', websiteIntelligence.company.website);
        
        // Save prompt to file for review
        const promptFile = `${CONFIG.OUTPUT_DIR}/prompt-${websiteIntelligence.company.companyName.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
        await fs.writeFile(promptFile, prompt);
        
        console.log(`\n💾 Prompt saved to: ${promptFile}`);
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Copy the prompt above');
        console.log('2. Paste it into a new Cursor chat');
        console.log('3. Let Claude generate the intelligent description');
        console.log('4. Copy the result back here');
        console.log('\n' + '='.repeat(100));
        
        // Interactive mode
        console.log('\nPress ENTER when you have the Claude-generated description...');
        await this.askQuestion('');
        
        const description = await this.askQuestion('\nPaste the Claude-generated description here:\n');
        
        if (description && description.trim().length > 100) {
            return {
                content: description.trim(),
                source: 'claude-4-sonnet-cursor',
                websiteIntelligence: websiteIntelligence,
                promptUsed: prompt
            };
        } else {
            throw new Error('No valid description provided');
        }
    }
    
    /**
     * Save generated description and intelligence data
     */
    async saveIntelligentDescription(companyId, descriptionData) {
        try {
            // Save to database
            await this.db
                .update(companies)
                .set({
                    new_description: descriptionData.content,
                    description_status: 'generated',
                    description_generated_at: new Date(),
                    description_source: descriptionData.source
                })
                .where(eq(companies.id, companyId));
            
            // Save detailed intelligence data to file
            const company = descriptionData.websiteIntelligence.company;
            const filename = `${company.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_intelligence.json`;
            const filepath = `${CONFIG.OUTPUT_DIR}/${filename}`;
            
            await fs.writeFile(filepath, JSON.stringify({
                company: company,
                description: descriptionData.content,
                websiteIntelligence: descriptionData.websiteIntelligence,
                generatedAt: new Date().toISOString(),
                source: descriptionData.source
            }, null, 2));
            
            console.log(`✅ Saved intelligent description for ${company.companyName}`);
            console.log(`💾 Intelligence data saved to: ${filename}`);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to save description: ${error.message}`);
            return false;
        }
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }
    
    /**
     * Main processing loop
     */
    async processIntelligentDescriptions() {
        console.log('🚀 Starting Intelligent Description Engine');
        console.log('🧠 Powered by Claude 4 Sonnet + Website Intelligence');
        
        try {
            const companies = await this.getCompaniesWithSitemapData();
            
            if (companies.length === 0) {
                console.log('✅ No companies with sitemap data found to process');
                console.log('💡 Run sitemap analysis first to gather website intelligence');
                return;
            }
            
            console.log(`📊 Found ${companies.length} companies with sitemap data ready for intelligent analysis`);
            
            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                this.stats.processed++;
                
                console.log(`\n[${i + 1}/${companies.length}] 🧠 Processing: ${company.companyName}`);
                console.log(`  🌐 Website: ${company.website}`);
                console.log(`  📄 Total Pages: ${company.totalPages}`);
                
                try {
                    // Analyze website intelligence
                    const websiteIntelligence = await this.analyzeWebsiteIntelligence(company);
                    
                    // Generate description with Claude through Cursor
                    const descriptionData = await this.generateDescriptionWithClaude(websiteIntelligence);
                    
                    // Save results
                    const saved = await this.saveIntelligentDescription(company.companyId, descriptionData);
                    
                    if (saved) {
                        this.stats.successful++;
                    } else {
                        this.stats.failed++;
                    }
                    
                } catch (error) {
                    console.error(`❌ Failed to process ${company.companyName}: ${error.message}`);
                    this.stats.failed++;
                }
                
                // Continue to next company?
                if (i < companies.length - 1) {
                    const continueProcessing = await this.askQuestion('\nContinue to next company? (y/n): ');
                    if (continueProcessing.toLowerCase() !== 'y') {
                        break;
                    }
                }
            }
            
            // Final statistics
            console.log('\n🎉 Intelligent Description Generation Complete!');
            console.log('📊 Final Statistics:');
            console.log(`  • Companies Processed: ${this.stats.processed}`);
            console.log(`  • Successful: ${this.stats.successful}`);
            console.log(`  • Failed: ${this.stats.failed}`);
            console.log(`  • Pages Analyzed: ${this.stats.pagesAnalyzed}`);
            console.log(`  • Content Sections Extracted: ${this.stats.contentExtracted}`);
            console.log(`  • Success Rate: ${((this.stats.successful / this.stats.processed) * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.error('💥 Fatal error:', error.message);
        } finally {
            this.rl.close();
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const engine = new IntelligentDescriptionEngine();
    engine.processIntelligentDescriptions().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

export default IntelligentDescriptionEngine;
