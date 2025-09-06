const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NETLIFY_URL || 'http://localhost:8888';
const TEST_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'TestPassword123'
};

async function testAuthSystem() {
  console.log('🧪 Starting authentication system tests...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  
  let token = null;
  
  try {
    // Test 1: User Registration
    console.log('\n📝 Test 1: User Registration');
    const registerResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
    });
    
    const registerData = await registerResponse.json();
    console.log('Status:', registerResponse.status);
    console.log('Response:', registerData);
    
    if (registerData.success) {
      console.log('✅ Registration successful');
      token = registerData.token;
    } else {
      console.log('❌ Registration failed:', registerData.error);
      
      // If user already exists, try login instead
      if (registerData.error?.includes('already exists')) {
        console.log('👤 User exists, attempting login...');
        
        const loginResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: TEST_USER.email,
            password: TEST_USER.password,
          }),
        });
        
        const loginData = await loginResponse.json();
        if (loginData.success) {
          console.log('✅ Login successful');
          token = loginData.token;
        } else {
          console.log('❌ Login failed:', loginData.error);
          return;
        }
      } else {
        return;
      }
    }
    
    // Test 2: Token Verification
    console.log('\n🔐 Test 2: Token Verification');
    const verifyResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const verifyData = await verifyResponse.json();
    console.log('Status:', verifyResponse.status);
    console.log('Response:', verifyData);
    
    if (verifyData.success) {
      console.log('✅ Token verification successful');
    } else {
      console.log('❌ Token verification failed:', verifyData.error);
    }
    
    // Test 3: Token Refresh
    console.log('\n🔄 Test 3: Token Refresh');
    const refreshResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const refreshData = await refreshResponse.json();
    console.log('Status:', refreshResponse.status);
    console.log('Response:', refreshData);
    
    if (refreshData.success) {
      console.log('✅ Token refresh successful');
      token = refreshData.token; // Update with new token
    } else {
      console.log('❌ Token refresh failed:', refreshData.error);
    }
    
    // Test 4: Invalid Login
    console.log('\n🚫 Test 4: Invalid Login');
    const invalidLoginResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: 'WrongPassword123',
      }),
    });
    
    const invalidLoginData = await invalidLoginResponse.json();
    console.log('Status:', invalidLoginResponse.status);
    console.log('Response:', invalidLoginData);
    
    if (!invalidLoginData.success) {
      console.log('✅ Invalid login properly rejected');
    } else {
      console.log('❌ Invalid login was accepted (security issue!)');
    }
    
    // Test 5: Logout
    console.log('\n👋 Test 5: Logout');
    const logoutResponse = await fetch(`${BASE_URL}/.netlify/functions/auth-logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const logoutData = await logoutResponse.json();
    console.log('Status:', logoutResponse.status);
    console.log('Response:', logoutData);
    
    if (logoutData.success) {
      console.log('✅ Logout successful');
    } else {
      console.log('❌ Logout failed:', logoutData.error);
    }
    
    console.log('\n🎉 Authentication system tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run tests if called directly
if (require.main === module) {
  testAuthSystem();
}

module.exports = { testAuthSystem };
