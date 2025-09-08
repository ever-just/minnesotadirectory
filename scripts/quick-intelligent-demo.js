/**
 * 🚀 Quick Demo: Intelligent Description Generation
 * 
 * This script demonstrates the power of the intelligent system by:
 * 1. Finding a company with rich sitemap data
 * 2. Analyzing their website structure and content
 * 3. Generating a Claude-ready prompt with actual business intelligence
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, sql } from 'drizzle-orm';
import { companies, websiteStructures, websitePages } from '../db/schema.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

class QuickIntelligentDemo {
    constructor() {
        const sqlConnection = neon(process.env.DATABASE_URL);
        this.db = drizzle(sqlConnection);
        
        this.httpClient = axios.create({
            timeout: 8000,
            headers: { 'User-Agent': 'Minnesota-Directory-Demo/1.0' }
        });
    }
    
    async findBestDemoCompany() {
        console.log('🔍 Finding best company for intelligent analysis demo...');
        
        // Find companies with good sitemap data
        const candidates = await this.db
            .select({
                companyId: companies.id,
                companyName: companies.name,
                industry: companies.industry,
                website: companies.website,
                sales: companies.sales,
                websiteId: websiteStructures.id,
                totalPages: websiteStructures.totalPages,
                domain: websiteStructures.domain
            })
            .from(companies)
            .leftJoin(websiteStructures, eq(companies.id, websiteStructures.companyId))
            .where(
                and(
                    eq(websiteStructures.analysisStatus, 'completed'),
                    sql`${websiteStructures.totalPages} BETWEEN 10 AND 50`, // Good size for demo
                    sql`${companies.sales} > 10000000` // Larger companies likely have better websites
                )
            )
            .orderBy(sql`${websiteStructures.totalPages} DESC`)
            .limit(5);
        
        if (candidates.length === 0) {
            throw new Error('No suitable companies found for demo. Run sitemap analysis first.');
        }
        
        console.log(`✅ Found ${candidates.length} suitable companies for demo`);
        candidates.forEach((company, i) => {
            console.log(`  ${i+1}. ${company.companyName} - ${company.totalPages} pages (${company.industry})`);
        });
        
        return candidates[0]; // Return the best candidate
    }
    
    async analyzeCompanyIntelligence(company) {
        console.log(`\n🧠 Analyzing ${company.companyName}...`);
        console.log(`  🌐 Website: ${company.website}`);
        console.log(`  📄 Pages to analyze: ${company.totalPages}`);
        
        // Get website pages
        const pages = await this.db
            .select()
            .from(websitePages)
            .where(eq(websitePages.websiteStructureId, company.websiteId))
            .orderBy(sql`${websitePages.priority} DESC`)
            .limit(15);
        
        console.log(`  📋 Retrieved ${pages.length} pages from sitemap`);
        
        // Classify pages
        const classified = this.classifyPages(pages);
        
        console.log('  🏷️  Page Classification:');
        Object.entries(classified).forEach(([type, typePages]) => {
            if (typePages.length > 0) {
                console.log(`     ${type}: ${typePages.length} pages`);
            }
        });
        
        // Analyze key pages
        const contentAnalysis = {};
        const keyTypes = ['about', 'services', 'products'];
        
        for (const type of keyTypes) {
            if (classified[type] && classified[type].length > 0) {
                console.log(`\n  📄 Analyzing ${type} pages...`);
                contentAnalysis[type] = [];
                
                // Analyze first 2 pages of each type
                for (let i = 0; i < Math.min(2, classified[type].length); i++) {
                    const page = classified[type][i];
                    const content = await this.extractPageContent(page.url);
                    
                    if (content) {
                        contentAnalysis[type].push({ page, content });
                        console.log(`     ✅ ${page.url} - ${content.title}`);
                    } else {
                        console.log(`     ❌ Failed to analyze ${page.url}`);
                    }
                    
                    // Small delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        return {
            company,
            pages: classified,
            contentAnalysis
        };
    }
    
    classifyPages(pages) {
        const classified = {
            about: [],
            services: [],
            products: [],
            contact: [],
            other: []
        };
        
        const patterns = {
            about: /\b(about|company|story|mission|who-we-are|overview)\b/i,
            services: /\b(services|solutions|offerings|what-we-do|capabilities)\b/i,
            products: /\b(products|portfolio|catalog|software|tools)\b/i,
            contact: /\b(contact|location|office|reach)\b/i
        };
        
        pages.forEach(page => {
            const combined = `${page.path || ''} ${page.title || ''}`.toLowerCase();
            
            let categorized = false;
            for (const [type, pattern] of Object.entries(patterns)) {
                if (pattern.test(combined)) {
                    classified[type].push(page);
                    categorized = true;
                    break;
                }
            }
            
            if (!categorized && page.priority && parseFloat(page.priority) > 0.7) {
                classified.other.push(page);
            }
        });
        
        return classified;
    }
    
    async extractPageContent(url) {
        try {
            const response = await this.httpClient.get(url);
            const $ = cheerio.load(response.data);
            
            // Remove non-content elements
            $('script, style, nav, footer, .menu').remove();
            
            return {
                title: $('title').text().trim(),
                h1: $('h1').first().text().trim(),
                metaDescription: $('meta[name="description"]').attr('content') || '',
                headings: $('h2, h3').map((i, el) => $(el).text().trim()).get().slice(0, 5),
                keyPhrases: $('strong, b, em').map((i, el) => $(el).text().trim()).get()
                    .filter(text => text && text.length > 5 && text.length < 100)
                    .slice(0, 10),
                mainContent: $('main, .main, .content, article').first().text().trim().substring(0, 2000)
            };
        } catch (error) {
            return null;
        }
    }
    
    generateClaudePrompt(intelligence) {
        const { company, contentAnalysis } = intelligence;
        
        let prompt = `# 🧠 INTELLIGENT BUSINESS DESCRIPTION - DEMO

## Company: ${company.companyName}
- **Industry**: ${company.industry}
- **Website**: ${company.website}  
- **Revenue**: ${company.sales ? '$' + parseInt(company.sales).toLocaleString() : 'Not disclosed'}
- **Pages Analyzed**: ${Object.values(contentAnalysis).flat().length}

## Website Intelligence Analysis
`;

        Object.entries(contentAnalysis).forEach(([pageType, pages]) => {
            if (pages.length > 0) {
                prompt += `\n### ${pageType.toUpperCase()} PAGES\n`;
                
                pages.forEach((pageData, i) => {
                    const { page, content } = pageData;
                    prompt += `\n**${pageType} Page ${i+1}**: ${page.url}\n`;
                    prompt += `- **Title**: ${content.title}\n`;
                    prompt += `- **Main Heading**: ${content.h1}\n`;
                    
                    if (content.headings.length > 0) {
                        prompt += `- **Key Headings**: ${content.headings.join(', ')}\n`;
                    }
                    
                    if (content.keyPhrases.length > 0) {
                        prompt += `- **Emphasized Text**: ${content.keyPhrases.join(', ')}\n`;
                    }
                    
                    if (content.mainContent) {
                        prompt += `- **Content Sample**: ${content.mainContent.substring(0, 500)}...\n`;
                    }
                });
            }
        });
        
        prompt += `\n## 🎯 TASK: Generate Intelligent Business Description

Based on the actual website content analysis above, create a professional business description that accurately reflects what ${company.companyName} actually does.

Structure it as:

### Executive Summary
[2-3 sentences based on actual website content]

### Business Profile
**Core Activities**: [From services/about pages]
**Target Market**: [Inferred from website language]
**Key Offerings**: [Specific services/products found]
**Value Proposition**: [From actual website messaging]
**Market Position**: [Based on content analysis]

### Strategic Overview
[Industry context and competitive positioning based on website intelligence]

**Requirements**: Use ONLY information derived from the website analysis above. Be specific and accurate based on actual content found.`;

        return prompt;
    }
    
    async runDemo() {
        console.log('🚀 INTELLIGENT DESCRIPTION SYSTEM - QUICK DEMO');
        console.log('='.repeat(60));
        
        try {
            // Step 1: Find best company
            const company = await this.findBestDemoCompany();
            
            // Step 2: Analyze website intelligence  
            const intelligence = await this.analyzeCompanyIntelligence(company);
            
            // Step 3: Generate Claude prompt
            const prompt = this.generateClaudePrompt(intelligence);
            
            // Step 4: Save and display results
            await fs.mkdir('./demo-output', { recursive: true });
            const demoFile = `./demo-output/intelligent-demo-${company.companyName.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
            
            const demoReport = `# 🧠 Intelligent Description Demo Results

## Company Analyzed: ${company.companyName}
- **Industry**: ${company.industry}
- **Website**: ${company.website}
- **Pages in Sitemap**: ${company.totalPages}
- **Pages Successfully Analyzed**: ${Object.values(intelligence.contentAnalysis).flat().length}

## Website Intelligence Summary
${Object.entries(intelligence.pages).map(([type, pages]) => 
    `- **${type}**: ${pages.length} pages`).join('\n')}

## Claude-Ready Prompt
\`\`\`
${prompt}
\`\`\`

## Next Steps
1. Copy the prompt above
2. Paste into new Cursor chat with Claude
3. Generate the intelligent description
4. Save result to database using our scripts

## Intelligence Data
\`\`\`json
${JSON.stringify(intelligence, null, 2)}
\`\`\`
`;
            
            await fs.writeFile(demoFile, demoReport);
            
            console.log('\n🎉 DEMO COMPLETE!');
            console.log('=' .repeat(60));
            console.log(`📊 Results:`);
            console.log(`  • Company: ${company.companyName}`);
            console.log(`  • Pages Analyzed: ${Object.values(intelligence.contentAnalysis).flat().length}`);
            console.log(`  • Content Sections: ${Object.keys(intelligence.contentAnalysis).length}`);
            console.log(`  • Demo Report: ${demoFile}`);
            
            console.log('\n🧠 Claude Prompt Preview:');
            console.log('-'.repeat(60));
            console.log(prompt.substring(0, 500) + '...');
            console.log('-'.repeat(60));
            
            console.log('\n💡 This demonstrates:');
            console.log('  ✅ Zero API costs (uses existing sitemap data)');
            console.log('  ✅ Rich context (actual website content)');
            console.log('  ✅ Company-specific insights (not generic)');
            console.log('  ✅ Intelligent page classification');
            console.log('  ✅ Ready for Claude 4 Sonnet generation');
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        }
    }
}

// Run demo
if (import.meta.url === `file://${process.argv[1]}`) {
    const demo = new QuickIntelligentDemo();
    demo.runDemo().catch(error => {
        console.error('💥 Demo error:', error);
        process.exit(1);
    });
}

export default QuickIntelligentDemo;
