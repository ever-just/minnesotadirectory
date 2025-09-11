# 🚨 CRITICAL FIX: Map Not Showing + Duplicate Companies

## 🔍 ROOT CAUSES IDENTIFIED

### 1. **Map Shows Nothing**
- **All coordinates were purged** - The purge script deleted ALL geocoded companies, not just out-of-state ones
- **Database authentication failing** - `password authentication failed for user 'neondb_owner'`
- **App.tsx hardcoded bypass** - Line 300: `const isAPIConnected = true;` (bypassing actual DB test)

### 2. **Duplicate Companies** 
- **Multiple migration runs** without checking for existing data
- **UnitedHealth Group appears 6 times** in the database
- Migration scripts don't use `ON CONFLICT DO NOTHING`

## 🛠️ IMMEDIATE FIXES

### Fix 1: Remove Duplicates (Quick)
Run this existing function that's already built:
```bash
curl -X POST http://localhost:8888/.netlify/functions/cleanup-duplicates
```

### Fix 2: Restore Database Connection
The issue is the import statement. In Netlify functions, use:
```typescript
// ❌ WRONG
import { neon } from '@neondatabase/serverless';

// ✅ CORRECT
import { neon } from '@netlify/neon';
```

### Fix 3: Quick Database Check Script
Create `emergency-db-check.js`:
```javascript
// Direct connection test
const DATABASE_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function emergencyCheck() {
  try {
    const response = await fetch('https://ep-winter-recipe-aejsi9db.c-2.us-east-2.aws.neon.tech/sql', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer npg_RaSZ09iyfWAm',
        'Content-Type': 'application/json',
        'Neon-Connection-String': DATABASE_URL
      },
      body: JSON.stringify({
        query: `
          SELECT 
            (SELECT COUNT(*) FROM companies) as total,
            (SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL) as with_coords,
            (SELECT COUNT(*) FROM (SELECT name FROM companies GROUP BY name HAVING COUNT(*) > 1) duplicates) as duplicate_groups
        `
      })
    });
    
    const data = await response.json();
    console.log('Database Status:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

emergencyCheck();
```

## 📊 WHAT HAPPENED (Timeline)

1. **Migration scripts ran multiple times** → Created duplicates
2. **Purge script was too aggressive** → Deleted ALL coordinates instead of just out-of-state
3. **Database connection failing** → Can't fix issues through normal API

## 🚀 RECOVERY PLAN

### Step 1: Fix Database Connection
1. Restart Netlify dev server:
```bash
# Kill current process
pkill -f "netlify dev"

# Restart with environment variables
netlify dev
```

### Step 2: Clean Duplicates
Once DB connection works:
```bash
curl -X POST http://localhost:8888/.netlify/functions/cleanup-duplicates
```

### Step 3: Restore Coordinates
The coordinates need to be re-geocoded. Use the standardized addresses:
```sql
-- Check how many need geocoding
SELECT COUNT(*) FROM companies WHERE latitude IS NULL;

-- Re-run geocoding with Minnesota constraints
-- Use the fix-minnesota-geocoding.js script from MINNESOTA_GEOCODING_FIX_PLAN.md
```

## 🔧 PREVENT FUTURE ISSUES

### 1. Fix Migration Scripts
Add `ON CONFLICT DO NOTHING`:
```sql
INSERT INTO companies (...) 
VALUES (...) 
ON CONFLICT (name, city) DO NOTHING;
```

### 2. Add Unique Constraint
```sql
ALTER TABLE companies 
ADD CONSTRAINT companies_name_city_unique 
UNIQUE (name, city);
```

### 3. Fix App.tsx
Remove the hardcoded bypass:
```typescript
// Line 300 in App.tsx
const isAPIConnected = await CompanyService.testConnection(); // Don't hardcode true!
```

## ⚡ QUICK WIN
If you can access the database directly (TablePlus, pgAdmin), run:
```sql
-- Remove duplicates keeping oldest
DELETE FROM companies a USING companies b 
WHERE a.id > b.id 
  AND a.name = b.name;

-- Count remaining
SELECT COUNT(*) FROM companies;
-- Should be ~2,765 not 16,000+
```

## 🚨 CRITICAL: Database Connection Failed

### Possible Causes:
1. **Password changed** on Neon database
2. **Database paused** (Neon pauses inactive databases)
3. **Connection limit reached**
4. **SSL/TLS certificate issue**

### Emergency Solutions:

#### Option 1: Check Neon Dashboard
1. Go to [Neon Console](https://console.neon.tech)
2. Check if database is active
3. Verify connection string hasn't changed
4. Wake up database if paused

#### Option 2: Use Neon HTTP API
```bash
# Test connection via HTTP
curl -X POST https://ep-winter-recipe-aejsi9db.c-2.us-east-2.aws.neon.tech/sql \
  -H "Authorization: Bearer npg_RaSZ09iyfWAm" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) FROM companies"}'
```

#### Option 3: Restart Everything
```bash
# 1. Kill all Node processes
pkill -f node

# 2. Clear any cached credentials
rm -rf node_modules/.cache

# 3. Restart Netlify dev
netlify dev
```

#### Option 4: Direct PostgreSQL Client
Use TablePlus, pgAdmin, or psql with:
```
Host: ep-winter-recipe-aejsi9db.c-2.us-east-2.aws.neon.tech
Database: neondb
User: neondb_owner
Password: npg_RaSZ09iyfWAm
SSL: Required
```

## 📱 What The User Sees:
- **List View**: Shows duplicate companies (6x UnitedHealth)
- **Map View**: "No Mapped Companies" (all coordinates lost)
- **Data Source**: Unknown (might be cached or CSV fallback)
