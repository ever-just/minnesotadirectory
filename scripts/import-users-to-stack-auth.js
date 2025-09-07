#!/usr/bin/env node
import fs from 'fs';

// Get Stack Auth config from environment variables directly
const stackAuthConfig = {
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || '',
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || '',
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY || '',
};

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
  if (!stackAuthConfig.secretServerKey || !stackAuthConfig.publishableClientKey || !stackAuthConfig.projectId) {
    console.error('❌ Stack Auth not configured. Missing environment variables.');
    console.error('Required: NEXT_PUBLIC_STACK_PROJECT_ID, NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY, STACK_SECRET_SERVER_KEY');
    process.exit(1);
  }
  
  console.log('✅ Stack Auth configured successfully');
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`[${i+1}/${users.length}] Importing: ${user.email}`);
    
    try {
      const response = await fetch(`https://api.stack-auth.com/api/v1/users`, {
        method: 'POST',
        headers: {
          'x-stack-secret-server-key': stackAuthConfig.secretServerKey,
          'x-stack-publishable-client-key': stackAuthConfig.publishableClientKey,
          'x-stack-project-id': stackAuthConfig.projectId,
          'x-stack-access-type': 'server',
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
