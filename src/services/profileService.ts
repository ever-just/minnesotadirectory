import { authService } from './authService';

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

export interface ProfileResponse {
  success: boolean;
  profile?: UserProfile;
  source?: 'stack-auth' | 'fallback';
  error?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  message?: string;
  updatedAt?: string;
  error?: string;
}

class ProfileService {
  private static readonly API_BASE = '/.netlify/functions';

  /**
   * Get enhanced user profile from Stack Auth backend
   */
  async getUserProfile(): Promise<ProfileResponse> {
    try {
      if (!authService.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      const headers = authService.getAuthHeaders();
      
      const response = await fetch(`${ProfileService.API_BASE}/profile-get`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Profile loaded from ${data.source || 'unknown'} source`);
      
      return data;
      
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update user preferences (email notifications, etc.)
   */
  async updatePreferences(preferences: Partial<UserProfile['preferences']>): Promise<ProfileUpdateResponse> {
    try {
      if (!authService.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      const headers = {
        ...authService.getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${ProfileService.API_BASE}/profile-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          updateType: 'preferences',
          data: preferences
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Preferences updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update basic profile info (name, etc.)
   */
  async updateProfile(profileData: { name?: string; profileImage?: string }): Promise<ProfileUpdateResponse> {
    try {
      if (!authService.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      const headers = {
        ...authService.getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${ProfileService.API_BASE}/profile-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          updateType: 'profile',
          data: profileData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Profile updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update security settings
   */
  async updateSecurity(securitySettings: { twoFactorEnabled?: boolean }): Promise<ProfileUpdateResponse> {
    try {
      if (!authService.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      const headers = {
        ...authService.getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${ProfileService.API_BASE}/profile-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          updateType: 'security',
          data: securitySettings
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Security settings updated successfully');
      
      return result;
      
    } catch (error) {
      console.error('Failed to update security settings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get available OAuth providers and connection status
   */
  async getOAuthStatus(): Promise<{ google: boolean; github: boolean }> {
    try {
      const profile = await this.getUserProfile();
      
      if (profile.success && profile.profile) {
        return {
          google: profile.profile.socialAccounts.google?.connected || false,
          github: profile.profile.socialAccounts.github?.connected || false
        };
      }
      
      return { google: false, github: false };
      
    } catch (error) {
      console.error('Failed to get OAuth status:', error);
      return { google: false, github: false };
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService();
export default profileService;
