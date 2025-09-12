// Development authentication server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { eq } = require('drizzle-orm');

const app = express();
const PORT = 8888;

// Database setup
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8888'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Helper functions
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Register endpoint
app.post('/.netlify/functions/auth-register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user
    const result = await sql`
      INSERT INTO users (name, email, password_hash, is_email_verified, created_at, updated_at)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, false, NOW(), NOW())
      RETURNING id, name, email, is_email_verified, created_at
    `;
    
    const newUser = result[0];

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    // Return success response
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isEmailVerified: newUser.is_email_verified,
        createdAt: newUser.created_at
      },
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again later.'
    });
  }
});

// Login endpoint
app.post('/.netlify/functions/auth-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, name, password_hash, is_email_verified, created_at
      FROM users 
      WHERE email = ${email.toLowerCase()}
    `;
    
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login timestamp
    await sql`
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    // Return success response
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again later.'
    });
  }
});

// Verify token endpoint
app.get('/.netlify/functions/auth-verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const users = await sql`
      SELECT id, email, name, is_email_verified, created_at
      FROM users 
      WHERE id = ${decoded.userId}
    `;
    
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Refresh token endpoint
app.post('/.netlify/functions/auth-refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const users = await sql`
      SELECT id, email, name, is_email_verified, created_at
      FROM users 
      WHERE id = ${decoded.userId}
    `;
    
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate new token
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });
    
    res.status(200).json({
      success: true,
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Logout endpoint
app.post('/.netlify/functions/auth-logout', (req, res) => {
  // In a JWT-based system, logout is handled client-side
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Profile endpoints (for UserProfile component compatibility)
app.get('/.netlify/functions/profile-get', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const users = await sql`
      SELECT id, email, name, is_email_verified, created_at
      FROM users 
      WHERE id = ${decoded.userId}
    `;
    
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get saved preferences from localStorage simulation
    // In production, this would come from database
    const profile = {
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: '',
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: false,
          weeklyDigest: true
        },
        security: {
          twoFactorEnabled: false
        },
        createdAt: user.created_at
      }
    };
    
    res.status(200).json(profile);
    
  } catch (error) {
    console.error('Profile get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

app.put('/.netlify/functions/profile-update', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // In a real app, update the database
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development auth server running on http://localhost:${PORT}`);
  console.log('📍 Auth endpoints:');
  console.log(`   POST http://localhost:${PORT}/.netlify/functions/auth-register`);
  console.log(`   POST http://localhost:${PORT}/.netlify/functions/auth-login`);
  console.log(`   GET  http://localhost:${PORT}/.netlify/functions/auth-verify`);
  console.log(`   POST http://localhost:${PORT}/.netlify/functions/auth-refresh`);
  console.log(`   POST http://localhost:${PORT}/.netlify/functions/auth-logout`);
});