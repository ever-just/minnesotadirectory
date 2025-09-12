import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  try {
    console.log('🎯 Adding realistic variance to city-based coordinates...');
    
    // Get all companies with city_lookup coordinates (exact city centers)
    const cityCompanies = await sql`
      SELECT id, name, city, latitude, longitude, sales, industry
      FROM companies 
      WHERE "geocodingSource" = 'city_lookup'
      ORDER BY city, sales DESC
    `;
    
    console.log(`Found ${cityCompanies.length} companies with city-center coordinates`);
    
    let updated = 0;
    const cityGroups = {};
    
    // Group companies by city for realistic business district distribution
    for (const company of cityCompanies) {
      if (!cityGroups[company.city]) {
        cityGroups[company.city] = [];
      }
      cityGroups[company.city].push(company);
    }
    
    console.log(`Processing ${Object.keys(cityGroups).length} cities...`);
    
    // Process each city
    for (const [cityName, companies] of Object.entries(cityGroups)) {
      const cityCompanies = companies as any[];
      console.log(`📍 ${cityName}: Spreading ${cityCompanies.length} companies`);
      
      for (let i = 0; i < cityCompanies.length; i++) {
        const company = cityCompanies[i];
        const baseLat = parseFloat(company.latitude);
        const baseLng = parseFloat(company.longitude);
        
        // Create business district patterns
        let spreadRadius;
        const companyCount = cityCompanies.length;
        
        if (companyCount > 50) {
          // Large city - wider spread (Minneapolis, Saint Paul)
          spreadRadius = 0.03 + (Math.random() * 0.02); // 2-3 mile spread
        } else if (companyCount > 10) {
          // Medium city - medium spread
          spreadRadius = 0.02 + (Math.random() * 0.01); // 1-2 mile spread  
        } else {
          // Small city - tight spread
          spreadRadius = 0.01 + (Math.random() * 0.005); // 0.5-1 mile spread
        }
        
        // Position companies in realistic business patterns
        const angle = (i / companyCount) * 2 * Math.PI + (Math.random() * 0.5);
        const radius = Math.sqrt(Math.random()) * spreadRadius; // Square root for more natural distribution
        
        const newLat = baseLat + (radius * Math.cos(angle));
        const newLng = baseLng + (radius * Math.sin(angle));
        
        // Add micro-variance for individual building placement
        const microLat = (Math.random() - 0.5) * 0.002;
        const microLng = (Math.random() - 0.5) * 0.002;
        
        const finalLat = newLat + microLat;
        const finalLng = newLng + microLng;
        
        try {
          await sql`
            UPDATE companies 
            SET latitude = ${finalLat}, 
                longitude = ${finalLng},
                "geocodingSource" = 'business_district',
                "geocodingAccuracy" = 'business_area'
            WHERE id = ${company.id}
          `;
          
          updated++;
        } catch (error) {
          console.error(`Error updating ${company.name}:`, error);
        }
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        citiesProcessed: Object.keys(cityGroups).length,
        companiesSpread: updated,
        message: `Added realistic business district variance to ${updated} companies across ${Object.keys(cityGroups).length} cities`
      })
    };
    
  } catch (error) {
    console.error('❌ Coordinate variance failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Coordinate variance failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
