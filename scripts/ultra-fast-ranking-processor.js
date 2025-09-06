#!/usr/bin/env node
/**
 * ULTRA-FAST Ranking Processor
 * Pre-processes and ranks all sitemap data for instant retrieval
 * Target: Process 2,655 companies in under 30 seconds
 */

import { neon } from '@netlify/neon';

async function ultraFastRankingProcessor() {
    try {
        console.log('🚀 ULTRA-FAST RANKING PROCESSOR STARTING...');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // STEP 1: Add ranking columns to database for speed
        console.log('⚡ Adding ranking columns to database...');
        try {
            await sql`
                ALTER TABLE website_pages 
                ADD COLUMN IF NOT EXISTS importance_score INTEGER DEFAULT 50,
                ADD COLUMN IF NOT EXISTS page_type VARCHAR(50) DEFAULT 'page',
                ADD COLUMN IF NOT EXISTS ranking_factors JSONB
            `;
            console.log('✅ Ranking columns added');
        } catch (e) {
            console.log('⚠️ Columns might already exist:', e.message);
        }

        // STEP 2: Get all companies with website data
        const companies = await sql`
            SELECT 
                ws.id as structure_id,
                ws.company_id,
                ws.domain,
                ws.total_pages,
                c.name as company_name
            FROM website_structures ws
            JOIN companies c ON c.id = ws.company_id
            WHERE ws.analysis_status = 'completed'
            ORDER BY ws.total_pages DESC
        `;

        console.log(`📊 Found ${companies.length} companies with sitemap data to rank`);
        console.log('🔥 Starting ULTRA-FAST batch ranking...');

        // STEP 3: Process in ultra-fast batches
        const ULTRA_BATCH_SIZE = 50; // Process 50 companies simultaneously
        const batches = [];
        for (let i = 0; i < companies.length; i += ULTRA_BATCH_SIZE) {
            batches.push(companies.slice(i, i + ULTRA_BATCH_SIZE));
        }

        let totalRanked = 0;
        const startTime = Date.now();

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`\n⚡ ULTRA-BATCH ${batchIndex + 1}/${batches.length}: Ranking ${batch.length} companies...`);

            // Process entire batch in parallel for maximum speed
            const batchPromises = batch.map(async (company) => {
                try {
                    return await rankCompanyPagesUltraFast(sql, company);
                } catch (error) {
                    console.error(`❌ Failed to rank ${company.company_name}:`, error.message);
                    return { success: false, company: company.company_name };
                }
            });

            const results = await Promise.allSettled(batchPromises);
            
            const batchSuccessful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            totalRanked += batchSuccessful;
            
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (totalRanked / (Date.now() - startTime) * 1000).toFixed(1);
            
            console.log(`✅ Batch complete: ${batchSuccessful}/${batch.length} successful`);
            console.log(`📈 Progress: ${totalRanked}/${companies.length} (${(totalRanked/companies.length*100).toFixed(1)}%)`);
            console.log(`⚡ Speed: ${rate} companies/second, ${elapsed}s elapsed`);
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n🎉 ULTRA-FAST RANKING COMPLETE!`);
        console.log(`📊 Final Stats:`);
        console.log(`   • ${totalRanked} companies ranked`);
        console.log(`   • ${totalTime} seconds total`);
        console.log(`   • ${(totalRanked / totalTime).toFixed(1)} companies/second`);
        console.log(`   • Average: ${(totalTime * 1000 / totalRanked).toFixed(1)}ms per company`);

    } catch (error) {
        console.error('❌ Ultra-fast ranking failed:', error);
    }
}

/**
 * ULTRA-FAST company ranking using optimized algorithms
 */
async function rankCompanyPagesUltraFast(sql, company) {
    const startTime = performance.now();
    
    // Get all pages for this company
    const pages = await sql`
        SELECT id, url, title, priority
        FROM website_pages
        WHERE website_structure_id = ${company.structure_id}
    `;

    if (pages.length === 0) {
        return { success: true, company: company.company_name, pages: 0 };
    }

    // ULTRA-FAST ranking using batch operations
    const rankingPromises = pages.map(page => {
        const score = calculateUltraFastScore(page, company.domain);
        const pageType = determinePageTypeFast(page.url, page.title);
        
        return sql`
            UPDATE website_pages 
            SET 
                importance_score = ${score},
                page_type = ${pageType},
                ranking_factors = ${JSON.stringify({
                    sitemap_priority: page.priority || 0.5,
                    calculated_score: score,
                    page_type: pageType
                })}
            WHERE id = ${page.id}
        `;
    });

    // Execute all updates in parallel
    await Promise.all(rankingPromises);
    
    const processingTime = performance.now() - startTime;
    
    return { 
        success: true, 
        company: company.company_name, 
        pages: pages.length,
        time: processingTime.toFixed(1)
    };
}

/**
 * LIGHTNING-FAST score calculation (single operation)
 */
function calculateUltraFastScore(page, domain) {
    const url = page.url || '';
    const title = page.title || '';
    
    // Fast homepage detection
    if (url === `https://${domain}/` || url === `https://${domain}`) {
        return 100;
    }
    
    // Fast type scoring using lookup
    const typeScores = {
        'about': 85, 'services': 90, 'products': 88, 'contact': 75,
        'careers': 70, 'news': 65, 'investors': 80, 'locations': 78
    };
    
    let baseScore = 50;
    for (const [type, score] of Object.entries(typeScores)) {
        if (url.includes(`/${type}`) || title.toLowerCase().includes(type)) {
            baseScore = score;
            break;
        }
    }
    
    // Fast priority boost
    const priorityBoost = (page.priority || 0.5) * 30;
    
    // Fast URL depth penalty
    const depth = (url.match(/\//g) || []).length;
    const depthPenalty = Math.min(20, depth * 2);
    
    return Math.min(100, Math.max(0, Math.round(baseScore + priorityBoost - depthPenalty)));
}

/**
 * FAST page type determination
 */
function determinePageTypeFast(url, title) {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    if (urlLower.includes('/about') || titleLower.includes('about')) return 'about';
    if (urlLower.includes('/service') || titleLower.includes('service')) return 'services';
    if (urlLower.includes('/product') || titleLower.includes('product')) return 'products';
    if (urlLower.includes('/contact') || titleLower.includes('contact')) return 'contact';
    if (urlLower.includes('/career') || titleLower.includes('career')) return 'careers';
    if (urlLower.includes('/news') || titleLower.includes('news')) return 'news';
    if (urlLower.includes('/investor') || titleLower.includes('investor')) return 'investors';
    if (urlLower.includes('/location') || titleLower.includes('location')) return 'locations';
    
    return 'page';
}

ultraFastRankingProcessor();
