import React, { useState, useEffect } from 'react';
import { User, LogIn } from 'lucide-react';
import AuthModal from './AuthModal';
import { authService } from '../services/authService';
import './UserIcon.css';

const UserIcon: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getUser();
          if (currentUser) {
            setUser({
              name: currentUser.name,
              email: currentUser.email
            });
            setIsAuthenticated(true);
          } else {
            // Token exists but user data is missing, verify token
            const isValid = await authService.verifyToken();
            if (isValid) {
              const verifiedUser = authService.getUser();
              if (verifiedUser) {
                setUser({
                  name: verifiedUser.name,
                  email: verifiedUser.email
                });
                setIsAuthenticated(true);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // If auth check fails, clear any invalid tokens
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleIconClick = () => {
    if (isAuthenticated) {
      handleLogout();
    } else {
      setShowAuthModal(true);
    }
  };

  const handleLogin = (userData: {name: string, email: string}) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Show loading state briefly while checking authentication
  if (loading) {
    return (
      <div className="user-icon-container">
        <button className="user-icon-button unauthenticated" disabled>
          <LogIn className="user-icon" size={24} style={{ opacity: 0.5 }} />
        </button>
      </div>
    );
  }

  return (
    <div className="user-icon-container">
      <button 
        onClick={handleIconClick}
        className={`user-icon-button ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}
        title={isAuthenticated ? `Logout ${user?.name}` : 'Sign in or Sign up'}
      >
        {isAuthenticated ? (
          <User className="user-icon" size={24} />
        ) : (
          <LogIn className="user-icon" size={24} />
        )}
      </button>
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
};

export default UserIcon;