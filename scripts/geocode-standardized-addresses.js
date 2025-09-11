import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const GOOGLE_API_KEY = "AIzaSyDtR2sZLXQ4l-P33jS70r9OEQFStSa3ikA";
const sql = neon(DATABASE_URL);

// Rate limiting for API politeness
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced Nominatim geocoding using standardized addresses
 */
async function geocodeWithNominatim(standardizedAddress, city, state, postalCode = '') {
  try {
    // Build address with standardized version
    const fullAddress = [standardizedAddress, city, state, postalCode, 'USA']
      .filter(Boolean)
      .join(', ');
    
    console.log(`🎯 Nominatim: ${fullAddress}`);
    
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
    console.log(`❌ Nominatim error: ${error.message}`);
    return null;
  }
}

/**
 * Google Maps geocoding fallback using standardized addresses
 */
async function geocodeWithGoogle(standardizedAddress, city, state, postalCode = '') {
  if (!GOOGLE_API_KEY) {
    console.log('⚠️  Google API key not configured');
    return null;
  }
  
  try {
    // Build address with standardized version
    const fullAddress = [standardizedAddress, city, state, postalCode, 'USA']
      .filter(Boolean)
      .join(', ');
    
    console.log(`🎯 Google Maps: ${fullAddress}`);
    
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`❌ Google error: ${data.status} - ${data.error_message || 'No results'}`);
      return null;
    }
    
    const result = data.results[0];
    const location = result.geometry.location;
    
    // Determine accuracy from location_type
    let accuracy = 'approximate';
    if (result.geometry.location_type === 'ROOFTOP') {
      accuracy = 'exact';
    } else if (result.geometry.location_type === 'RANGE_INTERPOLATED') {
      accuracy = 'street';
    }
    
    console.log(`✅ SUCCESS: [${location.lat}, ${location.lng}] (${accuracy})`);
    return {
      latitude: location.lat,
      longitude: location.lng,
      accuracy,
      source: 'google',
      matched_address: result.formatted_address
    };
    
  } catch (error) {
    console.log(`❌ Google error: ${error.message}`);
    return null;
  }
}

/**
 * Smart geocoding with fallback chain
 */
async function smartGeocode(company) {
  if (!company.standardized_address) {
    console.log(`❌ No standardized address for ${company.name}`);
    return null;
  }
  
  // Try Nominatim first (free)
  let result = await geocodeWithNominatim(
    company.standardized_address,
    company.city,
    company.state,
    company.postalCode
  );
  
  // Small delay for API politeness
  await delay(1000);
  
  // If Nominatim fails, try Google Maps
  if (!result) {
    console.log(`🔄 Trying Google Maps fallback...`);
    result = await geocodeWithGoogle(
      company.standardized_address,
      company.city,
      company.state,
      company.postalCode
    );
    
    await delay(500); // Google has higher rate limits
  }
  
  return result;
}

/**
 * Get companies that need geocoding (prioritize by revenue)
 */
async function getCompaniesForGeocoding(limit = 100) {
  console.log(`📊 Loading companies that need geocoding (limit: ${limit})...`);
  
  const companies = await sql`
    SELECT id, name, standardized_address, city, state, "postalCode", sales
    FROM companies 
    WHERE standardized_address IS NOT NULL 
    AND standardized_address != ''
    AND latitude IS NULL  -- Only companies without coordinates
    ORDER BY sales DESC NULLS LAST
    LIMIT ${limit}
  `;
  
  console.log(`   Found ${companies.length} companies ready for geocoding`);
  return companies;
}

/**
 * Update company with geocoding results
 */
async function updateCompanyCoordinates(companyId, result) {
  await sql`
    UPDATE companies 
    SET latitude = ${result.latitude},
        longitude = ${result.longitude},
        "geocodedAt" = NOW(),
        "geocodingSource" = ${result.source},
        "geocodingAccuracy" = ${result.accuracy}
    WHERE id = ${companyId}
  `;
}

/**
 * Get current geocoding statistics
 */
async function getGeocodingStats() {
  const stats = await sql`
    SELECT 
      COUNT(*) as total_companies,
      COUNT(CASE WHEN standardized_address IS NOT NULL THEN 1 END) as has_standardized_address,
      COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coordinates,
      COUNT(CASE WHEN "geocodingSource" = 'nominatim' THEN 1 END) as nominatim_count,
      COUNT(CASE WHEN "geocodingSource" = 'google' THEN 1 END) as google_count,
      COUNT(CASE WHEN "geocodingAccuracy" = 'exact' THEN 1 END) as exact_count,
      COUNT(CASE WHEN "geocodingAccuracy" = 'street' THEN 1 END) as street_count,
      COUNT(CASE WHEN "geocodingAccuracy" = 'city' THEN 1 END) as city_count
    FROM companies
  `;
  
  return stats[0];
}

/**
 * Main geocoding execution
 */
async function runStandardizedGeocoding() {
  console.log('🚀 STANDARDIZED ADDRESS GEOCODING');
  console.log('=' .repeat(60));
  
  // Get initial statistics
  const initialStats = await getGeocodingStats();
  console.log('📊 Initial Statistics:');
  console.log(`   Total companies: ${initialStats.total_companies}`);
  console.log(`   With standardized addresses: ${initialStats.has_standardized_address}`);
  console.log(`   Already geocoded: ${initialStats.has_coordinates}`);
  console.log(`   Need geocoding: ${initialStats.has_standardized_address - initialStats.has_coordinates}`);
  
  const needGeocoding = initialStats.has_standardized_address - initialStats.has_coordinates;
  
  if (needGeocoding === 0) {
    console.log('✅ All companies with standardized addresses are already geocoded!');
    return;
  }
  
  console.log(`\n🎯 Starting geocoding process for ${Math.min(needGeocoding, 50)} companies...`);
  
  // Get companies that need geocoding
  const companies = await getCompaniesForGeocoding(50); // Process 50 at a time
  
  let successful = 0;
  let failed = 0;
  const results = [];
  
  for (const company of companies) {
    console.log(`\n${successful + failed + 1}/${companies.length}: ${company.name}`);
    console.log(`   Original: "${company.standardized_address}"`);
    console.log(`   Location: ${company.city}, ${company.state}`);
    
    try {
      const result = await smartGeocode(company);
      
      if (result) {
        await updateCompanyCoordinates(company.id, result);
        successful++;
        
        results.push({
          company: company.name,
          coordinates: [result.latitude, result.longitude],
          accuracy: result.accuracy,
          source: result.source,
          address: company.standardized_address
        });
        
        console.log(`   ✅ SUCCESS: [${result.latitude}, ${result.longitude}] via ${result.source}`);
      } else {
        failed++;
        console.log(`   ❌ FAILED: No results from any geocoding service`);
      }
      
    } catch (error) {
      failed++;
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    // Progress indicator
    if ((successful + failed) % 10 === 0) {
      console.log(`\n📈 Progress: ${successful + failed}/${companies.length} processed (${successful} successful)`);
    }
  }
  
  // Final statistics
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  
  const finalStats = await getGeocodingStats();
  const newlyGeocoded = finalStats.has_coordinates - initialStats.has_coordinates;
  
  console.log(`\n🎉 Geocoding Complete!`);
  console.log(`   Companies processed: ${companies.length}`);
  console.log(`   Successful: ${successful} (${Math.round(successful/companies.length*100)}%)`);
  console.log(`   Failed: ${failed} (${Math.round(failed/companies.length*100)}%)`);
  console.log(`   Total companies now geocoded: ${finalStats.has_coordinates}`);
  console.log(`   Success rate improvement: ${Math.round(successful/companies.length*100)}% (vs ~30% with original addresses)`);
  
  // Show accuracy breakdown
  console.log(`\n📍 Coordinate Accuracy:`);
  console.log(`   Exact (building-level): ${finalStats.exact_count}`);
  console.log(`   Street-level: ${finalStats.street_count}`);
  console.log(`   City-level: ${finalStats.city_count}`);
  
  // Show source breakdown  
  console.log(`\n🌐 Geocoding Sources:`);
  console.log(`   OpenStreetMap (Nominatim): ${finalStats.nominatim_count}`);
  console.log(`   Google Maps: ${finalStats.google_count}`);
  
  // Show top successful results
  if (results.length > 0) {
    console.log(`\n🏆 Top ${Math.min(10, results.length)} Successfully Geocoded Companies:`);
    results.slice(0, 10).forEach((result, i) => {
      console.log(`${i + 1}. ${result.company}`);
      console.log(`   📍 [${result.coordinates.join(', ')}] (${result.accuracy} via ${result.source})`);
      console.log(`   📍 "${result.address}"`);
      console.log('');
    });
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your map view to see the new precise pins');
  console.log('   2. Run again to geocode more companies');
  console.log('   3. Consider using Google Places API for even better corporate HQ accuracy');
  
  return {
    processed: companies.length,
    successful,
    failed,
    newlyGeocoded,
    totalGeocoded: finalStats.has_coordinates
  };
}

// Execute the geocoding
runStandardizedGeocoding()
  .then(() => {
    console.log('\n🎉 Standardized address geocoding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Geocoding failed:', error.message);
    process.exit(1);
  });

export { smartGeocode, getGeocodingStats };





