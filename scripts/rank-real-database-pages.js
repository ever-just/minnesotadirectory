#!/usr/bin/env node
/**
 * RANK ALL REAL DATABASE PAGES
 * Processes the actual 40,697 pages from sitemap analysis
 * Calculates importance scores and identifies top 20 pages per company
 */

import { neon } from '@netlify/neon';

async function rankRealDatabasePages() {
    try {
        console.log('🎯 RANKING ALL REAL DATABASE SITEMAP PAGES...');
        console.log('📊 Processing actual pages from sitemap.xml analysis');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Get total count of real pages
        const [pageCount] = await sql`
            SELECT COUNT(*) as total_pages
            FROM website_pages
        `;
        
        console.log(`📈 Found ${pageCount.total_pages} REAL pages to rank`);
        
        // Process pages in optimized batches
        const BATCH_SIZE = 1000; // Process 1000 pages at a time
        const totalBatches = Math.ceil(pageCount.total_pages / BATCH_SIZE);
        
        console.log(`🔥 Processing ${totalBatches} batches of ${BATCH_SIZE} pages each...`);
        
        let totalProcessed = 0;
        const startTime = Date.now();
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const offset = batchIndex * BATCH_SIZE;
            
            console.log(`\n⚡ BATCH ${batchIndex + 1}/${totalBatches}: Processing pages ${offset + 1}-${Math.min(offset + BATCH_SIZE, pageCount.total_pages)}`);
            
            // Get batch of real pages with company info
            const pages = await sql`
                SELECT 
                    wp.id,
                    wp.url,
                    wp.title,
                    wp.priority,
                    wp.last_modified,
                    wp.change_freq,
                    ws.domain,
                    c.name as company_name,
                    c.industry
                FROM website_pages wp
                JOIN website_structures ws ON ws.id = wp.website_structure_id
                JOIN companies c ON c.id = ws.company_id
                ORDER BY wp.id
                LIMIT ${BATCH_SIZE}
                OFFSET ${offset}
            `;
            
            console.log(`📋 Retrieved ${pages.length} real pages for ranking`);
            
            // Process each page and calculate ranking
            const rankingPromises = pages.map(async (page) => {
                const ranking = calculateRealPageRanking(page);
                
                // Update the database with calculated rankings
                return sql`
                    UPDATE website_pages 
                    SET 
                        importance_score = ${ranking.importanceScore},
                        page_category = ${ranking.category},
                        ranking_factors = ${JSON.stringify(ranking.factors)}
                    WHERE id = ${page.id}
                `;
            });
            
            // Execute all rankings in parallel for speed
            await Promise.all(rankingPromises);
            
            totalProcessed += pages.length;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (totalProcessed / (Date.now() - startTime) * 1000).toFixed(1);
            
            console.log(`✅ Batch complete: ${pages.length} pages ranked`);
            console.log(`📈 Progress: ${totalProcessed}/${pageCount.total_pages} (${(totalProcessed/pageCount.total_pages*100).toFixed(1)}%)`);
            console.log(`⚡ Speed: ${rate} pages/second, ${elapsed}s elapsed`);
        }
        
        console.log('\n🎯 MARKING TOP 20 PAGES FOR EACH COMPANY...');
        
        // Mark top 20 pages for each company for fast queries
        const companies = await sql`
            SELECT DISTINCT ws.id as structure_id, c.name as company_name
            FROM website_structures ws
            JOIN companies c ON c.id = ws.company_id
            WHERE ws.analysis_status = 'completed'
        `;
        
        console.log(`🏢 Processing top 20 pages for ${companies.length} companies...`);
        
        for (const company of companies) {
            // Mark top 20 pages for this company
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
        
        // Final statistics
        const [finalStats] = await sql`
            SELECT 
                COUNT(*) as total_ranked_pages,
                COUNT(*) FILTER (WHERE is_top_page = TRUE) as total_top_pages,
                AVG(importance_score) as avg_score,
                MAX(importance_score) as max_score,
                MIN(importance_score) as min_score
            FROM website_pages
            WHERE importance_score IS NOT NULL
        `;
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`\n🎉 REAL DATABASE RANKING COMPLETE!`);
        console.log(`📊 Final Statistics:`);
        console.log(`   • ${finalStats.total_ranked_pages} real pages ranked`);
        console.log(`   • ${finalStats.total_top_pages} top pages identified`);
        console.log(`   • Average score: ${Math.round(finalStats.avg_score)}`);
        console.log(`   • Score range: ${finalStats.min_score}-${finalStats.max_score}`);
        console.log(`   • Total time: ${totalTime} seconds`);
        console.log(`   • Speed: ${(finalStats.total_ranked_pages / totalTime).toFixed(1)} pages/second`);
        
    } catch (error) {
        console.error('❌ Failed to rank real database pages:', error);
    }
}

/**
 * Calculate ranking for a real page from the database
 */
function calculateRealPageRanking(page) {
    const url = page.url || '';
    const title = page.title || 'Untitled';
    const domain = page.domain || '';
    
    // 1. SITEMAP PRIORITY SCORE (30%)
    const sitemapScore = (page.priority || 0.5) * 100;
    
    // 2. URL STRUCTURE SCORE (25%)
    const urlScore = calculateUrlStructureScore(url, domain);
    
    // 3. TITLE ANALYSIS SCORE (20%)
    const titleScore = calculateTitleScore(title);
    
    // 4. PAGE CATEGORY SCORE (15%)
    const category = determinePageCategory(url, title);
    const categoryScore = getCategoryScore(category);
    
    // 5. FRESHNESS SCORE (10%)
    const freshnessScore = calculateFreshnessScore(page.last_modified);
    
    // FINAL WEIGHTED SCORE
    const importanceScore = Math.round(
        (sitemapScore * 0.30) +
        (urlScore * 0.25) +
        (titleScore * 0.20) +
        (categoryScore * 0.15) +
        (freshnessScore * 0.10)
    );
    
    return {
        importanceScore: Math.min(100, Math.max(0, importanceScore)),
        category,
        factors: {
            sitemap_priority: sitemapScore,
            url_structure: urlScore,
            title_analysis: titleScore,
            page_category: categoryScore,
            content_freshness: freshnessScore
        }
    };
}

/**
 * Analyze URL structure for importance indicators
 */
function calculateUrlStructureScore(url, domain) {
    const path = url.replace(`https://${domain}`, '').replace(`http://${domain}`, '');
    
    // Homepage gets maximum score
    if (path === '/' || path === '') return 100;
    
    // Count path depth (fewer levels = more important)
    const depth = (path.match(/\//g) || []).length;
    let depthScore = Math.max(20, 100 - (depth * 15));
    
    // Boost for important path segments
    const importantPaths = [
        'about', 'services', 'products', 'contact', 'careers',
        'news', 'investors', 'locations', 'leadership', 'mission'
    ];
    
    const hasImportantPath = importantPaths.some(segment => 
        path.toLowerCase().includes(segment)
    );
    
    if (hasImportantPath) depthScore += 15;
    
    return Math.min(100, depthScore);
}

/**
 * Analyze page title for importance indicators
 */
function calculateTitleScore(title) {
    const titleLower = title.toLowerCase();
    let score = 50; // Base score
    
    // High-value keywords
    const highValueKeywords = [
        'home', 'about', 'services', 'products', 'contact',
        'leadership', 'board', 'mission', 'vision', 'values',
        'careers', 'jobs', 'investors', 'news', 'press'
    ];
    
    const mediumValueKeywords = [
        'team', 'management', 'executives', 'directors',
        'sustainability', 'community', 'research', 'innovation',
        'locations', 'offices', 'branches'
    ];
    
    // Score based on keyword presence
    const highValueMatches = highValueKeywords.filter(keyword => 
        titleLower.includes(keyword)
    ).length;
    
    const mediumValueMatches = mediumValueKeywords.filter(keyword => 
        titleLower.includes(keyword)
    ).length;
    
    score += (highValueMatches * 15) + (mediumValueMatches * 8);
    
    // Title length optimization (not too short, not too long)
    const titleLength = title.length;
    if (titleLength >= 10 && titleLength <= 60) {
        score += 10; // Optimal length
    } else if (titleLength < 10 || titleLength > 100) {
        score -= 10; // Too short or too long
    }
    
    return Math.min(100, score);
}

/**
 * Determine page category from URL and title
 */
function determinePageCategory(url, title) {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Homepage detection
    if (urlLower.endsWith('/') && urlLower.split('/').length <= 4) return 'homepage';
    
    // Category detection based on URL and title
    if (urlLower.includes('/about') || titleLower.includes('about')) return 'about';
    if (urlLower.includes('/service') || titleLower.includes('service')) return 'services';
    if (urlLower.includes('/product') || titleLower.includes('product')) return 'products';
    if (urlLower.includes('/contact') || titleLower.includes('contact')) return 'contact';
    if (urlLower.includes('/career') || titleLower.includes('career') || titleLower.includes('job')) return 'careers';
    if (urlLower.includes('/news') || urlLower.includes('/press') || titleLower.includes('news')) return 'news';
    if (urlLower.includes('/investor') || titleLower.includes('investor')) return 'investors';
    if (urlLower.includes('/location') || titleLower.includes('location')) return 'locations';
    if (urlLower.includes('/leadership') || titleLower.includes('leadership') || titleLower.includes('board')) return 'leadership';
    if (urlLower.includes('/mission') || urlLower.includes('/vision') || titleLower.includes('mission')) return 'mission';
    if (urlLower.includes('/community') || titleLower.includes('community')) return 'community';
    if (urlLower.includes('/sustainability') || titleLower.includes('sustainability')) return 'sustainability';
    if (urlLower.includes('/research') || titleLower.includes('research')) return 'research';
    if (urlLower.includes('/patient') || titleLower.includes('patient')) return 'healthcare';
    if (urlLower.includes('/provider') || titleLower.includes('provider')) return 'healthcare';
    
    return 'general';
}

/**
 * Get importance score for page category
 */
function getCategoryScore(category) {
    const categoryScores = {
        'homepage': 100,
        'about': 85,
        'services': 90,
        'products': 88,
        'contact': 75,
        'careers': 70,
        'news': 65,
        'investors': 80,
        'locations': 78,
        'leadership': 85,
        'mission': 85,
        'community': 75,
        'sustainability': 70,
        'research': 75,
        'healthcare': 85,
        'general': 50
    };
    
    return categoryScores[category] || 50;
}

/**
 * Calculate freshness score based on last modified date
 */
function calculateFreshnessScore(lastModified) {
    if (!lastModified) return 60; // Default score
    
    try {
        const daysSinceUpdate = (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 30) return 90;      // Very fresh
        if (daysSinceUpdate < 90) return 75;      // Recent
        if (daysSinceUpdate < 365) return 60;     // Moderate
        if (daysSinceUpdate < 730) return 45;     // Old
        return 30; // Very old
        
    } catch (error) {
        return 60; // Default if date parsing fails
    }
}

rankRealDatabasePages();
