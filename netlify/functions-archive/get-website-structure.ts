import type { Handler } from '@netlify/functions';
import { SitemapAnalysisService } from '../../src/services/SitemapAnalysisService';

/**
 * Get cached website structure for a company
 * Falls back to queueing analysis if not available
 */
export const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { companyId, domain, forceRefresh = 'false' } = event.queryStringParameters || {};
        
        if (!companyId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'companyId parameter is required',
                    success: false
                })
            };
        }

        // Check if we need to force refresh or if data is stale
        const needsRefresh = forceRefresh === 'true' || await SitemapAnalysisService.needsRefresh(companyId);
        
        if (needsRefresh && domain) {
            // Queue for analysis with high priority
            await SitemapAnalysisService.queueCompaniesForAnalysis([{
                id: companyId,
                domain: domain
            }], 1); // High priority
            
            console.log(`📝 Queued ${domain} for high-priority analysis`);
        }

        // Try to get cached data
        const cachedStructure = await SitemapAnalysisService.getCachedWebsiteStructure(companyId);
        
        if (cachedStructure) {
            // Transform to match frontend expectations
            const websiteStructure = {
                domain: cachedStructure.domain,
                pages: cachedStructure.pages.map(page => ({
                    url: page.url,
                    title: page.title,
                    priority: page.priority,
                    lastModified: page.lastModified,
                    changeFreq: page.changeFreq
                })),
                subdomains: cachedStructure.subdomains.map(subdomain => ({
                    name: subdomain.subdomain,
                    fullDomain: subdomain.fullDomain,
                    isActive: subdomain.isActive,
                    responseTime: subdomain.responseTime,
                    lastChecked: subdomain.lastChecked
                })),
                totalPages: cachedStructure.totalPages,
                sitemapUrl: cachedStructure.sitemapUrl,
                lastUpdated: cachedStructure.lastAnalyzed,
                cached: true,
                nextAnalysis: cachedStructure.nextAnalysis
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    structure: websiteStructure,
                    cached: true,
                    lastAnalyzed: cachedStructure.lastAnalyzed,
                    needsRefresh,
                    timestamp: new Date().toISOString()
                })
            };
        }

        // No cached data available
        return {
            statusCode: 202, // Accepted - processing
            headers,
            body: JSON.stringify({
                success: true,
                message: needsRefresh 
                    ? 'Analysis queued - check back in a few minutes'
                    : 'No website structure data available',
                cached: false,
                queued: needsRefresh,
                estimatedTime: '2-5 minutes',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Get website structure error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to get website structure',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        };
    }
};
