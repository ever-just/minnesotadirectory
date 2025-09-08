#!/usr/bin/env node

/**
 * FAST NOMINATIM GEOCODING - Address First Approach
 * Uses the working OpenStreetMap API with optimized address parsing
 * Focuses on EXACT street addresses for precision
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config();

const DATABASE_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

// Optimized address parsing for better geocoding success
function cleanAddress(rawAddress) {
  // Remove problematic parts that block geocoding
  let cleaned = rawAddress
    .replace(/\s+Ste\s+[\w\d-]+.*$/i, '') // Remove "Ste 100", "Suite 300" 
    .replace(/\s+Suite\s+[\w\d-]+.*$/i, '') 
    .replace(/\s+Unit\s+[\w\d-]+.*$/i, '') 
    .replace(/\s+#[\w\d-]+.*$/i, '') 
    .replace(/\s+Bldg\s+[\w\d-]+.*$/i, '') // Remove "Bldg 275-6W"
    .replace(/\s+Building\s+[\w\d-]+.*$/i, '')
    .replace(/\s+Floor\s+\d+.*$/i, '')
    .replace(/\s+Fl\s+\d+.*$/i, '')
    .trim();
  
  return cleaned;
}

// Fast Nominatim geocoding with address-first strategy
async function geocodeAddress(address, city, state, postalCode = '') {
  try {
    // Clean the address to improve success rate
    const cleanAddr = cleanAddress(address);
    
    // Build address variations (try exact first, then simplified)
    const addressVariations = [
      `${cleanAddr}, ${city}, ${state}${postalCode ? `, ${postalCode}` : ''}, USA`,
      `${cleanAddr}, ${city}, ${state}, USA`,
      `${cleanAddr}, ${city}, USA`
    ];
    
    for (const addr of addressVariations) {
      console.log(`🎯 Trying: ${addr}`);
      
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=us&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MinnesotaDirectory/3.0 (support@minnesotadirectory.com)'
        }
      });
      
      if (!response.ok) {
        console.log(`❌ API error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          // Determine accuracy
          let accuracy = 'city';
          if (result.address?.house_number && result.address?.road) {
            accuracy = 'exact_address';
          } else if (result.address?.road) {
            accuracy = 'street';
          }
          
          console.log(`✅ SUCCESS: [${lat}, ${lng}] (${accuracy})`);
          return { lat, lng, accuracy, matched_address: addr };
        }
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`❌ All address variations failed`);
    return null;
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function runFastNominatim() {
  console.log('🚀 FAST NOMINATIM ADDRESS-FIRST GEOCODING');
  console.log('🎯 Using exact street addresses + optimized parsing');
  
  try {
    // Get companies that haven't been processed yet (skip exact coordinates)
    console.log('\n📊 Loading companies that need exact coordinates...');
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", sales
      FROM companies 
      WHERE address IS NOT NULL 
        AND address != ''
        AND address NOT LIKE '%Unknown%'
        AND sales IS NOT NULL
        AND latitude IS NULL
      ORDER BY sales DESC 
      LIMIT 50
    `;
    
    console.log(`✅ Found ${companies.length} companies to process`);
    
    let successful = 0;
    let failed = 0;
    const results = [];
    
    // Process companies sequentially but fast
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      console.log(`\n[${i+1}/${companies.length}] 💼 ${company.name} ($${(parseFloat(company.sales)/1000000).toFixed(1)}M)`);
      console.log(`Original address: "${company.address}"`);
      console.log(`Clean address: "${cleanAddress(company.address)}"`);
      
      const coords = await geocodeAddress(
        company.address,
        company.city, 
        company.state || 'Minnesota',
        company.postalCode
      );
      
      if (coords) {
        // Update database  
        try {
          await sql`
            UPDATE companies 
            SET latitude = ${coords.lat},
                longitude = ${coords.lng}
            WHERE id = ${company.id}
          `;
          
          successful++;
          results.push({
            company: company.name,
            coordinates: [coords.lat, coords.lng],
            accuracy: coords.accuracy,
            matched: coords.matched_address
          });
          
          console.log(`✅ UPDATED in database with ${coords.accuracy} accuracy`);
          
        } catch (dbError) {
          console.error(`❌ Database update failed: ${dbError.message}`);
          failed++;
        }
      } else {
        failed++;
      }
      
      // Respect Nominatim rate limits (1 request per second)
      if (i < companies.length - 1) {
        console.log('⏳ Rate limit delay...');
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }
    
    console.log('\n🎉 FAST NOMINATIM GEOCODING COMPLETE!');
    console.log('=' .repeat(60));
    console.log(`⚡ Processed: ${companies.length} companies`);
    console.log(`✅ Successful: ${successful} (${Math.round((successful/companies.length)*100)}%)`);
    console.log(`❌ Failed: ${failed}`);
    
    // Show successful results
    console.log('\n🏆 Successfully Geocoded with EXACT Addresses:');
    results.filter(r => r.accuracy === 'exact_address').forEach(r => {
      console.log(`   📍 ${r.company}: [${r.coordinates.join(', ')}] ✅ EXACT`);
    });
    
    console.log('\n🏅 Successfully Geocoded with STREET Accuracy:');
    results.filter(r => r.accuracy === 'street').forEach(r => {
      console.log(`   📍 ${r.company}: [${r.coordinates.join(', ')}] 🎯 STREET`);
    });
    
    // Check final totals
    const [{ total }] = await sql`SELECT COUNT(*) as total FROM companies WHERE latitude IS NOT NULL`;
    console.log(`\n📊 Total companies now mapped: ${total}`);
    
    console.log('\n🗺️ Refresh your browser map - you should see exact building locations!');
    console.log('🎯 Major companies should now be at their actual street addresses');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n⏹️  Geocoding stopped - progress saved');
  process.exit(0);
});

runFastNominatim();
