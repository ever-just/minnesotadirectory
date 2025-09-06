import { Handler } from '@netlify/functions';
import {
  verifyToken,
  extractToken,
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

    // Verify JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      return createResponse(401, {
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // In a stateless JWT system, we can't truly invalidate tokens server-side
    // without maintaining a blacklist. For now, we just return success.
    // The client should remove the token from localStorage.
    
    // TODO: Implement token blacklist if needed for enhanced security
    
    return createResponse(200, {
      success: true,
      message: 'Logout successful'
    });

  } catch (error: any) {
    console.error('Logout error:', error);

    return createResponse(500, {
      success: false,
      error: 'Logout failed. Please try again later.'
    });
  }
};
