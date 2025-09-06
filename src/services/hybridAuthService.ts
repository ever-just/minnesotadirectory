import { stackAuthConfig, isStackAuthConfigured } from '../config/stackAuth';
import authService from './authService'; // existing auth service

export interface HybridUser {
  id: string;
  email: string;
  name: string;
  isEmailVerified?: boolean;
  source: 'stack' | 'custom';
}

class HybridAuthService {
  isStackAuthEnabled(): boolean {
    return isStackAuthConfigured();
  }
  
  // This will be used during transition period
  getCurrentUser(): HybridUser | null {
    // During migration, we'll check both systems
    const existingUser = authService.getUser();
    
    if (existingUser) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        isEmailVerified: existingUser.isEmailVerified,
        source: 'custom'
      };
    }
    
    return null;
  }
  
  isAuthenticated(): boolean {
    if (this.isStackAuthEnabled()) {
      // Stack Auth will handle this via useStackAuth hook
      return false; // Let React components handle this
    }
    
    return authService.isAuthenticated();
  }
  
  async logout(): Promise<void> {
    if (this.isStackAuthEnabled()) {
      // Stack Auth logout will be handled by useStackAuth hook
      return;
    }
    
    return authService.logout();
  }
}

export const hybridAuthService = new HybridAuthService();
export default hybridAuthService;
