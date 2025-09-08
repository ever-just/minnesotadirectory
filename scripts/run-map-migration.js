#!/usr/bin/env node

/**
 * Minnesota Directory - Map Migration Script
 * 
 * This script:
 * 1. Runs the database migration to add coordinate columns
 * 2. Starts the geocoding process in batches
 * 3. Provides progress updates
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import { config } from 'dotenv';
config({ path: join(__dirname, '../.env') });

// Database connection
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function runDatabaseMigration() {
  console.log('🗃️  Running database migration...');
  
  try {
    // Read and execute migration
    const migrationSQL = readFileSync(
      join(__dirname, '../migrations/add-coordinates.sql'), 
      'utf-8'
    );
    
    await sql(migrationSQL);
    console.log('✅ Database migration completed successfully');
    
    // Check how many companies need geocoding
    const [{ count }] = await sql`
      SELECT COUNT(*) as count 
      FROM companies 
      WHERE latitude IS NULL
    `;
    
    console.log(`📍 Found ${count} companies that need geocoding`);
    return parseInt(count);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function startGeocodingProcess(totalCount) {
  console.log('🌍 Starting geocoding process...');
  console.log('⚠️  This will take approximately', Math.ceil(totalCount / 10), 'minutes due to rate limiting');
  
  const batchSize = 10; // Process 10 companies at a time
  let processed = 0;
  let successful = 0;
  let failed = 0;
  
  while (processed < totalCount) {
    try {
      console.log(`\n🔄 Processing batch ${Math.floor(processed / batchSize) + 1}...`);
      
      // Call the geocoding function
      const response = await fetch('http://localhost:8888/.netlify/functions/geocode-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize: batchSize,
          skipExisting: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        processed += result.results.processed;
        successful += result.results.successful;
        failed += result.results.failed;
        
        console.log(`✅ Batch completed: ${result.results.successful}/${result.results.processed} successful`);
        
        // Show some example results
        if (result.results.details.length > 0) {
          console.log('📌 Examples:');
          result.results.details.slice(0, 3).forEach(detail => {
            console.log(`   ${detail.company}: [${detail.coordinates.join(', ')}] (${detail.accuracy})`);
          });
        }
        
        // Show errors if any
        if (result.results.errors.length > 0) {
          console.log('⚠️  Errors in this batch:');
          result.results.errors.slice(0, 3).forEach(error => {
            console.log(`   ${error}`);
          });
        }
      } else {
        console.error('❌ Batch failed:', result.error);
        failed += batchSize;
      }
      
      // Progress update
      const percentage = Math.round((processed / totalCount) * 100);
      console.log(`📊 Progress: ${processed}/${totalCount} (${percentage}%) - Success: ${successful}, Failed: ${failed}`);
      
      // Break if no more to process
      if (result.results && result.results.processed === 0) {
        console.log('✅ No more companies to process');
        break;
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('❌ Error in geocoding batch:', error);
      
      // Check if it's a connection error (Netlify not running)
      if (error.code === 'ECONNREFUSED') {
        console.log('\n⚠️  It looks like your Netlify dev server is not running!');
        console.log('🔧 Please run "npm run dev" in another terminal to start the server, then try again.');
        process.exit(1);
      }
      
      failed += batchSize;
      
      // Continue with next batch after error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n🎉 Geocoding process completed!');
  console.log(`📊 Final Results:`);
  console.log(`   Total processed: ${processed}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Success rate: ${Math.round((successful / processed) * 100)}%`);
}

async function main() {
  console.log('🗺️  Minnesota Directory - Map Feature Migration');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Run database migration
    const totalCount = await runDatabaseMigration();
    
    if (totalCount === 0) {
      console.log('✅ All companies already have coordinates! Migration complete.');
      return;
    }
    
    // Ask user if they want to proceed with geocoding
    console.log('\n⚠️  About to start geocoding process:');
    console.log(`   - Will process ${totalCount} companies`);
    console.log(`   - Estimated time: ${Math.ceil(totalCount / 10)} minutes`);
    console.log(`   - Uses free OpenStreetMap service (rate limited)`);
    console.log(`   - Falls back to Google Maps if configured`);
    console.log('\n🚀 Make sure your Netlify dev server is running: npm run dev');
    
    // For now, just start the process
    // In production, you might want to add user confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Start geocoding
    await startGeocodingProcess(totalCount);
    
    console.log('\n✅ Migration complete! Your map feature is ready to use.');
    console.log('🗺️  You can now access the interactive map view in your application.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Handle script interruption gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️  Process interrupted. Geocoding can be resumed later.');
  process.exit(0);
});

// Run the script
main().catch(console.error);
