import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  try {
    console.log('🧹 Starting duplicate cleanup...');
    
    // Find all companies with duplicate names
    const duplicateGroups = await sql`
      SELECT name, COUNT(*) as count, ARRAY_AGG(id ORDER BY "createdAt" ASC) as ids
      FROM companies 
      GROUP BY name 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    console.log(`Found ${duplicateGroups.length} groups of duplicate companies`);
    
    let totalRemoved = 0;
    
    for (const group of duplicateGroups) {
      const ids = group.ids;
      const keepId = ids[0]; // Keep the oldest record
      const removeIds = ids.slice(1); // Remove newer duplicates
      
      console.log(`📋 ${group.name}: Keeping ${keepId}, removing ${removeIds.length} duplicates`);
      
      for (const removeId of removeIds) {
        await sql`DELETE FROM companies WHERE id = ${removeId}`;
        totalRemoved++;
      }
    }
    
    // Get final count
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM companies`;
    
    const result = {
      success: true,
      duplicateGroupsFound: duplicateGroups.length,
      duplicatesRemoved: totalRemoved,
      companiesRemaining: parseInt(count),
      details: duplicateGroups.map(g => ({
        name: g.name,
        hadDuplicates: g.count,
        removedCount: g.count - 1
      }))
    };
    
    console.log('✅ Cleanup complete:', result);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
