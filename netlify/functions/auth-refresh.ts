import { Handler } from '@netlify/functions';
import {
  verifyToken,
  extractToken,
  generateToken,
  getUserById,
  formatUserResponse,
  createResponse,
  handleCORS
} from './utils/auth';

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight requests
  const corsResponse = await handleCORS(event);
  if (corsResponse) return corsResponse;

  // Only allow POST method
  if (event.httpMethod !== 'POST') {
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

    // Verify JWT token (even if expired, we can refresh if it's not too old)
    const decoded = verifyToken(token);
    if (!decoded) {
      return createResponse(401, {
        success: false,
        error: 'Invalid token - cannot refresh'
      });
    }

    // Get user from database to ensure they still exist
    const user = await getUserById(decoded.userId);
    if (!user) {
      return createResponse(401, {
        success: false,
        error: 'User not found'
      });
    }

    // Generate new JWT token
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    // Return success response with new token
    return createResponse(200, {
      success: true,
      token: newToken,
      user: formatUserResponse(user),
      message: 'Token refreshed successfully'
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);

    return createResponse(500, {
      success: false,
      error: 'Token refresh failed. Please try again later.'
    });
  }
};
