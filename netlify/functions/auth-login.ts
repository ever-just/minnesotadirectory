import { Handler } from '@netlify/functions';
import {
  comparePassword,
  generateToken,
  isValidEmail,
  getUserByEmail,
  updateUserLastLogin,
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
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return createResponse(400, {
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return createResponse(401, {
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return createResponse(401, {
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login timestamp
    await updateUserLastLogin(user.id);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    // Return success response
    return createResponse(200, {
      success: true,
      token,
      user: formatUserResponse(user),
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('Login error:', error);

    // Generic server error
    return createResponse(500, {
      success: false,
      error: 'Login failed. Please try again later.'
    });
  }
};
