import type { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import { updateUserPreferences, getStackUser, syncUserToStackAuth, updateStackUserProfile } from './utils/stackAuth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', 
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
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

    // Parse update request
    const body = JSON.parse(event.body || '{}');
    const { updateType, data } = body;

    console.log(`🔧 PROFILE: Updating ${updateType} for ${decoded.email}`);

    // Ensure user exists in Stack Auth (create if needed)
    let stackUser = await getStackUser(decoded.email);
    if (!stackUser) {
      console.log(`🔄 Creating Stack Auth user for ${decoded.email}`);
      stackUser = await syncUserToStackAuth(decoded.email, decoded.name);
    }

    if (!stackUser) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to access user profile' })
      };
    }

    let result = false;

    switch (updateType) {
      case 'preferences':
        result = await updateUserPreferences(stackUser.id, data);
        break;
        
      case 'profile':
        // Update basic profile info (name, etc.)
        try {
          const updatedUser = await updateStackUserProfile(stackUser.id, {
            displayName: data.name,
            metadata: {
              ...stackUser.metadata,
              updatedFromApp: new Date().toISOString()
            }
          });
          result = !!updatedUser;
        } catch (error) {
          console.error('Profile update error:', error);
          result = false;
        }
        break;
        
      case 'security':
        // Update security settings
        try {
          result = await updateUserPreferences(stackUser.id, {
            twoFactorEnabled: data.twoFactorEnabled,
            securityUpdatedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Security update error:', error);
          result = false;
        }
        break;
        
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid update type' })
        };
    }

    if (result) {
      console.log(`✅ PROFILE: Successfully updated ${updateType} for ${decoded.email}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `${updateType} updated successfully`,
          updatedAt: new Date().toISOString()
        })
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: `Failed to update ${updateType}` })
      };
    }

  } catch (error: any) {
    console.error('Profile update error:', error);
    
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
