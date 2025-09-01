import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🚀 Starting CSV migration...');

    // CSV data (first few rows for testing)
    const companies = [
      {
        name: 'Target Corporation',
        industry: 'Department Stores', 
        sales: 106566000000,
        employees: 440000,
        city: 'Minneapolis',
        state: 'Minnesota',
        website: 'http://www.target.com'
      },
      {
        name: 'UnitedHealth Group Incorporated',
        industry: 'Life and Health Insurance',
        sales: 400278000000, 
        employees: 400000,
        city: 'Eden Prairie',
        state: 'Minnesota',
        website: 'http://www.unitedhealthgroup.com'
      }
    ];

    // Insert companies
    for (const company of companies) {
      await sql`
        INSERT INTO companies (name, industry, sales, employees, city, state, website)
        VALUES (${company.name}, ${company.industry}, ${company.sales}, ${company.employees}, ${company.city}, ${company.state}, ${company.website})
      `;
    }

    console.log(`✅ Migrated ${companies.length} test companies`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        migrated: companies.length,
        message: 'Test migration completed successfully' 
      })
    };

  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Migration failed', 
        details: error.message 
      })
    };
  }
};
