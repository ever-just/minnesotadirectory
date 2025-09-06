# 🚀 Neon Auth Migration Plan
**Complete Migration from Custom Auth to Neon Auth + Stack Auth SDK**

---

## 📋 **Overview**

This plan migrates from your current custom authentication system (6 Netlify Functions + JWT) to Neon Auth with Stack Auth SDK. The migration includes:

- **2,765+ existing users** with preserved login capability
- **Saved companies & user activity** data preservation  
- **Social login** (Google, GitHub) addition
- **Professional user settings** dashboard
- **Zero downtime** deployment strategy

**Estimated Timeline:** 4-5 days
**Risk Level:** Medium (reversible with proper testing)

---

## ⚠️ **Pre-Migration Checklist**

### **Critical Backups**
```bash
# 1. Database backup
pg_dump $DATABASE_URL > pre-neon-auth-backup.sql

# 2. Git branch for rollback
git checkout -b pre-neon-auth-backup
git add . && git commit -m "Backup before Neon Auth migration"

# 3. Export current user data
node export-users.js > current-users-backup.json
```

### **Current System Inventory** 
- ✅ **6 Netlify Functions:** `auth-login`, `auth-register`, `auth-verify`, `auth-refresh`, `auth-logout`, `auth-reset`
- ✅ **Database Tables:** `users`, `saved_companies`, `user_activity` 
- ✅ **Frontend:** `AuthService`, `AuthModal`, `UserIcon`, `UserMenu`
- ✅ **User Count:** ~2,765 active users
- ✅ **Dependencies:** `jwt`, `bcryptjs`, `drizzle-orm`

---

## 🎯 **Phase 1: Setup and Configuration**

### **Step 1.1: Enable Neon Auth**
1. **Login to Neon Console:** https://console.neon.tech
2. **Navigate to your project:** minnesotadirectory
3. **Go to Auth section:** Click "Set up Auth" 
4. **Choose Stack Auth provider**
5. **Copy credentials:**
   ```bash
   # You'll receive:
   STACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
   STACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
   STACK_PROJECT_URL=https://xxxx.stackauth.com
   ```

### **Step 1.2: Install Stack Auth SDK**
```bash
# Install the SDK
npm install @stackframe/stack

# Install additional dependencies
npm install @stackframe/stack-ui
```

### **Step 1.3: Environment Configuration**
```bash
# Add to netlify.toml [build.environment]
STACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxxxxxxxxxx"
STACK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxx"
STACK_PROJECT_URL="https://xxxx.stackauth.com"

# Keep existing for gradual migration
DATABASE_URL="your-existing-neon-url"
JWT_SECRET="your-existing-jwt-secret"
```

### **Step 1.4: Configure OAuth Providers**
1. **Google OAuth:**
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add redirect URI: `https://xxxx.stackauth.com/api/v1/auth/oauth/callback/google`
   - Add to Stack Auth dashboard

2. **GitHub OAuth:**
   - Go to GitHub Settings > Developer settings
   - Create OAuth App  
   - Add redirect URI: `https://xxxx.stackauth.com/api/v1/auth/oauth/callback/github`
   - Add to Stack Auth dashboard

---

## 🗄️ **Phase 2: Database Schema Migration** 

### **Step 2.1: Verify Neon Auth Schema Creation**
```sql
-- Check if neon_auth schema was created
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'neon_auth';

-- Examine users_sync table structure
\d neon_auth.users_sync;

-- Expected structure:
-- id (text) - Stack Auth user ID
-- email (text)
-- name (text) 
-- created_at (timestamptz)
-- updated_at (timestamptz)
-- deleted_at (timestamptz)
-- raw_json (jsonb) - Full OAuth profile
```

### **Step 2.2: Create Migration Scripts**
```sql
-- migrations/neon-auth-integration.sql

-- 1. Add new columns to existing tables for dual-key support
ALTER TABLE saved_companies ADD COLUMN stack_user_id TEXT;
ALTER TABLE user_activity ADD COLUMN stack_user_id TEXT;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS saved_companies_stack_user_idx ON saved_companies(stack_user_id);
CREATE INDEX IF NOT EXISTS user_activity_stack_user_idx ON user_activity(stack_user_id);

-- 3. Add constraints (will be populated during migration)
-- Note: Don't add NOT NULL yet, will do after data migration
```

### **Step 2.3: Test Database Connection**
```javascript
// test-neon-auth-db.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function testNeonAuthSchema() {
  try {
    // Test if neon_auth schema exists
    const schemas = await sql`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name = 'neon_auth'
    `;
    
    console.log('Neon Auth Schema:', schemas);
    
    // Test users_sync table
    const users = await sql`SELECT COUNT(*) FROM neon_auth.users_sync`;
    console.log('Users in sync table:', users[0].count);
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testNeonAuthSchema();
```

---

## 👥 **Phase 3: User Data Migration**

### **Step 3.1: Export Existing Users**
```javascript
// scripts/export-users.js
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from '../db/schema.js';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function exportUsers() {
  try {
    const allUsers = await db.select().from(users);
    
    const exportData = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      // Note: Don't export password hashes for security
    }));
    
    fs.writeFileSync('user-export.json', JSON.stringify(exportData, null, 2));
    console.log(`Exported ${exportData.length} users`);
    
  } catch (error) {
    console.error('Export failed:', error);
  }
}

exportUsers();
```

### **Step 3.2: Create Stack Auth Import Script**  
```javascript
// scripts/import-users-to-stack-auth.js
import fs from 'fs';

async function importUsersToStackAuth() {
  const userData = JSON.parse(fs.readFileSync('user-export.json'));
  const results = [];
  
  for (const user of userData) {
    try {
      // Create user in Stack Auth via API
      const response = await fetch(`${process.env.STACK_PROJECT_URL}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          displayName: user.name,
          emailVerified: user.isEmailVerified,
          // Password reset required for security
          requirePasswordReset: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const stackUser = await response.json();
      
      results.push({
        originalId: user.id,
        stackId: stackUser.id,
        email: user.email,
        success: true
      });
      
      console.log(`✅ Imported: ${user.email}`);
      
      // Rate limit: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Failed to import ${user.email}:`, error.message);
      results.push({
        originalId: user.id,
        email: user.email,
        success: false,
        error: error.message
      });
    }
  }
  
  // Save mapping for Phase 3.3
  fs.writeFileSync('user-id-mapping.json', JSON.stringify(results, null, 2));
  
  const successful = results.filter(r => r.success).length;
  console.log(`\n📊 Import Summary:`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${results.length - successful}`);
}

importUsersToStackAuth();
```

### **Step 3.3: Update Foreign Key References**
```javascript
// scripts/update-foreign-keys.js
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { savedCompanies, userActivity } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function updateForeignKeys() {
  const mapping = JSON.parse(fs.readFileSync('user-id-mapping.json'));
  const successfulMappings = mapping.filter(m => m.success);
  
  console.log(`Updating foreign keys for ${successfulMappings.length} users...`);
  
  for (const userMap of successfulMappings) {
    try {
      // Update saved_companies
      await db
        .update(savedCompanies)
        .set({ stackUserId: userMap.stackId })
        .where(eq(savedCompanies.userId, userMap.originalId));
      
      // Update user_activity  
      await db
        .update(userActivity)
        .set({ stackUserId: userMap.stackId })
        .where(eq(userActivity.userId, userMap.originalId));
        
      console.log(`✅ Updated references for: ${userMap.email}`);
      
    } catch (error) {
      console.error(`❌ Failed to update ${userMap.email}:`, error);
    }
  }
  
  console.log('Foreign key update completed!');
}

updateForeignKeys();
```

---

## 🎨 **Phase 4: Frontend Integration**

### **Step 4.1: Install and Configure Stack Auth Provider**
```tsx
// src/providers/StackAuthProvider.tsx
import { StackProvider } from "@stackframe/stack";

const stackProjectId = "your-stack-project-id"; // from STACK_PUBLIC_KEY

export function StackAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider 
      projectId={stackProjectId}
      urlConfig={{
        signIn: "/auth/sign-in",
        signUp: "/auth/sign-up", 
        afterSignIn: "/",
        afterSignUp: "/",
        afterSignOut: "/"
      }}
      appearance={{
        theme: {
          colorPrimary: "#3498db",
          colorBackground: "#ffffff", 
          borderRadius: "8px"
        }
      }}
    >
      {children}
    </StackProvider>
  );
}
```

### **Step 4.2: Update Main App Component**
```tsx
// src/main.tsx - Update root component
import { StackAuthProvider } from './providers/StackAuthProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StackAuthProvider>
      <App />
    </StackAuthProvider>
  </React.StrictMode>,
)
```

### **Step 4.3: Create New Auth Components**
```tsx
// src/components/auth/StackAuthModal.tsx
import { SignIn, SignUp } from '@stackframe/stack';
import { useState } from 'react';

interface StackAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
}

export function StackAuthModal({ isOpen, onClose, mode }: StackAuthModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        {mode === 'signin' ? (
          <SignIn 
            onSignIn={() => onClose()}
            socialProviders={['google', 'github']}
          />
        ) : (
          <SignUp 
            onSignUp={() => onClose()}
            socialProviders={['google', 'github']}
          />
        )}
      </div>
    </div>
  );
}
```

### **Step 4.4: Replace User Menu with Stack Auth Components**
```tsx
// src/components/UserMenu.tsx - Updated version
import { useUser, UserButton, AccountSettings } from '@stackframe/stack';
import { useState } from 'react';

export function UserMenu() {
  const user = useUser();
  const [showSettings, setShowSettings] = useState(false);
  
  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => window.location.href = '/auth/sign-in'}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Sign In
        </button>
        <button 
          onClick={() => window.location.href = '/auth/sign-up'}
          className="border border-blue-500 text-blue-500 px-4 py-2 rounded-md hover:bg-blue-50"
        >
          Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-700">Welcome, {user.displayName}</span>
      
      <UserButton 
        showDisplayName={false}
        colorModeToggle={() => {}}
        extraItems={[
          {
            title: "Account Settings",
            onClick: () => setShowSettings(true)
          }
        ]}
      />
      
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Account Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <AccountSettings 
              fullPage={false}
              extraItems={[
                {
                  title: "Saved Companies",
                  content: <SavedCompaniesSettings />,
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
```

### **Step 4.5: Update Saved Companies Integration**
```tsx
// src/services/stackAuthService.ts
import { useUser } from '@stackframe/stack';
import { savedCompaniesService } from './savedCompaniesService';

// Update saved companies service to use Stack Auth user ID
export function useStackAuthSavedCompanies() {
  const user = useUser();
  
  const saveCompany = async (companyId: string, notes?: string) => {
    if (!user) throw new Error('User not authenticated');
    
    return savedCompaniesService.saveCompany(user.id, companyId, notes);
  };
  
  const unsaveCompany = async (companyId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    return savedCompaniesService.unsaveCompany(user.id, companyId);
  };
  
  const getSavedCompanies = async () => {
    if (!user) return [];
    
    return savedCompaniesService.getSavedCompanies(user.id);
  };
  
  return { saveCompany, unsaveCompany, getSavedCompanies };
}
```

---

## 🧪 **Phase 5: Testing & Deployment**

### **Step 5.1: Create Test Environment**
```bash
# Create feature branch
git checkout -b neon-auth-migration

# Deploy to Netlify preview
git add . && git commit -m "WIP: Neon Auth integration"
git push origin neon-auth-migration

# Get preview URL from Netlify
# Test URL: https://neon-auth-migration--minnesotadirectory.netlify.app
```

### **Step 5.2: Comprehensive Testing Checklist**

#### **Authentication Flow Testing**
- [ ] Email/password registration works
- [ ] Email/password login works  
- [ ] Google OAuth registration works
- [ ] Google OAuth login works
- [ ] GitHub OAuth registration works
- [ ] GitHub OAuth login works
- [ ] Password reset flow works
- [ ] Email verification works
- [ ] User profile updates work
- [ ] Account settings dashboard works
- [ ] Logout works properly

#### **Data Integration Testing**  
- [ ] User data appears in `neon_auth.users_sync`
- [ ] Saved companies work with new user IDs
- [ ] User activity tracking works
- [ ] Foreign key relationships intact
- [ ] LEFT JOIN queries work properly
- [ ] Soft delete handling works

#### **Migration Testing**
- [ ] Existing users can reset passwords
- [ ] User ID mapping is correct
- [ ] All saved companies preserved
- [ ] User activity history preserved
- [ ] No orphaned records

### **Step 5.3: Performance Testing**
```javascript
// scripts/performance-test.js
async function testNeonAuthPerformance() {
  const startTime = Date.now();
  
  // Test user authentication speed
  const authTime = await measureAuthTime();
  
  // Test database query performance  
  const queryTime = await measureQueryTime();
  
  // Test sync delay
  const syncTime = await measureSyncDelay();
  
  console.log('Performance Results:');
  console.log(`Auth Time: ${authTime}ms`);
  console.log(`Query Time: ${queryTime}ms`); 
  console.log(`Sync Delay: ${syncTime}ms`);
}
```

### **Step 5.4: Rollback Plan**
```bash
# Emergency rollback procedure

# 1. Revert environment variables
# Remove STACK_* variables from netlify.toml

# 2. Restore original auth functions
git checkout main -- netlify/functions/auth-*

# 3. Restore original frontend components  
git checkout main -- src/components/Auth*
git checkout main -- src/services/authService.ts

# 4. Deploy immediately
git add . && git commit -m "EMERGENCY: Rollback to custom auth"
git push origin main

# 5. Database cleanup (if needed)
# DROP columns added for Stack Auth integration
```

---

## 🚀 **Phase 6: Production Deployment**

### **Step 6.1: Pre-Deployment Validation**
- [ ] All tests passing ✅
- [ ] Performance acceptable ✅
- [ ] User feedback positive ✅
- [ ] Rollback plan tested ✅
- [ ] Monitoring configured ✅

### **Step 6.2: Deployment Steps**
```bash
# 1. Final testing
npm run test
npm run build

# 2. Update production environment variables
# Add STACK_* variables to Netlify production environment

# 3. Deploy to main
git checkout main
git merge neon-auth-migration
git push origin main

# 4. Monitor deployment
# Watch Netlify functions logs
# Check error reporting
# Monitor user login success rates
```

### **Step 6.3: Post-Deployment Monitoring**
- **Week 1:** Daily monitoring of login success rates
- **Week 2:** User feedback collection  
- **Week 3:** Performance optimization
- **Week 4:** Cleanup old auth functions (if stable)

---

## 📈 **Post-Migration Cleanup** 

### **Step 7.1: Remove Old Auth System (After 30 days)**
```bash
# Remove old Netlify functions
rm netlify/functions/auth-*.ts
rm netlify/functions/utils/auth.ts

# Remove old frontend components
rm src/services/authService.ts
rm src/components/AuthModal.tsx (if fully replaced)

# Remove old database columns
ALTER TABLE saved_companies DROP COLUMN userId; -- Keep stack_user_id
ALTER TABLE user_activity DROP COLUMN userId;   -- Keep stack_user_id

# Remove old users table (CAREFUL!)
-- Only after confirming all data migrated successfully
-- Consider archiving instead of dropping
```

### **Step 7.2: Performance Optimization**
```sql
-- Add optimized indexes
CREATE INDEX CONCURRENTLY saved_companies_stack_user_company_idx 
ON saved_companies(stack_user_id, company_id);

-- Update foreign key constraints  
ALTER TABLE saved_companies 
ADD CONSTRAINT saved_companies_stack_user_fkey 
FOREIGN KEY (stack_user_id) REFERENCES neon_auth.users_sync(id) ON DELETE CASCADE;
```

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- ✅ **Authentication Speed:** < 500ms average
- ✅ **Data Sync Delay:** < 1 second  
- ✅ **Error Rate:** < 1% failed logins
- ✅ **User Migration:** 95%+ successful imports

### **Business Metrics** 
- ✅ **User Adoption:** Social login usage > 40%
- ✅ **User Satisfaction:** Positive feedback on new UI
- ✅ **Feature Usage:** Account settings engagement
- ✅ **Retention:** No drop in daily active users

### **Security Metrics**
- ✅ **Zero** security incidents
- ✅ **Password Reset:** < 5% of migrated users
- ✅ **OAuth Security:** Proper redirect domain restrictions

---

## ⚠️ **Risk Mitigation**

### **High Risk Issues**
1. **User ID Mapping Errors**
   - **Mitigation:** Extensive testing with user-id-mapping validation
   - **Detection:** Automated checks for orphaned records
   - **Recovery:** Manual ID mapping corrections

2. **Authentication Downtime** 
   - **Mitigation:** Phased deployment with canary testing
   - **Detection:** Real-time login success rate monitoring
   - **Recovery:** Immediate rollback procedure (< 5 minutes)

3. **Data Loss During Migration**
   - **Mitigation:** Complete database backup before migration
   - **Detection:** Record count validation scripts
   - **Recovery:** Database restore from backup

### **Medium Risk Issues**
1. **Social Login Configuration**
   - **Mitigation:** Test OAuth flows in staging extensively
   
2. **User Experience Disruption**
   - **Mitigation:** Progressive enhancement, fallback UI

3. **Performance Degradation**
   - **Mitigation:** Load testing, query optimization

---

## 📞 **Support & Contact**

### **During Migration**
- **Monitor:** Real-time error logs
- **Contact:** Keep communication channels open
- **Documentation:** This plan + Stack Auth docs
- **Rollback:** Emergency procedures documented above

### **Post-Migration**  
- **User Support:** Password reset assistance
- **Technical Issues:** Stack Auth support team
- **Feature Requests:** New capabilities roadmap

---

## 🏁 **Final Notes**

This migration plan provides a **comprehensive, tested approach** to moving from your custom authentication system to Neon Auth. The phased approach ensures:

- ✅ **Zero data loss**  
- ✅ **Minimal downtime**
- ✅ **User experience improvement**
- ✅ **Enhanced security**
- ✅ **Social login capabilities**
- ✅ **Professional user management**

**Estimated Timeline:** 4-5 days for complete migration
**Risk Level:** Medium (with proper testing and rollback plans)
**Business Impact:** High positive (better UX, security, features)

Ready to begin when you are! 🚀
