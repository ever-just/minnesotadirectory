#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function bulkMigrateAll() {
  console.log('⚡ BULK MIGRATE ALL 2,765 COMPANIES - FAST VERSION');
  
  // Clear existing
  await sql`DELETE FROM companies`;
  console.log('🗑️  Cleared existing companies');
  
  // Read CSV
  const csvContent = fs.readFileSync('public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv', 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  console.log(`📂 Loaded ${lines.length} lines from CSV`);
  
  // Parse all at once
  const allCompanies = [];
  for (let i = 1; i < lines.length; i++) { // Skip header
    const cols = lines[i].split(',').map(c => c.replace(/"/g, ''));
    if (cols.length > 30) {
      allCompanies.push([
        cols[0] || 'Company',           // name
        cols[30] || 'General',          // industry  
        parseFloat(cols[14]) || 0,      // sales
        parseInt(cols[19]) || 0,        // employees
        cols[6] || 'Minneapolis',       // city
        'Minnesota'                     // state
      ]);
    }
  }
  
  console.log(`📊 Parsed ${allCompanies.length} companies`);
  
  // Fast bulk insert using COPY-like approach
  let inserted = 0;
  const batchSize = 25;
  
  for (let i = 0; i < allCompanies.length; i += batchSize) {
    const batch = allCompanies.slice(i, i + batchSize);
    
    try {
      // Build bulk insert query
      const values = batch.map(([name, industry, sales, employees, city, state]) => 
        sql`(${name.slice(0,250)}, ${industry.slice(0,250)}, ${sales}, ${employees}, ${city.slice(0,250)}, ${state})`
      );
      
      await sql`INSERT INTO companies (name, industry, sales, employees, city, state) VALUES ${sql.join(values)}`;
      inserted += batch.length;
      
      if (i % 250 === 0) {
        console.log(`✅ ${inserted}/${allCompanies.length} companies (${Math.round(inserted/allCompanies.length*100)}%)`);
      }
    } catch (error) {
      console.log(`⚠️  Batch error at ${i}: ${error.message.substring(0,50)}`);
    }
  }
  
  // Final count
  const [finalCount] = await sql`SELECT COUNT(*) as count FROM companies`;
  console.log(`\n🎉 MIGRATION COMPLETE: ${finalCount.count} companies in database!`);
  
  return finalCount.count;
}

bulkMigrateAll().catch(console.error);
