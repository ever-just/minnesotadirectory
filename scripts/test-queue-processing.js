#!/usr/bin/env node
/**
 * Test queue processing with mock data
 * Simulates website analysis and stores mock results
 */

import { neon } from '@netlify/neon';

async function testQueueProcessing() {
    try {
        console.log('🧪 Testing queue processing with mock data...');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Get first 3 jobs for testing
        const jobs = await sql`
            UPDATE analysis_queue 
            SET status = 'processing', last_attempt = now(), attempts = attempts + 1
            WHERE id IN (
                SELECT id FROM analysis_queue
                WHERE status = 'queued' 
                ORDER BY priority ASC, created_at ASC
                LIMIT 3
            )
            RETURNING id, company_id, domain, attempts
        `;

        if (jobs.length === 0) {
            console.log('📭 No jobs to process');
            return;
        }

        console.log(`📋 Processing ${jobs.length} jobs...`);

        for (const job of jobs) {
            console.log(`🔍 Mock analyzing ${job.domain}...`);
            
            try {
                // Create mock website structure data
                const mockStructure = {
                    domain: job.domain,
                    pages: [
                        { url: `https://${job.domain}/`, title: 'Home', priority: 1.0 },
                        { url: `https://${job.domain}/about`, title: 'About', priority: 0.8 },
                        { url: `https://${job.domain}/contact`, title: 'Contact', priority: 0.6 },
                        { url: `https://${job.domain}/services`, title: 'Services', priority: 0.7 }
                    ],
                    subdomains: [],
                    totalPages: 4,
                    lastUpdated: new Date().toISOString()
                };
                
                // Store mock results
                await storeMockWebsiteStructure(sql, job.company_id, mockStructure);
                
                // Mark job as completed
                await sql`
                    UPDATE analysis_queue 
                    SET status = 'completed', updated_at = now()
                    WHERE id = ${job.id}
                `;
                
                console.log(`✅ ${job.domain}: Stored mock data with ${mockStructure.pages.length} pages`);
                
            } catch (error) {
                console.error(`❌ ${job.domain} failed:`, error.message);
                
                // Mark as failed
                await sql`
                    UPDATE analysis_queue 
                    SET status = 'failed', error_message = ${error.message}, updated_at = now()
                    WHERE id = ${job.id}
                `;
            }
        }

        // Get final stats
        const [stats] = await sql`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'queued') as queued,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM analysis_queue
        `;

        console.log(`\n📊 Queue Status:`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   Queued: ${stats.queued}`);
        console.log(`   Completed: ${stats.completed}`);
        console.log(`   Failed: ${stats.failed}`);
        
        if (stats.completed > 0) {
            console.log(`\n🎉 ${stats.completed} websites now have cached data!`);
            console.log(`✨ Test the frontend with cached website structures`);
        }
        
    } catch (error) {
        console.error('❌ Test processing failed:', error);
        process.exit(1);
    }
}

async function storeMockWebsiteStructure(sql, companyId, structure) {
    // Insert/update main website structure
    const [websiteStructure] = await sql`
        INSERT INTO website_structures (
            company_id, domain, total_pages, total_directories, total_subdomains,
            last_analyzed, analysis_status
        )
        VALUES (
            ${companyId}, ${structure.domain}, ${structure.pages.length}, 
            2, 0, now(), 'completed'
        )
        ON CONFLICT (company_id) DO UPDATE SET
            domain = ${structure.domain},
            total_pages = ${structure.pages.length},
            total_directories = 2,
            total_subdomains = 0,
            last_analyzed = now(),
            analysis_status = 'completed',
            error_message = NULL,
            updated_at = now()
        RETURNING id
    `;

    const websiteStructureId = websiteStructure.id;

    // Clear old pages
    await sql`DELETE FROM website_pages WHERE website_structure_id = ${websiteStructureId}`;

    // Insert mock pages
    for (const page of structure.pages) {
        await sql`
            INSERT INTO website_pages (
                website_structure_id, url, path, title, priority, page_type, depth
            )
            VALUES (
                ${websiteStructureId}, ${page.url}, ${extractPath(page.url)}, 
                ${page.title}, ${page.priority}, ${determinePageType(page.url)}, 
                ${calculateDepth(page.url)}
            )
        `;
    }
}

function extractPath(url) {
    try {
        return new URL(url).pathname;
    } catch {
        return '/';
    }
}

function determinePageType(url) {
    const path = extractPath(url).toLowerCase();
    if (path === '/' || path === '') return 'home';
    if (path.includes('about')) return 'about';
    if (path.includes('contact')) return 'contact';
    if (path.includes('service')) return 'services';
    return 'other';
}

function calculateDepth(url) {
    const path = extractPath(url);
    return path.split('/').filter(Boolean).length;
}

testQueueProcessing();
