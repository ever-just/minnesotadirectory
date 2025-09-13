import { neon } from '@netlify/neon';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);
  
  const MN_BOUNDS = {
    north: 49.384358,
    south: 43.499356,
    east: -89.491897,
    west: -97.239209
  };
  
  try {
    // Find companies outside Minnesota
    const outsideMN = await sql`
      SELECT COUNT(*) as count,
             MIN(latitude) as min_lat,
             MAX(latitude) as max_lat,
             MIN(longitude) as min_lng,
             MAX(longitude) as max_lng
      FROM companies 
      WHERE latitude IS NOT NULL 
        AND (latitude < ${MN_BOUNDS.south} OR latitude > ${MN_BOUNDS.north}
             OR longitude < ${MN_BOUNDS.west} OR longitude > ${MN_BOUNDS.east})
    `;
    
    // Show examples of misplaced companies
    let examples = [];
    if (outsideMN[0].count > 0) {
      examples = await sql`
        SELECT name, city, state, latitude, longitude, "geocodingSource", "geocodingAccuracy"
        FROM companies 
        WHERE latitude IS NOT NULL 
          AND (latitude < ${MN_BOUNDS.south} OR latitude > ${MN_BOUNDS.north}
               OR longitude < ${MN_BOUNDS.west} OR longitude > ${MN_BOUNDS.east})
        LIMIT 10
      `;
    }
    
    // Check geocoding sources
    const sources = await sql`
      SELECT "geocodingSource", "geocodingAccuracy", COUNT(*) as count
      FROM companies 
      WHERE latitude IS NOT NULL
      GROUP BY "geocodingSource", "geocodingAccuracy"
      ORDER BY count DESC
    `;
    
    // Total geocoded companies
    const total = await sql`
      SELECT COUNT(*) as total_geocoded
      FROM companies 
      WHERE latitude IS NOT NULL
    `;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        damage: {
          companiesOutsideMN: outsideMN[0].count,
          latRange: [outsideMN[0].min_lat, outsideMN[0].max_lat],
          lngRange: [outsideMN[0].min_lng, outsideMN[0].max_lng],
          examples: examples.map(c => ({
            name: c.name,
            location: `${c.city}, ${c.state}`,
            coordinates: [c.latitude, c.longitude],
            source: `${c.geocodingSource} (${c.geocodingAccuracy})`
          }))
        },
        sources: sources.map(s => ({
          source: s.geocodingSource || 'unknown',
          accuracy: s.geocodingAccuracy || 'unknown',
          count: s.count
        })),
        totalGeocoded: total[0].total_geocoded,
        mnBounds: MN_BOUNDS
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
