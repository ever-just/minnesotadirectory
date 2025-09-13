import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  LogIn, 
  Star, 
  Settings, 
  LogOut, 
  ChevronDown, 
  UserCircle,
  Mail,
  Shield
} from 'lucide-react';
import AuthModal from './AuthModal';
import UserSettings from './UserSettings';
import { authService } from '../services/authService';
import { optimizedSavedCompaniesService } from '../services/optimizedSavedCompaniesService';
import './UserMenu.css';

interface UserMenuProps {
  onNavigateToSaved?: () => void;
  // onShowProfile removed - component handles its own profile modal
}

const UserMenu: React.FC<UserMenuProps> = ({ onNavigateToSaved }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'email' | 'privacy'>('profile');
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
    console.log('🔍 UserMenu clicked!', { isAuthenticated, showDropdown });
    if (isAuthenticated) {
      const newDropdownState = !showDropdown;
      setShowDropdown(newDropdownState);
      console.log('🔄 Dropdown state changed to:', newDropdownState);
    } else {
      setShowAuthModal(true);
      console.log('🔐 Showing auth modal for unauthenticated user');
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
      console.log('🔗 Navigating to saved companies...');
      setShowDropdown(false);
      // Use provided callback or fallback to direct navigation
      if (onNavigateToSaved) {
        onNavigateToSaved();
      } else {
        window.location.href = '/saved';
      }
    };

  const handleShowProfile = () => {
    console.log('👤 Opening Profile Settings...');
    setShowDropdown(false);
    setActiveSettingsTab('profile');
    setShowSettings(true);
  };


  const handleEmailPreferences = () => {
    console.log('✉️ Opening Email Preferences...');
    setShowDropdown(false);
    setActiveSettingsTab('email');
    setShowSettings(true);
  };

  const handlePrivacySecurity = () => {
    console.log('🔒 Opening Privacy & Security...');
    setShowDropdown(false);
    setActiveSettingsTab('privacy');
    setShowSettings(true);
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
          <User className="user-icon" size={24} />
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
          </div>
          
          <div className="dropdown-divider" />
          
          <div className="dropdown-section">
            <button onClick={handleShowProfile} className="dropdown-item">
              <Settings size={18} />
              <span>Profile</span>
            </button>
            
            <button onClick={handleEmailPreferences} className="dropdown-item">
              <Mail size={18} />
              <span>Email Preferences</span>
            </button>
            
            <button onClick={handlePrivacySecurity} className="dropdown-item">
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
      
      {/* User Settings Modal */}
      {showSettings && user && (
        <UserSettings
          onClose={() => setShowSettings(false)}
          userEmail={user.email}
          userName={user.name}
        />
      )}
    </div>
  );
};

export default UserMenu;
