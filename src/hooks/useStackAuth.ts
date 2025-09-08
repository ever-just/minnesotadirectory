// import { useUser, useStackApp } from '@stackframe/stack';
import { isStackAuthConfigured } from '../config/stackAuth';

export function useStackAuth() {
  // const user = useUser();
  // const stackApp = useStackApp();
  
  const isConfigured = false; // isStackAuthConfigured();
  const isAuthenticated = false;
  
  return {
    // User data
    user: null,
    isAuthenticated,
    isConfigured,
    
    // User properties (safe access)
    userId: null,
    email: null,
    name: null,
    profileImageUrl: null,
    
    // Auth methods
    signOut: () => {
      console.warn('Stack Auth not configured');
    },
    
    // Status
    isLoading: false, // Stack Auth handles loading states internally
  };
}

export default useStackAuth;
