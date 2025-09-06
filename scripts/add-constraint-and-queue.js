#!/usr/bin/env node
/**
 * Add constraint and queue companies
 */

import { neon } from '@netlify/neon';

function extractDomain(url) {
    if (!url) return null;
    try {
        const cleanUrl = url.includes('http') ? url : `https://${url}`;
        const domain = new URL(cleanUrl).hostname;
        return domain.replace('www.', '');
    } catch {
        return null;
    }
}

async function addConstraintAndQueue() {
    try {
        console.log('🚀 Adding constraint and queuing companies...');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Add unique constraint
        console.log('🔧 Adding unique constraint...');
        try {
            await sql`ALTER TABLE analysis_queue ADD CONSTRAINT analysis_queue_company_unique UNIQUE (company_id)`;
            console.log('✅ Unique constraint added');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️ Constraint already exists');
            } else {
                console.error('❌ Failed to add constraint:', error.message);
            }
        }

        // Get companies (first 100 for testing)
        const companies = await sql`
            SELECT id, name, website
            FROM companies 
            WHERE website IS NOT NULL 
            AND website != ''
            AND website != 'N/A'
            ORDER BY sales DESC NULLS LAST
            LIMIT 100
        `;

        console.log(`📊 Processing ${companies.length} companies...`);

        let queued = 0;
        let skipped = 0;

        for (const company of companies) {
            const domain = extractDomain(company.website);
            if (!domain) {
                skipped++;
                continue;
            }

            try {
                await sql`
                    INSERT INTO analysis_queue (company_id, domain, priority, status)
                    VALUES (${company.id}, ${domain}, 5, 'queued')
                    ON CONFLICT (company_id) DO NOTHING
                `;
                
                queued++;
                if (queued % 25 === 0) {
                    console.log(`📝 Queued ${queued} companies...`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to queue ${company.name}:`, error.message);
                skipped++;
            }
        }

        // Get final stats
        const [stats] = await sql`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'queued') as pending
            FROM analysis_queue
        `;

        console.log(`\n🎉 Queue initialization complete!`);
        console.log(`✅ Successfully queued: ${queued}`);
        console.log(`⚠️ Skipped: ${skipped}`);
        console.log(`📊 Total in queue: ${stats.total}`);
        console.log(`⏳ Ready for processing: ${stats.pending}`);
        
        if (stats.pending > 0) {
            console.log(`\n✨ Ready to start background processing!`);
            console.log(`💡 Next: Run background processor to analyze websites`);
        }
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addConstraintAndQueue();
