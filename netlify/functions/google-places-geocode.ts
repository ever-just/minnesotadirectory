import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Google Places API - Find Place from Text (optimized for businesses)
async function findBusinessPlace(companyName: string, address: string, city: string, state: string): Promise<{lat: number, lng: number, accuracy: string, placeId: string} | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.log('⚠️ Google Maps API key not configured - using Nominatim fallback');
    return null;
  }
  
  try {
    // Build search queries - try multiple approaches
    const searchQueries = [
      `${companyName} ${address} ${city} ${state}`, // Full business + address
      `${companyName} ${city} ${state}`, // Business + city
      `${address} ${city} ${state}`, // Just address
      companyName // Business name only
    ];
    
    for (const query of searchQueries) {
      console.log(`🏢 Searching Google Places: "${query}"`);
      
      const encodedQuery = encodeURIComponent(query);
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedQuery}&inputtype=textquery&fields=place_id,name,geometry,types&locationbias=circle:50000@44.9778,-93.2650&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
        const place = data.candidates[0];
        
        // Verify it's a business/establishment
        const isEstablishment = place.types && (
          place.types.includes('establishment') || 
          place.types.includes('point_of_interest') ||
          place.types.includes('premise')
        );
        
        if (isEstablishment && place.geometry && place.geometry.location) {
          console.log(`✅ Found business: ${place.name} (${place.place_id})`);
          console.log(`   Types: ${place.types?.join(', ')}`);
          
          return {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            accuracy: 'business_exact',
            placeId: place.place_id
          };
        }
      }
      
      // Small delay between queries to respect rate limits
      await delay(200);
    }
    
    console.log(`❌ No business found in Google Places`);
    return null;
    
  } catch (error) {
    console.error('Google Places API error:', error);
    return null;
  }
}

// Enhanced Nominatim fallback with better address parsing
async function enhancedNominatim(address: string, city: string, state: string): Promise<{lat: number, lng: number, accuracy: string} | null> {
  try {
    // Create simplified address variations
    const variations = [
      `${address}, ${city}, ${state}, USA`,
      `${address.replace(/\s+Ste.*$/i, '')}, ${city}, ${state}, USA`, // Remove suite
      `${address.replace(/\s+(Bldg|Building).*$/i, '')}, ${city}, ${state}, USA`, // Remove building
      `${address.match(/^\d+\s+[^,]+?(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Pkwy|Pl)/i)?.[0] || address}, ${city}, ${state}, USA` // Extract street only
    ];
    
    for (const addr of variations) {
      if (!addr || addr.includes('undefined')) continue;
      
      console.log(`🎯 Nominatim trying: ${addr}`);
      
      const encodedAddress = encodeURIComponent(addr);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MinnesotaDirectory/2.0 (support@minnesotadirectory.com)'
        }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (!data || data.length === 0) continue;
      
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      if (isNaN(lat) || isNaN(lng)) continue;
      
      let accuracy = 'approximate';
      if (result.address?.house_number && result.address?.road) {
        accuracy = 'street_exact';
      } else if (result.address?.road) {
        accuracy = 'street';
      }
      
      console.log(`✅ Nominatim success: [${lat}, ${lng}] (${accuracy})`);
      return { lat, lng, accuracy };
      
      // Small delay between attempts
      await delay(300);
    }
    
    return null;
    
  } catch (error) {
    console.error('Nominatim error:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    const { batchSize = 5 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 10);
    
    console.log('🏢 Starting GOOGLE PLACES business geocoding...');
    console.log('🎯 Optimized for corporate headquarters and business locations');
    
    // Get top companies by revenue for precise business location lookup
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", latitude, longitude, "geocodingSource", sales
      FROM companies 
      WHERE "geocodingSource" IN ('manual', 'city_lookup', 'business_district')
        AND address IS NOT NULL 
        AND address != ''
        AND name IS NOT NULL
      ORDER BY sales DESC NULLS LAST
      LIMIT ${limit}
    `;
    
    console.log(`Found ${companies.length} companies for business location lookup`);
    
    const results = {
      processed: 0,
      successful: 0,
      placesSuccess: 0,
      nominatimSuccess: 0,
      failed: 0,
      details: [] as any[]
    };
    
    for (const company of companies) {
      try {
        console.log(`\n📍 Processing: ${company.name}`);
        console.log(`   Revenue: $${(parseFloat(company.sales)/1000000).toFixed(1)}M`);
        console.log(`   Address: "${company.address}, ${company.city}, ${company.state}"`);
        
        const oldLat = parseFloat(company.latitude);
        const oldLng = parseFloat(company.longitude);
        console.log(`   Current: [${oldLat}, ${oldLng}] (${company.geocodingSource})`);
        
        // Try Google Places API first (best for businesses)
        let coords = await findBusinessPlace(
          company.name,
          company.address,
          company.city,
          company.state || 'Minnesota'
        );
        
        let source = 'google_places';
        
        // Fallback to enhanced Nominatim
        if (!coords) {
          console.log('🔄 Falling back to enhanced Nominatim...');
          coords = await enhancedNominatim(
            company.address,
            company.city,
            company.state || 'Minnesota'
          );
          source = 'nominatim_enhanced';
        }
        
        if (coords) {
          // Calculate distance moved for validation
          const distance = Math.sqrt(
            Math.pow((coords.lat - oldLat) * 69, 2) + 
            Math.pow((coords.lng - oldLng) * 69, 2)
          );
          
          // Validate result (businesses shouldn't move >20 miles)
          if (distance > 20) {
            console.log(`⚠️ REJECTED: Moved ${distance.toFixed(2)} miles - likely wrong location`);
            results.failed++;
          } else {
            // Update with business-precise coordinates
            await sql`
              UPDATE companies
              SET latitude = ${coords.lat},
                  longitude = ${coords.lng},
                  "geocodedAt" = NOW(),
                  "geocodingSource" = ${source},
                  "geocodingAccuracy" = ${coords.accuracy}
              WHERE id = ${company.id}
            `;
            
            results.successful++;
            
            if (source === 'google_places') {
              results.placesSuccess++;
            } else {
              results.nominatimSuccess++;
            }
            
            results.details.push({
              company: company.name,
              address: company.address,
              oldCoords: [oldLat, oldLng],
              newCoords: [coords.lat, coords.lng],
              accuracy: coords.accuracy,
              source: source,
              distanceMoved: `${distance.toFixed(2)} miles`,
              placeId: coords.placeId || null
            });
            
            console.log(`✅ UPDATED via ${source.toUpperCase()}: [${coords.lat}, ${coords.lng}]`);
            console.log(`   Accuracy: ${coords.accuracy}, Distance moved: ${distance.toFixed(2)} miles`);
          }
        } else {
          results.failed++;
          console.log(`❌ FAILED: Both Google Places and Nominatim failed`);
        }
        
        results.processed++;
        
        // Respect API rate limits
        await delay(1500); // Conservative rate limiting
        
      } catch (error) {
        results.failed++;
        results.processed++;
        console.error(`Error processing ${company.name}:`, error);
      }
    }
    
    // Get updated statistics
    const [{ exact_count }] = await sql`
      SELECT COUNT(*) as exact_count
      FROM companies 
      WHERE "geocodingAccuracy" IN ('business_exact', 'street_exact', 'exact')
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
        businessExactCoordinates: parseInt(exact_count),
        totalMappedCompanies: parseInt(total_mapped),
        successRate: `${Math.round((results.successful / results.processed) * 100)}%`,
        placesVsNominatim: `${results.placesSuccess} Google Places, ${results.nominatimSuccess} Nominatim`,
        message: `Business-optimized geocoding: ${results.successful}/${results.processed} companies upgraded to exact business locations`
      })
    };
    
  } catch (error) {
    console.error('❌ Google Places geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Google Places geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
