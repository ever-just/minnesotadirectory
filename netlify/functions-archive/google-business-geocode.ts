import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import { Client } from '@googlemaps/google-maps-services-js';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize Google Maps client
let googleClient: Client | null = null;
function getGoogleClient() {
  if (!googleClient) {
    googleClient = new Client({});
  }
  return googleClient;
}

// Google Places business search using the same approach as existing script
async function findBusinessLocation(
  companyName: string, 
  address: string, 
  city: string, 
  state: string,
  apiKey: string
): Promise<{lat: number, lng: number, accuracy: string, placeId?: string, name?: string} | null> {
  
  const client = getGoogleClient();
  
  try {
    // Method 1: Text search for business name + location (like existing script)
    const searchQueries = [
      `${companyName} ${city} ${state}`,
      `${companyName} headquarters ${city} Minnesota`,
      `${companyName} ${address} ${city}`,
      companyName // Business name only as last resort
    ];
    
    for (const query of searchQueries) {
      try {
        console.log(`🔍 Text search: "${query}"`);
        
        const response = await client.textSearch({
          params: {
            query: query,
            key: apiKey,
          }
        });
        
        if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
          // Look for the best match (prefer establishments)
          for (const result of response.data.results.slice(0, 3)) { // Check top 3 results
            
            // Verify it's in Minnesota and is a business
            const isInMinnesota = result.formatted_address && 
              (result.formatted_address.includes('MN') || result.formatted_address.includes('Minnesota'));
            
            const isEstablishment = result.types && (
              result.types.includes('establishment') ||
              result.types.includes('point_of_interest') ||
              result.types.includes('premise')
            );
            
            if (isInMinnesota && isEstablishment && result.geometry && result.geometry.location) {
              console.log(`✅ Found business: ${result.name}`);
              console.log(`   Address: ${result.formatted_address}`);
              console.log(`   Types: ${result.types?.join(', ')}`);
              console.log(`   Place ID: ${result.place_id}`);
              console.log(`   Rating: ${result.rating || 'N/A'}`);
              
              return {
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
                accuracy: 'business_exact',
                placeId: result.place_id,
                name: result.name
              };
            }
          }
        }
        
        // Delay between queries to respect rate limits
        await delay(500);
        
      } catch (queryError) {
        console.log(`❌ Query "${query}" failed: ${queryError.message}`);
        continue;
      }
    }
    
    // Method 2: Try direct geocoding of the address (fallback)
    if (address && address.trim()) {
      try {
        console.log(`🎯 Geocoding address directly: "${address}, ${city}, ${state}"`);
        
        const response = await client.geocode({
          params: {
            address: `${address}, ${city}, ${state}, USA`,
            key: apiKey
          }
        });
        
        if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
          const result = response.data.results[0];
          const location = result.geometry.location;
          
          console.log(`✅ Address geocoded: [${location.lat}, ${location.lng}]`);
          console.log(`   Formatted: ${result.formatted_address}`);
          
          let accuracy = 'street';
          if (result.geometry.location_type === 'ROOFTOP') {
            accuracy = 'rooftop_exact';
          } else if (result.geometry.location_type === 'RANGE_INTERPOLATED') {
            accuracy = 'address_interpolated';
          }
          
          return {
            lat: location.lat,
            lng: location.lng,
            accuracy,
            name: result.formatted_address
          };
        }
        
      } catch (geocodeError) {
        console.log(`❌ Address geocoding failed: ${geocodeError.message}`);
      }
    }
    
    console.log(`❌ All Google search methods failed`);
    return null;
    
  } catch (error) {
    console.error('Google API error:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    const { batchSize = 5 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 8);
    
    // Check for Google Places API key
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
    
    console.log('🏢 Starting Google Places BUSINESS HEADQUARTERS geocoding...');
    console.log('🎯 Using official Google Places API for exact business locations');
    
    // Get top companies by revenue for Google Places business search
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", latitude, longitude, "geocodingSource", sales
      FROM companies 
      WHERE "geocodingSource" IN ('manual', 'city_lookup', 'business_district')
        AND name IS NOT NULL
        AND city IS NOT NULL  
        AND sales IS NOT NULL
      ORDER BY sales DESC NULLS LAST
      LIMIT ${limit}
    `;
    
    console.log(`Found ${companies.length} companies for Google Places business lookup`);
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      businessFound: 0,
      details: [] as any[]
    };
    
    for (const company of companies) {
      try {
        console.log(`\n💼 ${company.name} ($${(parseFloat(company.sales)/1000000).toFixed(1)}M revenue)`);
        console.log(`   Address: ${company.address || 'N/A'}`);
        console.log(`   Current: [${company.latitude}, ${company.longitude}] (${company.geocodingSource})`);
        
        const businessCoords = await findBusinessLocation(
          company.name,
          company.address || '',
          company.city,
          company.state || 'Minnesota',
          apiKey
        );
        
        if (businessCoords) {
          // Calculate distance moved for validation
          const oldLat = parseFloat(company.latitude);
          const oldLng = parseFloat(company.longitude);
          const distance = Math.sqrt(
            Math.pow((businessCoords.lat - oldLat) * 69, 2) + 
            Math.pow((businessCoords.lng - oldLng) * 69, 2)
          );
          
          // Validate result (corporate HQs shouldn't be >30 miles from city center)
          if (distance > 30) {
            console.log(`⚠️ REJECTED: ${distance.toFixed(2)} miles moved - likely wrong business`);
            results.failed++;
          } else {
            // Update with exact business coordinates
            await sql`
              UPDATE companies
              SET latitude = ${businessCoords.lat},
                  longitude = ${businessCoords.lng},
                  "geocodedAt" = NOW(),
                  "geocodingSource" = 'google_places_business',
                  "geocodingAccuracy" = 'headquarters_exact'
              WHERE id = ${company.id}
            `;
            
            results.successful++;
            results.businessFound++;
            
            results.details.push({
              company: company.name,
              revenue: `$${(parseFloat(company.sales)/1000000).toFixed(1)}M`,
              googlePlaceName: businessCoords.name,
              placeId: businessCoords.placeId,
              oldCoords: [oldLat, oldLng],
              newCoords: [businessCoords.lat, businessCoords.lng],
              accuracy: businessCoords.accuracy,
              distanceMoved: `${distance.toFixed(2)} miles`
            });
            
            console.log(`✅ BUSINESS LOCATION FOUND: [${businessCoords.lat}, ${businessCoords.lng}]`);
            console.log(`   Google name: "${businessCoords.name}"`);
            console.log(`   Distance moved: ${distance.toFixed(2)} miles`);
            console.log(`   Place ID: ${businessCoords.placeId}`);
          }
        } else {
          results.failed++;
          console.log(`❌ Business not found in Google Places`);
        }
        
        results.processed++;
        
        // Respect Google Places API rate limits
        await delay(1000);
        
      } catch (error) {
        results.failed++;
        results.processed++;
        console.error(`Error processing ${company.name}:`, error);
      }
    }
    
    // Get updated statistics
    const [{ headquarters_count }] = await sql`
      SELECT COUNT(*) as headquarters_count
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
        headquartersFound: parseInt(headquarters_count),
        totalMappedCompanies: parseInt(total_mapped),
        successRate: `${Math.round((results.successful / results.processed) * 100)}%`,
        message: `Google Places found exact business locations for ${results.businessFound}/${results.processed} companies`
      })
    };
    
  } catch (error) {
    console.error('❌ Google Places business geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Google Places business geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
