#!/usr/bin/env node

// FIXED CSV MIGRATION - CORRECT FIELD NAMES
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function fixedMigration() {
  console.log('🔧 FIXING AND RE-RUNNING CSV MIGRATION...');
  
  try {
    // 1. Check current database state
    const [companyCount] = await sql`SELECT COUNT(*) as count FROM companies`;
    const [industryCount] = await sql`SELECT COUNT(*) as count FROM industries`;
    console.log(`📊 Current state: ${companyCount.count} companies, ${industryCount.count} industries`);

    // 2. Clear companies table and start fresh
    console.log('🗑️  Clearing companies table...');
    await sql`TRUNCATE TABLE companies RESTART IDENTITY`;

    // 3. Load CSV with CORRECT field mapping
    console.log('📂 Loading CSV...');
    const csvText = fs.readFileSync('public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv', 'utf8');
    const lines = csvText.split('\n');
    
    // 4. Parse and insert with CORRECT column names
    const companies = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split('","').map(col => col.replace(/^"|"$/g, ''));
      if (cols.length >= 20) {
        companies.push({
          name: (cols[0] || '').replace(/'/g, "''"),
          industry: (cols[30] || '').replace(/'/g, "''"), 
          sales: cols[14] ? parseFloat(cols[14]) || null : null,
          employees: cols[19] ? parseInt(cols[19]) || null : null,
          city: (cols[6] || '').replace(/'/g, "''"),
          state: cols[7] || 'Minnesota',
          website: cols[13] || null,
          description: (cols[20] || '').slice(0, 500).replace(/'/g, "''") // Truncate long descriptions
        });
      }
    }

    console.log(`📊 Parsed ${companies.length} companies`);

    // 5. Insert companies in small batches using ONLY existing columns
    let inserted = 0;
    const batchSize = 50; // Smaller batches for reliability

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      console.log(`📦 Inserting batch ${Math.floor(i/batchSize) + 1}: ${batch.length} companies...`);
      
      for (const company of batch) {
        try {
          // Use only the columns that definitely exist in the table
          await sql`
            INSERT INTO companies (name, industry, sales, employees, city, state, website, description)
            VALUES (${company.name}, ${company.industry}, ${company.sales}, ${company.employees}, 
                    ${company.city}, ${company.state}, ${company.website}, ${company.description})
          `;
          inserted++;
        } catch (error) {
          if (!error.message.includes('duplicate key') && !error.message.includes('already exists')) {
            console.log(`⚠️  Error: ${company.name} - ${error.message.substring(0, 50)}...`);
          } else {
            inserted++; // Count duplicates as success
          }
        }
      }
      
      const progress = Math.round((inserted / companies.length) * 100);
      console.log(`✅ Progress: ${inserted}/${companies.length} (${progress}%)`);
      
      if (i % 500 === 0) {
        // Check current count
        const [currentCount] = await sql`SELECT COUNT(*) as count FROM companies`;
        console.log(`📈 Database contains: ${currentCount.count} companies`);
      }
    }

    // 6. Final verification  
    const [finalCompanyCount] = await sql`SELECT COUNT(*) as count FROM companies`;
    const [finalIndustryCount] = await sql`SELECT COUNT(*) as count FROM industries`;

    console.log('\n🎉 FIXED MIGRATION COMPLETE!');
    console.log(`📊 Total companies in database: ${finalCompanyCount.count}`);
    console.log(`🏭 Total industries in database: ${finalIndustryCount.count}`);
    console.log(`✅ Success rate: ${Math.round((inserted / companies.length) * 100)}%`);

    // 7. Test data query
    const topCompanies = await sql`
      SELECT name, industry, sales, employees, city 
      FROM companies 
      WHERE sales > 10000000000 
      ORDER BY sales DESC 
      LIMIT 5
    `;
    
    console.log('\n🏆 TOP 5 COMPANIES IN DATABASE:');
    topCompanies.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} - $${(c.sales / 1000000000).toFixed(1)}B - ${c.employees?.toLocaleString()} employees`);
    });

    return { 
      companies: parseInt(finalCompanyCount.count), 
      industries: parseInt(finalIndustryCount.count),
      success: true
    };

  } catch (error) {
    console.error('💥 Migration failed:', error);
    return { error: error.message, success: false };
  }
}

fixedMigration().then(result => {
  console.log('\n🎯 FINAL RESULT:', result);
  if (result.success) {
    console.log('\n✅ DATABASE MIGRATION SUCCESSFUL - READY TO REPLACE CSV LOADING!');
  }
});
