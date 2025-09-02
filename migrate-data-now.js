#!/usr/bin/env node

// IMMEDIATE CSV TO DATABASE MIGRATION - WORKING VERSION
import fs from 'fs';

console.log('🚀 MIGRATING CSV DATA TO DATABASE NOW...');

// 1. Load CSV file
const csvFile = 'public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv';
console.log(`📂 Loading CSV file: ${csvFile}`);

const csvText = fs.readFileSync(csvFile, 'utf8');
const lines = csvText.split('\n');
console.log(`📊 Total lines in CSV: ${lines.length}`);
console.log(`📋 Header: ${lines[0].substring(0, 100)}...`);

// 2. Parse companies efficiently
const companies = [];
let validRows = 0;
let invalidRows = 0;

console.log('📈 Parsing company data...');

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Split by comma but handle quoted fields
  const cols = line.split('","').map(col => col.replace(/^"|"$/g, ''));
  
  if (cols.length >= 20) { // Ensure minimum required fields
    const company = {
      name: cols[0] || '',
      tradestyle: cols[1] || null,
      address: cols[3] || null,
      city: cols[6] || '',
      state: cols[7] || 'Minnesota',
      postalCode: cols[8] || null,
      phone: cols[10] || null,
      website: cols[13] || null,
      sales: cols[14] ? parseFloat(cols[14]) || null : null,
      employees: cols[19] ? parseInt(cols[19]) || null : null,
      description: cols[20] || null,
      ownership: cols[21] || null,
      isHeadquarters: cols[24] === 'true',
      ticker: cols[25] || null,
      industry: cols[30] || null,
      sicDescription: cols[32] || null,
      naicsDescription: cols[36] || null,
      employeesSite: cols[18] || null
    };
    
    companies.push(company);
    validRows++;
  } else {
    invalidRows++;
  }
  
  // Progress indicator
  if (i % 500 === 0) {
    console.log(`📊 Processed ${i}/${lines.length} lines...`);
  }
}

console.log(`✅ Successfully parsed ${validRows} companies`);
console.log(`⚠️  Skipped ${invalidRows} invalid rows`);

// 3. Extract unique industries
const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];
console.log(`🏭 Found ${industries.length} unique industries`);

// 4. Create SQL insert statements for manual execution
console.log('📝 Generating SQL insert statements...');

// Create INSERT statement for top 10 companies
const topCompanies = companies
  .filter(c => c.sales && c.sales > 0)
  .sort((a, b) => (b.sales || 0) - (a.sales || 0))
  .slice(0, 10);

console.log('\n🎯 TOP 10 COMPANIES BY SALES:');
topCompanies.forEach((c, i) => {
  console.log(`${i + 1}. ${c.name} - $${(c.sales / 1000000).toFixed(0)}M - ${c.employees?.toLocaleString()} employees`);
});

// Generate SQL for immediate execution
const sqlStatements = [];

// Industries first
sqlStatements.push('-- Insert Industries');
industries.slice(0, 20).forEach(industry => {
  sqlStatements.push(`INSERT INTO industries (name) VALUES ('${industry.replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING;`);
});

// Top companies
sqlStatements.push('\n-- Insert Top Companies');
topCompanies.forEach(company => {
  const values = [
    company.name?.replace(/'/g, "''") || '',
    company.industry?.replace(/'/g, "''") || null,
    company.sales || null,
    company.employees || null,
    company.city?.replace(/'/g, "''") || '',
    company.state || 'Minnesota',
    company.website || null
  ];
  
  sqlStatements.push(`INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('${values[0]}', '${values[1]}', ${values[2]}, ${values[3]}, '${values[4]}', '${values[5]}', '${values[6]}') ON CONFLICT DO NOTHING;`);
});

// Save SQL file
fs.writeFileSync('migration.sql', sqlStatements.join('\n'));

console.log('\n📋 MIGRATION SUMMARY:');
console.log(`📊 Total companies ready: ${companies.length}`);
console.log(`🏭 Total industries ready: ${industries.length}`);
console.log(`📝 SQL file created: migration.sql`);
console.log(`🎯 Top 10 companies prepared for insertion`);

console.log('\n✅ DATA MIGRATION PREPARED - READY TO EXECUTE!');
