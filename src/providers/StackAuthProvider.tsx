// Stack Auth Provider for React/Vite
import React, { createContext, useContext, useState, useEffect } from 'react';
import { stackAuthConfig, isStackAuthConfigured } from '../config/stackAuth';

interface User {
  id: string;
  email: string;
  displayName?: string;
  primaryEmail?: string;
}

interface StackAuthContextValue {
  isConfigured: boolean;
  isAuthenticated: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const StackAuthContext = createContext<StackAuthContextValue | undefined>(undefined);

export function useStackAuth() {
  const context = useContext(StackAuthContext);
  if (!context) {
    throw new Error('useStackAuth must be used within StackAuthProvider');
  }
  return context;
}

interface StackAuthProviderProps {
  children: React.ReactNode;
}

export function StackAuthProvider({ children }: StackAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isStackAuthConfigured();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('stack_auth_token');
        if (token && isConfigured) {
          // In a real implementation, validate the token with Stack Auth API
          const userData = JSON.parse(localStorage.getItem('stack_auth_user') || '{}');
          if (userData.email) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isConfigured]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      throw new Error('Stack Auth is not configured');
    }

    // Temporary implementation - in production, this would call Stack Auth API
    const mockUser = {
      id: '1',
      email,
      displayName: email.split('@')[0],
      primaryEmail: email
    };
    
    localStorage.setItem('stack_auth_token', 'mock_token');
    localStorage.setItem('stack_auth_user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!isConfigured) {
      throw new Error('Stack Auth is not configured');
    }

    // Temporary implementation
    const mockUser = {
      id: '1',
      email,
      displayName: name,
      primaryEmail: email
    };
    
    localStorage.setItem('stack_auth_token', 'mock_token');
    localStorage.setItem('stack_auth_user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const signOut = async () => {
    localStorage.removeItem('stack_auth_token');
    localStorage.removeItem('stack_auth_user');
    setUser(null);
  };

  const value: StackAuthContextValue = {
    isConfigured,
    isAuthenticated: !!user,
    user,
    signIn,
    signUp,
    signOut,
    loading
  };

  return (
    <StackAuthContext.Provider value={value}>
      {children}
    </StackAuthContext.Provider>
  );
}

export default StackAuthProvider;