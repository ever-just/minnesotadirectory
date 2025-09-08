# 🗺️ Google Places API Setup for Exact Business Coordinates

## Current Status
- ✅ **1,681 companies** mapped with approximate city coordinates
- ✅ **Interactive map** working with logo markers  
- ❌ **Need exact business headquarters** coordinates

## Google Places API Setup

### **Step 1: Get Your API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Enable "Places API (New)" 
4. Create an API key in Credentials section

### **Step 2: Configure in Netlify**
Add to your Netlify environment variables:
```
GOOGLE_PLACES_API_KEY=your_api_key_here
```

**Where to add:**
- Netlify Dashboard → Site Settings → Environment Variables
- OR add to netlify.toml under `[build.environment]`

### **Step 3: Test & Deploy**
```bash
# Test the business geocoding
curl -X GET "http://localhost:8888/.netlify/functions/google-hq-geocode?batchSize=3"

# Expected results: 
# ✅ Target Corporation → Exact "1000 Nicollet Mall" coordinates
# ✅ UnitedHealth Group → Exact "1 Health Drive, Eden Prairie" coordinates  
# ✅ 3M Company → Exact "3M Center, Maplewood" coordinates
```

## What Google Places API Will Fix

### **Before (Current):**
```
Target Corporation: [44.9537, -93.265] (city center)
```

### **After (Google Places):**
```  
Target Corporation: [44.9737893, -93.2758321] (exact 1000 Nicollet Mall)
UnitedHealth Group: [44.8578, -93.4681] (exact 1 Health Drive, Eden Prairie)
```

## Benefits of Google Places vs Current Approach

| Feature | Current (Nominatim) | Google Places |
|---------|-------------------|---------------|
| **Corporate HQ Recognition** | ❌ Poor | ✅ Excellent |
| **Building Name Translation** | ❌ Fails | ✅ Handles "3M Center", etc. |
| **Suite Number Handling** | ❌ Blocks geocoding | ✅ Intelligent parsing |
| **Business Database** | ❌ Limited | ✅ Google My Business data |
| **Coordinate Precision** | ~1-2 mile accuracy | Street-level precision |

## Expected Results

With Google Places API configured:
- **Target Corporation** → Exact Nicollet Mall headquarters
- **UnitedHealth Group** → Exact Eden Prairie campus  
- **3M Company** → Exact Maplewood headquarters
- **Mayo Clinic** → Exact Rochester facilities
- **General Mills** → Exact Golden Valley headquarters

**Success rate should increase from ~30% to ~85%+ for corporate addresses.**

## Alternative: Manual Override for Key Companies

If Google Places API setup is delayed, we can manually set exact coordinates for top 20 companies:

```sql
UPDATE companies SET 
  latitude = 44.9737893, longitude = -93.2758321,
  geocodingAccuracy = 'manual_exact'
WHERE name = 'Target Corporation';
```

This would give immediate exact coordinates for the most important companies while API setup is being completed.
