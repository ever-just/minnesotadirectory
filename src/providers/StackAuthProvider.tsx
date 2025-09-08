// import { StackProvider, StackClientApp } from '@stackframe/stack';
import { stackAuthConfig, isStackAuthConfigured } from '../config/stackAuth';

interface StackAuthProviderProps {
  children: React.ReactNode;
}

export function StackAuthProvider({ children }: StackAuthProviderProps) {
  // If Stack Auth is not configured, render children without provider
  if (!isStackAuthConfigured()) {
    console.warn('Stack Auth not configured, falling back to existing auth');
    return <>{children}</>;
  }

  // Initialize Stack client app
  const stackApp = new StackClientApp({
    tokenStore: "memory", 
    publishableClientKey: stackAuthConfig.publishableClientKey,
  });

  return (
    <StackProvider app={stackApp}>
      {children}
    </StackProvider>
  );
}

export default StackAuthProvider;
