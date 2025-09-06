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
      if (stackApp && typeof stackApp.signOut === 'function') {
        stackApp.signOut();
      } else {
        console.warn('Stack Auth not configured or signOut method not available');
      }
    },
    
    // Status
    isLoading: false, // Stack Auth handles loading states internally
  };
}

export default useStackAuth;
