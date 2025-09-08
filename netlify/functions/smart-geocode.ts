import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Corporate address translations for known headquarters
const corporateTranslations = {
  "3M Center": "3M Center Building, Saint Paul",
  "Ameriprise Financial Ctr": "Ameriprise Financial Center, Minneapolis", 
  "1 Health Dr": "1 Health Drive, Eden Prairie",
  "1 General Mills Blvd": "1 General Mills Boulevard, Golden Valley",
  "800 Nicollet Mall": "800 Nicollet Mall, Minneapolis",
  "1000 Nicollet Mall": "1000 Nicollet Mall, Minneapolis",
  "414 Nicollet Mall": "414 Nicollet Mall, Minneapolis"
};

// Multi-stage address preprocessing
function generateAddressVariations(rawAddress: string, city: string, state: string, postalCode?: string): string[] {
  const variations = [];
  
  // 1. Check for known corporate translations
  const translated = corporateTranslations[rawAddress.trim()];
  if (translated) {
    variations.push(`${translated}, ${state}, USA`);
  }
  
  // 2. Original address (full format)
  const fullAddress = [rawAddress, city, state, postalCode, 'USA'].filter(Boolean).join(', ');
  variations.push(fullAddress);
  
  // 3. Remove suite/unit/room numbers
  const noSuite = rawAddress
    .replace(/\s+Ste\s+[\w\d-]+.*$/i, '')
    .replace(/\s+Suite\s+[\w\d-]+.*$/i, '')
    .replace(/\s+Unit\s+[\w\d-]+.*$/i, '')
    .replace(/\s+#[\w\d-]+.*$/i, '')
    .replace(/\s+Apt\s+[\w\d-]+.*$/i, '');
  if (noSuite !== rawAddress) {
    variations.push([noSuite, city, state, postalCode, 'USA'].filter(Boolean).join(', '));
  }
  
  // 4. Remove building/floor designations  
  const noBuilding = rawAddress
    .replace(/\s+Bldg\s+[\w\d-]+.*$/i, '')
    .replace(/\s+Building\s+[\w\d-]+.*$/i, '')
    .replace(/\s+Floor\s+[\w\d-]+.*$/i, '')
    .replace(/\s+Fl\s+[\w\d-]+.*$/i, '');
  if (noBuilding !== rawAddress) {
    variations.push([noBuilding, city, state, postalCode, 'USA'].filter(Boolean).join(', '));
  }
  
  // 5. Street address only (remove everything after street name)
  const streetOnly = rawAddress.match(/^\d+\s+[^,]+?(St|Ave|Blvd|Rd|Dr|Ln|Way|Pkwy|Pl|Cir)/i);
  if (streetOnly) {
    variations.push([streetOnly[0], city, state, 'USA'].filter(Boolean).join(', '));
  }
  
  // 6. Just street number + major street name (last resort)
  const basicStreet = rawAddress.match(/^\d+\s+\w+/);
  if (basicStreet) {
    variations.push([basicStreet[0], city, state, 'USA'].filter(Boolean).join(', '));
  }
  
  // Remove duplicates and return
  return [...new Set(variations)];
}

// Enhanced Nominatim geocoding with multiple attempts
async function smartGeocode(addressVariations: string[]): Promise<{lat: number, lng: number, accuracy: string, matchedAddress: string} | null> {
  for (const address of addressVariations) {
    try {
      console.log(`🎯 Trying: ${address}`);
      
      const encodedAddress = encodeURIComponent(address);
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
      
      // Determine accuracy based on address match quality
      let accuracy = 'approximate';
      if (result.address?.house_number && result.address?.road) {
        accuracy = 'exact'; // Street-level precision
      } else if (result.address?.road || result.address?.suburb) {
        accuracy = 'street'; // Street or neighborhood level
      } else if (result.address?.city || result.address?.town) {
        accuracy = 'city'; // City level
      }
      
      console.log(`✅ SUCCESS: [${lat}, ${lng}] (${accuracy}) via "${address}"`);
      return { lat, lng, accuracy, matchedAddress: address };
      
    } catch (error) {
      console.log(`❌ Error with "${address}": ${error.message}`);
      continue;
    }
    
    // Small delay between attempts
    await delay(200);
  }
  
  console.log(`❌ All address variations failed`);
  return null;
}

// Google Maps fallback (if API key is available)
async function googleMapsGeocode(address: string): Promise<{lat: number, lng: number, accuracy: string} | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }
    
    const result = data.results[0];
    const location = result.geometry.location;
    
    let accuracy = 'approximate';
    if (result.geometry.location_type === 'ROOFTOP') {
      accuracy = 'exact';
    } else if (result.geometry.location_type === 'RANGE_INTERPOLATED') {
      accuracy = 'street';
    }
    
    return { lat: location.lat, lng: location.lng, accuracy };
    
  } catch (error) {
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    const { batchSize = 8 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 15);
    
    console.log('🧠 Starting INTELLIGENT address geocoding...');
    console.log('🎯 Using multi-stage address parsing + corporate translations');
    
    // Get companies that need exact coordinates
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", latitude, longitude, "geocodingSource", sales
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
    
    console.log(`Found ${companies.length} companies for intelligent geocoding`);
    
    const results = {
      processed: 0,
      successful: 0,
      improved: 0,
      failed: 0,
      details: [] as any[]
    };
    
    for (const company of companies) {
      try {
        console.log(`\n📍 Processing: ${company.name}`);
        console.log(`   Address: "${company.address}"`);
        console.log(`   City: ${company.city}, State: ${company.state}`);
        console.log(`   Current coords: [${company.latitude}, ${company.longitude}]`);
        
        // Generate multiple address variations
        const addressVariations = generateAddressVariations(
          company.address,
          company.city,
          company.state || 'Minnesota',
          company.postalCode
        );
        
        console.log(`🔄 Generated ${addressVariations.length} address variations to try:`);
        addressVariations.forEach((addr, i) => console.log(`   ${i+1}. ${addr}`));
        
        // Try smart geocoding with variations
        let coords = await smartGeocode(addressVariations);
        
        // Fallback to Google Maps if available and Nominatim failed
        if (!coords && process.env.GOOGLE_MAPS_API_KEY) {
          console.log(`🔄 Trying Google Maps fallback...`);
          coords = await googleMapsGeocode(addressVariations[0]);
          if (coords) {
            coords.matchedAddress = `Google Maps: ${addressVariations[0]}`;
          }
        }
        
        if (coords) {
          // Calculate distance moved for validation
          const oldLat = parseFloat(company.latitude);
          const oldLng = parseFloat(company.longitude);
          const distance = Math.sqrt(
            Math.pow((coords.lat - oldLat) * 69, 2) + 
            Math.pow((coords.lng - oldLng) * 69, 2)
          );
          
          // Validate result (flag if moved >15 miles - likely error)
          if (distance > 15) {
            console.log(`⚠️ WARNING: Moved ${distance.toFixed(2)} miles - may be incorrect`);
            results.failed++;
          } else {
            // Update with exact coordinates
            await sql`
              UPDATE companies
              SET latitude = ${coords.lat},
                  longitude = ${coords.lng},
                  "geocodedAt" = NOW(),
                  "geocodingSource" = 'smart_geocode',
                  "geocodingAccuracy" = ${coords.accuracy}
              WHERE id = ${company.id}
            `;
            
            results.successful++;
            if (company.geocodingSource !== 'smart_geocode') {
              results.improved++;
            }
            
            results.details.push({
              company: company.name,
              address: company.address,
              matchedAddress: coords.matchedAddress || addressVariations[0],
              oldCoords: [oldLat, oldLng],
              newCoords: [coords.lat, coords.lng],
              accuracy: coords.accuracy,
              distanceMoved: `${distance.toFixed(2)} miles`,
              oldSource: company.geocodingSource
            });
            
            console.log(`✅ UPDATED: [${coords.lat}, ${coords.lng}] (${coords.accuracy})`);
            console.log(`   Distance moved: ${distance.toFixed(2)} miles`);
            console.log(`   Matched via: ${coords.matchedAddress || 'address variation'}`);
          }
        } else {
          results.failed++;
          console.log(`❌ FAILED: All ${addressVariations.length} address variations failed`);
        }
        
        results.processed++;
        
        // Respect rate limits
        await delay(1200);
        
      } catch (error) {
        results.failed++;
        results.processed++;
        console.error(`Error processing ${company.name}:`, error);
      }
    }
    
    // Get updated statistics
    const [{ total_exact }] = await sql`
      SELECT COUNT(*) as total_exact
      FROM companies 
      WHERE "geocodingAccuracy" IN ('exact', 'street')
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
        successRate: `${Math.round((results.successful / results.processed) * 100)}%`,
        message: `Intelligently geocoded ${results.successful}/${results.processed} companies (${results.improved} improved to exact addresses)`
      })
    };
    
  } catch (error) {
    console.error('❌ Smart geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Smart geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
