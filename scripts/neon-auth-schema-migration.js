#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
const sql = neon(DATABASE_URL);

async function runSchemaMigration() {
  console.log('🗄️ Starting Neon Auth schema migration...');
  
  try {
    // Step 1: Check if neon_auth schema exists
    console.log('1. Checking for neon_auth schema...');
    const schemas = await sql`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'neon_auth'
    `;
    
    if (schemas.length === 0) {
      console.log('❌ neon_auth schema not found. You must enable Neon Auth in the console first.');
      process.exit(1);
    }
    console.log('✅ neon_auth schema found');
    
    // Step 2: Check users_sync table structure
    console.log('2. Examining users_sync table...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'neon_auth' AND table_name = 'users_sync'
      ORDER BY ordinal_position
    `;
    console.log('✅ users_sync table structure:', columns);
    
    // Step 3: Add stack_user_id columns to existing tables
    console.log('3. Adding stack_user_id columns...');
    
    await sql`
      ALTER TABLE saved_companies 
      ADD COLUMN IF NOT EXISTS stack_user_id TEXT
    `;
    console.log('✅ Added stack_user_id to saved_companies');
    
    await sql`
      ALTER TABLE user_activity 
      ADD COLUMN IF NOT EXISTS stack_user_id TEXT
    `;
    console.log('✅ Added stack_user_id to user_activity');
    
    // Step 4: Create indexes for performance
    console.log('4. Creating indexes...');
    
    await sql`
      CREATE INDEX IF NOT EXISTS saved_companies_stack_user_idx 
      ON saved_companies(stack_user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS user_activity_stack_user_idx 
      ON user_activity(stack_user_id)
    `;
    console.log('✅ Indexes created');
    
    // Step 5: Verify migration
    console.log('5. Verifying migration...');
    const savedCompaniesSchema = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'saved_companies' AND column_name = 'stack_user_id'
    `;
    
    const userActivitySchema = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_activity' AND column_name = 'stack_user_id'
    `;
    
    if (savedCompaniesSchema.length === 0 || userActivitySchema.length === 0) {
      throw new Error('Schema migration verification failed');
    }
    
    console.log('✅ Schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    process.exit(1);
  }
}

runSchemaMigration();
