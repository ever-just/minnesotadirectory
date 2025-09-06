#!/usr/bin/env node
/**
 * Check what real sitemap data we have in the database
 */

import { neon } from '@netlify/neon';

async function checkRealSitemapData() {
    try {
        console.log('🔍 CHECKING REAL SITEMAP DATA FROM DATABASE...');
        
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('❌ NETLIFY_DATABASE_URL not found');
            process.exit(1);
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Get Fairview's actual sitemap data
        const [fairview] = await sql`
            SELECT ws.*, c.name as company_name
            FROM website_structures ws
            JOIN companies c ON c.id = ws.company_id
            WHERE c.name ILIKE '%Fairview%'
            LIMIT 1
        `;
        
        if (fairview) {
            console.log('\n🏥 FAIRVIEW REAL SITEMAP DATA:');
            console.log('   Company:', fairview.company_name);
            console.log('   Domain:', fairview.domain);
            console.log('   Total Pages:', fairview.total_pages);
            console.log('   Sitemap URL:', fairview.sitemap_url);
            console.log('   Last Analyzed:', fairview.last_analyzed);
            
            // Get actual pages for Fairview
            const pages = await sql`
                SELECT url, title, priority, last_modified, change_freq
                FROM website_pages
                WHERE website_structure_id = ${fairview.id}
                ORDER BY priority DESC NULLS LAST
                LIMIT 15
            `;
            
            console.log('\n📄 REAL PAGES FROM FAIRVIEW\'S ACTUAL SITEMAP.XML:');
            pages.forEach((page, i) => {
                console.log(`   ${i+1}. ${page.title || 'Untitled'} - ${page.url}`);
                console.log(`      Priority: ${page.priority || 'N/A'}, Modified: ${page.last_modified || 'N/A'}`);
            });
            
            // Get 3M data too
            const [threeMCompany] = await sql`
                SELECT ws.*, c.name as company_name
                FROM website_structures ws
                JOIN companies c ON c.id = ws.company_id
                WHERE c.name ILIKE '%3M%'
                LIMIT 1
            `;
            
            if (threeMCompany) {
                console.log('\n🏭 3M COMPANY REAL SITEMAP DATA:');
                console.log('   Company:', threeMCompany.company_name);
                console.log('   Domain:', threeMCompany.domain);
                console.log('   Total Pages:', threeMCompany.total_pages);
                
                const threeMPages = await sql`
                    SELECT url, title, priority
                    FROM website_pages
                    WHERE website_structure_id = ${threeMCompany.id}
                    ORDER BY priority DESC NULLS LAST
                    LIMIT 10
                `;
                
                console.log('\n📄 REAL 3M PAGES:');
                threeMPages.forEach((page, i) => {
                    console.log(`   ${i+1}. ${page.title || 'Untitled'} - ${page.url}`);
                });
            }
            
        } else {
            console.log('❌ No Fairview data found in database');
        }
        
        // Show summary stats
        const [stats] = await sql`
            SELECT 
                COUNT(DISTINCT ws.id) as total_companies_analyzed,
                COUNT(wp.id) as total_real_pages,
                AVG(ws.total_pages) as avg_pages_per_company
            FROM website_structures ws
            LEFT JOIN website_pages wp ON wp.website_structure_id = ws.id
        `;
        
        console.log('\n📊 DATABASE SUMMARY:');
        console.log('   Companies Analyzed:', stats.total_companies_analyzed);
        console.log('   Total Real Pages:', stats.total_real_pages);
        console.log('   Avg Pages/Company:', Math.round(stats.avg_pages_per_company));
        
    } catch (error) {
        console.error('❌ Error checking sitemap data:', error);
    }
}

checkRealSitemapData();
