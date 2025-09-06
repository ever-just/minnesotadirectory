#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
const sql = neon(DATABASE_URL);

async function updateForeignKeys() {
  console.log('🔗 Updating foreign key references...');
  
  if (!fs.existsSync('user-import-results.json')) {
    console.error('❌ user-import-results.json not found. Run import script first.');
    process.exit(1);
  }
  
  const importResults = JSON.parse(fs.readFileSync('user-import-results.json', 'utf8'));
  const successfulImports = importResults.results.filter(r => r.imported);
  
  console.log(`Updating references for ${successfulImports.length} imported users...`);
  
  let updatedSavedCompanies = 0;
  let updatedUserActivity = 0;
  
  try {
    for (const userMap of successfulImports) {
      console.log(`Updating references for: ${userMap.email}`);
      
      // Update saved_companies
      const savedResult = await sql`
        UPDATE saved_companies 
        SET stack_user_id = ${userMap.stackId}
        WHERE user_id = ${userMap.originalId}
      `;
      updatedSavedCompanies += savedResult.count || 0;
      
      // Update user_activity
      const activityResult = await sql`
        UPDATE user_activity 
        SET stack_user_id = ${userMap.stackId}
        WHERE user_id = ${userMap.originalId}
      `;
      updatedUserActivity += activityResult.count || 0;
    }
    
    console.log('\n✅ Foreign key updates completed:');
    console.log(`  📊 Updated ${updatedSavedCompanies} saved_companies records`);
    console.log(`  📊 Updated ${updatedUserActivity} user_activity records`);
    
    // Verify updates
    console.log('\n🔍 Verifying updates...');
    
    const savedWithStack = await sql`
      SELECT COUNT(*) FROM saved_companies WHERE stack_user_id IS NOT NULL
    `;
    
    const activityWithStack = await sql`
      SELECT COUNT(*) FROM user_activity WHERE stack_user_id IS NOT NULL  
    `;
    
    console.log(`✅ Verification complete:`);
    console.log(`  📊 ${savedWithStack[0].count} saved_companies have stack_user_id`);
    console.log(`  📊 ${activityWithStack[0].count} user_activity have stack_user_id`);
    
  } catch (error) {
    console.error('❌ Foreign key update failed:', error);
    process.exit(1);
  }
}

updateForeignKeys();
