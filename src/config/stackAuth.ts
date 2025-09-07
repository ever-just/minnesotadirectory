// Stack Auth Configuration
export const stackAuthConfig = {
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || '',
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || '',
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY || '', // Server-side only
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
