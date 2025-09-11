// Stack Auth Configuration
export const stackAuthConfig = {
  projectId: import.meta.env.VITE_STACK_PROJECT_ID || '0a08a082-f36e-4983-8e82-f090cad88df1',
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY || 'pck_36egmmz37c6zkkkmd40g96vgzqfpxt20dj321pv9yge7r',
  secretServerKey: import.meta.env.VITE_STACK_SECRET_SERVER_KEY || '', // Server-side only
};

export const isStackAuthConfigured = () => {
  return !!(stackAuthConfig.projectId && 
           stackAuthConfig.publishableClientKey && 
           stackAuthConfig.projectId !== '');
};

// Validate configuration
if (typeof window === 'undefined') { // Server-side check
  console.log('Stack Auth Config Status:', isStackAuthConfigured() ? '✅ Configured' : '❌ Not configured');
}
