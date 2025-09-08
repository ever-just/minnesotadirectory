import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const handler: Handler = async (event) => {
  try {
    const { batchSize = 5 } = event.queryStringParameters || {};
    const limit = Math.min(parseInt(batchSize), 10);
    
    console.log('🎯 Simple Address-First Geocoding with Google Maps');
    
    // Get companies with highest revenue first (simple query, no complex columns)
    const companies = await sql`
      SELECT id, name, address, city, state, sales
      FROM companies 
      WHERE address IS NOT NULL 
        AND address != ''
        AND sales IS NOT NULL
      ORDER BY sales DESC
      LIMIT ${limit}
    `;
    
    console.log(`Found ${companies.length} companies to geocode`);
    
    const results = [];
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Google Maps API key not found' })
      };
    }
    
    // Process each company sequentially (reliable)
    for (const company of companies) {
      try {
        console.log(`📍 ${company.name}: ${company.address}`);
        
        // Method 1: Try exact street address
        const streetAddress = `${company.address}, ${company.city}, ${company.state || 'Minnesota'}, USA`;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(streetAddress)}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          const location = result.geometry.location;
          
          // Simple coordinate update (no complex metadata columns)
          await sql`
            UPDATE companies
            SET latitude = ${location.lat},
                longitude = ${location.lng}
            WHERE id = ${company.id}
          `;
          
          results.push({
            company: company.name,
            address: streetAddress,
            coordinates: [location.lat, location.lng],
            accuracy: result.geometry.location_type
          });
          
          console.log(`✅ [${location.lat}, ${location.lng}] (${result.geometry.location_type})`);
        } else {
          console.log(`❌ Address geocoding failed: ${data.status}`);
          results.push({
            company: company.name,
            error: data.status
          });
        }
        
        // Rate limiting - respect Google's 50 QPS limit
        await new Promise(resolve => setTimeout(resolve, 1200));
        
      } catch (error) {
        console.error(`Error with ${company.name}:`, error);
        results.push({
          company: company.name, 
          error: error.message
        });
      }
    }
    
    // Get total count
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM companies WHERE latitude IS NOT NULL`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        processed: companies.length,
        successful: results.filter(r => r.coordinates).length,
        totalMappedCompanies: parseInt(count),
        results: results,
        message: `Address-first geocoding complete`
      })
    };
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
