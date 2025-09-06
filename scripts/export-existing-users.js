#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
const sql = neon(DATABASE_URL);

async function exportUsers() {
  console.log('📤 Exporting existing users...');
  
  try {
    const users = await sql`
      SELECT 
        id,
        email,
        name,
        is_email_verified as "isEmailVerified",
        created_at as "createdAt",
        last_login_at as "lastLoginAt"
      FROM users 
      ORDER BY created_at ASC
    `;
    
    console.log(`✅ Found ${users.length} users to export`);
    
    // Save export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      userCount: users.length,
      users: users
    };
    
    fs.writeFileSync('exported-users.json', JSON.stringify(exportData, null, 2));
    
    // Create mapping template
    const mappingTemplate = users.map(user => ({
      originalId: user.id,
      email: user.email,
      name: user.name,
      stackId: null, // To be filled during import
      imported: false,
      error: null
    }));
    
    fs.writeFileSync('user-mapping-template.json', JSON.stringify(mappingTemplate, null, 2));
    
    console.log('✅ Export completed:');
    console.log('  - exported-users.json');
    console.log('  - user-mapping-template.json');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportUsers();
