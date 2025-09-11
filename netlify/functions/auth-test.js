// Test function to verify auth dependencies work
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Test JWT
    const testToken = jwt.sign({ test: 'data' }, 'secret', { expiresIn: '1h' });
    const decoded = jwt.verify(testToken, 'secret');
    
    // Test bcrypt
    const hash = await bcrypt.hash('test', 10);
    const match = await bcrypt.compare('test', hash);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        jwt_works: !!decoded,
        bcrypt_works: match,
        versions: {
          jwt: jwt.version || 'unknown',
          node: process.version
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
