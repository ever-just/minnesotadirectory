import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function fixSavedCompaniesTable() {
  console.log('🔧 Fixing saved_companies table...');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Drop and recreate the table with proper constraints
    console.log('🗑️  Dropping existing saved_companies table...');
    await sql.query(`DROP TABLE IF EXISTS saved_companies CASCADE;`);
    
    console.log('🆕 Creating saved_companies table with proper constraints...');
    await sql.query(`
      CREATE TABLE saved_companies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW(),
        notes TEXT,
        tags VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT saved_companies_user_company_unique UNIQUE (user_id, company_id)
      );
    `);
    
    console.log('📊 Creating indexes...');
    await sql.query(`CREATE INDEX saved_companies_user_idx ON saved_companies(user_id);`);
    await sql.query(`CREATE INDEX saved_companies_company_idx ON saved_companies(company_id);`);
    await sql.query(`CREATE INDEX saved_companies_saved_at_idx ON saved_companies(saved_at DESC);`);
    
    // Test insert
    console.log('🧪 Testing insert...');
    const testResult = await sql.query(`
      INSERT INTO saved_companies (user_id, company_id, notes) 
      VALUES ('67d87577-242a-4d8f-b89c-21fa8042eaba', '99ec024e-c64f-4576-837c-c6433a5b5081', 'Test save') 
      RETURNING id, saved_at;
    `);
    
    console.log('✅ Test insert successful:', testResult.rows ? testResult.rows[0] : testResult);
    
    // Test retrieval
    console.log('🔍 Testing retrieval...');
    const getResult = await sql.query(`
      SELECT sc.id, sc.notes, sc.saved_at, c.name as company_name
      FROM saved_companies sc
      JOIN companies c ON sc.company_id = c.id
      WHERE sc.user_id = $1
      ORDER BY sc.saved_at DESC;
    `, ['67d87577-242a-4d8f-b89c-21fa8042eaba']);
    
    console.log('✅ Retrieval test successful:', getResult.rows ? getResult.rows : getResult);
    
    console.log('🎉 saved_companies table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixSavedCompaniesTable();
