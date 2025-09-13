import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Shield, 
  Bell,
  Save,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { authService } from '../services/authService';
import './UserSettings.css';

interface UserSettingsProps {
  onClose: () => void;
  userEmail: string;
  userName: string;
}

type TabType = 'profile' | 'email' | 'privacy';

const UserSettings: React.FC<UserSettingsProps> = ({ onClose, userEmail, userName }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    name: userName,
    email: userEmail,
    phone: '',
    company: '',
    jobTitle: ''
  });
  
  // Email preferences
  const [emailPrefs, setEmailPrefs] = useState({
    marketingEmails: false,
    productUpdates: true,
    weeklyDigest: false,
    savedCompanyAlerts: true,
    newsletterSubscription: false
  });
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'private' as 'public' | 'private',
    showEmail: false,
    allowDataCollection: true,
    twoFactorEnabled: false
  });
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.email) setEmailPrefs(prefs.email);
        if (prefs.privacy) setPrivacySettings(prefs.privacy);
        if (prefs.profile) {
          setProfileData(prev => ({ ...prev, ...prefs.profile }));
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Save to localStorage for now
      const currentPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
      currentPrefs.profile = {
        phone: profileData.phone,
        company: profileData.company,
        jobTitle: profileData.jobTitle
      };
      localStorage.setItem('userPreferences', JSON.stringify(currentPrefs));
      
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailPrefs = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Save to localStorage
      const currentPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
      currentPrefs.email = emailPrefs;
      localStorage.setItem('userPreferences', JSON.stringify(currentPrefs));
      
      setSuccessMessage('Email preferences updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to update email preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Save to localStorage
      const currentPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
      currentPrefs.privacy = privacySettings;
      localStorage.setItem('userPreferences', JSON.stringify(currentPrefs));
      
      setSuccessMessage('Privacy settings updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to update privacy settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccessMessage(null);
    
    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError('Please fill in all password fields');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    setSaving(true);
    
    try {
      // In a real app, this would call an API endpoint
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderProfileTab = () => (
    <div className="settings-tab-content">
      <h3>Profile Information</h3>
      
      <div className="settings-form">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            disabled
            className="disabled"
          />
          <small>Contact support to change your name</small>
        </div>
        
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={profileData.email}
            disabled
            className="disabled"
          />
          <small>Your primary email address</small>
        </div>
        
        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div className="form-group">
          <label>Company</label>
          <input
            type="text"
            value={profileData.company}
            onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
            placeholder="Your company name"
          />
        </div>
        
        <div className="form-group">
          <label>Job Title</label>
          <input
            type="text"
            value={profileData.jobTitle}
            onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
            placeholder="Your job title"
          />
        </div>
        
        <button 
          className="save-button"
          onClick={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save size={16} />
              Save Profile
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderEmailTab = () => (
    <div className="settings-tab-content">
      <h3>Email Preferences</h3>
      <p className="settings-description">
        Choose which emails you'd like to receive from us.
      </p>
      
      <div className="settings-form">
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emailPrefs.productUpdates}
              onChange={(e) => setEmailPrefs({ ...emailPrefs, productUpdates: e.target.checked })}
            />
            <span className="checkbox-text">
              <strong>Product Updates</strong>
              <small>New features and improvements to the platform</small>
            </span>
          </label>
        </div>
        
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emailPrefs.savedCompanyAlerts}
              onChange={(e) => setEmailPrefs({ ...emailPrefs, savedCompanyAlerts: e.target.checked })}
            />
            <span className="checkbox-text">
              <strong>Saved Company Alerts</strong>
              <small>Updates about companies you've saved</small>
            </span>
          </label>
        </div>
        
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emailPrefs.weeklyDigest}
              onChange={(e) => setEmailPrefs({ ...emailPrefs, weeklyDigest: e.target.checked })}
            />
            <span className="checkbox-text">
              <strong>Weekly Digest</strong>
              <small>Summary of new companies and trending businesses</small>
            </span>
          </label>
        </div>
        
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emailPrefs.marketingEmails}
              onChange={(e) => setEmailPrefs({ ...emailPrefs, marketingEmails: e.target.checked })}
            />
            <span className="checkbox-text">
              <strong>Marketing Emails</strong>
              <small>Promotional offers and partner communications</small>
            </span>
          </label>
        </div>
        
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emailPrefs.newsletterSubscription}
              onChange={(e) => setEmailPrefs({ ...emailPrefs, newsletterSubscription: e.target.checked })}
            />
            <span className="checkbox-text">
              <strong>Newsletter</strong>
              <small>Monthly newsletter with business insights</small>
            </span>
          </label>
        </div>
        
        <button 
          className="save-button"
          onClick={handleSaveEmailPrefs}
          disabled={saving}
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save size={16} />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="settings-tab-content">
      <h3>Privacy & Security</h3>
      
      <div className="settings-form">
        <div className="settings-section">
          <h4>Privacy Settings</h4>
          
          <div className="form-group">
            <label>Profile Visibility</label>
            <select
              value={privacySettings.profileVisibility}
              onChange={(e) => setPrivacySettings({ 
                ...privacySettings, 
                profileVisibility: e.target.value as 'public' | 'private' 
              })}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <small>Control who can see your profile information</small>
          </div>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={privacySettings.showEmail}
                onChange={(e) => setPrivacySettings({ ...privacySettings, showEmail: e.target.checked })}
              />
              <span className="checkbox-text">
                <strong>Show Email Address</strong>
                <small>Allow others to see your email address</small>
              </span>
            </label>
          </div>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={privacySettings.allowDataCollection}
                onChange={(e) => setPrivacySettings({ ...privacySettings, allowDataCollection: e.target.checked })}
              />
              <span className="checkbox-text">
                <strong>Analytics & Improvements</strong>
                <small>Help us improve by sharing usage data</small>
              </span>
            </label>
          </div>
        </div>
        
        <div className="settings-section">
          <h4>Change Password</h4>
          
          <div className="form-group">
            <label>Current Password</label>
            <div className="password-input">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>New Password</label>
            <div className="password-input">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="password-input">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button 
            className="save-button"
            onClick={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <>Changing Password...</>
            ) : (
              <>
                <Key size={16} />
                Change Password
              </>
            )}
          </button>
        </div>
        
        <div className="settings-section">
          <h4>Security</h4>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={privacySettings.twoFactorEnabled}
                onChange={(e) => setPrivacySettings({ ...privacySettings, twoFactorEnabled: e.target.checked })}
              />
              <span className="checkbox-text">
                <strong>Two-Factor Authentication</strong>
                <small>Add an extra layer of security to your account</small>
              </span>
            </label>
          </div>
          
          <button 
            className="save-button"
            onClick={handleSavePrivacy}
            disabled={saving}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={16} />
                Save Security Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="user-settings-overlay" onClick={onClose}>
      <div className="user-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="alert alert-success">
            <Check size={18} />
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            Profile
          </button>
          <button
            className={`tab-button ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={18} />
            Email
          </button>
          <button
            className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Shield size={18} />
            Privacy & Security
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="settings-content">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'email' && renderEmailTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
        </div>
      </div>
    </div>
  );
};

export default UserSettings;