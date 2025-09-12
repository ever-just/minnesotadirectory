import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// High-speed parallel geocoding with rate limit management
const REQUESTS_PER_SECOND = 40; // Conservative (Google allows 50/second)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Address-first geocoding (prioritize exact street addresses)
async function geocodeAddress(address: string, city: string, state: string, postalCode: string, apiKey: string): Promise<{lat: number, lng: number, accuracy: string, source: string} | null> {
  try {
    // Method 1: Exact street address (highest priority)
    const streetAddress = `${address}, ${city}, ${state}${postalCode ? `, ${postalCode}` : ''}, USA`;
    
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(streetAddress)}&key=${apiKey}`);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      let accuracy = 'approximate';
      if (result.geometry.location_type === 'ROOFTOP') {
        accuracy = 'rooftop_exact';
      } else if (result.geometry.location_type === 'RANGE_INTERPOLATED') {
        accuracy = 'street_exact'; 
      } else if (result.geometry.location_type === 'GEOMETRIC_CENTER') {
        accuracy = 'building_center';
      }
      
      return {
        lat: location.lat,
        lng: location.lng,
        accuracy,
        source: 'google_address'
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Business name geocoding (fallback for failed addresses)
async function geocodeBusiness(companyName: string, city: string, state: string, apiKey: string): Promise<{lat: number, lng: number, accuracy: string, source: string} | null> {
  try {
    // Search for business by name + location
    const businessQuery = `${companyName} ${city} ${state}`;
    
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(businessQuery)}&key=${apiKey}`);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      return {
        lat: location.lat,
        lng: location.lng,
        accuracy: 'business_location',
        source: 'google_business'
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// High-speed parallel processing function
async function processCompanyBatch(companies: any[], apiKey: string): Promise<any[]> {
  const results = [];
  
  // Process all companies in parallel (up to rate limit)
  const promises = companies.map(async (company, index) => {
    // Stagger requests to respect rate limits (25ms between each = 40/second)
    await delay(index * 25);
    
    try {
      console.log(`🎯 ${company.name}: Trying address first...`);
      
      // Method 1: Try exact street address first
      let coords = await geocodeAddress(
        company.address || '',
        company.city,
        company.state || 'Minnesota', 
        company.postalCode || '',
        apiKey
      );
      
      // Method 2: Fallback to business name search
      if (!coords) {
        console.log(`🔄 ${company.name}: Fallback to business search...`);
        coords = await geocodeBusiness(
          company.name,
          company.city,
          company.state || 'Minnesota',
          apiKey
        );
      }
      
      if (coords) {
        // Calculate distance for validation
        const oldLat = parseFloat(company.latitude);
        const oldLng = parseFloat(company.longitude);
        const distance = Math.sqrt(
          Math.pow((coords.lat - oldLat) * 69, 2) + 
          Math.pow((coords.lng - oldLng) * 69, 2)
        );
        
        // Validate (reject if >100 miles - likely error)
        if (distance > 100) {
          console.log(`❌ ${company.name}: Rejected - ${distance.toFixed(1)} miles moved`);
          return { success: false, company: company.name, reason: 'too_far', distance };
        }
        
        console.log(`✅ ${company.name}: [${coords.lat}, ${coords.lng}] (${coords.accuracy}) via ${coords.source}`);
        
        return {
          success: true,
          company: company.name,
          id: company.id,
          coordinates: coords,
          distance: distance.toFixed(2),
          oldCoords: [oldLat, oldLng]
        };
      }
      
      console.log(`❌ ${company.name}: All methods failed`);
      return { success: false, company: company.name, reason: 'not_found' };
      
    } catch (error) {
      console.error(`❌ ${company.name}: Error - ${error.message}`);
      return { success: false, company: company.name, reason: 'error', error: error.message };
    }
  });
  
  // Wait for all parallel requests to complete
  const batchResults = await Promise.all(promises);
  return batchResults;
}

export const handler: Handler = async (event, context) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Google Maps API key not configured'
        })
      };
    }
    
    const { batchSize = 20 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 40); // Max 40 parallel requests
    
    console.log('🚀 TURBO GEOCODING: Address-first + Parallel Processing');
    console.log(`⚡ Processing ${limit} companies in parallel...`);
    
    // Get companies prioritized by revenue (exact coordinates for biggest companies first)
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", latitude, longitude, "geocodingSource", sales
      FROM companies 
      WHERE "geocodingSource" IN ('manual', 'city_lookup', 'business_district')
        AND address IS NOT NULL
        AND address != ''
        AND sales IS NOT NULL
      ORDER BY sales DESC NULLS LAST
      LIMIT ${limit}
    `;
    
    console.log(`Found ${companies.length} companies for turbo geocoding`);
    
    if (companies.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'No companies need geocoding',
          processed: 0
        })
      };
    }
    
    // Start high-speed parallel processing
    const startTime = Date.now();
    console.log(`⏱️ Starting parallel batch processing...`);
    
    const batchResults = await processCompanyBatch(companies, apiKey);
    
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`⚡ Parallel processing complete in ${processingTime}s`);
    
    // Apply successful results to database in parallel
    const successful = batchResults.filter(r => r.success);
    const failed = batchResults.filter(r => !r.success);
    
    console.log(`📊 Results: ${successful.length} successful, ${failed.length} failed`);
    
    // Update database with all successful results in parallel  
    if (successful.length > 0) {
      const updatePromises = successful.map(async (result) => {
        try {
          await sql`
            UPDATE companies
            SET latitude = ${result.coordinates.lat},
                longitude = ${result.coordinates.lng}, 
                "geocodedAt" = NOW(),
                "geocodingSource" = ${result.coordinates.source},
                "geocodingAccuracy" = ${result.coordinates.accuracy}
            WHERE id = ${result.id}
          `;
        } catch (error) {
          console.error(`Database update failed for ${result.company}:`, error);
        }
      });
      
      await Promise.all(updatePromises);
      console.log(`✅ Database updated for ${successful.length} companies`);
    }
    
    // Get final stats
    const [{ total_exact }] = await sql`
      SELECT COUNT(*) as total_exact 
      FROM companies 
      WHERE "geocodingAccuracy" IN ('rooftop_exact', 'street_exact', 'building_center', 'business_location')
    `;
    
    const [{ total_mapped }] = await sql`
      SELECT COUNT(*) as total_mapped
      FROM companies 
      WHERE latitude IS NOT NULL
    `;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        processingTimeSeconds: processingTime,
        batchSize: companies.length,
        successful: successful.length,
        failed: failed.length,
        successRate: `${Math.round((successful.length / companies.length) * 100)}%`,
        exactCoordinates: parseInt(total_exact),
        totalMappedCompanies: parseInt(total_mapped),
        successfulDetails: successful.slice(0, 5), // Show first 5
        failureReasons: failed.reduce((acc, f) => {
          acc[f.reason] = (acc[f.reason] || 0) + 1;
          return acc;
        }, {}),
        message: `TURBO GEOCODED ${successful.length}/${companies.length} companies in ${processingTime}s using address-first parallel processing`
      })
    };
    
  } catch (error) {
    console.error('❌ Turbo geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Turbo geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
