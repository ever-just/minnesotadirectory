import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { limit = '50' } = event.queryStringParameters || {};
    const limitNum = Math.min(parseInt(limit), 3000);

    const companies = await sql`
      SELECT name, industry, sales, employees, city, state, website, description
      FROM companies 
      ORDER BY sales DESC NULLS LAST
      LIMIT ${limitNum}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        companies: companies,
        total: companies.length,
        success: true
      })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch companies',
        companies: [],
        total: 0,
        success: false
      })
    };
  }
};
