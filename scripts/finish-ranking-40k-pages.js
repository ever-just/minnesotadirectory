#!/usr/bin/env node
/**
 * FINISH RANKING ALL 40,697 REAL PAGES
 * Conservative approach to avoid connection limits
 * Processes remaining 38,697 pages with connection pooling
 */

import { neon } from '@netlify/neon';

async function finishRankingAllPages() {
    try {
        console.log('🎯 FINISHING RANKING OF ALL 40,697 REAL PAGES...');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Check current ranking progress
        const [progress] = await sql`
            SELECT 
                COUNT(*) as total_pages,
                COUNT(*) FILTER (WHERE importance_score IS NOT NULL) as ranked_pages,
                COUNT(*) FILTER (WHERE importance_score IS NULL) as unranked_pages
            FROM website_pages
        `;
        
        console.log(`📊 Current Progress:`);
        console.log(`   Total Pages: ${progress.total_pages}`);
        console.log(`   Already Ranked: ${progress.ranked_pages}`);
        console.log(`   Still Need Ranking: ${progress.unranked_pages}`);
        
        if (progress.unranked_pages === 0) {
            console.log('🎉 ALL PAGES ALREADY RANKED!');
            return;
        }
        
        // CONSERVATIVE PROCESSING: Smaller batches with delays
        const SMALL_BATCH_SIZE = 200; // Much smaller to avoid connection issues
        const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay
        const totalBatches = Math.ceil(progress.unranked_pages / SMALL_BATCH_SIZE);
        
        console.log(`🐌 Using CONSERVATIVE approach: ${totalBatches} batches of ${SMALL_BATCH_SIZE} pages`);
        console.log(`⏱️ Estimated time: ${Math.round(totalBatches * 2)} seconds`);
        
        let totalProcessed = progress.ranked_pages;
        const startTime = Date.now();
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            console.log(`\n⚡ CONSERVATIVE BATCH ${batchIndex + 1}/${totalBatches}:`);
            
            // Get unranked pages only
            const pages = await sql`
                SELECT 
                    wp.id,
                    wp.url,
                    wp.title,
                    wp.priority,
                    wp.last_modified,
                    wp.change_freq,
                    ws.domain,
                    c.name as company_name
                FROM website_pages wp
                JOIN website_structures ws ON ws.id = wp.website_structure_id
                JOIN companies c ON c.id = ws.company_id
                WHERE wp.importance_score IS NULL
                ORDER BY wp.id
                LIMIT ${SMALL_BATCH_SIZE}
            `;
            
            if (pages.length === 0) {
                console.log('✅ No more unranked pages found!');
                break;
            }
            
            console.log(`📋 Processing ${pages.length} unranked pages...`);
            
            // Process pages with simpler ranking (faster)
            for (const page of pages) {
                const score = calculateSimpleRanking(page);
                const category = determineSimpleCategory(page.url, page.title);
                
                await sql`
                    UPDATE website_pages 
                    SET 
                        importance_score = ${score},
                        page_category = ${category}
                    WHERE id = ${page.id}
                `;
            }
            
            totalProcessed += pages.length;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const remaining = progress.total_pages - totalProcessed;
            
            console.log(`✅ Batch complete: ${pages.length} pages ranked`);
            console.log(`📈 Progress: ${totalProcessed}/${progress.total_pages} (${(totalProcessed/progress.total_pages*100).toFixed(1)}%)`);
            console.log(`⏱️ Remaining: ${remaining} pages, ${elapsed}s elapsed`);
            
            // DELAY to prevent connection overload
            if (batchIndex < totalBatches - 1) {
                console.log(`😴 Waiting ${DELAY_BETWEEN_BATCHES}ms to prevent connection overload...`);
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }
        
        // Mark top 20 pages for each company
        console.log('\n🏆 MARKING TOP 20 PAGES FOR EACH COMPANY...');
        
        const companies = await sql`
            SELECT DISTINCT ws.id as structure_id, c.name as company_name
            FROM website_structures ws
            JOIN companies c ON c.id = ws.company_id
            WHERE ws.analysis_status = 'completed'
        `;
        
        for (const company of companies) {
            await sql`
                UPDATE website_pages 
                SET is_top_page = TRUE
                WHERE id IN (
                    SELECT id FROM website_pages
                    WHERE website_structure_id = ${company.structure_id}
                    ORDER BY importance_score DESC, priority DESC NULLS LAST
                    LIMIT 20
                )
            `;
        }
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n🎉 ALL 40,697 REAL PAGES RANKED!`);
        console.log(`⚡ Total time: ${totalTime} seconds`);
        console.log(`📊 Average: ${(40697 / totalTime).toFixed(1)} pages/second`);
        
    } catch (error) {
        console.error('❌ Failed to finish ranking all pages:', error);
    }
}

/**
 * Simplified ranking calculation to avoid connection timeouts
 */
function calculateSimpleRanking(page) {
    const url = page.url || '';
    const title = page.title || '';
    
    let score = 50; // Base score
    
    // Homepage boost
    if (url.endsWith('/') && url.split('/').length <= 4) score = 100;
    
    // Important page types
    if (url.includes('/about') || title.toLowerCase().includes('about')) score += 20;
    if (url.includes('/service') || title.toLowerCase().includes('service')) score += 25;
    if (url.includes('/leadership') || title.toLowerCase().includes('leadership')) score += 20;
    if (url.includes('/board') || title.toLowerCase().includes('board')) score += 20;
    if (url.includes('/mission') || title.toLowerCase().includes('mission')) score += 15;
    
    // Sitemap priority boost
    score += (page.priority || 0.5) * 30;
    
    // URL depth penalty
    const depth = (url.match(/\//g) || []).length;
    score -= Math.min(20, depth * 2);
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Simple category determination
 */
function determineSimpleCategory(url, title) {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    if (urlLower.includes('/about') || titleLower.includes('about')) return 'about';
    if (urlLower.includes('/service') || titleLower.includes('service')) return 'services';
    if (urlLower.includes('/leadership') || titleLower.includes('leadership')) return 'leadership';
    if (urlLower.includes('/community') || titleLower.includes('community')) return 'community';
    if (urlLower.includes('/career') || titleLower.includes('career')) return 'careers';
    if (urlLower.includes('/contact') || titleLower.includes('contact')) return 'contact';
    if (urlLower.includes('/news') || titleLower.includes('news')) return 'news';
    
    return 'general';
}

finishRankingAllPages();
