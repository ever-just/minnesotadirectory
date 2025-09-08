#!/usr/bin/env node

/**
 * Fast Sequential Geocoding
 * Runs geocoding batches quickly in sequence to avoid server overload
 */

console.log('🚀 FAST SEQUENTIAL GEOCODING');
console.log('⚡ Address-first approach with Google Maps API fallback');

async function runFastGeocoding() {
  let totalSuccessful = 0;
  let totalProcessed = 0;
  let cycle = 1;
  
  const startTime = Date.now();
  
  // Run multiple quick cycles
  for (let i = 0; i < 15; i++) { // 15 cycles max
    try {
      console.log(`\n🔄 Cycle ${cycle}: Processing 8 companies...`);
      
      const response = await fetch('http://localhost:8888/.netlify/functions/geocode-companies', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          batchSize: 8, 
          skipExisting: true 
        })
      });
      
      if (!response.ok) {
        console.log(`❌ Cycle ${cycle}: HTTP ${response.status}`);
        break;
      }
      
      const result = await response.json();
      
      if (result.success) {
        totalSuccessful += result.results.successful;
        totalProcessed += result.results.processed;
        
        console.log(`✅ Cycle ${cycle}: ${result.results.successful}/${result.results.processed} successful`);
        
        // Show examples
        if (result.results.details && result.results.details.length > 0) {
          result.results.details.forEach(company => {
            console.log(`   📍 ${company.company}: [${company.coordinates.join(', ')}] (${company.accuracy})`);
          });
        }
        
        // If no more companies to process, stop
        if (result.results.processed === 0) {
          console.log('✅ No more companies need geocoding - complete!');
          break;
        }
        
      } else {
        console.log(`❌ Cycle ${cycle}: Failed - ${result.error}`);
        break;
      }
      
      cycle++;
      
      // Short delay between cycles (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Cycle ${cycle}: ${error.message}`);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.log('🔧 Connection failed - is Netlify dev server running?');
        break;
      }
      
      // Continue with next cycle after longer delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      cycle++;
    }
  }
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(1);
  const speed = (totalProcessed / parseFloat(totalTime)).toFixed(1);
  
  console.log('\n🎉 FAST GEOCODING COMPLETE!');
  console.log('=' .repeat(50));
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log(`📊 Total results: ${totalSuccessful}/${totalProcessed} successful`);
  console.log(`⚡ Average speed: ${speed} companies/second`);
  console.log(`🎯 Success rate: ${Math.round((totalSuccessful / totalProcessed) * 100)}%`);
  
  console.log('\n🗺️ Refresh your browser to see the improved company locations!');
  console.log(`✅ ${totalSuccessful} additional companies now have precise coordinates`);
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️  Geocoding interrupted');
  console.log('🔄 Progress has been saved');
  process.exit(0);
});

// Start fast geocoding
runFastGeocoding().catch(error => {
  console.error('❌ Fast geocoding failed:', error);
  process.exit(1);
});
