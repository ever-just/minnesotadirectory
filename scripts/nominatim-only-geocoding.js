import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

// Rate limiting for API politeness
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Nominatim-only geocoding using standardized addresses
 */
async function geocodeWithNominatim(standardizedAddress, city, state, postalCode = '') {
  try {
    // Build address with standardized version
    const fullAddress = [standardizedAddress, city, state, postalCode, 'USA']
      .filter(Boolean)
      .join(', ');
    
    console.log(`🎯 ${fullAddress}`);
    
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MinnesotaDirectory/3.0 (support@minnesotadirectory.com)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }
    
    // Determine accuracy based on address details
    let accuracy = 'city';
    if (result.address?.house_number && result.address?.road) {
      accuracy = 'exact'; // Street-level precision
    } else if (result.address?.road || result.address?.suburb) {
      accuracy = 'street'; // Street or neighborhood level
    }
    
    console.log(`✅ SUCCESS: [${lat}, ${lng}] (${accuracy})`);
    return {
      latitude: lat,
      longitude: lng,
      accuracy,
      source: 'nominatim',
      matched_address: fullAddress
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Fast batch geocoding (Nominatim only)
 */
async function runFastGeocoding(batchSize = 100) {
  console.log('🚀 FAST NOMINATIM GEOCODING WITH STANDARDIZED ADDRESSES');
  console.log('='.repeat(70));
  
  // Get companies that need geocoding
  const companies = await sql`
    SELECT id, name, standardized_address, city, state, "postalCode", sales
    FROM companies 
    WHERE standardized_address IS NOT NULL 
    AND standardized_address != ''
    AND latitude IS NULL  -- Only companies without coordinates
    ORDER BY sales DESC NULLS LAST
    LIMIT ${batchSize}
  `;
  
  console.log(`📊 Processing ${companies.length} companies...`);
  
  if (companies.length === 0) {
    console.log('✅ All companies with standardized addresses already geocoded!');
    return;
  }
  
  let successful = 0;
  let failed = 0;
  const results = [];
  
  for (const company of companies) {
    console.log(`\n${successful + failed + 1}/${companies.length}: ${company.name}`);
    
    try {
      const result = await geocodeWithNominatim(
        company.standardized_address,
        company.city,
        company.state,
        company.postalCode
      );
      
      if (result) {
        // Update database
        await sql`
          UPDATE companies 
          SET latitude = ${result.latitude},
              longitude = ${result.longitude},
              "geocodedAt" = NOW(),
              "geocodingSource" = ${result.source},
              "geocodingAccuracy" = ${result.accuracy}
          WHERE id = ${company.id}
        `;
        
        successful++;
        results.push({
          company: company.name,
          coordinates: [result.latitude, result.longitude],
          accuracy: result.accuracy
        });
        
      } else {
        failed++;
        console.log(`❌ No results found`);
      }
      
    } catch (error) {
      failed++;
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    // Progress indicator every 25 companies
    if ((successful + failed) % 25 === 0) {
      console.log(`\n📈 Progress: ${successful + failed}/${companies.length} processed (${successful} successful, ${Math.round(successful/(successful + failed)*100)}% success rate)`);
    }
    
    // Rate limiting - 1 request per second
    await delay(1200);
  }
  
  // Final results
  console.log('\n' + '='.repeat(70));
  console.log('🎉 BATCH GEOCODING COMPLETE!');
  console.log('='.repeat(70));
  
  console.log(`\n📊 Results:`);
  console.log(`   Companies processed: ${companies.length}`);
  console.log(`   Successful: ${successful} (${Math.round(successful/companies.length*100)}%)`);
  console.log(`   Failed: ${failed} (${Math.round(failed/companies.length*100)}%)`);
  
  // Get updated totals
  const stats = await sql`
    SELECT 
      COUNT(*) as total_companies,
      COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coordinates,
      COUNT(CASE WHEN "geocodingAccuracy" = 'exact' THEN 1 END) as exact_count,
      COUNT(CASE WHEN "geocodingAccuracy" = 'street' THEN 1 END) as street_count
    FROM companies
  `;
  
  const stat = stats[0];
  console.log(`\n🗺️ Overall Progress:`);
  console.log(`   Total companies geocoded: ${stat.has_coordinates}/${stat.total_companies}`);
  console.log(`   Overall success rate: ${Math.round(stat.has_coordinates/stat.total_companies*100)}%`);
  console.log(`   Exact coordinates: ${stat.exact_count}`);
  console.log(`   Street-level: ${stat.street_count}`);
  
  // Show top successes
  if (results.length > 0) {
    console.log(`\n🏆 Successfully Geocoded in This Batch:`);
    results.slice(0, 15).forEach((result, i) => {
      console.log(`${i + 1}. ${result.company}`);
      console.log(`   📍 [${result.coordinates.join(', ')}] (${result.accuracy} precision)`);
    });
  }
  
  console.log(`\n💡 Run this script again to geocode more companies!`);
  console.log(`   Remaining: ${companies.length - successful} companies need geocoding`);
  
  return {
    processed: companies.length,
    successful,
    failed,
    successRate: Math.round(successful/companies.length*100)
  };
}

// Execute
runFastGeocoding(100)
  .then((results) => {
    if (results) {
      console.log(`\n🎉 Batch completed with ${results.successRate}% success rate!`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Geocoding failed:', error.message);
    process.exit(1);
  });





