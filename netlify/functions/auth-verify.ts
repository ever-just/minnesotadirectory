import { Handler } from '@netlify/functions';
import {
  verifyToken,
  extractToken,
  getUserById,
  formatUserResponse,
  createResponse,
  handleCORS
} from './utils/auth';

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight requests
  const corsResponse = await handleCORS(event);
  if (corsResponse) return corsResponse;

  // Only allow GET method
  if (event.httpMethod !== 'GET') {
    return createResponse(405, {
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Extract token from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return createResponse(401, {
        success: false,
        error: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      return createResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user from database
    const user = await getUserById(decoded.userId);
    if (!user) {
      return createResponse(401, {
        success: false,
        error: 'User not found'
      });
    }

    // Return success response with user data
    return createResponse(200, {
      success: true,
      user: formatUserResponse(user),
      message: 'Token verified successfully'
    });

  } catch (error: any) {
    console.error('Token verification error:', error);

    return createResponse(500, {
      success: false,
      error: 'Token verification failed. Please try again later.'
    });
  }
};
