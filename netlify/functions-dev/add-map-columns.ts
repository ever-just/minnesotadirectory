import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@netlify/neon';

export const handler: Handler = async (event, context) => {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    console.log('Adding map columns to companies table...');
    
    // Add the columns if they don't exist (using camelCase to match Drizzle schema)
    await sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
      ADD COLUMN IF NOT EXISTS "geocodedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "geocodingSource" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "geocodingAccuracy" VARCHAR(20)
    `;
    
    console.log('✅ Map columns added successfully');
    
    // Check how many companies need geocoding
    const [{ count }] = await sql`
      SELECT COUNT(*) as count 
      FROM companies 
      WHERE latitude IS NULL
    `;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Map columns added successfully',
        companiesNeedingGeocode: parseInt(count)
      })
    };
    
  } catch (error) {
    console.error('Error adding map columns:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
