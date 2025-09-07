import { useUser, useStackApp } from '@stackframe/stack';
import { isStackAuthConfigured } from '../config/stackAuth';

export function useStackAuth() {
  const user = useUser();
  const stackApp = useStackApp();
  
  const isConfigured = isStackAuthConfigured();
  const isAuthenticated = isConfigured && !!user;
  
  return {
    // User data
    user: user || null,
    isAuthenticated,
    isConfigured,
    
    // User properties (safe access)
    userId: user?.id || null,
    email: user?.primaryEmail || null,
    name: user?.displayName || null,
    profileImageUrl: user?.profileImageUrl || null,
    
    // Auth methods
    signOut: () => {
      if (stackApp) {
        // Use Stack Auth's recommended signOut method
        window.location.href = '/auth/sign-out';
      } else {
        console.warn('Stack Auth not configured');
      }
    },
    
    // Status
    isLoading: false, // Stack Auth handles loading states internally
  };
}

export default useStackAuth;
