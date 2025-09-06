// Stack Auth Configuration
export const stackAuthConfig = {
  publicKey: process.env.STACK_PUBLIC_KEY || '',
  secretKey: process.env.STACK_SECRET_KEY || '', // Server-side only
  projectUrl: process.env.STACK_PROJECT_URL || '',
};

export const isStackAuthConfigured = () => {
  return !!(stackAuthConfig.publicKey && 
           stackAuthConfig.projectUrl && 
           !stackAuthConfig.publicKey.includes('REPLACE_ME') &&
           !stackAuthConfig.projectUrl.includes('REPLACE_ME'));
};

// Validate configuration
if (typeof window === 'undefined') { // Server-side check
  console.log('Stack Auth Config Status:', isStackAuthConfigured() ? '✅ Configured' : '❌ Not configured');
}
