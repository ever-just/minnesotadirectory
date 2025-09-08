import { StackServerApp } from '@stackframe/js';

// Stack Auth API client for backend operations  
const stackAuth = new StackServerApp({
  tokenStore: "memory",
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
});

export interface StackUser {
  id: string;
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  oauth: {
    google?: { email: string; name?: string };
    github?: { email: string; username?: string };
  };
  metadata: Record<string, any>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    weeklyDigest: boolean;
  };
  socialAccounts: {
    google?: { connected: boolean; email?: string };
    github?: { connected: boolean; username?: string };
  };
  security: {
    twoFactorEnabled: boolean;
    lastLogin: string;
    loginHistory: Array<{
      timestamp: string;
      ip: string;
      device: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Create or update user in Stack Auth
 */
export async function createStackUser(email: string, name: string, metadata: Record<string, any> = {}): Promise<StackUser | null> {
  try {
    // Note: StackServerApp has different API - this is a placeholder for the actual Stack Auth integration
    // For now, return a mock enhanced profile since we're keeping the custom frontend
    console.log(`📝 Would create Stack user: ${email} (${name})`);
    
    return {
      id: `stack_${Date.now()}`,
      email,
      displayName: name,
      profileImageUrl: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: true,
      oauth: {},
      metadata: {
        source: 'minnesota-directory',
        ...metadata
      }
    } as StackUser;
  } catch (error) {
    console.error('Failed to create Stack user:', error);
    return null;
  }
}

/**
 * Get user from Stack Auth by email
 */
export async function getStackUser(email: string): Promise<StackUser | null> {
  try {
    // Placeholder implementation - will integrate with actual Stack Auth API
    console.log(`📋 Would get Stack user: ${email}`);
    
    // Return null for now to trigger fallback profile creation
    return null;
  } catch (error) {
    console.error('Failed to get Stack user:', error);
    return null;
  }
}

/**
 * Update user profile in Stack Auth
 */
export async function updateStackUserProfile(userId: string, updates: {
  displayName?: string;
  profileImageUrl?: string;
  metadata?: Record<string, any>;
}): Promise<StackUser | null> {
  try {
    // Placeholder implementation - enhanced profile updates
    console.log(`🔧 Would update Stack user ${userId}:`, updates);
    
    return {
      id: userId,
      email: 'user@example.com',
      displayName: updates.displayName || 'User',
      profileImageUrl: updates.profileImageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: true,
      oauth: {},
      metadata: updates.metadata || {}
    } as StackUser;
  } catch (error) {
    console.error('Failed to update Stack user:', error);
    return null;
  }
}

/**
 * Get enhanced user profile combining our data with Stack Auth
 */
export async function getEnhancedUserProfile(email: string): Promise<UserProfile | null> {
  try {
    const stackUser = await getStackUser(email);
    
    if (!stackUser) {
      return null;
    }
    
    // Build enhanced profile
    const profile: UserProfile = {
      id: stackUser.id,
      email: stackUser.email,
      name: stackUser.displayName || 'User',
      profileImage: stackUser.profileImageUrl,
      preferences: {
        emailNotifications: stackUser.metadata?.emailNotifications ?? true,
        smsNotifications: stackUser.metadata?.smsNotifications ?? false,
        marketingEmails: stackUser.metadata?.marketingEmails ?? false,
        weeklyDigest: stackUser.metadata?.weeklyDigest ?? true,
      },
      socialAccounts: {
        google: {
          connected: !!stackUser.oauth?.google,
          email: stackUser.oauth?.google?.email
        },
        github: {
          connected: !!stackUser.oauth?.github,
          username: stackUser.oauth?.github?.username
        }
      },
      security: {
        twoFactorEnabled: stackUser.metadata?.twoFactorEnabled ?? false,
        lastLogin: stackUser.metadata?.lastLogin || stackUser.updatedAt,
        loginHistory: stackUser.metadata?.loginHistory || []
      },
      createdAt: stackUser.createdAt,
      updatedAt: stackUser.updatedAt
    };
    
    return profile;
    
  } catch (error) {
    console.error('Failed to get enhanced profile:', error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<boolean> {
  try {
    // Placeholder implementation for preferences update
    console.log(`⚙️ Would update preferences for ${userId}:`, preferences);
    
    // Simulate successful update
    return true;
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return false;
  }
}

/**
 * Sync existing user to Stack Auth (for migration)
 */
export async function syncUserToStackAuth(email: string, name: string, existingData: Record<string, any> = {}): Promise<StackUser | null> {
  try {
    // Check if user already exists in Stack Auth
    const existingStackUser = await getStackUser(email);
    
    if (existingStackUser) {
      // Update with our data
      return await updateStackUserProfile(existingStackUser.id, {
        displayName: name,
        metadata: {
          ...existingStackUser.metadata,
          ...existingData,
          syncedAt: new Date().toISOString()
        }
      });
    } else {
      // Create new Stack Auth user
      return await createStackUser(email, name, {
        ...existingData,
        migratedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to sync user to Stack Auth:', error);
    return null;
  }
}

export { stackAuth };
