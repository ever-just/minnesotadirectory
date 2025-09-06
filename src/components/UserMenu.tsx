import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  LogIn, 
  Star, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Activity, 
  Bookmark,
  UserCircle,
  Mail,
  Shield
} from 'lucide-react';
import AuthModal from './AuthModal';
import { authService } from '../services/authService';
import { optimizedSavedCompaniesService } from '../services/optimizedSavedCompaniesService';
import './UserMenu.css';

interface UserMenuProps {
  onNavigateToSaved?: () => void;
  onShowProfile?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onNavigateToSaved, onShowProfile }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            
            // Get saved companies count instantly
            try {
              const count = optimizedSavedCompaniesService.getSavedCountOptimized();
              setSavedCount(count);
            } catch (error) {
              console.error('Error getting saved count:', error);
            }
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
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleIconClick = () => {
    if (isAuthenticated) {
      setShowDropdown(!showDropdown);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleLogin = (userData: {name: string, email: string}) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowAuthModal(false);
    // Refresh saved companies count
    setSavedCount(optimizedSavedCompaniesService.getSavedCountOptimized());
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setShowDropdown(false);
    setSavedCount(0);
    optimizedSavedCompaniesService.clearCache();
  };

    const handleNavigateToSaved = () => {
      setShowDropdown(false);
      // Navigate to dedicated saved companies page
      window.location.href = '/saved';
    };

  const handleShowProfile = () => {
    setShowDropdown(false);
    onShowProfile?.();
  };

  // Show loading state briefly while checking authentication
  if (loading) {
    return (
      <div className="user-menu-container">
        <button className="user-menu-button unauthenticated" disabled>
          <LogIn size={24} style={{ opacity: 0.5 }} />
        </button>
      </div>
    );
  }

  return (
    <div className="user-menu-container" ref={dropdownRef}>
      <button 
        onClick={handleIconClick}
        className={`user-menu-button ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}
        title={isAuthenticated ? `${user?.name} - Click for menu` : 'Sign in or Sign up'}
      >
        {isAuthenticated ? (
          <>
            <User className="user-icon" size={24} />
            <ChevronDown className="dropdown-arrow" size={16} />
          </>
        ) : (
          <LogIn className="user-icon" size={24} />
        )}
      </button>
      
      {/* User Dropdown Menu */}
      {isAuthenticated && showDropdown && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="user-avatar">
              <UserCircle size={32} />
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          
          <div className="dropdown-divider" />
          
          <div className="dropdown-section">
            <button onClick={handleNavigateToSaved} className="dropdown-item">
              <Star size={18} />
              <span>Saved Companies</span>
              {savedCount > 0 && (
                <span className="saved-count">{savedCount}</span>
              )}
            </button>
            
            <button onClick={() => {/* TODO: Activity page */}} className="dropdown-item">
              <Activity size={18} />
              <span>Activity</span>
            </button>
            
            <button onClick={() => {/* TODO: Bookmarks */}} className="dropdown-item">
              <Bookmark size={18} />
              <span>Bookmarks</span>
            </button>
          </div>
          
          <div className="dropdown-divider" />
          
          <div className="dropdown-section">
            <button onClick={handleShowProfile} className="dropdown-item">
              <Settings size={18} />
              <span>Account Settings</span>
            </button>
            
            <button onClick={() => {/* TODO: Email preferences */}} className="dropdown-item">
              <Mail size={18} />
              <span>Email Preferences</span>
            </button>
            
            <button onClick={() => {/* TODO: Privacy settings */}} className="dropdown-item">
              <Shield size={18} />
              <span>Privacy & Security</span>
            </button>
          </div>
          
          <div className="dropdown-divider" />
          
          <button onClick={handleLogout} className="dropdown-item logout">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
      
      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
};

export default UserMenu;
