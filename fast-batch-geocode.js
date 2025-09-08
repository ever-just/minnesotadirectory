#!/usr/bin/env node

/**
 * TURBO GEOCODING SCRIPT
 * Runs multiple geocoding batches in parallel for maximum speed
 * Uses address-first approach with Google Maps API
 */

const CONCURRENT_BATCHES = 8; // Run 8 batches simultaneously  
const BATCH_SIZE = 5; // 5 companies per batch
const DELAY_BETWEEN_STARTS = 500; // 0.5 seconds between batch starts

console.log('🚀 TURBO GEOCODING SYSTEM STARTING...');
console.log('⚡ Using address-first approach + Google Maps API');
console.log(`🔥 Running ${CONCURRENT_BATCHES} parallel batches of ${BATCH_SIZE} companies each`);
console.log(`📊 Total processing capacity: ${CONCURRENT_BATCHES * BATCH_SIZE} companies per cycle`);

async function runGeocodingBatch(batchNumber) {
  console.log(`\n🔄 Starting batch ${batchNumber}...`);
  
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/geocode-companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        batchSize: BATCH_SIZE, 
        skipExisting: true 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Batch ${batchNumber}: ${result.results.successful}/${result.results.processed} successful`);
      
      // Show successful companies
      if (result.results.details && result.results.details.length > 0) {
        result.results.details.forEach(company => {
          console.log(`   📍 ${company.company}: [${company.coordinates.join(', ')}] (${company.accuracy})`);
        });
      }
      
      return {
        batchNumber,
        successful: result.results.successful,
        processed: result.results.processed,
        details: result.results.details || []
      };
    } else {
      console.log(`❌ Batch ${batchNumber}: Failed - ${result.error}`);
      return {
        batchNumber,
        successful: 0,
        processed: 0,
        error: result.error
      };
    }
    
  } catch (error) {
    console.error(`❌ Batch ${batchNumber}: Error - ${error.message}`);
    return {
      batchNumber,
      successful: 0,
      processed: 0,
      error: error.message
    };
  }
}

async function runTurboGeocoding() {
  const startTime = Date.now();
  console.log(`\n⚡ LAUNCHING ${CONCURRENT_BATCHES} PARALLEL GEOCODING BATCHES...`);
  
  // Start all batches with staggered timing
  const batchPromises = [];
  
  for (let i = 1; i <= CONCURRENT_BATCHES; i++) {
    // Stagger batch starts to avoid overwhelming the server
    const delay = (i - 1) * DELAY_BETWEEN_STARTS;
    
    const batchPromise = new Promise(resolve => {
      setTimeout(async () => {
        const result = await runGeocodingBatch(i);
        resolve(result);
      }, delay);
    });
    
    batchPromises.push(batchPromise);
  }
  
  console.log('⏳ All batches started, waiting for completion...');
  
  // Wait for all batches to complete
  const allResults = await Promise.all(batchPromises);
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(1);
  
  // Calculate totals
  const totalSuccessful = allResults.reduce((sum, batch) => sum + batch.successful, 0);
  const totalProcessed = allResults.reduce((sum, batch) => sum + batch.processed, 0);
  const successRate = Math.round((totalSuccessful / totalProcessed) * 100);
  
  console.log('\n🎉 TURBO GEOCODING COMPLETE!');
  console.log('=' .repeat(50));
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log(`📊 Results: ${totalSuccessful}/${totalProcessed} successful (${successRate}%)`);
  console.log(`⚡ Speed: ${(totalProcessed / parseFloat(totalTime)).toFixed(1)} companies/second`);
  
  // Show batch breakdown
  console.log('\n📋 Batch Results:');
  allResults.forEach(batch => {
    if (batch.successful > 0) {
      console.log(`   Batch ${batch.batchNumber}: ${batch.successful}/${batch.processed} ✅`);
    } else {
      console.log(`   Batch ${batch.batchNumber}: ${batch.processed} ❌ (${batch.error || 'no results'})`);
    }
  });
  
  // Show successful company examples
  console.log('\n🏆 Successfully Geocoded Companies:');
  let exampleCount = 0;
  for (const batch of allResults) {
    if (batch.details && batch.details.length > 0) {
      for (const company of batch.details) {
        console.log(`   📍 ${company.company}: [${company.coordinates.join(', ')}] (${company.accuracy})`);
        exampleCount++;
        if (exampleCount >= 10) break;
      }
    }
    if (exampleCount >= 10) break;
  }
  
  console.log('\n🗺️ Refresh your map to see the new exact company locations!');
  console.log(`🎯 ${totalSuccessful} companies now have precise coordinates`);
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️  Turbo geocoding interrupted');
  console.log('🔄 Progress has been saved - you can run this again to continue');
  process.exit(0);
});

// Run the turbo geocoding
runTurboGeocoding().catch(error => {
  console.error('❌ Turbo geocoding failed:', error);
  process.exit(1);
});
