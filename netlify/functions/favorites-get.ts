import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import * as jwt from 'jsonwebtoken';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const sql = neon(DATABASE_URL);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // Get and verify token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Authentication required' })
      };
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid token' })
      };
    }

    console.log(`📋 FAVORITES: Getting saved companies for user ${decoded.userId}`);

    // Get saved companies using snake_case column names
    const savedCompanies = await sql`
      SELECT 
        sc.id as saved_id,
        sc.saved_at,
        sc.notes,
        sc.tags,
        c.id as company_id,
        c.name,
        c.industry,
        c.sales,
        c.employees,
        c.city,
        c.state,
        c.website,
        c.description
      FROM saved_companies sc
      JOIN companies c ON sc.company_id = c.id
      WHERE sc.user_id = ${decoded.userId}
      ORDER BY sc.saved_at DESC
    `;

    const savedList = savedCompanies || [];
    console.log(`✅ FAVORITES: Found ${savedList.length} saved companies`);

    // Format response for frontend
    const formattedCompanies = savedList.map(row => ({
      savedCompanyId: row.saved_id,
      savedAt: row.saved_at,
      notes: row.notes || '',
      tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      company: {
        id: row.company_id,
        name: row.name,
        industry: row.industry,
        sales: row.sales,
        employees: row.employees,
        city: row.city,
        state: row.state,
        website: row.website,
        description: row.description
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        savedCompanies: formattedCompanies,
        total: formattedCompanies.length,
        message: `Found ${formattedCompanies.length} favorite companies`
      })
    };

  } catch (error) {
    console.error('❌ FAVORITES: Get error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to get favorites'
      })
    };
  }
};
