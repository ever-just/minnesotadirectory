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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Get company ID from query params
    const { companyId } = event.queryStringParameters || {};

    if (!companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Company ID required' })
      };
    }

    console.log(`🗑️ FAVORITES: Removing ${companyId} for user ${decoded.userId}`);

    // Remove saved company using snake_case column names
    const result = await sql`
      DELETE FROM saved_companies 
      WHERE user_id = ${decoded.userId} AND company_id = ${companyId}
      RETURNING id
    `;

    const removedCount = result?.length || 0;
    console.log(`✅ FAVORITES: Removed ${removedCount} saved company`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: removedCount > 0 ? 'Company removed from favorites' : 'Company was not in favorites',
        removed: removedCount > 0
      })
    };

  } catch (error) {
    console.error('❌ FAVORITES: Remove error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to remove favorite'
      })
    };
  }
};
