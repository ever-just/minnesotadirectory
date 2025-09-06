import React from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackAuthConfig, isStackAuthConfigured } from '../config/stackAuth';

const theme: StackTheme = {
  colorPrimary: '#3498db',
  colorSecondary: '#2ecc71', 
  colorBackground: '#ffffff',
  colorForeground: '#2c3e50',
  borderRadius: '8px',
};

interface StackAuthProviderProps {
  children: React.ReactNode;
}

export function StackAuthProvider({ children }: StackAuthProviderProps) {
  // If Stack Auth is not configured, render children without provider
  if (!isStackAuthConfigured()) {
    console.warn('Stack Auth not configured, falling back to existing auth');
    return <>{children}</>;
  }

  return (
    <StackProvider
      projectId={stackAuthConfig.projectId}
      urls={{
        signIn: '/auth/sign-in',
        signUp: '/auth/sign-up',
        afterSignIn: '/',
        afterSignUp: '/',
        afterSignOut: '/',
        home: '/',
      }}
      theme={theme}
    >
      {children}
    </StackProvider>
  );
}

export default StackAuthProvider;
