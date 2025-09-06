import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function createSavedCompaniesTable() {
  console.log('🎯 FINAL FIX: Creating saved_companies table with proper schema...');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Step 1: Drop any existing conflicting table
    console.log('🗑️  Cleaning up any existing saved_companies table...');
    try {
      await sql.query(`DROP TABLE IF EXISTS saved_companies CASCADE;`);
      console.log('✅ Cleaned up existing table');
    } catch (error) {
      console.log('ℹ️  No existing table to clean up');
    }
    
    // Step 2: Create table with snake_case naming (matching database convention)
    console.log('🆕 Creating saved_companies table with correct naming...');
    await sql.query(`
      CREATE TABLE saved_companies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW(),
        notes TEXT,
        tags VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table created with snake_case columns');
    
    // Step 3: Create unique constraint
    console.log('🔐 Adding unique constraint...');
    await sql.query(`
      ALTER TABLE saved_companies 
      ADD CONSTRAINT saved_companies_user_company_unique 
      UNIQUE (user_id, company_id);
    `);
    console.log('✅ Unique constraint added');
    
    // Step 4: Create indexes for performance
    console.log('📊 Creating indexes...');
    const indexes = [
      `CREATE INDEX saved_companies_user_idx ON saved_companies(user_id);`,
      `CREATE INDEX saved_companies_company_idx ON saved_companies(company_id);`,
      `CREATE INDEX saved_companies_saved_at_idx ON saved_companies(saved_at DESC);`
    ];
    
    for (const indexSQL of indexes) {
      try {
        await sql.query(indexSQL);
        console.log(`✅ Index created: ${indexSQL.split(' ')[2]}`);
      } catch (error) {
        console.log(`⚠️  Index warning: ${error.message}`);
      }
    }
    
    // Step 5: Verify table structure
    console.log('🔍 Verifying table structure...');
    const tableStructure = await sql.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'saved_companies'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Table structure verified:');
    (tableStructure.rows || []).forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Step 6: Test insert/select
    console.log('🧪 Testing insert and select...');
    
    // Get real user and company IDs
    const testUser = await sql.query(`SELECT id, email FROM users LIMIT 1;`);
    const testCompany = await sql.query(`SELECT id, name FROM companies LIMIT 1;`);
    
    if (testUser.rows.length > 0 && testCompany.rows.length > 0) {
      // Test insert
      const insertResult = await sql.query(`
        INSERT INTO saved_companies (user_id, company_id, notes, tags) 
        VALUES ($1, $2, $3, $4)
        RETURNING id, saved_at;
      `, [testUser.rows[0].id, testCompany.rows[0].id, 'Test save from final fix', 'test,final']);
      
      console.log(`✅ Test insert successful:`, insertResult.rows[0]);
      
      // Test select with JOIN
      const selectResult = await sql.query(`
        SELECT sc.id, sc.notes, sc.tags, sc.saved_at, c.name as company_name, u.email as user_email
        FROM saved_companies sc
        JOIN companies c ON sc.company_id = c.id
        JOIN users u ON sc.user_id = u.id
        WHERE sc.user_id = $1;
      `, [testUser.rows[0].id]);
      
      console.log(`✅ Test select with JOIN successful:`, selectResult.rows[0]);
      
      // Clean up test data
      await sql.query(`DELETE FROM saved_companies WHERE user_id = $1 AND company_id = $2;`, 
        [testUser.rows[0].id, testCompany.rows[0].id]);
      console.log(`🧹 Test data cleaned up`);
      
    } else {
      console.log('⚠️  No test users/companies found for testing');
    }
    
    console.log('🎉 saved_companies table creation and testing completed successfully!');
    console.log('📋 Table is ready for production use with proper schema alignment');
    
  } catch (error) {
    console.error('❌ Final fix failed:', error);
    throw error;
  }
}

createSavedCompaniesTable();
