#!/usr/bin/env node

// Continue geocoding companies in batches
// This script runs multiple small batches to populate the map

async function runGeocoding() {
  console.log('🌍 Continuing to geocode companies...');
  
  for (let i = 0; i < 10; i++) {
    try {
      console.log(`🔄 Batch ${i + 1}/10...`);
      
      const response = await fetch('http://localhost:8888/.netlify/functions/geocode-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5, skipExisting: true })
      });
      
      const result = await response.json();
      
      if (result.success && result.results.successful > 0) {
        console.log(`✅ Added ${result.results.successful} companies to map`);
        result.results.details.forEach(company => {
          console.log(`   📍 ${company.company}: [${company.coordinates.join(', ')}]`);
        });
      } else {
        console.log('⚠️ No new companies geocoded in this batch');
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('❌ Batch failed:', error.message);
    }
  }
  
  console.log('🎉 Geocoding session complete! Refresh your map to see new companies.');
}

runGeocoding().catch(console.error);
