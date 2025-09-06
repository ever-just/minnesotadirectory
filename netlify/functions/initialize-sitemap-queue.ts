import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import { SitemapAnalysisService } from '../../src/services/SitemapAnalysisService';

/**
 * Initialize the sitemap analysis queue with all companies
 * This should be run once to populate the queue with existing companies
 */
export const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Security check - only allow POST requests with a secret key
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { secretKey, priority = 5, batchSize = 100 } = body;

    // Simple security check (in production, use proper authentication)
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        const sql = neon(process.env.NETLIFY_DATABASE_URL!);
        
        console.log('🚀 Starting sitemap queue initialization...');
        
        // Get all companies with websites
        const companies = await sql`
            SELECT id, name, website
            FROM companies 
            WHERE website IS NOT NULL 
            AND website != ''
            AND website != 'N/A'
            ORDER BY sales DESC NULLS LAST
        `;

        console.log(`📊 Found ${companies.length} companies with websites`);

        // Extract domains and prepare for queueing
        const companiesWithDomains = companies
            .map(company => {
                const domain = extractDomain(company.website);
                return domain ? {
                    id: company.id,
                    name: company.name,
                    domain: domain
                } : null;
            })
            .filter(Boolean);

        console.log(`🌐 ${companiesWithDomains.length} companies have valid domains`);

        // Queue companies in batches
        let totalQueued = 0;
        const batchSizeNum = Math.min(parseInt(batchSize.toString()), 500);
        
        for (let i = 0; i < companiesWithDomains.length; i += batchSizeNum) {
            const batch = companiesWithDomains.slice(i, i + batchSizeNum);
            
            await SitemapAnalysisService.queueCompaniesForAnalysis(
                batch.map(c => ({ id: c.id, domain: c.domain })),
                priority
            );
            
            totalQueued += batch.length;
            console.log(`📝 Queued batch ${Math.ceil((i + 1) / batchSizeNum)}: ${batch.length} companies (total: ${totalQueued})`);
            
            // Small delay between batches to avoid overwhelming the database
            if (i + batchSizeNum < companiesWithDomains.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Get queue statistics
        const [queueStats] = await sql`
            SELECT 
                COUNT(*) as total_queued,
                COUNT(*) FILTER (WHERE status = 'queued') as pending,
                COUNT(*) FILTER (WHERE status = 'processing') as processing,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM analysis_queue
        `;

        const summary = {
            companiesProcessed: companies.length,
            companiesWithValidDomains: companiesWithDomains.length,
            totalQueued,
            queueStats: {
                total: parseInt(queueStats.total_queued),
                pending: parseInt(queueStats.pending),
                processing: parseInt(queueStats.processing),
                completed: parseInt(queueStats.completed),
                failed: parseInt(queueStats.failed)
            },
            estimatedProcessingTime: `${Math.ceil(totalQueued / 10)} - ${Math.ceil(totalQueued / 5)} minutes`
        };

        console.log('✅ Queue initialization complete:', summary);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Successfully queued ${totalQueued} companies for sitemap analysis`,
                summary,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Queue initialization error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to initialize sitemap queue',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        };
    }
};

// Helper function to extract domain from URL
function extractDomain(url: string): string | null {
    if (!url) return null;
    try {
        const cleanUrl = url.includes('http') ? url : `https://${url}`;
        const domain = new URL(cleanUrl).hostname;
        return domain.replace('www.', '');
    } catch {
        return null;
    }
}
