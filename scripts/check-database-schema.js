#!/usr/bin/env node
/**
 * Check current database schema and record counts
 */

import { neon } from '@netlify/neon';

async function checkSchema() {
    try {
        console.log('🔍 Checking Netlify/Neon database schema...');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Get all tables
        const tables = await sql`
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `;
        
        console.log(`📊 Found ${tables.length} tables in database:`);
        
        for (const table of tables) {
            const tableName = table.table_name;
            console.log(`\n📋 Table: ${tableName}`);
            
            // Get columns for this table
            const columns = await sql`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = ${tableName}
                ORDER BY ordinal_position
            `;
            
            columns.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
            });
            
            // Get record count
            try {
                const countResult = await sql([`SELECT COUNT(*) as count FROM "${tableName}"`]);
                console.log(`   📊 Records: ${countResult[0].count}`);
            } catch (error) {
                console.log(`   ⚠️ Could not count records: ${error.message}`);
            }
        }
        
        // Check sitemap processing status specifically
        if (tables.some(t => t.table_name === 'analysis_queue')) {
            console.log('\n🔍 Sitemap Processing Status:');
            const [queueStats] = await sql`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'queued') as queued,
                    COUNT(*) FILTER (WHERE status = 'processing') as processing,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                FROM analysis_queue
            `;
            
            console.log(`   Total: ${queueStats.total}`);
            console.log(`   Queued: ${queueStats.queued}`);
            console.log(`   Processing: ${queueStats.processing}`);
            console.log(`   Completed: ${queueStats.completed}`);
            console.log(`   Failed: ${queueStats.failed}`);
            
            const progress = Math.round((queueStats.completed / queueStats.total) * 100);
            console.log(`   Progress: ${progress}%`);
        }
        
        console.log('\n✅ Database schema check complete!');
        
    } catch (error) {
        console.error('❌ Schema check failed:', error);
        process.exit(1);
    }
}

checkSchema();
