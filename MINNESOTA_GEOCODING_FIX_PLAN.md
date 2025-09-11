# 🎯 MINNESOTA GEOCODING FIX PLAN
*Optimized for Claude inside Cursor - Direct Action Plan*

## 🚨 CRITICAL PROBLEM SUMMARY
Minnesota companies are being geocoded to **wrong states** (Kansas, Louisiana, etc.) due to previous implementation using city-center + random scatter approach that occasionally placed companies outside state boundaries.

## 📊 CURRENT SITUATION
- **1,833 companies** displayed on map (from screenshot)
- **Many placed incorrectly** in Kansas, Louisiana, and other states
- **Root cause**: `fast-geocode.ts` used random scatter from city centers
- **Mixed accuracy levels**: city-level, building-level, scattered

## ⚠️ DISCOVERED ISSUES
1. **Database authentication failing** - Need to use hardcoded URL temporarily
2. **Multiple geocoding approaches** created inconsistent results
3. **City-center scatter** from `fast-geocode.ts` placed companies outside MN

## 🛠️ IMMEDIATE ACTION PLAN

### Phase 1: Damage Assessment (5 minutes)
```javascript
// 1. Check how many companies are outside Minnesota bounds
const MN_BOUNDS = {
  north: 49.384358,  // Northernmost point
  south: 43.499356,  // Southernmost point  
  east: -89.491897,  // Easternmost point
  west: -97.239209   // Westernmost point
};

// Query: Find all companies with coordinates outside MN
SELECT COUNT(*), MIN(latitude), MAX(latitude), MIN(longitude), MAX(longitude)
FROM companies 
WHERE latitude IS NOT NULL 
  AND (latitude < 43.499356 OR latitude > 49.384358 
    OR longitude < -97.239209 OR longitude > -89.491897);
```

### Phase 2: Purge Bad Coordinates (2 minutes)
```sql
-- Reset all city-center scattered coordinates
UPDATE companies 
SET latitude = NULL, 
    longitude = NULL, 
    geocodedAt = NULL,
    geocodingSource = NULL,
    geocodingAccuracy = NULL
WHERE geocodingSource = 'city_lookup'
   OR geocodingAccuracy = 'city'
   OR (latitude < 43.499356 OR latitude > 49.384358 
       OR longitude < -97.239209 OR longitude > -89.491897);
```

### Phase 3: Fast Minnesota-Constrained Geocoding (10 minutes)

#### 3.1 Create Ultra-Fast MN-Only Geocoder
```javascript
// minnesota-constrained-geocoder.js
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();
const sql = neon(process.env.DATABASE_URL);

const MN_BOUNDS = {
  north: 49.384358,
  south: 43.499356,
  east: -89.491897,
  west: -97.239209
};

async function geocodeWithMNConstraint(address, city, state, postalCode) {
  // Build full address
  const fullAddress = [address, city, 'Minnesota', postalCode, 'USA']
    .filter(Boolean)
    .join(', ');
  
  // Nominatim with viewbox constraint to Minnesota
  const viewbox = `${MN_BOUNDS.west},${MN_BOUNDS.south},${MN_BOUNDS.east},${MN_BOUNDS.north}`;
  const url = `https://nominatim.openstreetmap.org/search?` + 
    `q=${encodeURIComponent(fullAddress)}` +
    `&format=json&limit=1` +
    `&countrycodes=us` +
    `&viewbox=${viewbox}` +
    `&bounded=1` +  // CRITICAL: Restrict results to viewbox
    `&state=Minnesota`;  // Extra state hint
    
  const response = await fetch(url);
  const data = await response.json();
  
  if (data?.[0]) {
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    
    // Double-check Minnesota bounds
    if (lat >= MN_BOUNDS.south && lat <= MN_BOUNDS.north &&
        lon >= MN_BOUNDS.west && lon <= MN_BOUNDS.east) {
      return { lat, lon, accuracy: 'address' };
    }
  }
  
  return null;
}

// Parallel batch processing - 10x faster
async function processBatch(companies) {
  return Promise.all(companies.map(async (company) => {
    const result = await geocodeWithMNConstraint(
      company.standardized_address || company.address,
      company.city,
      'Minnesota',
      company.postalCode
    );
    
    if (result) {
      await sql`
        UPDATE companies 
        SET latitude = ${result.lat},
            longitude = ${result.lon},
            geocodedAt = NOW(),
            geocodingSource = 'nominatim_mn_constrained',
            geocodingAccuracy = ${result.accuracy}
        WHERE id = ${company.id}
      `;
    }
  }));
}
```

### Phase 4: Verification & Cleanup (2 minutes)
```sql
-- Verify all coordinates are within Minnesota
SELECT COUNT(*) as outside_mn
FROM companies 
WHERE latitude IS NOT NULL 
  AND (latitude < 43.499356 OR latitude > 49.384358 
       OR longitude < -97.239209 OR longitude > -89.491897);

-- Should return 0
```

## 🚀 EXECUTION COMMANDS
```bash
# 1. Run damage assessment
node -e "/* damage assessment query */"

# 2. Purge bad coordinates  
node -e "/* purge SQL */"

# 3. Run MN-constrained geocoding
node minnesota-constrained-geocoder.js

# 4. Start dev server to verify
npm run dev
```

## 📈 SUCCESS METRICS
- ✅ **0 companies outside Minnesota bounds**
- ✅ **All companies within MN bounding box**
- ✅ **No Kansas/Louisiana misplacements**
- ✅ **Processing speed: ~50 companies/second**

## 🎯 ALTERNATIVE: MCP Server Integration
If Nominatim still struggles, integrate Google Places MCP:
```javascript
// Use mcp_Stripe_search_stripe_documentation as template
// Create mcp_google_places_geocode with MN constraint
```

## ⚡ SPEED OPTIMIZATIONS
1. **Remove ALL delays** (no setTimeout)
2. **Process in parallel batches of 50**
3. **Skip already-correct coordinates**
4. **Use database transactions for bulk updates**

## 🔒 PREVENTION
Add coordinate validation to all future geocoding:
```javascript
function isInMinnesota(lat, lon) {
  return lat >= 43.499356 && lat <= 49.384358 &&
         lon >= -97.239209 && lon <= -89.491897;
}
```

---
**ESTIMATED TOTAL TIME: 20 minutes to complete fix**

## 🚨 CURRENT BLOCKER: DATABASE AUTHENTICATION

The PostgreSQL database is rejecting authentication. To proceed:

### Option 1: Fix Database Connection
1. Check if Netlify CLI is loading environment variables correctly
2. Ensure `.env` file exists with: `DATABASE_URL=postgresql://...`
3. Restart Netlify dev server: `netlify dev`

### Option 2: Direct Database Access (Temporary)
Use a database client (TablePlus, pgAdmin, DBeaver) with the connection string from netlify.toml to manually run the SQL commands.

### Option 3: Create .env File
```bash
echo 'DATABASE_URL="postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"' > .env
```

## 📊 WHAT WE DISCOVERED

From the screenshots you provided:
- **Companies are placed in Kansas, Louisiana, Texas** - completely wrong states!
- These are Minnesota companies with Minnesota addresses
- The `fast-geocode.ts` function used city centers + random scatter, which pushed companies outside state boundaries

## 🎯 THE FIX (3 STEPS)

### Step 1: SQL to Purge Bad Coordinates
```sql
-- Run this in your database client
UPDATE companies 
SET latitude = NULL, 
    longitude = NULL, 
    geocodedAt = NULL,
    geocodingSource = NULL,
    geocodingAccuracy = NULL
WHERE 
  -- Outside Minnesota bounds
  (latitude < 43.499356 OR latitude > 49.384358 
   OR longitude < -97.239209 OR longitude > -89.491897)
  -- OR city-scatter approach
  OR geocodingSource = 'city_lookup'
  OR geocodingAccuracy = 'city';
```

### Step 2: Create Minnesota-Constrained Geocoder
Save as `fix-minnesota-geocoding.js`:
```javascript
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();
const sql = neon(process.env.DATABASE_URL);

// Minnesota bounds - CRITICAL for constraint
const MN_BOUNDS = {
  north: 49.384358,
  south: 43.499356,
  east: -89.491897,
  west: -97.239209
};

async function geocodeMinnesotaOnly() {
  // Get companies needing geocoding
  const companies = await sql`
    SELECT id, name, standardized_address, address, city, "postalCode"
    FROM companies 
    WHERE latitude IS NULL 
      AND (standardized_address IS NOT NULL OR address IS NOT NULL)
    ORDER BY sales DESC NULLS LAST
    LIMIT 50
  `;
  
  console.log(`Geocoding ${companies.length} companies...`);
  
  for (const company of companies) {
    const address = company.standardized_address || company.address;
    const fullAddress = `${address}, ${company.city}, Minnesota, ${company.postalCode}, USA`;
    
    // Nominatim with STRICT Minnesota bounds
    const viewbox = `${MN_BOUNDS.west},${MN_BOUNDS.south},${MN_BOUNDS.east},${MN_BOUNDS.north}`;
    const url = `https://nominatim.openstreetmap.org/search?` + 
      `q=${encodeURIComponent(fullAddress)}` +
      `&format=json&limit=1` +
      `&countrycodes=us` +
      `&viewbox=${viewbox}` +
      `&bounded=1` +  // FORCE results within viewbox
      `&state=Minnesota`;
      
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        // VERIFY Minnesota bounds
        if (lat >= MN_BOUNDS.south && lat <= MN_BOUNDS.north &&
            lon >= MN_BOUNDS.west && lon <= MN_BOUNDS.east) {
          
          await sql`
            UPDATE companies 
            SET latitude = ${lat},
                longitude = ${lon},
                geocodedAt = NOW(),
                geocodingSource = 'nominatim_mn_only',
                geocodingAccuracy = 'address'
            WHERE id = ${company.id}
          `;
          
          console.log(`✅ ${company.name} -> [${lat}, ${lon}]`);
        } else {
          console.log(`❌ ${company.name} - coordinates outside MN, skipping`);
        }
      }
    } catch (err) {
      console.error(`Error geocoding ${company.name}:`, err.message);
    }
    
    // Respect Nominatim rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

geocodeMinnesotaOnly();
```

### Step 3: Run and Verify
```bash
node fix-minnesota-geocoding.js
```

Then check the map at localhost:8888 - all companies should be within Minnesota!
