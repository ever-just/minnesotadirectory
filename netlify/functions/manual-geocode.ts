import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Manually add coordinates for major Minnesota companies
const knownCoordinates = [
  { name: 'Target Corporation', lat: 44.9537, lng: -93.2650 }, // Minneapolis
  { name: 'UnitedHealth Group Incorporated', lat: 44.8578, lng: -93.4681 }, // Eden Prairie
  { name: 'Cargill, Incorporated', lat: 44.9636728, lng: -93.4932209 }, // Wayzata
  { name: 'Best Buy Co., Inc.', lat: 44.8640168, lng: -93.3065797 }, // Richfield
  { name: '3M Company', lat: 44.9537, lng: -93.0840 }, // Saint Paul
  { name: 'General Mills, Inc.', lat: 45.0252, lng: -93.4170 }, // Golden Valley
  { name: 'U.S. Bancorp', lat: 44.9778, lng: -93.2650 }, // Minneapolis
  { name: 'Mayo Clinic', lat: 44.0225, lng: -92.4640 }, // Rochester
  { name: 'Xcel Energy Inc.', lat: 44.9537, lng: -93.2650 }, // Minneapolis
  { name: 'Hormel Foods Corporation', lat: 43.6677, lng: -92.9690 } // Austin
];

export const handler: Handler = async (event, context) => {
  try {
    console.log('📍 Adding known coordinates for major companies...');
    
    let updated = 0;
    let notFound = 0;
    
    for (const coord of knownCoordinates) {
      try {
        // Find company by name and update coordinates
        const result = await sql`
          UPDATE companies 
          SET latitude = ${coord.lat}, 
              longitude = ${coord.lng},
              "geocodedAt" = NOW(),
              "geocodingSource" = 'manual',
              "geocodingAccuracy" = 'exact'
          WHERE name = ${coord.name}
        `;
        
        if (result.count > 0) {
          console.log(`✅ ${coord.name}: [${coord.lat}, ${coord.lng}]`);
          updated++;
        } else {
          console.log(`❌ ${coord.name}: Not found in database`);
          notFound++;
        }
        
      } catch (error) {
        console.error(`❌ Error updating ${coord.name}:`, error);
        notFound++;
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
        updated,
        notFound,
        message: `Added coordinates for ${updated} companies`
      })
    };
    
  } catch (error) {
    console.error('❌ Manual geocoding failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Manual geocoding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
