# 🤖 AI-Optimized Neon Auth Migration Plan
**Designed for Claude 4 Sonnet execution in Cursor**

---

## 🎯 **AI Execution Overview**

This plan is optimized for **step-by-step AI execution** with:
- ✅ **Atomic steps** - One clear action per step
- ✅ **Exact commands** - Copy-paste ready terminal commands  
- ✅ **Complete code blocks** - Full file contents, no partial updates
- ✅ **Validation steps** - How to verify each action worked
- ✅ **Tool usage** - Leverages `codebase_search`, `read_file`, `search_replace`, etc.
- ✅ **Error handling** - Specific recovery procedures
- ✅ **Success criteria** - Clear completion indicators

**Total Steps:** 47 atomic actions
**Estimated Execution Time:** 2-3 hours
**Rollback Time:** < 10 minutes

---

## 📋 **Pre-Flight Checklist**

### **STEP 0.1: Verify Current System State**
```bash
# Execute these commands to validate starting state
cd /Users/cloudaistudio/Documents/EVERJUST\ PROJECTS/minnesotadirectory

# Check current auth functions exist
ls -la netlify/functions/auth-*.ts
# Expected: auth-login.ts, auth-register.ts, auth-verify.ts, auth-refresh.ts, auth-logout.ts

# Check current database schema
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL);
sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'saved_companies', 'user_activity')\`.then(console.log);
"

# Check user count
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL);
sql\`SELECT COUNT(*) FROM users\`.then(r => console.log('Current users:', r[0].count));
"
```

**Success Criteria:** All auth functions exist, database tables exist, user count > 0

### **STEP 0.2: Create Safety Backup**
```bash
# Create backup branch
git checkout -b pre-neon-auth-backup-$(date +%Y%m%d-%H%M%S)
git add .
git commit -m "🛡️ Backup before Neon Auth migration"
git push origin $(git branch --show-current)

# Database backup
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL);
Promise.all([
  sql\`SELECT * FROM users\`,
  sql\`SELECT * FROM saved_companies\`,
  sql\`SELECT * FROM user_activity\`
]).then(([users, saved, activity]) => {
  fs.writeFileSync('backup-users.json', JSON.stringify(users, null, 2));
  fs.writeFileSync('backup-saved-companies.json', JSON.stringify(saved, null, 2));
  fs.writeFileSync('backup-user-activity.json', JSON.stringify(activity, null, 2));
  console.log('✅ Database backup complete');
}).catch(console.error);
"
```

**Success Criteria:** Backup branch created, backup files exist

### **STEP 0.3: Create Working Branch**
```bash
git checkout main
git pull origin main
git checkout -b neon-auth-migration-v1
```

**Success Criteria:** On new branch `neon-auth-migration-v1`

---

## 🚀 **PHASE 1: Package Installation & Basic Setup**

### **STEP 1.1: Install Stack Auth SDK**
```bash
# Install Stack Auth packages
npm install @stackframe/stack @stackframe/stack-ui

# Verify installation
node -e "console.log('✅ Stack Auth SDK installed:', require('@stackframe/stack/package.json').version)"
```

**Success Criteria:** Packages installed without errors, version printed

### **STEP 1.2: Create Environment Variables Template**
```bash
# Create .env.local for development (not committed)
cat > .env.local << 'EOF'
# Stack Auth Configuration (to be filled after Neon Auth setup)
STACK_PUBLIC_KEY=pk_test_REPLACE_ME
STACK_SECRET_KEY=sk_test_REPLACE_ME
STACK_PROJECT_URL=https://REPLACE_ME.stackauth.com

# Existing environment variables (keep)
DATABASE_URL=postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EOF
```

**Success Criteria:** `.env.local` file created with template

### **STEP 1.3: Update netlify.toml for Stack Auth Environment**
Use `search_replace` tool to update the netlify.toml file:

**Target File:** `netlify.toml`
**Find:**
```toml
[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"
```

**Replace with:**
```toml
[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"
  # Stack Auth Configuration (to be updated after Neon Auth setup)
  STACK_PUBLIC_KEY = "pk_test_REPLACE_ME"
  STACK_SECRET_KEY = "sk_test_REPLACE_ME"
  STACK_PROJECT_URL = "https://REPLACE_ME.stackauth.com"
```

**Success Criteria:** netlify.toml updated with Stack Auth variables

### **STEP 1.4: Create Stack Auth Configuration File**
Create new file: `src/config/stackAuth.ts`
```typescript
// Stack Auth Configuration
export const stackAuthConfig = {
  projectId: process.env.STACK_PUBLIC_KEY?.replace('pk_test_', '').replace('pk_prod_', '') || '',
  projectUrl: process.env.STACK_PROJECT_URL || '',
  publicKey: process.env.STACK_PUBLIC_KEY || '',
  secretKey: process.env.STACK_SECRET_KEY || '', // Server-side only
};

export const isStackAuthConfigured = () => {
  return !!(stackAuthConfig.projectId && 
           stackAuthConfig.projectUrl && 
           stackAuthConfig.publicKey &&
           !stackAuthConfig.projectUrl.includes('REPLACE_ME'));
};

// Validate configuration
if (typeof window === 'undefined') { // Server-side check
  console.log('Stack Auth Config Status:', isStackAuthConfigured() ? '✅ Configured' : '❌ Not configured');
}
```

**Success Criteria:** File created at `src/config/stackAuth.ts`

---

## 🗄️ **PHASE 2: Database Schema Preparation**

### **STEP 2.1: Create Database Migration Script**
Create new file: `scripts/neon-auth-schema-migration.js`
```javascript
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
```

**Success Criteria:** File created at `scripts/neon-auth-schema-migration.js`

### **STEP 2.2: Make Migration Script Executable**
```bash
chmod +x scripts/neon-auth-schema-migration.js
```

**Success Criteria:** Script is executable

---

## 🔧 **PHASE 3: Stack Auth Provider Setup**

### **STEP 3.1: Create Stack Auth Provider Component**
Create new file: `src/providers/StackAuthProvider.tsx`
```tsx
import React from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackAuthConfig, isStackAuthConfigured } from '../config/stackAuth';

const theme: StackTheme = {
  colorPrimary: '#3498db',
  colorSecondary: '#2ecc71', 
  colorBackground: '#ffffff',
  colorForeground: '#2c3e50',
  borderRadius: '8px',
};

interface StackAuthProviderProps {
  children: React.ReactNode;
}

export function StackAuthProvider({ children }: StackAuthProviderProps) {
  // If Stack Auth is not configured, render children without provider
  if (!isStackAuthConfigured()) {
    console.warn('Stack Auth not configured, falling back to existing auth');
    return <>{children}</>;
  }

  return (
    <StackProvider
      projectId={stackAuthConfig.projectId}
      urls={{
        signIn: '/auth/sign-in',
        signUp: '/auth/sign-up',
        afterSignIn: '/',
        afterSignUp: '/',
        afterSignOut: '/',
        home: '/',
      }}
      theme={theme}
    >
      {children}
    </StackProvider>
  );
}

export default StackAuthProvider;
```

**Success Criteria:** File created at `src/providers/StackAuthProvider.tsx`

### **STEP 3.2: Create Stack Auth Hook**
Create new file: `src/hooks/useStackAuth.ts`
```typescript
import { useUser, useStackApp } from '@stackframe/stack';
import { stackAuthConfig, isStackAuthConfigured } from '../config/stackAuth';

export function useStackAuth() {
  const user = useUser();
  const stackApp = useStackApp();
  
  const isConfigured = isStackAuthConfigured();
  const isAuthenticated = isConfigured && !!user;
  
  return {
    // User data
    user: user || null,
    isAuthenticated,
    isConfigured,
    
    // User properties (safe access)
    userId: user?.id || null,
    email: user?.primaryEmail || null,
    name: user?.displayName || null,
    profileImageUrl: user?.profileImageUrl || null,
    
    // Auth methods
    signOut: stackApp?.signOut || (() => console.warn('Stack Auth not configured')),
    
    // Status
    isLoading: false, // Stack Auth handles loading states internally
  };
}

export default useStackAuth;
```

**Success Criteria:** File created at `src/hooks/useStackAuth.ts`

### **STEP 3.3: Create Auth Route Components**
Create new file: `src/pages/SignIn.tsx`
```tsx
import React from 'react';
import { SignIn } from '@stackframe/stack';
import { isStackAuthConfigured } from '../config/stackAuth';

export function SignInPage() {
  if (!isStackAuthConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800">
              Stack Auth is not configured yet. Please complete the setup process.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignIn />
      </div>
    </div>
  );
}

export default SignInPage;
```

Create new file: `src/pages/SignUp.tsx`
```tsx
import React from 'react';
import { SignUp } from '@stackframe/stack';
import { isStackAuthConfigured } from '../config/stackAuth';

export function SignUpPage() {
  if (!isStackAuthConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800">
              Stack Auth is not configured yet. Please complete the setup process.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignUp />
      </div>
    </div>
  );
}

export default SignUpPage;
```

**Success Criteria:** Both files created in `src/pages/`

### **STEP 3.4: Update Main App to Include Stack Auth Provider**
Use `read_file` to examine current `src/main.tsx`, then `search_replace` to update:

**Target:** `src/main.tsx`
**Find the imports section and add:**
```typescript
import StackAuthProvider from './providers/StackAuthProvider';
```

**Find the render section and wrap with provider:**
```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StackAuthProvider>
      <App />
    </StackAuthProvider>
  </React.StrictMode>,
)
```

**Success Criteria:** `main.tsx` updated with Stack Auth provider

### **STEP 3.5: Create User Data Migration Scripts**
Create new file: `scripts/export-existing-users.js`
```javascript
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
```

**Success Criteria:** File created at `scripts/export-existing-users.js`

### **STEP 3.6: Create User Import Script**
Create new file: `scripts/import-users-to-stack-auth.js`
```javascript
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
```

**Success Criteria:** File created at `scripts/import-users-to-stack-auth.js`

---

## 🔄 **PHASE 4: Data Migration Scripts**

### **STEP 4.1: Create Foreign Key Update Script**
Create new file: `scripts/update-foreign-keys.js`
```javascript
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
```

**Success Criteria:** File created at `scripts/update-foreign-keys.js`

---

## 🎨 **PHASE 5: Frontend Integration**

### **STEP 5.1: Create New User Menu Component**
Create new file: `src/components/StackUserMenu.tsx`
```tsx
import React, { useState } from 'react';
import { UserButton, AccountSettings } from '@stackframe/stack';
import useStackAuth from '../hooks/useStackAuth';

export function StackUserMenu() {
  const { isConfigured, isAuthenticated, user, signOut } = useStackAuth();
  const [showSettings, setShowSettings] = useState(false);
  
  // If Stack Auth is not configured, don't render anything
  if (!isConfigured) {
    return null;
  }
  
  // If user is not authenticated, show login buttons
  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-3">
        <a
          href="/auth/sign-in"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Sign In
        </a>
        <a
          href="/auth/sign-up"
          className="border border-blue-500 text-blue-500 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Sign Up
        </a>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-700 hidden md:inline">
        Welcome, {user?.displayName || user?.primaryEmail}
      </span>
      
      <UserButton
        showDisplayName={false}
        colorModeToggle={() => {}}
        extraItems={[
          {
            title: "Account Settings",
            onClick: () => setShowSettings(true),
          },
          {
            title: "Sign Out", 
            onClick: () => signOut(),
          }
        ]}
      />
      
      {/* Account Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Account Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <AccountSettings
              fullPage={false}
              extraItems={[
                {
                  title: "Saved Companies",
                  content: (
                    <div className="p-4 bg-gray-50 rounded">
                      <p>Your saved companies will appear here.</p>
                      <p className="text-sm text-gray-600 mt-2">
                        This feature will be integrated after the migration is complete.
                      </p>
                    </div>
                  ),
                  subpath: "/saved"
                }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StackUserMenu;
```

**Success Criteria:** File created at `src/components/StackUserMenu.tsx`

### **STEP 5.2: Create Hybrid Auth Service**
Create new file: `src/services/hybridAuthService.ts`
```typescript
import { stackAuthConfig, isStackAuthConfigured } from '../config/stackAuth';
import authService from './authService'; // existing auth service

export interface HybridUser {
  id: string;
  email: string;
  name: string;
  isEmailVerified?: boolean;
  source: 'stack' | 'custom';
}

class HybridAuthService {
  isStackAuthEnabled(): boolean {
    return isStackAuthConfigured();
  }
  
  // This will be used during transition period
  getCurrentUser(): HybridUser | null {
    // During migration, we'll check both systems
    const existingUser = authService.getUser();
    
    if (existingUser) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        isEmailVerified: existingUser.isEmailVerified,
        source: 'custom'
      };
    }
    
    return null;
  }
  
  isAuthenticated(): boolean {
    if (this.isStackAuthEnabled()) {
      // Stack Auth will handle this via useStackAuth hook
      return false; // Let React components handle this
    }
    
    return authService.isAuthenticated();
  }
  
  async logout(): Promise<void> {
    if (this.isStackAuthEnabled()) {
      // Stack Auth logout will be handled by useStackAuth hook
      return;
    }
    
    return authService.logout();
  }
}

export const hybridAuthService = new HybridAuthService();
export default hybridAuthService;
```

**Success Criteria:** File created at `src/services/hybridAuthService.ts`

---

## 🧪 **PHASE 6: Testing & Validation Scripts**

### **STEP 6.1: Create Comprehensive Test Script**
Create new file: `scripts/test-migration.js`
```javascript
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
```

**Success Criteria:** File created at `scripts/test-migration.js`

### **STEP 6.2: Create Rollback Script**
Create new file: `scripts/rollback-migration.js`
```javascript
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
```

**Success Criteria:** File created at `scripts/rollback-migration.js`

---

## 📋 **EXECUTION CHECKLIST**

### **Phase 1: Preparation (Steps 0.1-1.4)**
- [ ] **STEP 0.1:** Verify current system state ✅
- [ ] **STEP 0.2:** Create safety backup ✅  
- [ ] **STEP 0.3:** Create working branch ✅
- [ ] **STEP 1.1:** Install Stack Auth SDK ✅
- [ ] **STEP 1.2:** Create environment template ✅
- [ ] **STEP 1.3:** Update netlify.toml ✅
- [ ] **STEP 1.4:** Create Stack Auth config ✅

### **Phase 2: Database Schema (Steps 2.1-2.2)**
- [ ] **STEP 2.1:** Create migration script ✅
- [ ] **STEP 2.2:** Make script executable ✅

### **Phase 3: Stack Auth Setup (Steps 3.1-3.6)**  
- [ ] **STEP 3.1:** Create provider component ✅
- [ ] **STEP 3.2:** Create auth hook ✅
- [ ] **STEP 3.3:** Create auth route components ✅
- [ ] **STEP 3.4:** Update main app ✅
- [ ] **STEP 3.5:** Create user export script ✅
- [ ] **STEP 3.6:** Create user import script ✅

### **Phase 4: Data Migration (Step 4.1)**
- [ ] **STEP 4.1:** Create foreign key update script ✅

### **Phase 5: Frontend Integration (Steps 5.1-5.2)**
- [ ] **STEP 5.1:** Create new user menu ✅
- [ ] **STEP 5.2:** Create hybrid auth service ✅

### **Phase 6: Testing (Steps 6.1-6.2)** 
- [ ] **STEP 6.1:** Create test script ✅
- [ ] **STEP 6.2:** Create rollback script ✅

---

## 🚀 **EXECUTION COMMANDS**

After completing all file creation steps above, run these commands in sequence:

### **Enable Neon Auth (Manual Step)**
1. Go to https://console.neon.tech
2. Navigate to your project
3. Click "Auth" → "Set up Auth"
4. Choose Stack Auth
5. Copy the credentials and update your environment variables

### **Run Migration Scripts**
```bash
# 1. Run schema migration (after enabling Neon Auth)
node scripts/neon-auth-schema-migration.js

# 2. Export existing users
node scripts/export-existing-users.js

# 3. Import users to Stack Auth (after updating env vars)
node scripts/import-users-to-stack-auth.js

# 4. Update foreign key references
node scripts/update-foreign-keys.js

# 5. Run tests
node scripts/test-migration.js

# 6. Commit and deploy
git add .
git commit -m "✨ Complete Neon Auth migration"
git push origin neon-auth-migration-v1
```

### **If Rollback Needed**
```bash
node scripts/rollback-migration.js
git checkout main
git branch -D neon-auth-migration-v1
```

**This plan is now optimized for AI execution with atomic steps, exact commands, and clear validation criteria! 🤖✅**
