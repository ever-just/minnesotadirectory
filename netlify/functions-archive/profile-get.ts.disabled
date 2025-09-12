import type { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import { getEnhancedUserProfile } from './utils/stackAuth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify JWT token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Authentication required' })
      };
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid token' })
      };
    }

    console.log(`📋 PROFILE: Getting enhanced profile for ${decoded.email}`);

    // Get enhanced profile from Stack Auth
    const enhancedProfile = await getEnhancedUserProfile(decoded.email);

    if (!enhancedProfile) {
      // Return basic profile if Stack Auth not available
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          profile: {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            preferences: {
              emailNotifications: true,
              smsNotifications: false,
              marketingEmails: false,
              weeklyDigest: true,
            },
            socialAccounts: {
              google: { connected: false },
              github: { connected: false }
            },
            security: {
              twoFactorEnabled: false,
              lastLogin: new Date().toISOString(),
              loginHistory: []
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          source: 'fallback'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        profile: enhancedProfile,
        source: 'stack-auth'
      })
    };

  } catch (error: any) {
    console.error('Profile get error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
