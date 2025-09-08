#!/usr/bin/env node

/**
 * Bulk Geocoding Script
 * Geocodes ALL 2,763 companies in manageable batches
 */

async function geocodeAllCompanies() {
  console.log('🌍 Starting bulk geocoding for ALL companies...');
  console.log('⏱️  Estimated time: 20-30 minutes (rate limited for API politeness)');
  
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let batchNumber = 1;
  
  // Process in small batches to avoid timeouts
  const batchSize = 8;
  const maxBatches = 50; // Safety limit
  
  for (let i = 0; i < maxBatches; i++) {
    try {
      console.log(`\n🔄 Batch ${batchNumber} (${batchSize} companies)...`);
      
      const response = await fetch('http://localhost:8888/.netlify/functions/geocode-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        totalProcessed += result.results.processed;
        totalSuccessful += result.results.successful;
        totalFailed += result.results.failed;
        
        console.log(`✅ Batch ${batchNumber}: ${result.results.successful}/${result.results.processed} successful`);
        
        // Show progress
        const successRate = Math.round((totalSuccessful / totalProcessed) * 100);
        console.log(`📊 Overall: ${totalSuccessful} successful, ${totalFailed} failed (${successRate}% success rate)`);
        
        // Show some successful companies
        if (result.results.details && result.results.details.length > 0) {
          result.results.details.forEach(company => {
            console.log(`   📍 ${company.company}: [${company.coordinates.join(', ')}] (${company.accuracy})`);
          });
        }
        
        // If no companies processed, we're done
        if (result.results.processed === 0) {
          console.log('✅ No more companies need geocoding - all done!');
          break;
        }
        
      } else {
        console.error(`❌ Batch ${batchNumber} failed:`, result.error);
        totalFailed += batchSize;
      }
      
      batchNumber++;
      
      // Delay between batches (respect API rate limits)
      console.log('⏳ Waiting 3 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`❌ Error in batch ${batchNumber}:`, error.message);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n⚠️  Connection refused - is your Netlify dev server running?');
        console.log('🔧 Please ensure "npm run dev" is running, then try again.');
        process.exit(1);
      }
      
      batchNumber++;
      
      // Continue with next batch after error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n🎉 Bulk geocoding session complete!');
  console.log(`📊 Final Results:`);
  console.log(`   Total companies processed: ${totalProcessed}`);
  console.log(`   Successful geocodes: ${totalSuccessful}`);
  console.log(`   Failed attempts: ${totalFailed}`);
  console.log(`   Success rate: ${Math.round((totalSuccessful / totalProcessed) * 100)}%`);
  console.log('\n🗺️ Refresh your map to see all the new company markers!');
}

// Handle graceful interruption
process.on('SIGINT', () => {
  console.log('\n⏹️  Process interrupted. Progress has been saved.');
  console.log('🔄 You can resume geocoding later by running this script again.');
  process.exit(0);
});

// Start the bulk geocoding process
geocodeAllCompanies().catch(error => {
  console.error('❌ Bulk geocoding failed:', error);
  process.exit(1);
});
