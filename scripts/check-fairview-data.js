#!/usr/bin/env node
import { neon } from '@netlify/neon';

async function checkFairviewData() {
    try {
        console.log('=== CHECKING FAIRVIEW HEALTH SERVICES DATA ===');
        
        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        // Find Fairview company
        const [fairview] = await sql`
            SELECT id, name, website
            FROM companies 
            WHERE name ILIKE '%Fairview%' 
            LIMIT 1
        `;
        
        if (!fairview) {
            console.log('❌ Fairview company not found in database');
            return;
        }
        
        console.log('🏥 Fairview Company Data:');
        console.log('   ID:', fairview.id);
        console.log('   Name:', fairview.name);
        console.log('   Website:', fairview.website);
        
        // Check if it has website structure data
        const [structure] = await sql`
            SELECT * FROM website_structures 
            WHERE company_id = ${fairview.id}
        `;
        
        if (structure) {
            console.log('\n📊 Fairview Website Structure EXISTS:');
            console.log('   Domain:', structure.domain);
            console.log('   Total Pages:', structure.total_pages);
            console.log('   Status:', structure.analysis_status);
            console.log('   Last Analyzed:', structure.last_analyzed);
            
            // Get pages
            const pages = await sql`
                SELECT url, title, page_type, priority
                FROM website_pages 
                WHERE website_structure_id = ${structure.id}
                ORDER BY priority DESC
                LIMIT 10
            `;
            
            console.log('\n📄 Fairview Pages in Database:');
            pages.forEach(page => {
                console.log(`   - ${page.title || 'Untitled'} (${page.page_type}): ${page.url}`);
            });
            
            console.log('\n✅ FAIRVIEW HAS REAL DATABASE DATA!');
            console.log('🤔 So why is frontend showing "No website structure data available"?');
            
        } else {
            console.log('\n❌ No website structure found for Fairview in database');
        }
        
        // Check if the API function would work
        console.log('\n🔧 Testing API Function Logic:');
        console.log('   Company ID needed for API:', fairview.id);
        console.log('   Domain extracted from website:', fairview.website);
        
    } catch (error) {
        console.error('❌ Check failed:', error);
    }
}

checkFairviewData();
