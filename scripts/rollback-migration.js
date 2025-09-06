#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
const sql = neon(DATABASE_URL);

async function rollbackMigration() {
  console.log('🔄 Rolling back Neon Auth migration...\n');
  
  try {
    // Step 1: Remove stack_user_id columns
    console.log('1. Removing stack_user_id columns...');
    
    await sql`ALTER TABLE saved_companies DROP COLUMN IF EXISTS stack_user_id`;
    await sql`ALTER TABLE user_activity DROP COLUMN IF EXISTS stack_user_id`;
    
    console.log('✅ Columns removed');
    
    // Step 2: Drop indexes
    console.log('2. Removing indexes...');
    
    await sql`DROP INDEX IF EXISTS saved_companies_stack_user_idx`;
    await sql`DROP INDEX IF EXISTS user_activity_stack_user_idx`;
    
    console.log('✅ Indexes removed');
    
    // Step 3: Clean up migration files
    console.log('3. Cleaning up migration files...');
    
    const filesToRemove = [
      'exported-users.json',
      'user-import-results.json',
      'user-mapping-template.json',
      'backup-users.json',
      'backup-saved-companies.json', 
      'backup-user-activity.json'
    ];
    
    for (const file of filesToRemove) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`  ✅ Removed: ${file}`);
      }
    }
    
    console.log('\n✅ Rollback completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Remove Stack Auth components from your app');
    console.log('2. Revert environment variables');
    console.log('3. Test your existing auth system');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    console.log('\nManual cleanup required. Please:');
    console.log('1. Check database schema manually');
    console.log('2. Remove migration files manually'); 
    console.log('3. Revert code changes');
    process.exit(1);
  }
}

rollbackMigration();
