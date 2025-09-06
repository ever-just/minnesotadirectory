import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

/**
 * Get TOP 20 REAL PAGES from database for a specific company
 * Returns actual sitemap data with calculated importance rankings
 */
const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { companyName, domain, limit = '20', offset = '0' } = event.queryStringParameters || {};
        
        if (!companyName && !domain) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'companyName or domain parameter is required'
                })
            };
        }

        console.log(`🎯 Getting TOP ${limit} REAL pages for: ${companyName || domain}`);

        const sql = neon(process.env.NETLIFY_DATABASE_URL!);
        const limitNum = Math.min(parseInt(limit), 100);
        const offsetNum = parseInt(offset);
        
        // Find the company and get their real ranked pages
        let topPages;
        let companyInfo;
        
        if (companyName) {
            // Get company info and their top pages
            const results = await sql`
                SELECT 
                    c.name as company_name,
                    ws.domain,
                    ws.total_pages,
                    ws.last_analyzed,
                    wp.id,
                    wp.url,
                    wp.title,
                    wp.priority,
                    wp.last_modified,
                    wp.change_freq,
                    wp.importance_score,
                    wp.page_category,
                    wp.ranking_factors
                FROM companies c
                JOIN website_structures ws ON ws.company_id = c.id
                JOIN website_pages wp ON wp.website_structure_id = ws.id
                WHERE c.name ILIKE ${`%${companyName}%`}
                AND ws.analysis_status = 'completed'
                ORDER BY wp.importance_score DESC, wp.priority DESC NULLS LAST
                LIMIT ${limitNum}
                OFFSET ${offsetNum}
            `;
            
            if (results.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'No ranked pages found for this company',
                        message: `No sitemap data found for ${companyName}`
                    })
                };
            }
            
            companyInfo = {
                name: results[0].company_name,
                domain: results[0].domain,
                totalPages: results[0].total_pages,
                lastAnalyzed: results[0].last_analyzed
            };
            
            topPages = results.map(page => ({
                id: page.id,
                url: page.url,
                title: page.title || 'Untitled',
                priority: page.priority || 0.5,
                lastModified: page.last_modified,
                changeFreq: page.change_freq || 'monthly',
                importanceScore: page.importance_score || 50,
                category: page.page_category || 'general',
                rankingFactors: page.ranking_factors
            }));
            
        } else if (domain) {
            // Similar query but by domain
            const results = await sql`
                SELECT 
                    c.name as company_name,
                    ws.domain,
                    ws.total_pages,
                    ws.last_analyzed,
                    wp.id,
                    wp.url,
                    wp.title,
                    wp.priority,
                    wp.last_modified,
                    wp.change_freq,
                    wp.importance_score,
                    wp.page_category,
                    wp.ranking_factors
                FROM website_structures ws
                JOIN companies c ON c.id = ws.company_id
                JOIN website_pages wp ON wp.website_structure_id = ws.id
                WHERE ws.domain = ${domain}
                AND ws.analysis_status = 'completed'
                ORDER BY wp.importance_score DESC, wp.priority DESC NULLS LAST
                LIMIT ${limitNum}
                OFFSET ${offsetNum}
            `;
            
            if (results.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'No ranked pages found for this domain',
                        message: `No sitemap data found for ${domain}`
                    })
                };
            }
            
            companyInfo = {
                name: results[0].company_name,
                domain: results[0].domain,
                totalPages: results[0].total_pages,
                lastAnalyzed: results[0].last_analyzed
            };
            
            topPages = results.map(page => ({
                id: page.id,
                url: page.url,
                title: page.title || 'Untitled',
                priority: page.priority || 0.5,
                lastModified: page.last_modified,
                changeFreq: page.change_freq || 'monthly',
                importanceScore: page.importance_score || 50,
                category: page.page_category || 'general',
                rankingFactors: page.ranking_factors
            }));
        }

        console.log(`✅ Found ${topPages.length} real ranked pages for ${companyInfo.name}`);
        console.log(`🏆 Top page: "${topPages[0]?.title}" (Score: ${topPages[0]?.importanceScore})`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                company: companyInfo,
                pages: topPages,
                pagination: {
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: topPages.length === limitNum,
                    totalPages: companyInfo.totalPages
                },
                metadata: {
                    source: 'real-database-rankings',
                    lastAnalyzed: companyInfo.lastAnalyzed,
                    cached: true
                }
            })
        };

    } catch (error) {
        console.error('❌ Real top pages API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};

export { handler };
