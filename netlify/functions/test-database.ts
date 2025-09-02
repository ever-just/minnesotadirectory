import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const handler: Handler = async (event) => {
  try {
    console.log('🧪 Starting database connection test...');

    // TEST 1: Database Connection
    console.log('Test 1: Database Connection');
    const connectionTest = await sql`SELECT NOW() as current_time, version() as postgres_version`;
    
    // TEST 2: Table Existence  
    console.log('Test 2: Table Existence');
    const tablesTest = await sql`
      SELECT table_name, column_count 
      FROM (
        SELECT table_name, COUNT(*) as column_count
        FROM information_schema.columns 
        WHERE table_name IN ('companies', 'industries')
        GROUP BY table_name
      ) t
    `;

    // TEST 3: Sample Data Insert
    console.log('Test 3: Sample Data Insert');
    await sql`
      INSERT INTO companies (name, industry, sales, employees, city, state, website)
      VALUES ('Test Company', 'Technology', 1000000, 50, 'Minneapolis', 'Minnesota', 'https://test.com')
      ON CONFLICT DO NOTHING
    `;

    // TEST 4: Data Query
    console.log('Test 4: Data Query');
    const testQuery = await sql`
      SELECT name, industry, sales, employees 
      FROM companies 
      WHERE name = 'Test Company'
      LIMIT 1
    `;

    // TEST 5: Table Counts
    console.log('Test 5: Current Data Counts');
    const companiesCount = await sql`SELECT COUNT(*) as count FROM companies`;
    const industriesCount = await sql`SELECT COUNT(*) as count FROM industries`;

    const results = {
      timestamp: new Date().toISOString(),
      tests: {
        connection: {
          status: '✅ SUCCESS',
          time: connectionTest[0].current_time,
          version: connectionTest[0].postgres_version
        },
        tables: {
          status: '✅ SUCCESS',
          found: tablesTest,
          companies_table: tablesTest.find(t => t.table_name === 'companies'),
          industries_table: tablesTest.find(t => t.table_name === 'industries')
        },
        sample_insert: {
          status: '✅ SUCCESS',
          inserted: 'Test Company data'
        },
        query: {
          status: '✅ SUCCESS', 
          result: testQuery[0] || 'No test data found'
        },
        counts: {
          status: '✅ SUCCESS',
          companies: companiesCount[0].count,
          industries: industriesCount[0].count
        }
      }
    };

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Database test failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
