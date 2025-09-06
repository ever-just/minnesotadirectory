#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
const sql = neon(DATABASE_URL);

async function testMigration() {
  console.log('🧪 Testing Neon Auth migration...\n');
  
  const tests = [];
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Check neon_auth schema exists
  try {
    const schemas = await sql`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'neon_auth'
    `;
    if (schemas.length > 0) {
      tests.push({ name: 'neon_auth schema exists', status: '✅ PASS' });
      passedTests++;
    } else {
      tests.push({ name: 'neon_auth schema exists', status: '❌ FAIL' });
      failedTests++;
    }
  } catch (error) {
    tests.push({ name: 'neon_auth schema exists', status: `❌ ERROR: ${error.message}` });
    failedTests++;
  }
  
  // Test 2: Check users_sync table has data
  try {
    const userCount = await sql`SELECT COUNT(*) FROM neon_auth.users_sync`;
    const count = parseInt(userCount[0].count);
    if (count > 0) {
      tests.push({ name: `users_sync table has data (${count} users)`, status: '✅ PASS' });
      passedTests++;
    } else {
      tests.push({ name: 'users_sync table has data', status: '❌ FAIL (0 users)' });
      failedTests++;
    }
  } catch (error) {
    tests.push({ name: 'users_sync table has data', status: `❌ ERROR: ${error.message}` });
    failedTests++;
  }
  
  // Test 3: Check foreign key columns exist
  try {
    const savedCompaniesColumns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'saved_companies' AND column_name = 'stack_user_id'
    `;
    
    if (savedCompaniesColumns.length > 0) {
      tests.push({ name: 'saved_companies.stack_user_id column exists', status: '✅ PASS' });
      passedTests++;
    } else {
      tests.push({ name: 'saved_companies.stack_user_id column exists', status: '❌ FAIL' });
      failedTests++;
    }
  } catch (error) {
    tests.push({ name: 'saved_companies.stack_user_id column exists', status: `❌ ERROR: ${error.message}` });
    failedTests++;
  }
  
  // Test 4: Check foreign key data populated
  try {
    const populatedCount = await sql`
      SELECT COUNT(*) FROM saved_companies WHERE stack_user_id IS NOT NULL
    `;
    const count = parseInt(populatedCount[0].count);
    if (count > 0) {
      tests.push({ name: `saved_companies foreign keys populated (${count} records)`, status: '✅ PASS' });
      passedTests++;
    } else {
      tests.push({ name: 'saved_companies foreign keys populated', status: '⚠️  WARN (0 records)' });
    }
  } catch (error) {
    tests.push({ name: 'saved_companies foreign keys populated', status: `❌ ERROR: ${error.message}` });
    failedTests++;
  }
  
  // Test 5: Check Stack Auth configuration files exist
  const configTests = [
    'src/config/stackAuth.ts',
    'src/providers/StackAuthProvider.tsx',
    'src/hooks/useStackAuth.ts',
    'src/components/StackUserMenu.tsx'
  ];
  
  for (const file of configTests) {
    if (fs.existsSync(file)) {
      tests.push({ name: `${file} exists`, status: '✅ PASS' });
      passedTests++;
    } else {
      tests.push({ name: `${file} exists`, status: '❌ FAIL' });
      failedTests++;
    }
  }
  
  // Test 6: Check migration result files exist
  const migrationFiles = [
    'exported-users.json',
    'user-import-results.json'
  ];
  
  for (const file of migrationFiles) {
    if (fs.existsSync(file)) {
      tests.push({ name: `${file} exists`, status: '✅ PASS' });
      passedTests++;
    } else {
      tests.push({ name: `${file} exists`, status: '❌ FAIL' });
      failedTests++;
    }
  }
  
  // Print results
  console.log('📋 Test Results:\n');
  tests.forEach(test => {
    console.log(`  ${test.status} ${test.name}`);
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Passed: ${passedTests}`);
  console.log(`  ❌ Failed: ${failedTests}`);
  console.log(`  📈 Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Migration appears successful.');
  } else {
    console.log(`\n⚠️  ${failedTests} tests failed. Please review and fix issues before proceeding.`);
  }
  
  return { passed: passedTests, failed: failedTests, total: tests.length };
}

testMigration();
