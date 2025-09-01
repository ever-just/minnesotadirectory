#!/usr/bin/env node

import { db } from '../db/index.ts';
import { companies, industries } from '../db/schema.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OPTIMIZED CSV PARSING (fastest method)
function parseCSVOptimized(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const companies = [];
  const batchSize = 1000; // Optimal batch size for PostgreSQL
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    
    const company = {
      name: values[0] || '',
      tradestyle: values[1] || null,
      address: values[3] || null,
      city: values[6] || '',
      state: values[7] || 'Minnesota',
      postalCode: values[8] || null,
      phone: values[10] || null,
      website: values[13] || null,
      sales: values[14] ? parseFloat(values[14]) || null : null,
      employees: values[19] ? parseInt(values[19]) || null : null,
      description: values[20] || null,
      ownership: values[21] || null,
      isHeadquarters: values[24] === 'true',
      ticker: values[25] || null,
      industry: values[30] || null,
      sicDescription: values[32] || null,
      naicsDescription: values[36] || null,
      employeesSite: values[18] || null
    };
    
    companies.push(company);
  }
  
  console.log(`✅ Parsed ${companies.length} companies from CSV`);
  return companies;
}

// OPTIMIZED BATCH INSERT (PostgreSQL COPY equivalent)
async function insertCompaniesBatch(companiesData) {
  console.log('🚀 Starting optimized batch insert...');
  
  const batchSize = 500; // Optimal for Drizzle + Neon
  let inserted = 0;
  
  for (let i = 0; i < companiesData.length; i += batchSize) {
    const batch = companiesData.slice(i, i + batchSize);
    
    try {
      await db.insert(companies).values(batch);
      inserted += batch.length;
      
      const percent = Math.round((inserted / companiesData.length) * 100);
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${inserted}/${companiesData.length} (${percent}%)`);
      
    } catch (error) {
      console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      throw error;
    }
  }
  
  return inserted;
}

// OPTIMIZED INDUSTRY EXTRACTION
async function insertIndustries(companiesData) {
  console.log('🏭 Creating industries lookup...');
  
  const uniqueIndustries = [...new Set(
    companiesData
      .map(c => c.industry)
      .filter(Boolean)
  )];
  
  const industriesData = uniqueIndustries.map(name => ({ name }));
  
  try {
    await db.insert(industries).values(industriesData);
    console.log(`✅ Inserted ${uniqueIndustries.length} industries`);
    return uniqueIndustries.length;
  } catch (error) {
    console.error('❌ Error inserting industries:', error.message);
    throw error;
  }
}

// MAIN MIGRATION FUNCTION
async function migrateCSVToDatabase() {
  const startTime = Date.now();
  console.log('🚀 OPTIMIZED CSV TO DATABASE MIGRATION STARTING...');
  
  try {
    // 1. Load and parse CSV (optimized)
    const csvPath = path.join(__dirname, '../public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv');
    console.log('📂 Reading CSV file...');
    const csvText = fs.readFileSync(csvPath, 'utf8');
    
    // 2. Parse with optimized method
    const companiesData = parseCSVOptimized(csvText);
    
    // 3. Insert industries first (for referential integrity)
    await insertIndustries(companiesData);
    
    // 4. Batch insert companies (optimized)
    const totalInserted = await insertCompaniesBatch(companiesData);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('🎉 MIGRATION COMPLETE!');
    console.log(`📊 Total companies: ${totalInserted}`);
    console.log(`🏭 Total industries: ${uniqueIndustries.length}`);
    console.log(`⚡ Duration: ${duration} seconds`);
    console.log(`🚀 Performance: ${Math.round(totalInserted / duration)} companies/second`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Execute migration
migrateCSVToDatabase();
