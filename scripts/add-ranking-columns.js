#!/usr/bin/env node
/**
 * Add ranking columns to website_pages table
 * Prepares database for real sitemap ranking
 */

import { neon } from '@netlify/neon';

async function addRankingColumns() {
    try {
        console.log('🚀 Adding ranking columns to website_pages table...');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Add ranking columns
        console.log('📊 Adding importance_score column...');
        await sql`
            ALTER TABLE website_pages 
            ADD COLUMN IF NOT EXISTS importance_score INTEGER DEFAULT 50
        `;
        
        console.log('📊 Adding page_category column...');
        await sql`
            ALTER TABLE website_pages 
            ADD COLUMN IF NOT EXISTS page_category VARCHAR(50) DEFAULT 'page'
        `;
        
        console.log('📊 Adding ranking_factors column...');
        await sql`
            ALTER TABLE website_pages 
            ADD COLUMN IF NOT EXISTS ranking_factors JSONB
        `;
        
        console.log('📊 Adding is_top_page column...');
        await sql`
            ALTER TABLE website_pages 
            ADD COLUMN IF NOT EXISTS is_top_page BOOLEAN DEFAULT FALSE
        `;
        
        // Add indexes for fast queries
        console.log('🔍 Creating performance indexes...');
        try {
            await sql`
                CREATE INDEX IF NOT EXISTS idx_website_pages_importance_score 
                ON website_pages(importance_score DESC)
            `;
            
            await sql`
                CREATE INDEX IF NOT EXISTS idx_website_pages_top_pages 
                ON website_pages(website_structure_id, is_top_page, importance_score DESC)
            `;
            
            await sql`
                CREATE INDEX IF NOT EXISTS idx_website_pages_category 
                ON website_pages(page_category, importance_score DESC)
            `;
            
            console.log('✅ Performance indexes created');
        } catch (indexError) {
            console.log('⚠️ Indexes might already exist:', indexError.message);
        }
        
        // Verify the schema
        const columns = await sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'website_pages' 
            AND column_name IN ('importance_score', 'page_category', 'ranking_factors', 'is_top_page')
            ORDER BY column_name
        `;
        
        console.log('✅ Ranking columns added successfully:');
        columns.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        
        // Check current page count
        const [pageStats] = await sql`
            SELECT COUNT(*) as total_pages
            FROM website_pages
        `;
        
        console.log(`📊 Ready to rank ${pageStats.total_pages} real pages!`);
        
    } catch (error) {
        console.error('❌ Failed to add ranking columns:', error);
    }
}

addRankingColumns();
