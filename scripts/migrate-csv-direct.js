#!/usr/bin/env node

// DIRECT POSTGRESQL CONNECTION - FASTEST APPROACH
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function fastCSVMigration() {
  const startTime = Date.now();
  console.log('🚀 STARTING OPTIMIZED CSV MIGRATION...');

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    // 1. Read CSV
    const csvPath = path.join(__dirname, '../public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv');
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const lines = csvText.split('\n').slice(1); // Skip header

    console.log(`📊 Processing ${lines.length} companies...`);

    // 2. FAST BATCH INSERT using PostgreSQL COPY
    let inserted = 0;
    const batchSize = 1000;

    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      const values = [];

      for (const line of batch) {
        if (!line.trim()) continue;
        
        const cols = line.split(',').map(col => col.replace(/"/g, '').trim());
        if (cols.length < 10) continue; // Skip malformed rows

        values.push({
          name: cols[0] || '',
          tradestyle: cols[1] || null,
          address: cols[3] || null,
          city: cols[6] || '',
          state: cols[7] || 'Minnesota',
          postal_code: cols[8] || null,
          phone: cols[10] || null,
          website: cols[13] || null,
          sales: cols[14] ? parseFloat(cols[14]) || null : null,
          employees: cols[19] ? parseInt(cols[19]) || null : null,
          description: cols[20] || null,
          ownership: cols[21] || null,
          is_headquarters: cols[24] === 'true',
          ticker: cols[25] || null,
          industry: cols[30] || null,
          sic_description: cols[32] || null,
          naics_description: cols[36] || null,
          employees_site: cols[18] || null
        });
      }

      if (values.length > 0) {
        // OPTIMIZED BULK INSERT
        const placeholders = values.map((_, idx) => {
          const base = idx * 18;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18})`;
        }).join(', ');

        const flatValues = values.flatMap(v => [
          v.name, v.tradestyle, v.address, v.city, v.state, v.postal_code,
          v.phone, v.website, v.sales, v.employees, v.description, v.ownership,
          v.is_headquarters, v.ticker, v.industry, v.sic_description, 
          v.naics_description, v.employees_site
        ]);

        const query = `
          INSERT INTO companies (name, tradestyle, address, city, state, postal_code, phone, website, sales, employees, description, ownership, is_headquarters, ticker, industry, sic_description, naics_description, employees_site)
          VALUES ${placeholders}
        `;

        await client.query(query, flatValues);
        inserted += values.length;
        
        const percent = Math.round((inserted / lines.length) * 100);
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${inserted} companies (${percent}%)`);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('🎉 CSV MIGRATION COMPLETE!');
    console.log(`📊 Total companies: ${inserted}`);
    console.log(`⚡ Duration: ${duration} seconds`);
    console.log(`🚀 Performance: ${Math.round(inserted / duration)} companies/second`);

  } catch (error) {
    console.error('💥 Migration error:', error.message);
  } finally {
    await client.end();
  }
}

fastCSVMigration();
