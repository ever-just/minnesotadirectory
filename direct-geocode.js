#!/usr/bin/env node

/**
 * DIRECT GEOCODING - Bypass Netlify function issues
 * Address-first geocoding with Google Maps API
 * Fast, simple, reliable
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: './.env' });

// Use the Google API key from netlify.toml
const GOOGLE_API_KEY = "AIzaSyDtR2sZLXQ4l-P33jS70r9OEQFStSa3ikA";
const DATABASE_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const sql = neon(DATABASE_URL);

// Direct address geocoding with Google Maps
async function geocodeExactAddress(address, city, state, postalCode = '') {
  try {
    // Build precise address string
    const fullAddress = [address, city, state, postalCode, 'USA']
      .filter(Boolean)
      .join(', ');
    
    console.log(`🎯 Geocoding: ${fullAddress}`);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      let accuracy = 'approximate';
      if (result.geometry.location_type === 'ROOFTOP') {
        accuracy = 'rooftop_exact';
      } else if (result.geometry.location_type === 'RANGE_INTERPOLATED') {
        accuracy = 'street_exact';
      }
      
      console.log(`✅ SUCCESS: [${location.lat}, ${location.lng}] (${accuracy})`);
      console.log(`   Google address: ${result.formatted_address}`);
      
      return {
        lat: location.lat,
        lng: location.lng,
        accuracy,
        formatted_address: result.formatted_address
      };
    }
    
    console.log(`❌ FAILED: ${data.status} - ${data.error_message || 'No results'}`);
    return null;
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return null;
  }
}

async function runDirectGeocoding() {
  console.log('🚀 DIRECT GEOCODING SYSTEM');
  console.log('⚡ Address-first + Google Maps API + Database direct');
  console.log(`🔑 Using Google API Key: ${GOOGLE_API_KEY.substring(0, 20)}...`);
  
  try {
    // Get companies needing exact coordinates (simple query)
    console.log('\n📊 Getting companies from database...');
    const companies = await sql`
      SELECT id, name, address, city, state, "postalCode", sales
      FROM companies 
      WHERE address IS NOT NULL 
        AND address != ''
        AND sales IS NOT NULL
      ORDER BY sales DESC 
      LIMIT 20
    `;
    
    console.log(`✅ Found ${companies.length} companies to process`);
    
    let successful = 0;
    let failed = 0;
    
    // Process companies one by one (reliable)
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      console.log(`\n[${i+1}/${companies.length}] 💼 ${company.name}`);
      console.log(`Revenue: $${(parseFloat(company.sales)/1000000).toFixed(1)}M`);
      
      // Geocode the exact address
      const coords = await geocodeExactAddress(
        company.address,
        company.city, 
        company.state || 'Minnesota',
        company.postalCode
      );
      
      if (coords) {
        // Update database with exact coordinates
        try {
          await sql`
            UPDATE companies 
            SET latitude = ${coords.lat},
                longitude = ${coords.lng}
            WHERE id = ${company.id}
          `;
          
          successful++;
          console.log(`✅ Database updated successfully`);
          
        } catch (dbError) {
          console.error(`❌ Database update failed: ${dbError.message}`);
          failed++;
        }
      } else {
        failed++;
      }
      
      // Rate limiting (1 request per second to be safe)
      if (i < companies.length - 1) {
        console.log('⏳ Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 DIRECT GEOCODING COMPLETE!');
    console.log('=' .repeat(50));
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🎯 Success rate: ${Math.round((successful / companies.length) * 100)}%`);
    
    // Check final totals
    const [{ total }] = await sql`SELECT COUNT(*) as total FROM companies WHERE latitude IS NOT NULL`;
    console.log(`📊 Total companies on map: ${total}`);
    
    console.log('\n🗺️ Refresh your browser to see the exact company locations!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

runDirectGeocoding();
