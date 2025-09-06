// Test script to debug heart button functionality
// This simulates exactly what the heart buttons should do

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5173';

async function testHeartButtons() {
  console.log('🧪 Testing heart button functionality on localhost:5173...');
  
  try {
    // Step 1: Create test user
    console.log('📝 Step 1: Create test user...');
    const registerResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Heart Test User',
        email: 'heart@test.com',
        password: 'HeartTest123'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('Registration result:', registerData.success ? '✅ Success' : '❌ Failed');
    
    // Step 2: Login to get token (like authService does)
    console.log('🔐 Step 2: Login to get token...');
    const loginResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'heart@test.com',
        password: 'HeartTest123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success || !loginData.token) {
      throw new Error('Login failed: ' + loginData.error);
    }
    
    console.log('✅ Login successful, got token');
    
    // Step 3: Get real company ID (like the frontend does)
    console.log('🏢 Step 3: Get real company...');
    const companiesResponse = await fetch(`${BASE_URL}/.netlify/functions/get-companies?limit=1`);
    const companiesData = await companiesResponse.json();
    
    if (!companiesData.success || !companiesData.companies[0]) {
      throw new Error('Failed to get companies');
    }
    
    const company = companiesData.companies[0];
    console.log(`✅ Got company: ${company.name} (ID: ${company.id})`);
    
    // Step 4: Save company (exactly like FavoriteButton does)
    console.log('💾 Step 4: Save company...');
    const saveResponse = await fetch(`${BASE_URL}/.netlify/functions/save-company-working`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        companyId: company.id,
        notes: 'Saved from directory',
        tags: 'favorite'
      })
    });
    
    const saveData = await saveResponse.json();
    console.log('Save result:', saveData);
    
    if (saveData.success) {
      console.log('🎉 Heart button save flow working perfectly!');
    } else {
      console.log('❌ Save failed:', saveData.error);
    }
    
    // Step 5: Test get saved companies
    console.log('📋 Step 5: Test get saved companies...');
    const getSavedResponse = await fetch(`${BASE_URL}/.netlify/functions/get-saved-companies-working`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const getSavedData = await getSavedResponse.json();
    console.log('Get saved result:', getSavedData);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testHeartButtons();
