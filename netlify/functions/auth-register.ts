import { Handler } from '@netlify/functions';
import {
  hashPassword,
  generateToken,
  isValidEmail,
  isValidPassword,
  getUserByEmail,
  createUser,
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
    const { name, email, password } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return createResponse(400, {
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Validate name
    if (name.trim().length < 2) {
      return createResponse(400, {
        success: false,
        error: 'Name must be at least 2 characters long'
      });
    }

    if (name.trim().length > 255) {
      return createResponse(400, {
        success: false,
        error: 'Name must be less than 255 characters'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return createResponse(400, {
        success: false,
        error: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return createResponse(400, {
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user
    const newUser = await createUser(name.trim(), email.trim(), passwordHash);

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    // Return success response
    return createResponse(201, {
      success: true,
      token,
      user: formatUserResponse(newUser),
      message: 'Account created successfully'
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle database constraint errors
    if (error.code === '23505' && error.constraint?.includes('email')) {
      return createResponse(400, {
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Handle other database errors
    if (error.code && error.code.startsWith('23')) {
      return createResponse(400, {
        success: false,
        error: 'Invalid data provided'
      });
    }

    // Generic server error
    return createResponse(500, {
      success: false,
      error: 'Registration failed. Please try again later.'
    });
  }
};
