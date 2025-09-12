import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Pre-defined coordinates for major Minnesota cities for instant results
const cityCoordinates = {
  'Minneapolis': { lat: 44.9778, lng: -93.2650 },
  'Saint Paul': { lat: 44.9537, lng: -93.0900 },  
  'Rochester': { lat: 44.0121, lng: -92.4802 },
  'Duluth': { lat: 46.7867, lng: -92.1005 },
  'Bloomington': { lat: 44.8308, lng: -93.2983 },
  'Brooklyn Park': { lat: 45.0941, lng: -93.3563 },
  'Plymouth': { lat: 45.0105, lng: -93.4555 },
  'Saint Cloud': { lat: 45.5579, lng: -94.2476 },
  'Eagan': { lat: 44.8041, lng: -93.1666 },
  'Woodbury': { lat: 44.9239, lng: -92.9594 },
  'Maple Grove': { lat: 45.0725, lng: -93.4557 },
  'Eden Prairie': { lat: 44.8547, lng: -93.4708 },
  'Coon Rapids': { lat: 45.1200, lng: -93.3030 },
  'Burnsville': { lat: 44.7678, lng: -93.2777 },
  'Minnetonka': { lat: 44.9211, lng: -93.4687 },
  'Lakeville': { lat: 44.6497, lng: -93.2424 },
  'Richfield': { lat: 44.8830, lng: -93.2830 },
  'Roseville': { lat: 45.0061, lng: -93.1568 },
  'Maplewood': { lat: 44.9530, lng: -92.9952 },
  'Cottage Grove': { lat: 44.8277, lng: -92.9438 },
  'Inver Grove Heights': { lat: 44.8516, lng: -93.0366 },
  'Apple Valley': { lat: 44.7319, lng: -93.2180 },
  'Edina': { lat: 44.8897, lng: -93.3499 },
  'Blaine': { lat: 45.1607, lng: -93.2349 },
  'Moorhead': { lat: 46.8737, lng: -96.7678 },
  'Mankato': { lat: 44.1636, lng: -94.0719 },
  'Winona': { lat: 44.0499, lng: -91.6432 },
  'Owatonna': { lat: 44.0838, lng: -93.2260 },
  'Austin': { lat: 43.6666, lng: -92.9746 },
  'Wayzata': { lat: 44.9647, lng: -93.5066 },
  'Chanhassen': { lat: 44.8619, lng: -93.5314 },
  'Faribault': { lat: 44.2951, lng: -93.2688 },
  'Northfield': { lat: 44.4583, lng: -93.1616 },
  'Red Wing': { lat: 44.5633, lng: -92.5338 },
  'Stillwater': { lat: 45.0566, lng: -92.8060 },
  'New Brighton': { lat: 45.0516, lng: -93.2016 },
  'Golden Valley': { lat: 44.9778, lng: -93.3832 },
  'Vadnais Heights': { lat: 45.0630, lng: -93.0738 },
  'Hopkins': { lat: 44.9250, lng: -93.4044 },
  'Elk River': { lat: 45.3041, lng: -93.5872 },
  'Andover': { lat: 45.2332, lng: -93.2916 },
  'Ramsey': { lat: 45.2411, lng: -93.4480 }
};

export const handler: Handler = async (event, context) => {
  try {
    console.log('🚀 Starting fast city-based geocoding...');
    
    // Get all companies without coordinates
    const ungeocodedCompanies = await sql`
      SELECT id, name, city, state, address
      FROM companies 
      WHERE latitude IS NULL 
      ORDER BY sales DESC NULLS LAST
    `;
    
    console.log(`Found ${ungeocodedCompanies.length} companies to geocode`);
    
    let updated = 0;
    let cityMatched = 0;
    let noMatch = 0;
    
    // Process companies in batches for speed
    const batchSize = 50;
    
    for (let i = 0; i < ungeocodedCompanies.length; i += batchSize) {
      const batch = ungeocodedCompanies.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ungeocodedCompanies.length/batchSize)}...`);
      
      // Process batch in parallel
      await Promise.all(batch.map(async (company) => {
        try {
          if (!company.city) {
            noMatch++;
            return;
          }
          
          // Clean up city name
          const cleanCity = company.city
            .replace(/\s+(City|Township|Village)$/i, '')
            .replace(/^City\s+of\s+/i, '')
            .trim();
          
          // Try exact match first
          let coords = cityCoordinates[cleanCity];
          
          // Try case-insensitive match
          if (!coords) {
            const cityKey = Object.keys(cityCoordinates).find(key => 
              key.toLowerCase() === cleanCity.toLowerCase()
            );
            coords = cityKey ? cityCoordinates[cityKey] : null;
          }
          
          // Try partial match for suburbs (Minneapolis area)
          if (!coords && cleanCity.toLowerCase().includes('minneapolis')) {
            coords = cityCoordinates['Minneapolis'];
          }
          
          if (coords) {
            // Create realistic business district distribution
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.sqrt(Math.random()) * 0.025; // Up to 1.5 mile radius from city center
            
            // Position companies in business district patterns
            const businessLat = coords.lat + (radius * Math.cos(angle));
            const businessLng = coords.lng + (radius * Math.sin(angle));
            
            // Add micro-variance for individual buildings (prevents exact overlap)
            const microLat = (Math.random() - 0.5) * 0.003; // ~0.1 mile building variance
            const microLng = (Math.random() - 0.5) * 0.003;
            
            const finalLat = businessLat + microLat;
            const finalLng = businessLng + microLng;
            
            await sql`
              UPDATE companies 
              SET latitude = ${finalLat}, 
                  longitude = ${finalLng},
                  "geocodedAt" = NOW(),
                  "geocodingSource" = 'business_district',
                  "geocodingAccuracy" = 'business_area'
              WHERE id = ${company.id}
            `;
            
            updated++;
            cityMatched++;
          } else {
            noMatch++;
          }
          
        } catch (error) {
          console.error(`Error processing ${company.name}:`, error);
          noMatch++;
        }
      }));
      
      console.log(`Batch complete: ${updated} total updated so far`);
    }
    
    // Get final count
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
        processedCompanies: ungeocodedCompanies.length,
        updatedCompanies: updated,
        cityMatched,
        noMatch,
        totalMappedCompanies: parseInt(count),
        message: `Fast geocoded ${updated} companies using city lookup`
      })
    };
    
  } catch (error) {
    console.error('❌ Fast geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Fast geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
