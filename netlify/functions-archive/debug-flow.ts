import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const sql = neon(DATABASE_URL);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    console.log('🔍 DEBUG: Checking complete save/retrieve flow...');
    
    // Check table exists and structure
    const tableCheck = await sql.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'saved_companies'
      ORDER BY ordinal_position;
    `);
    
    // Check all saved data
    const allSaved = await sql.query(`
      SELECT sc.*, u.email, c.name as company_name
      FROM saved_companies sc
      LEFT JOIN users u ON sc.user_id = u.id
      LEFT JOIN companies c ON sc.company_id = c.id
      ORDER BY sc.saved_at DESC;
    `);
    
    // Test token verification
    const testToken = event.queryStringParameters?.token;
    let tokenInfo = null;
    if (testToken) {
      try {
        tokenInfo = jwt.verify(testToken, JWT_SECRET);
      } catch (error) {
        tokenInfo = { error: error.message };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        debug: {
          table_structure: tableCheck.rows || [],
          all_saved_data: allSaved.rows || [],
          save_count: (allSaved.rows || []).length,
          token_verification: tokenInfo,
          database_url_set: !!process.env.DATABASE_URL
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
