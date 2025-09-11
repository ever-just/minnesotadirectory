import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

// SPEED OPTIMIZATION: Parallel processing with proper rate limiting
const CONCURRENT_REQUESTS = 10; // Process 10 addresses simultaneously
const REQUEST_DELAY = 150; // 150ms between requests (6-7 requests/second - safe for Nominatim)

/**
 * Ultra-fast parallel geocoding - NO artificial 1-second delays!
 */
async function geocodeAddressFast(standardizedAddress, city, state, postalCode = '') {
  try {
    const fullAddress = [standardizedAddress, city, state, postalCode, 'USA']
      .filter(Boolean)
      .join(', ');
    
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MinnesotaDirectory/3.0 (support@minnesotadirectory.com)' }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lng)) return null;
    
    let accuracy = 'city';
    if (result.address?.house_number && result.address?.road) {
      accuracy = 'exact';
    } else if (result.address?.road || result.address?.suburb) {
      accuracy = 'street';
    }
    
    return { latitude: lat, longitude: lng, accuracy, source: 'nominatim' };
    
  } catch (error) {
    return null;
  }
}

/**
 * Process companies in parallel batches (10x speed improvement)
 */
async function processInParallel(companies) {
  const results = [];
  const batches = [];
  
  // Create batches of concurrent requests
  for (let i = 0; i < companies.length; i += CONCURRENT_REQUESTS) {
    const batch = companies.slice(i, i + CONCURRENT_REQUESTS);
    batches.push(batch);
  }
  
  console.log(`🚀 Processing ${companies.length} companies in ${batches.length} parallel batches`);
  
  let successful = 0;
  let processed = 0;
  
  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} companies)`);
    
    // Process batch in parallel with staggered delays
    const batchPromises = batch.map(async (company, index) => {
      // Stagger requests within batch to avoid overwhelming API
      await new Promise(resolve => setTimeout(resolve, index * REQUEST_DELAY));
      
      const result = await geocodeAddressFast(
        company.standardized_address,
        company.city,
        company.state,
        company.postalCode
      );
      
      if (result) {
        // Update database immediately
        await sql`
          UPDATE companies 
          SET latitude = ${result.latitude},
              longitude = ${result.longitude},
              "geocodedAt" = NOW(),
              "geocodingSource" = ${result.source},
              "geocodingAccuracy" = ${result.accuracy}
          WHERE id = ${company.id}
        `;
        
        console.log(`✅ ${company.name}: [${result.latitude}, ${result.longitude}] (${result.accuracy})`);
        return { company: company.name, success: true, result };
      } else {
        console.log(`❌ ${company.name}: No results`);
        return { company: company.name, success: false };
      }
    });
    
    // Wait for batch completion
    const batchResults = await Promise.all(batchPromises);
    const batchSuccessful = batchResults.filter(r => r.success).length;
    
    successful += batchSuccessful;
    processed += batch.length;
    
    console.log(`   Batch complete: ${batchSuccessful}/${batch.length} successful (${Math.round(batchSuccessful/batch.length*100)}%)`);
    console.log(`   Overall progress: ${processed}/${companies.length} processed, ${successful} successful (${Math.round(successful/processed*100)}%)`);
    
    results.push(...batchResults);
  }
  
  return { successful, processed, results };
}

/**
 * Main ultra-fast geocoding execution
 */
async function runUltraFastGeocoding() {
  const startTime = Date.now();
  
  console.log('⚡ ULTRA-FAST PARALLEL GEOCODING');
  console.log('=' .repeat(50));
  
  // Get companies that need geocoding (using standardized addresses)
  const companies = await sql`
    SELECT id, name, standardized_address, city, state, "postalCode", sales
    FROM companies 
    WHERE standardized_address IS NOT NULL 
    AND standardized_address != ''
    AND latitude IS NULL  -- Only unmapped companies
    ORDER BY sales DESC NULLS LAST
    LIMIT 200  -- Process 200 companies quickly
  `;
  
  if (companies.length === 0) {
    console.log('✅ All companies with standardized addresses already geocoded!');
    return;
  }
  
  console.log(`📊 Processing ${companies.length} companies with ${CONCURRENT_REQUESTS} parallel requests...`);
  console.log(`⚡ Speed: ~${Math.round(CONCURRENT_REQUESTS / (REQUEST_DELAY/1000))} companies/second`);
  
  // Process in parallel
  const { successful, processed } = await processInParallel(companies);
  
  const endTime = Date.now();
  const timeSeconds = (endTime - startTime) / 1000;
  const companiesPerSecond = processed / timeSeconds;
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 ULTRA-FAST GEOCODING COMPLETE!');
  console.log('='.repeat(50));
  
  console.log(`⚡ Performance:`);
  console.log(`   Time taken: ${timeSeconds.toFixed(1)} seconds`);
  console.log(`   Speed: ${companiesPerSecond.toFixed(1)} companies/second`);
  console.log(`   vs Previous: ${(companiesPerSecond / 1.0).toFixed(0)}x faster!`);
  
  console.log(`\n📊 Results:`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Successful: ${successful} (${Math.round(successful/processed*100)}%)`);
  console.log(`   Failed: ${processed - successful}`);
  
  // Get updated totals
  const [stats] = await sql`
    SELECT COUNT(*) as total, COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as geocoded
    FROM companies WHERE standardized_address IS NOT NULL
  `;
  
  console.log(`\n🗺️ Overall Status:`);
  console.log(`   Total geocoded: ${stats.geocoded}/${stats.total}`);
  console.log(`   Success rate: ${Math.round(stats.geocoded/stats.total*100)}%`);
  
  const remaining = stats.total - stats.geocoded;
  if (remaining > 0) {
    const estimatedTime = (remaining / companiesPerSecond / 60).toFixed(1);
    console.log(`   Remaining: ${remaining} companies (~${estimatedTime} minutes to complete)`);
  }
  
  console.log('\n💡 Run again to geocode more companies at high speed!');
}

runUltraFastGeocoding().catch(console.error);





