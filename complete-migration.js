#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function completeMigration() {
  console.log('🚀 COMPLETE CSV TO DATABASE MIGRATION - ALL 2,765 COMPANIES');
  
  try {
    // 1. Clear existing data
    await sql`DELETE FROM companies`;
    console.log('🗑️  Cleared existing companies');
    
    // 2. Read CSV file
    const csvContent = fs.readFileSync('public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv', 'utf8');
    const lines = csvContent.split('\n');
    console.log(`📂 Loaded ${lines.length} lines from CSV`);
    
    // 3. Parse header to understand structure
    const header = lines[0].split(',');
    console.log(`📋 CSV has ${header.length} columns`);
    
    // 4. Process all companies
    let inserted = 0;
    const total = lines.length - 1; // Minus header
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by comma, handle quoted fields properly
      const cols = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim()); // Add last column
      
      if (cols.length >= 30) {
        try {
          // Map CSV columns to database fields
          const company = {
            name: cols[0]?.slice(0, 255) || 'Unknown Company',
            industry: cols[30]?.slice(0, 255) || 'General',
            sales: parseFloat(cols[14]) || 0,
            employees: parseInt(cols[19]) || 0,
            city: cols[6]?.slice(0, 255) || 'Minneapolis',
            state: cols[7] || 'Minnesota',
            website: cols[13] || null,
            description: cols[20]?.slice(0, 1000) || null
          };
          
          // Insert individual company
          await sql`
            INSERT INTO companies (name, industry, sales, employees, city, state, website, description)
            VALUES (${company.name}, ${company.industry}, ${company.sales}, ${company.employees}, ${company.city}, ${company.state}, ${company.website}, ${company.description})
          `;
          
          inserted++;
          
          // Progress update every 100 companies
          if (inserted % 100 === 0) {
            const progress = Math.round((inserted / total) * 100);
            console.log(`✅ Progress: ${inserted}/${total} companies (${progress}%)`);
          }
          
        } catch (error) {
          // Skip problematic records but continue
          if (!error.message.includes('duplicate key')) {
            console.log(`⚠️  Skipped company ${i}: ${error.message.substring(0, 50)}`);
          }
        }
      }
    }
    
    // 5. Verify final count
    const [finalCount] = await sql`SELECT COUNT(*) as count FROM companies`;
    console.log(`\n🎉 MIGRATION COMPLETE!`);
    console.log(`📊 Total companies in database: ${finalCount.count}`);
    console.log(`✅ Success rate: ${Math.round((inserted / total) * 100)}%`);
    
    // 6. Show top companies
    const topCompanies = await sql`
      SELECT name, sales, employees, city 
      FROM companies 
      WHERE sales > 0 
      ORDER BY sales DESC 
      LIMIT 10
    `;
    
    console.log(`\n🏆 TOP 10 COMPANIES BY REVENUE:`);
    topCompanies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name} - $${(company.sales / 1000000000).toFixed(1)}B`);
    });
    
    return finalCount.count;
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

completeMigration().catch(console.error);
