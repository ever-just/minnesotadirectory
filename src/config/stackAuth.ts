// Stack Auth Configuration
export const stackAuthConfig = {
  projectId: process.env.STACK_PUBLIC_KEY?.replace('pk_test_', '').replace('pk_prod_', '') || '',
  projectUrl: process.env.STACK_PROJECT_URL || '',
  publicKey: process.env.STACK_PUBLIC_KEY || '',
  secretKey: process.env.STACK_SECRET_KEY || '', // Server-side only
};

export const isStackAuthConfigured = () => {
  return !!(stackAuthConfig.projectId && 
           stackAuthConfig.projectUrl && 
           stackAuthConfig.publicKey &&
           !stackAuthConfig.projectUrl.includes('REPLACE_ME'));
};

// Validate configuration
if (typeof window === 'undefined') { // Server-side check
  console.log('Stack Auth Config Status:', isStackAuthConfigured() ? '✅ Configured' : '❌ Not configured');
}
