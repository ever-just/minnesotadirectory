import React, { useState } from 'react';
import { User, LogIn, LogOut } from 'lucide-react';
import AuthModal from './AuthModal';
import './UserIcon.css';

interface UserIconProps {}

const UserIcon: React.FC<UserIconProps> = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string, email: string} | null>(null);

  const handleIconClick = () => {
    if (isAuthenticated) {
      // Show user menu or logout
      handleLogout();
    } else {
      // Show login modal
      setShowAuthModal(true);
    }
  };

  const handleLogin = (userData: {name: string, email: string}) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

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
