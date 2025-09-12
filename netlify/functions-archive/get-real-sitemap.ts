import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

/**
 * Get REAL sitemap data from database for a specific company
 * Returns actual pages from sitemap.xml analysis
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
        const { companyName, domain } = event.queryStringParameters || {};
        
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

        console.log(`🔍 Getting REAL sitemap data for: ${companyName || domain}`);

        const sql = neon(process.env.NETLIFY_DATABASE_URL!);
        
        // Find the company's website structure
        let websiteStructure;
        if (companyName) {
            [websiteStructure] = await sql`
                SELECT ws.*, c.name as company_name
                FROM website_structures ws
                JOIN companies c ON c.id = ws.company_id
                WHERE c.name ILIKE ${`%${companyName}%`}
                LIMIT 1
            `;
        } else if (domain) {
            [websiteStructure] = await sql`
                SELECT ws.*, c.name as company_name
                FROM website_structures ws
                JOIN companies c ON c.id = ws.company_id
                WHERE ws.domain = ${domain}
                LIMIT 1
            `;
        }
        
        if (!websiteStructure) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'No sitemap data found for this company',
                    message: `No analysis found for ${companyName || domain}`
                })
            };
        }

        // Get the real pages from the database
        const realPages = await sql`
            SELECT 
                url, 
                title, 
                priority, 
                last_modified, 
                change_freq,
                page_type
            FROM website_pages
            WHERE website_structure_id = ${websiteStructure.id}
            ORDER BY priority DESC NULLS LAST, url ASC
            LIMIT 100
        `;

        // Get subdomains if any
        const subdomains = await sql`
            SELECT 
                subdomain_name,
                full_domain,
                is_active,
                response_time,
                last_checked
            FROM website_subdomains
            WHERE website_structure_id = ${websiteStructure.id}
            ORDER BY subdomain_name ASC
        `;

        console.log(`✅ Found ${realPages.length} real pages for ${websiteStructure.company_name}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                structure: {
                    domain: websiteStructure.domain,
                    companyName: websiteStructure.company_name,
                    totalPages: websiteStructure.total_pages,
                    totalDirectories: websiteStructure.total_directories,
                    totalSubdomains: websiteStructure.total_subdomains,
                    sitemapUrl: websiteStructure.sitemap_url,
                    lastAnalyzed: websiteStructure.last_analyzed,
                    analysisStatus: websiteStructure.analysis_status,
                    pages: realPages.map(page => ({
                        url: page.url,
                        title: page.title || 'Untitled',
                        priority: page.priority || 0.5,
                        lastModified: page.last_modified,
                        changeFreq: page.change_freq || 'monthly',
                        pageType: page.page_type || 'page'
                    })),
                    subdomains: subdomains.map(sub => ({
                        name: sub.subdomain_name,
                        fullDomain: sub.full_domain,
                        isActive: sub.is_active,
                        responseTime: sub.response_time,
                        lastChecked: sub.last_checked
                    }))
                },
                cached: true,
                source: 'real-database-sitemap'
            })
        };

    } catch (error) {
        console.error('❌ Real sitemap API error:', error);
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
