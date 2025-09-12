import type { Handler } from '@netlify/functions';
import { SitemapAnalysisService } from '../../src/services/SitemapAnalysisService';

/**
 * Background function to process sitemap analysis queue
 * Can be triggered by:
 * 1. Scheduled function (every 30 minutes)
 * 2. Manual trigger via API
 * 3. Webhook from external service
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
        const startTime = Date.now();
        const { batchSize = '10', maxRunTime = '300' } = event.queryStringParameters || {};
        
        const batchSizeNum = Math.min(parseInt(batchSize), 50); // Max 50 per batch
        const maxRunTimeNum = Math.min(parseInt(maxRunTime), 900); // Max 15 minutes
        
        console.log(`🚀 Starting sitemap processing: batch=${batchSizeNum}, maxTime=${maxRunTimeNum}s`);
        
        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        
        // Process jobs until time limit or no more jobs
        while (Date.now() - startTime < maxRunTimeNum * 1000) {
            // Get next batch of jobs
            const jobs = await SitemapAnalysisService.getNextAnalysisJobs(batchSizeNum);
            
            if (jobs.length === 0) {
                console.log('📭 No more jobs in queue');
                break;
            }
            
            console.log(`📋 Processing ${jobs.length} jobs...`);
            
            // Process jobs in parallel (but limit concurrency)
            const concurrency = Math.min(jobs.length, 5); // Max 5 concurrent analyses
            const jobChunks = [];
            
            for (let i = 0; i < jobs.length; i += concurrency) {
                jobChunks.push(jobs.slice(i, i + concurrency));
            }
            
            for (const chunk of jobChunks) {
                const promises = chunk.map(job => 
                    SitemapAnalysisService.processCompanyAnalysis(job)
                        .then(success => ({ job, success }))
                        .catch(error => ({ job, success: false, error }))
                );
                
                const results = await Promise.all(promises);
                
                results.forEach(result => {
                    totalProcessed++;
                    if (result.success) {
                        totalSuccessful++;
                    } else {
                        totalFailed++;
                        console.error(`❌ Job failed:`, result.job.domain, result.error);
                    }
                });
                
                // Check time limit between chunks
                if (Date.now() - startTime >= maxRunTimeNum * 1000) {
                    console.log('⏰ Time limit reached, stopping processing');
                    break;
                }
            }
        }
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        const summary = {
            duration: `${duration}s`,
            totalProcessed,
            totalSuccessful,
            totalFailed,
            successRate: totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0
        };
        
        console.log(`✅ Processing complete:`, summary);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Processed ${totalProcessed} sitemap analyses`,
                summary,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Sitemap processing error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to process sitemap queue',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        };
    }
};

// Export for scheduled function usage
export { handler as scheduledHandler };
