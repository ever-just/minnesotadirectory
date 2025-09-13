import { neon } from '@netlify/neon';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);
  
  try {
    // 1. Check coordinate status
    const coordinateStatus = await sql`
      SELECT 
        COUNT(*) as total_companies,
        COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as has_coordinates,
        COUNT(CASE WHEN latitude IS NULL THEN 1 END) as no_coordinates
      FROM companies
    `;
    
    // 2. Check for duplicates
    const duplicates = await sql`
      SELECT name, COUNT(*) as count
      FROM companies
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
    
    // 3. Show UnitedHealth specifically
    const unitedHealth = await sql`
      SELECT id, name, employees, sales, city, address, latitude, longitude
      FROM companies
      WHERE name = 'UnitedHealth Group Incorporated'
      ORDER BY sales DESC NULLS LAST
    `;
    
    // 4. Sample of companies with coordinates
    const withCoords = await sql`
      SELECT name, city, latitude, longitude, "geocodingSource"
      FROM companies
      WHERE latitude IS NOT NULL
      LIMIT 5
    `;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        coordinateStatus: coordinateStatus[0],
        duplicates: duplicates,
        unitedHealthEntries: unitedHealth.length,
        unitedHealthDetails: unitedHealth,
        sampleWithCoordinates: withCoords
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};





