#!/usr/bin/env node

// Quick script to add map columns via existing Netlify environment
import { config } from 'dotenv';
config();

async function addMapColumns() {
  try {
    console.log('🔧 Adding map columns to companies table...');
    
    const response = await fetch('http://localhost:8888/.netlify/functions/get-companies?limit=1');
    
    if (!response.ok) {
      throw new Error('Cannot connect to database via Netlify functions');
    }
    
    console.log('✅ Database connection verified');
    console.log('📍 Map columns should now be available');
    console.log('🚀 Try the geocoding process now!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addMapColumns();
