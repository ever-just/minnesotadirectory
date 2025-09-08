import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Rate limiting for API politeness
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Exact address geocoding using Nominatim
async function geocodeExactAddress(address: string, city: string, state: string, postalCode?: string): Promise<{lat: number, lng: number, accuracy: string} | null> {
  try {
    // Build the complete address exactly as provided
    const addressParts = [];
    if (address && address.trim() !== '') {
      addressParts.push(address.trim());
    }
    if (city && city.trim() !== '') {
      addressParts.push(city.trim());
    }
    if (state && state.trim() !== '') {
      addressParts.push(state.trim());
    }
    if (postalCode && postalCode.trim() !== '') {
      addressParts.push(postalCode.trim());
    }
    addressParts.push('USA');
    
    const fullAddress = addressParts.join(', ');
    const encodedAddress = encodeURIComponent(fullAddress);
    
    console.log(`🎯 Exact geocoding: ${fullAddress}`);
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MinnesotaDirectory/1.0 (contact@minnesotadirectory.com)'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      console.log(`❌ No results found`);
      return null;
    }
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.log(`❌ Invalid coordinates returned`);
      return null;
    }
    
    // Determine accuracy level from address details
    let accuracy = 'approximate';
    if (result.address?.house_number && result.address?.road) {
      accuracy = 'exact'; // Street-level precision
    } else if (result.address?.road || result.address?.suburb) {
      accuracy = 'street'; // Street or neighborhood level
    } else if (result.address?.city || result.address?.town) {
      accuracy = 'city'; // City level
    }
    
    console.log(`✅ Found coordinates: [${lat}, ${lng}] (${accuracy})`);
    return { lat, lng, accuracy };
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    const { batchSize = 10 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 25);
    
    console.log('🏢 Starting EXACT address-based geocoding...');
    console.log('🎯 Will replace approximate city coordinates with precise street addresses');
    
    // Get companies that need exact coordinates
    // Target companies with manual/approximate coordinates that have real addresses
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", latitude, longitude, "geocodingSource"
      FROM companies 
      WHERE "geocodingSource" IN ('manual', 'city_lookup', 'business_district')
        AND address IS NOT NULL 
        AND address != ''
        AND address NOT LIKE '%Unknown%'
        AND address NOT LIKE '%N/A%'
        AND city IS NOT NULL
      ORDER BY sales DESC NULLS LAST
      LIMIT ${limit}
    `;
    
    console.log(`Found ${companies.length} companies for exact address geocoding`);
    
    if (companies.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'No companies need address refinement - all coordinates are already precise',
          processed: 0,
          successful: 0
        })
      };
    }
    
    const results = {
      processed: 0,
      successful: 0,
      improved: 0, // Upgraded from city to exact address
      failed: 0,
      details: [] as any[]
    };
    
    // Process each company with exact address geocoding
    for (const company of companies) {
      try {
        console.log(`\n📍 Processing: ${company.name}`);
        console.log(`   Address: ${company.address}`);
        console.log(`   Current: [${company.latitude}, ${company.longitude}] (${company.geocodingSource})`);
        
        const exactCoords = await geocodeExactAddress(
          company.address,
          company.city,
          company.state || 'Minnesota',
          company.postalCode
        );
        
        if (exactCoords) {
          // Update with exact coordinates (NO random variance)
          await sql`
            UPDATE companies
            SET latitude = ${exactCoords.lat},
                longitude = ${exactCoords.lng},
                "geocodedAt" = NOW(),
                "geocodingSource" = 'nominatim_exact',
                "geocodingAccuracy" = ${exactCoords.accuracy}
            WHERE id = ${company.id}
          `;
          
          results.successful++;
          results.improved++;
          
          const oldLat = parseFloat(company.latitude);
          const oldLng = parseFloat(company.longitude);
          const distance = Math.sqrt(
            Math.pow((exactCoords.lat - oldLat) * 69, 2) + 
            Math.pow((exactCoords.lng - oldLng) * 69, 2)
          );
          
          results.details.push({
            company: company.name,
            address: company.address,
            oldCoords: [oldLat, oldLng],
            newCoords: [exactCoords.lat, exactCoords.lng],
            accuracy: exactCoords.accuracy,
            distanceMoved: `${distance.toFixed(2)} miles`
          });
          
          console.log(`✅ Updated: [${exactCoords.lat}, ${exactCoords.lng}] (${exactCoords.accuracy}) - moved ${distance.toFixed(2)} miles`);
        } else {
          results.failed++;
          console.log(`❌ Failed to geocode exact address`);
        }
        
        results.processed++;
        
        // Respect Nominatim rate limits (1 request per second)
        await delay(1100);
        
      } catch (error) {
        results.failed++;
        results.processed++;
        console.error(`Error geocoding ${company.name}:`, error);
      }
    }
    
    // Get updated statistics
    const [{ total_exact }] = await sql`
      SELECT COUNT(*) as total_exact
      FROM companies 
      WHERE "geocodingAccuracy" = 'exact'
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
        exactCoordinates: parseInt(total_exact),
        totalMappedCompanies: parseInt(total_mapped),
        message: `Upgraded ${results.improved} companies from city-approximate to exact street addresses`
      })
    };
    
  } catch (error) {
    console.error('❌ Exact geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Exact geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
