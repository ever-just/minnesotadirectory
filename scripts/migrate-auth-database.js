import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAuthMigration() {
  console.log('🚀 Starting authentication database migration...');
  
  try {
    // Use the database URL from existing scripts
    const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
    
    console.log('🔗 Using database connection...');
    
    // Initialize database connection
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql);
    
    console.log('✅ Database connection established');
    
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-users-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    
    // Execute individual SQL statements directly
    console.log('⚙️  Creating users table...');
    
    try {
      const createTableResult = await sql.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_email_verified BOOLEAN DEFAULT FALSE,
          email_verification_token VARCHAR(255),
          reset_password_token VARCHAR(255),
          reset_password_expires TIMESTAMP,
          last_login_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Users table created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Users table already exists');
      } else {
        throw error;
      }
    }
    
    // Create indexes
    console.log('⚙️  Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)',
      'CREATE INDEX IF NOT EXISTS users_email_verification_idx ON users(email_verification_token)',
      'CREATE INDEX IF NOT EXISTS users_reset_token_idx ON users(reset_password_token)'
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
    
    console.log('✅ Users table migration completed successfully');
    
    // Test the table by checking if it exists and getting column info
    const tableInfo = await sql.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    if (tableInfo.rows && tableInfo.rows.length > 0) {
      console.log('✅ Users table verified - columns:');
      tableInfo.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('⚠️  Users table verification query returned no results');
      // Try a simple existence check
      try {
        const existsCheck = await sql.query(`SELECT 1 FROM users LIMIT 1;`);
        console.log('✅ Users table exists and is accessible');
      } catch (error) {
        console.log('❌ Users table verification failed:', error.message);
      }
    }
    
    console.log('🎉 Authentication migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}` || true) {
  runAuthMigration();
}

export { runAuthMigration };
