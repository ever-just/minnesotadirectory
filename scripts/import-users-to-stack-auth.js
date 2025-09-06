#!/usr/bin/env node
import fs from 'fs';
import { stackAuthConfig } from '../src/config/stackAuth.js';

async function importUsersToStackAuth() {
  console.log('📥 Importing users to Stack Auth...');
  
  if (!fs.existsSync('exported-users.json')) {
    console.error('❌ exported-users.json not found. Run export script first.');
    process.exit(1);
  }
  
  const exportData = JSON.parse(fs.readFileSync('exported-users.json', 'utf8'));
  const users = exportData.users;
  const results = [];
  
  console.log(`Found ${users.length} users to import`);
  
  // Check if Stack Auth is configured
  if (!stackAuthConfig.secretKey || stackAuthConfig.secretKey.includes('REPLACE_ME')) {
    console.error('❌ Stack Auth not configured. Update environment variables first.');
    process.exit(1);
  }
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`[${i+1}/${users.length}] Importing: ${user.email}`);
    
    try {
      const response = await fetch(`${stackAuthConfig.projectUrl}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stackAuthConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primary_email: user.email,
          primary_email_verified: user.isEmailVerified || false,
          display_name: user.name,
          // Note: Users will need to reset passwords for security
          password: null,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const stackUser = await response.json();
      
      results.push({
        originalId: user.id,
        stackId: stackUser.id,
        email: user.email,
        name: user.name,
        imported: true,
        error: null,
        importedAt: new Date().toISOString()
      });
      
      console.log(`  ✅ Success: ${stackUser.id}`);
      
      // Rate limiting: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      
      results.push({
        originalId: user.id,
        stackId: null,
        email: user.email,
        name: user.name,
        imported: false,
        error: error.message,
        importedAt: new Date().toISOString()
      });
    }
  }
  
  // Save results
  fs.writeFileSync('user-import-results.json', JSON.stringify({
    importedAt: new Date().toISOString(),
    totalUsers: users.length,
    successfulImports: results.filter(r => r.imported).length,
    failedImports: results.filter(r => !r.imported).length,
    results: results
  }, null, 2));
  
  const successful = results.filter(r => r.imported).length;
  const failed = results.filter(r => !r.imported).length;
  
  console.log('\n📊 Import Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Results saved to: user-import-results.json`);
  
  if (failed > 0) {
    console.log('\n❌ Some imports failed. Check user-import-results.json for details.');
  }
}

importUsersToStackAuth();
