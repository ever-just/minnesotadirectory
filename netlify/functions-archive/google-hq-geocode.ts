import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import { Client } from '@googlemaps/google-maps-services-js';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const handler: Handler = async (event, context) => {
  try {
    // Check for Google Places API key (same as existing script)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Google Places API key not configured',
          message: 'Please set GOOGLE_PLACES_API_KEY environment variable'
        })
      };
    }
    
    console.log('🏢 Using Google Places API for EXACT business headquarters...');
    
    const { batchSize = 3 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 5);
    
    // Initialize Google Maps client (same as existing script)
    const client = new Client({});
    
    // Get top companies by revenue for Google Places lookup
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", latitude, longitude, "geocodingSource", sales
      FROM companies 
      WHERE sales IS NOT NULL
        AND name IS NOT NULL
        AND city IS NOT NULL
      ORDER BY sales DESC NULLS LAST
      LIMIT ${limit}
    `;
    
    console.log(`Found ${companies.length} top companies for Google Places business search`);
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: [] as any[]
    };
    
    for (const company of companies) {
      try {
        console.log(`\n💼 ${company.name} ($${(parseFloat(company.sales)/1000000).toFixed(1)}M)`);
        
        // Method 1: Business text search (exactly like existing script)
        const queries = [
          `${company.name} ${company.city} Minnesota`,
          `${company.name} headquarters ${company.city}`,
          company.name
        ];
        
        let businessFound = false;
        
        for (const query of queries) {
          if (businessFound) break;
          
          try {
            console.log(`🔍 Searching: "${query}"`);
            
            // Use textSearch exactly like existing script
            const response = await client.textSearch({
              params: {
                query: query,
                key: apiKey,
              }
            });
            
            if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
              // Find best Minnesota business match
              for (const result of response.data.results.slice(0, 3)) {
                const isInMN = result.formatted_address && 
                  (result.formatted_address.includes('MN,') || 
                   result.formatted_address.includes('Minnesota'));
                
                const isEstablishment = result.types && 
                  result.types.includes('establishment');
                
                if (isInMN && isEstablishment && result.geometry && result.geometry.location) {
                  // Calculate distance from current position for validation
                  const oldLat = parseFloat(company.latitude);
                  const oldLng = parseFloat(company.longitude);
                  const newLat = result.geometry.location.lat;
                  const newLng = result.geometry.location.lng;
                  
                  const distance = Math.sqrt(
                    Math.pow((newLat - oldLat) * 69, 2) + 
                    Math.pow((newLng - oldLng) * 69, 2)
                  );
                  
                  // Accept if reasonable distance (corporations can be anywhere in MN)
                  if (distance < 500) { // Max 500 miles (covers all of Minnesota)
                    
                    // Update with exact Google Places business coordinates
                    await sql`
                      UPDATE companies
                      SET latitude = ${newLat},
                          longitude = ${newLng},
                          "geocodedAt" = NOW(),
                          "geocodingSource" = 'google_places_hq',
                          "geocodingAccuracy" = 'headquarters_exact'
                      WHERE id = ${company.id}
                    `;
                    
                    results.successful++;
                    businessFound = true;
                    
                    results.details.push({
                      company: company.name,
                      googleName: result.name,
                      googleAddress: result.formatted_address,
                      placeId: result.place_id,
                      rating: result.rating,
                      types: result.types,
                      oldCoords: [oldLat, oldLng],
                      newCoords: [newLat, newLng],
                      distanceMoved: `${distance.toFixed(2)} miles`
                    });
                    
                    console.log(`✅ HEADQUARTERS FOUND: [${newLat}, ${newLng}]`);
                    console.log(`   Google name: "${result.name}"`);
                    console.log(`   Google address: ${result.formatted_address}`);
                    console.log(`   Distance moved: ${distance.toFixed(2)} miles`);
                    console.log(`   Place ID: ${result.place_id}`);
                    
                    break;
                  } else {
                    console.log(`⚠️ Rejected: ${distance.toFixed(2)} miles - too far`);
                  }
                }
              }
            }
            
          } catch (searchError) {
            console.log(`❌ Search error: ${searchError.message}`);
            continue;
          }
          
          // Rate limiting
          await delay(800);
        }
        
        if (!businessFound) {
          results.failed++;
          console.log(`❌ Business not found in Google Places`);
        }
        
        results.processed++;
        
        // Longer delay between companies
        await delay(1000);
        
      } catch (error) {
        results.failed++;
        results.processed++;
        console.error(`Error processing ${company.name}:`, error);
      }
    }
    
    // Get updated statistics
    const [{ hq_count }] = await sql`
      SELECT COUNT(*) as hq_count
      FROM companies 
      WHERE "geocodingAccuracy" = 'headquarters_exact'
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
        results,
        headquartersExact: parseInt(hq_count),
        totalMappedCompanies: parseInt(total_mapped),
        successRate: `${Math.round((results.successful / results.processed) * 100)}%`,
        message: `Google Places found exact headquarters for ${results.successful}/${results.processed} companies`
      })
    };
    
  } catch (error) {
    console.error('❌ Google Places HQ geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Google Places HQ geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
