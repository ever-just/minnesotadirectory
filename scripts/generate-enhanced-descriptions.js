/**
 * Enhanced Business Description Generator
 * 
 * This script generates structured business descriptions using LLM APIs
 * and supplements them with information from Wikipedia and other sources.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { companies } from '../db/schema.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
    // LLM API Configuration
    PREFERRED_LLM: process.env.PREFERRED_LLM || 'openai', // 'openai', 'anthropic', or 'both'
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    
    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL,
    
    // Processing Configuration
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 10,
    DELAY_BETWEEN_REQUESTS: parseInt(process.env.DELAY_MS) || 2000,
    MAX_RETRIES: 3,
    
    // Output Configuration
    SAVE_TO_FILE: process.env.SAVE_TO_FILE === 'true',
    OUTPUT_DIR: './generated-descriptions',
    
    // Wikipedia API Configuration
    WIKIPEDIA_API_BASE: 'https://en.wikipedia.org/api/rest_v1',
    
    // Filters
    INDUSTRY_FILTER: process.env.INDUSTRY_FILTER, // Optional: filter by specific industry
    MIN_REVENUE: process.env.MIN_REVENUE ? parseInt(process.env.MIN_REVENUE) : null,
    COMPANY_ID_FILTER: process.env.COMPANY_ID_FILTER // Optional: process specific company ID
};

class DescriptionGenerator {
    constructor() {
        this.db = null;
        this.openai = null;
        this.anthropic = null;
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            skipped: 0
        };
        
        this.initializeAPIs();
    }
    
    initializeAPIs() {
        // Initialize database connection
        if (!CONFIG.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        const sql = neon(CONFIG.DATABASE_URL);
        this.db = drizzle(sql);
        
        // Initialize LLM APIs based on configuration
        if (CONFIG.PREFERRED_LLM === 'openai' || CONFIG.PREFERRED_LLM === 'both') {
            if (!CONFIG.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY is required for OpenAI integration');
            }
            this.openai = new OpenAI({
                apiKey: CONFIG.OPENAI_API_KEY
            });
        }
        
        if (CONFIG.PREFERRED_LLM === 'anthropic' || CONFIG.PREFERRED_LLM === 'both') {
            if (!CONFIG.ANTHROPIC_API_KEY) {
                throw new Error('ANTHROPIC_API_KEY is required for Anthropic integration');
            }
            this.anthropic = new Anthropic({
                apiKey: CONFIG.ANTHROPIC_API_KEY
            });
        }
        
        console.log(`✅ Initialized with ${CONFIG.PREFERRED_LLM} API(s)`);
    }
    
    async loadPromptTemplate() {
        const templatePath = path.join(__dirname, 'business-description-prompt-template.md');
        try {
            const content = await fs.readFile(templatePath, 'utf8');
            // Extract the prompt template from the markdown (between triple backticks)
            const promptMatch = content.match(/```\n([\s\S]*?)\n```/);
            if (!promptMatch) {
                throw new Error('Could not extract prompt template from markdown file');
            }
            return promptMatch[1];
        } catch (error) {
            console.error('❌ Failed to load prompt template:', error.message);
            // Fallback to basic template
            return this.getFallbackTemplate();
        }
    }
    
    getFallbackTemplate() {
        return `Generate a comprehensive business description for the company "{COMPANY_NAME}" based on the following information:

**Company Details:**
- Name: {COMPANY_NAME}
- Industry: {INDUSTRY}
- Website: {WEBSITE}
- Location: {CITY}, {STATE}
- Revenue: ${SALES}
- Employees: {EMPLOYEES}
- Current Description: {EXISTING_DESCRIPTION}

**Additional Research Context:**
{WIKIPEDIA_INFO}

Create a business description with exactly this structure:

## Quick Overview
Provide a 2-3 sentence explanation of what this company does in simple, clear terms.

## Business Model Canvas
### Customer Segments
### Value Propositions  
### Channels
### Customer Relationships
### Revenue Streams
### Key Resources
### Key Activities
### Key Partnerships
### Cost Structure

Keep each section concise but informative (2-4 sentences per section).`;
    }
    
    async fetchWikipediaInfo(companyName) {
        try {
            // Search for the company on Wikipedia
            const searchUrl = `${CONFIG.WIKIPEDIA_API_BASE}/page/summary/${encodeURIComponent(companyName)}`;
            const response = await axios.get(searchUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Minnesota-Directory-Bot/1.0 (https://minnesotadirectory.org)'
                }
            });
            
            if (response.data && response.data.extract) {
                return response.data.extract;
            }
        } catch (error) {
            console.log(`⚠️  Wikipedia info not found for ${companyName}: ${error.message}`);
        }
        return 'No additional information found.';
    }
    
    async buildPrompt(company, template) {
        const wikipediaInfo = await this.fetchWikipediaInfo(company.name);
        
        return template
            .replace(/{COMPANY_NAME}/g, company.name || 'Unknown')
            .replace(/{INDUSTRY}/g, company.industry || 'Not specified')
            .replace(/{WEBSITE}/g, company.website || 'Not available')
            .replace(/{CITY}/g, company.city || 'Unknown')
            .replace(/{STATE}/g, company.state || 'Minnesota')
            .replace(/{SALES}/g, company.sales ? `$${company.sales}` : 'Not disclosed')
            .replace(/{EMPLOYEES}/g, company.employees || 'Not specified')
            .replace(/{EXISTING_DESCRIPTION}/g, company.description || 'No existing description')
            .replace(/{WIKIPEDIA_INFO}/g, wikipediaInfo)
            .replace(/{WEBSITE_SUMMARY}/g, 'Website analysis not yet implemented');
    }
    
    async generateWithOpenAI(prompt) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a business analyst creating comprehensive company descriptions. Be accurate, professional, and follow the exact structure requested.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.4
            });
            
            return {
                content: response.choices[0].message.content,
                source: 'openai-gpt4',
                tokens: response.usage.total_tokens
            };
        } catch (error) {
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }
    
    async generateWithAnthropic(prompt) {
        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            
            return {
                content: response.content[0].text,
                source: 'claude-3-sonnet',
                tokens: response.usage.input_tokens + response.usage.output_tokens
            };
        } catch (error) {
            throw new Error(`Anthropic API error: ${error.message}`);
        }
    }
    
    async generateDescription(company) {
        const template = await this.loadPromptTemplate();
        const prompt = await this.buildPrompt(company, template);
        
        let result = null;
        let errors = [];
        
        // Try preferred LLM first
        if (CONFIG.PREFERRED_LLM === 'openai' || CONFIG.PREFERRED_LLM === 'both') {
            try {
                result = await this.generateWithOpenAI(prompt);
            } catch (error) {
                errors.push(`OpenAI: ${error.message}`);
                console.log(`⚠️  OpenAI failed for ${company.name}: ${error.message}`);
            }
        }
        
        // Fallback to Anthropic if OpenAI failed or if both are configured
        if (!result && (CONFIG.PREFERRED_LLM === 'anthropic' || CONFIG.PREFERRED_LLM === 'both')) {
            try {
                result = await this.generateWithAnthropic(prompt);
            } catch (error) {
                errors.push(`Anthropic: ${error.message}`);
                console.log(`⚠️  Anthropic failed for ${company.name}: ${error.message}`);
            }
        }
        
        if (!result) {
            throw new Error(`All LLM APIs failed: ${errors.join(', ')}`);
        }
        
        return result;
    }
    
    async saveToDatabase(companyId, description, source, tokens) {
        try {
            await this.db
                .update(companies)
                .set({
                    new_description: description.content,
                    description_status: 'generated',
                    description_generated_at: new Date(),
                    description_source: source,
                    description_version: 1
                })
                .where(eq(companies.id, companyId));
            
            console.log(`✅ Saved description for company ${companyId} (${tokens} tokens, ${source})`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to save description for company ${companyId}:`, error.message);
            return false;
        }
    }
    
    async saveToFile(company, description, source) {
        if (!CONFIG.SAVE_TO_FILE) return;
        
        try {
            await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
            
            const filename = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_${company.id}.md`;
            const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
            
            const content = `# ${company.name}
            
**Generated:** ${new Date().toISOString()}
**Source:** ${source}
**Industry:** ${company.industry}
**Location:** ${company.city}, ${company.state}

${description.content}

---
*Original Description:* ${company.description || 'None'}
`;
            
            await fs.writeFile(filepath, content);
            console.log(`💾 Saved to file: ${filename}`);
        } catch (error) {
            console.error(`❌ Failed to save file for ${company.name}:`, error.message);
        }
    }
    
    async getCompaniesToProcess() {
        let query = this.db
            .select()
            .from(companies)
            .where(
                and(
                    isNull(companies.new_description), // Only companies without new descriptions
                    sql`${companies.name} IS NOT NULL AND ${companies.name} != ''`
                )
            );
        
        // Apply filters if specified
        const conditions = [];
        
        if (CONFIG.INDUSTRY_FILTER) {
            conditions.push(eq(companies.industry, CONFIG.INDUSTRY_FILTER));
        }
        
        if (CONFIG.MIN_REVENUE) {
            conditions.push(sql`CAST(${companies.sales} AS NUMERIC) >= ${CONFIG.MIN_REVENUE}`);
        }
        
        if (CONFIG.COMPANY_ID_FILTER) {
            conditions.push(eq(companies.id, CONFIG.COMPANY_ID_FILTER));
        }
        
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        
        const results = await query.limit(CONFIG.BATCH_SIZE);
        return results;
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async processCompany(company, retries = 0) {
        try {
            console.log(`🔄 Processing: ${company.name} (${company.industry})`);
            
            const description = await this.generateDescription(company);
            
            // Save to database
            const saved = await this.saveToDatabase(
                company.id, 
                description, 
                description.source, 
                description.tokens
            );
            
            if (saved) {
                // Save to file if configured
                await this.saveToFile(company, description, description.source);
                this.stats.successful++;
                return true;
            } else {
                this.stats.failed++;
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${company.name}:`, error.message);
            
            if (retries < CONFIG.MAX_RETRIES) {
                console.log(`🔄 Retrying ${company.name} (attempt ${retries + 1}/${CONFIG.MAX_RETRIES})`);
                await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS * 2); // Double delay for retries
                return await this.processCompany(company, retries + 1);
            }
            
            this.stats.failed++;
            return false;
        }
    }
    
    async run() {
        console.log('🚀 Starting Enhanced Description Generator');
        console.log('Configuration:', {
            llm: CONFIG.PREFERRED_LLM,
            batchSize: CONFIG.BATCH_SIZE,
            delay: CONFIG.DELAY_BETWEEN_REQUESTS,
            saveToFile: CONFIG.SAVE_TO_FILE,
            industryFilter: CONFIG.INDUSTRY_FILTER,
            minRevenue: CONFIG.MIN_REVENUE
        });
        
        try {
            const companies = await this.getCompaniesToProcess();
            
            if (companies.length === 0) {
                console.log('✅ No companies found to process');
                return;
            }
            
            console.log(`📊 Found ${companies.length} companies to process`);
            
            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                this.stats.processed++;
                
                console.log(`\n[${i + 1}/${companies.length}] Processing ${company.name}...`);
                
                await this.processCompany(company);
                
                // Add delay between requests to respect API rate limits
                if (i < companies.length - 1) {
                    await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS);
                }
                
                // Progress update every 5 companies
                if ((i + 1) % 5 === 0) {
                    console.log(`\n📈 Progress: ${i + 1}/${companies.length} companies processed`);
                    console.log(`✅ Successful: ${this.stats.successful}`);
                    console.log(`❌ Failed: ${this.stats.failed}`);
                }
            }
            
            console.log('\n🎉 Description generation complete!');
            console.log('📊 Final Statistics:');
            console.log(`  • Processed: ${this.stats.processed}`);
            console.log(`  • Successful: ${this.stats.successful}`);
            console.log(`  • Failed: ${this.stats.failed}`);
            console.log(`  • Success Rate: ${((this.stats.successful / this.stats.processed) * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const generator = new DescriptionGenerator();
    generator.run().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

export default DescriptionGenerator;
