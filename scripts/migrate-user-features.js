import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runUserFeaturesMigration() {
  console.log('🚀 Starting user features database migration...');
  
  try {
    // Use the database URL from existing scripts
    const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
    
    console.log('🔗 Using database connection...');
    
    // Initialize database connection
    const sql = neon(DATABASE_URL);
    
    console.log('✅ Database connection established');
    
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-user-features-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    
    // Execute individual SQL statements directly
    console.log('⚙️  Creating saved_companies table...');
    
    try {
      const createSavedCompaniesResult = await sql.query(`
        CREATE TABLE IF NOT EXISTS saved_companies (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          saved_at TIMESTAMP DEFAULT NOW(),
          notes TEXT,
          tags VARCHAR(500),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, company_id)
        );
      `);
      console.log('✅ saved_companies table created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ saved_companies table already exists');
      } else {
        throw error;
      }
    }
    
    console.log('⚙️  Creating user_activity table...');
    
    try {
      const createUserActivityResult = await sql.query(`
        CREATE TABLE IF NOT EXISTS user_activity (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          search_term VARCHAR(255),
          ip_address VARCHAR(45),
          user_agent TEXT,
          timestamp TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ user_activity table created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ user_activity table already exists');
      } else {
        throw error;
      }
    }
    
    // Create indexes
    console.log('⚙️  Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS saved_companies_user_idx ON saved_companies(user_id)',
      'CREATE INDEX IF NOT EXISTS saved_companies_company_idx ON saved_companies(company_id)',
      'CREATE INDEX IF NOT EXISTS saved_companies_user_company_idx ON saved_companies(user_id, company_id)',
      'CREATE INDEX IF NOT EXISTS saved_companies_saved_at_idx ON saved_companies(saved_at DESC)',
      'CREATE INDEX IF NOT EXISTS user_activity_user_idx ON user_activity(user_id)',
      'CREATE INDEX IF NOT EXISTS user_activity_type_idx ON user_activity(activity_type)',
      'CREATE INDEX IF NOT EXISTS user_activity_timestamp_idx ON user_activity(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS user_activity_company_idx ON user_activity(company_id)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await sql.query(indexSQL + ';');
        console.log(`✅ Index created: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`✅ Index already exists: ${indexSQL.split(' ')[5]}`);
        } else {
          console.log(`⚠️  Index creation warning: ${error.message}`);
        }
      }
    }
    
    console.log('✅ User features migration completed successfully');
    
    // Test the tables by checking if they exist and getting column info
    const tableInfo = await sql.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name IN ('saved_companies', 'user_activity')
      ORDER BY table_name, ordinal_position;
    `);
    
    if (tableInfo.rows && tableInfo.rows.length > 0) {
      console.log('✅ User feature tables verified:');
      const tables = {};
      tableInfo.rows.forEach(col => {
        if (!tables[col.table_name]) tables[col.table_name] = [];
        tables[col.table_name].push(`${col.column_name} (${col.data_type})`);
      });
      
      Object.keys(tables).forEach(tableName => {
        console.log(`📋 ${tableName}:`);
        tables[tableName].forEach(col => console.log(`   - ${col}`));
      });
    } else {
      console.log('⚠️  User feature tables verification query returned no results');
      // Try a simple existence check
      try {
        const existsCheck = await sql.query(`SELECT 1 FROM saved_companies LIMIT 1;`);
        console.log('✅ saved_companies table exists and is accessible');
      } catch (error) {
        console.log('❌ saved_companies table verification failed:', error.message);
      }
    }
    
    console.log('🎉 User features migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runUserFeaturesMigration();

export { runUserFeaturesMigration };
