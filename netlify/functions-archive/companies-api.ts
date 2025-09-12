import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { industry, search, page = '1', limit = '50' } = event.queryStringParameters || {};
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Base query
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Add industry filter
    if (industry && industry !== 'All Industries') {
      paramCount++;
      query += ` AND industry = $${paramCount}`;
      params.push(industry);
    }

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR city ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Add ordering and pagination
    query += ' ORDER BY sales DESC NULLS LAST';
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limitNum);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    // Execute query using tagged template
    const companies = await sql(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM companies WHERE 1=1';
    const countParams = [];
    let countParamNum = 0;

    if (industry && industry !== 'All Industries') {
      countParamNum++;
      countQuery += ` AND industry = $${countParamNum}`;
      countParams.push(industry);
    }

    if (search) {
      countParamNum++;
      countQuery += ` AND (name ILIKE $${countParamNum} OR city ILIKE $${countParamNum} OR description ILIKE $${countParamNum})`;
      countParams.push(`%${search}%`);
    }

    const [{ total }] = await sql(countQuery, countParams);

    const result = {
      companies: companies,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(total),
        totalPages: Math.ceil(parseInt(total) / limitNum)
      },
      filters: {
        industry: industry || 'All Industries',
        search: search || ''
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database query failed', 
        details: error.message 
      })
    };
  }
};
