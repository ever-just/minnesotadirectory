import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const sql = neon(DATABASE_URL);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
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

    // Parse body
    const body = JSON.parse(event.body || '{}');
    const { companyId, notes = 'Saved from directory', tags = 'favorite' } = body;

    if (!companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Company ID required' })
      };
    }

    console.log(`💾 FAVORITES: Saving ${companyId} for user ${decoded.userId}`);

    // Use UPSERT with snake_case column names (matching database schema)
    const result = await sql.query(`
      INSERT INTO saved_companies (user_id, company_id, notes, tags, saved_at) 
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, company_id) 
      DO UPDATE SET 
        notes = EXCLUDED.notes,
        tags = EXCLUDED.tags,
        saved_at = NOW()
      RETURNING id, saved_at;
    `, [decoded.userId, companyId, notes, tags]);

    console.log(`✅ FAVORITES: Save successful`, result.rows?.[0]);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Company saved to favorites',
        savedCompany: result.rows?.[0] || { id: 'saved', saved_at: new Date() }
      })
    };

  } catch (error) {
    console.error('❌ FAVORITES: Save error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to save favorite'
      })
    };
  }
};
