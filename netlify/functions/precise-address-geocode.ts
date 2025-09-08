import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced geocoding with better address precision
async function preciseGeocode(address: string, city: string, state: string, postalCode?: string): Promise<{lat: number, lng: number, accuracy: string} | null> {
  try {
    // Build precise address
    const addressParts = [];
    if (address && !address.toLowerCase().includes('unknown')) {
      addressParts.push(address);
    }
    if (city) addressParts.push(city);
    if (state) addressParts.push(state);
    if (postalCode) addressParts.push(postalCode);
    addressParts.push('USA');
    
    const fullAddress = addressParts.join(', ');
    const encodedAddress = encodeURIComponent(fullAddress);
    
    console.log(`Geocoding: ${fullAddress}`);
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MinnesotaDirectory/1.0 (contact@minnesotadirectory.com)'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lng)) return null;
    
    // Determine accuracy
    let accuracy = 'approximate';
    if (result.address?.house_number) {
      accuracy = 'exact';
    } else if (result.address?.city || result.address?.town) {
      accuracy = 'city';
    }
    
    return { lat, lng, accuracy };
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    console.log('🎯 Starting PRECISE address-based geocoding...');
    
    // Get companies with poor coordinates (city_lookup source) and some without any
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", latitude, longitude, "geocodingSource"
      FROM companies 
      WHERE (
        "geocodingSource" = 'city_lookup' OR 
        latitude IS NULL
      )
      AND address IS NOT NULL 
      AND city IS NOT NULL
      ORDER BY sales DESC NULLS LAST
      LIMIT 100
    `;
    
    console.log(`Found ${companies.length} companies for precise geocoding`);
    
    const results = {
      processed: 0,
      successful: 0,
      improved: 0, // Upgraded from city to address precision
      failed: 0,
      details: [] as any[]
    };
    
    // Process companies with proper rate limiting
    for (const company of companies) {
      try {
        if (!company.address || !company.city) {
          results.failed++;
          results.processed++;
          continue;
        }
        
        const coords = await preciseGeocode(
          company.address,
          company.city,
          company.state || 'Minnesota',
          company.postalCode
        );
        
        if (coords) {
          // Add small random variance to prevent exact stacking
          const latVariance = (Math.random() - 0.5) * 0.002; // ~0.1 mile spread
          const lngVariance = (Math.random() - 0.5) * 0.002;
          
          await sql`
            UPDATE companies
            SET latitude = ${coords.lat + latVariance},
                longitude = ${coords.lng + lngVariance},
                "geocodedAt" = NOW(),
                "geocodingSource" = 'nominatim_precise',
                "geocodingAccuracy" = ${coords.accuracy}
            WHERE id = ${company.id}
          `;
          
          results.successful++;
          
          if (company.geocodingSource === 'city_lookup') {
            results.improved++;
          }
          
          results.details.push({
            company: company.name,
            coordinates: [coords.lat + latVariance, coords.lng + lngVariance],
            accuracy: coords.accuracy,
            improved: company.geocodingSource === 'city_lookup'
          });
          
          console.log(`✅ ${company.name}: [${coords.lat}, ${coords.lng}] (${coords.accuracy})`);
        } else {
          results.failed++;
          console.log(`❌ ${company.name}: Precise geocoding failed`);
        }
        
        results.processed++;
        
        // Respect Nominatim rate limits
        await delay(1100);
        
      } catch (error) {
        results.failed++;
        results.processed++;
        console.error(`Error geocoding ${company.name}:`, error);
      }
    }
    
    // Get updated total count
    const [{ count }] = await sql`
      SELECT COUNT(*) as count 
      FROM companies 
      WHERE latitude IS NOT NULL
    `;
    
    const [{ precise_count }] = await sql`
      SELECT COUNT(*) as precise_count 
      FROM companies 
      WHERE "geocodingAccuracy" = 'exact'
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
        totalMappedCompanies: parseInt(count),
        preciseAddresses: parseInt(precise_count),
        message: `Precisely geocoded ${results.successful}/${results.processed} companies (${results.improved} improved from city to address precision)`
      })
    };
    
  } catch (error) {
    console.error('❌ Precise geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Precise geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
