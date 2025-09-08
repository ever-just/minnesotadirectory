import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fast Nominatim geocoding for remaining companies
async function geocodeAddress(address: string, city: string, state: string): Promise<{lat: number, lng: number} | null> {
  try {
    const fullAddress = `${address}, ${city}, ${state}, USA`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us`;
    
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
    
    return { lat, lng };
    
  } catch (error) {
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  try {
    const { batchSize = 20 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 50);
    
    console.log(`🎯 Precise geocoding remaining companies (batch size: ${limit})`);
    
    // Get companies that still need geocoding (no city match)
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode"
      FROM companies 
      WHERE latitude IS NULL 
      AND city IS NOT NULL 
      AND address IS NOT NULL
      ORDER BY sales DESC NULLS LAST
      LIMIT ${limit}
    `;
    
    console.log(`Found ${companies.length} companies for precise geocoding`);
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: [] as any[]
    };
    
    // Process companies with rate limiting
    for (const company of companies) {
      try {
        console.log(`Geocoding: ${company.name} - ${company.city}, ${company.state}`);
        
        const coords = await geocodeAddress(
          company.address,
          company.city,
          company.state
        );
        
        if (coords) {
          await sql`
            UPDATE companies
            SET latitude = ${coords.lat},
                longitude = ${coords.lng},
                "geocodedAt" = NOW(),
                "geocodingSource" = 'nominatim',
                "geocodingAccuracy" = 'approximate'
            WHERE id = ${company.id}
          `;
          
          results.successful++;
          results.details.push({
            company: company.name,
            coordinates: [coords.lat, coords.lng]
          });
          
          console.log(`✅ ${company.name}: [${coords.lat}, ${coords.lng}]`);
        } else {
          results.failed++;
          console.log(`❌ ${company.name}: Geocoding failed`);
        }
        
        results.processed++;
        
        // Respect rate limits
        await delay(1100);
        
      } catch (error) {
        results.failed++;
        console.error(`Error geocoding ${company.name}:`, error);
      }
    }
    
    // Get updated total
    const [{ count }] = await sql`
      SELECT COUNT(*) as count 
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
        totalMappedCompanies: parseInt(count),
        message: `Precisely geocoded ${results.successful}/${results.processed} companies`
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
