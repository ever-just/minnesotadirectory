#!/usr/bin/env node

// FINAL CSV MIGRATION - DIRECT NEON EXECUTION
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function executeMigration() {
  console.log('🚀 STARTING FINAL CSV TO DATABASE MIGRATION...');
  
  try {
    // 1. Test connection
    console.log('🔌 Testing database connection...');
    const connectionTest = await sql`SELECT NOW() as time, version() as version`;
    console.log('✅ Connected to:', connectionTest[0].version.substring(0, 50) + '...');
    
    // 2. Create tables (ensure they exist)
    console.log('🏗️  Creating database tables...');
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(255),
        sales DECIMAL(18,2),
        employees INTEGER,
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(50) DEFAULT 'Minnesota',
        postal_code VARCHAR(20),
        phone VARCHAR(50),
        website VARCHAR(500),
        description TEXT,
        tradestyle VARCHAR(255),
        ticker VARCHAR(10),
        ownership VARCHAR(100),
        naics_description TEXT,
        sic_description TEXT,
        is_headquarters BOOLEAN DEFAULT false,
        employees_site VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS industries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        company_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Tables ready');

    // 3. Load and parse CSV
    console.log('📂 Loading CSV file...');
    const csvText = fs.readFileSync('public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv', 'utf8');
    const lines = csvText.split('\n');
    console.log(`📊 Processing ${lines.length} lines...`);

    // 4. Parse companies
    const companies = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split('","').map(col => col.replace(/^"|"$/g, ''));
      if (cols.length >= 20) {
        companies.push({
          name: (cols[0] || '').replace(/'/g, "''"),
          tradestyle: cols[1] || null,
          address: cols[3] || null,
          city: (cols[6] || '').replace(/'/g, "''"),
          state: cols[7] || 'Minnesota',
          postalCode: cols[8] || null,
          phone: cols[10] || null,
          website: cols[13] || null,
          sales: cols[14] ? parseFloat(cols[14]) || null : null,
          employees: cols[19] ? parseInt(cols[19]) || null : null,
          description: (cols[20] || '').replace(/'/g, "''"),
          ownership: cols[21] || null,
          isHeadquarters: cols[24] === 'true',
          ticker: cols[25] || null,
          industry: (cols[30] || '').replace(/'/g, "''"),
          sicDescription: (cols[32] || '').replace(/'/g, "''"),
          naicsDescription: (cols[36] || '').replace(/'/g, "''"),
          employeesSite: cols[18] || null
        });
      }
    }
    console.log(`✅ Parsed ${companies.length} companies`);

    // 5. Insert companies in batches
    console.log('🚀 Inserting companies in batches...');
    const batchSize = 100; // Smaller batches for reliability
    let inserted = 0;

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      console.log(`📦 Batch ${Math.floor(i/batchSize) + 1}: Inserting ${batch.length} companies...`);
      
      for (const company of batch) {
        try {
          await sql`
            INSERT INTO companies (
              name, industry, sales, employees, city, state, website, 
              description, tradestyle, ticker, ownership, phone, address, 
              postal_code, naics_description, sic_description, is_headquarters, employees_site
            ) VALUES (
              ${company.name}, ${company.industry}, ${company.sales}, ${company.employees},
              ${company.city}, ${company.state}, ${company.website}, ${company.description},
              ${company.tradestyle}, ${company.ticker}, ${company.ownership}, ${company.phone},
              ${company.address}, ${company.postalCode}, ${company.naicsDescription}, 
              ${company.sicDescription}, ${company.isHeadquarters}, ${company.employeesSite}
            )
          `;
          inserted++;
        } catch (error) {
          console.log(`⚠️  Error inserting ${company.name}:`, error.message);
        }
      }
      
      const progress = Math.round((inserted / companies.length) * 100);
      console.log(`✅ Progress: ${inserted}/${companies.length} (${progress}%)`);
    }

    // 6. Insert industries
    console.log('🏭 Inserting industries...');
    const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];
    let industriesInserted = 0;
    
    for (const industry of industries) {
      try {
        await sql`INSERT INTO industries (name) VALUES (${industry}) ON CONFLICT (name) DO NOTHING`;
        industriesInserted++;
      } catch (error) {
        console.log(`⚠️  Error inserting industry ${industry}:`, error.message);
      }
    }

    // 7. Final verification
    const [companyCount] = await sql`SELECT COUNT(*) as count FROM companies`;
    const [industryCount] = await sql`SELECT COUNT(*) as count FROM industries`;

    console.log('\n🎉 MIGRATION COMPLETE!');
    console.log(`📊 Companies in database: ${companyCount.count}`);
    console.log(`🏭 Industries in database: ${industryCount.count}`);
    console.log(`✅ Success rate: ${Math.round((inserted / companies.length) * 100)}%`);

    const results = {
      status: 'SUCCESS',
      companies: parseInt(companyCount.count),
      industries: parseInt(industryCount.count),
      successRate: Math.round((inserted / companies.length) * 100)
    };

    console.log('\n📋 FINAL RESULTS:', results);
    return results;

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

executeMigration().catch(console.error);
