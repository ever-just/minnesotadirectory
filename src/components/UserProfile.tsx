import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Bell, 
  Shield, 
  Camera, 
  Save,
  X,
  Check,
  AlertCircle,
  Link as LinkIcon,
  Settings
} from 'lucide-react';
import { profileService, UserProfile as UserProfileData } from '../services/profileService';

interface UserProfileProps {
  onClose: () => void;
  userEmail: string;
  userName: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose, userEmail, userName }) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'social'>('profile');

  // Form state
  const [formData, setFormData] = useState({
    name: userName,
    profileImage: '',
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
      weeklyDigest: true,
    },
    security: {
      twoFactorEnabled: false
    }
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileService.getUserProfile();
      
      if (response.success && response.profile) {
        setProfile(response.profile);
        setFormData({
          name: response.profile.name,
          profileImage: response.profile.profileImage || '',
          preferences: response.profile.preferences,
          security: {
            twoFactorEnabled: response.profile.security.twoFactorEnabled
          }
        });
      } else {
        setError(response.error || 'Failed to load profile');
      }
    } catch (error) {
      setError('Failed to load profile');
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updateType: string) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      let result;
      switch (updateType) {
        case 'profile':
          result = await profileService.updateProfile({
            name: formData.name,
            profileImage: formData.profileImage
          });
          break;
          
        case 'preferences':
          result = await profileService.updatePreferences(formData.preferences);
          break;
          
        case 'security':
          result = await profileService.updateSecurity(formData.security);
          break;
          
        default:
          setError('Invalid update type');
          return;
      }

      if (result.success) {
        setSuccessMessage(`${updateType} updated successfully!`);
        await loadProfile(); // Reload to get latest data
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Update failed');
      }
      
    } catch (error) {
      setError('Failed to save changes');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const TabButton = ({ id, label, isActive, onClick }: { 
    id: string; 
    label: string; 
    isActive: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive 
          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content user-profile-modal" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-profile-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Account Settings</h2>
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="alert alert-success">
            <Check size={20} />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <TabButton
            id="profile"
            label="Profile"
            isActive={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
          <TabButton
            id="preferences"
            label="Preferences"
            isActive={activeTab === 'preferences'}
            onClick={() => setActiveTab('preferences')}
          />
          <TabButton
            id="security"
            label="Security"
            isActive={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
          />
          <TabButton
            id="social"
            label="Social Accounts"
            isActive={activeTab === 'social'}
            onClick={() => setActiveTab('social')}
          />
        </div>

        <div className="modal-body">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content">
              <h3 className="section-title">
                <User size={20} />
                Basic Profile Information
              </h3>
              
              <div className="form-group">
                <label htmlFor="name">Display Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={userEmail}
                  disabled
                  className="form-input disabled"
                />
                <p className="form-help">Email address cannot be changed</p>
              </div>

              <div className="form-group">
                <label htmlFor="profileImage">Profile Image URL (Optional)</label>
                <input
                  type="url"
                  id="profileImage"
                  value={formData.profileImage}
                  onChange={(e) => setFormData({...formData, profileImage: e.target.value})}
                  className="form-input"
                  placeholder="https://example.com/your-photo.jpg"
                />
              </div>

              <button
                onClick={() => handleSave('profile')}
                disabled={saving}
                className="btn-primary"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="tab-content">
              <h3 className="section-title">
                <Bell size={20} />
                Notification Preferences
              </h3>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.preferences.emailNotifications}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, emailNotifications: e.target.checked }
                    })}
                  />
                  <span>Email Notifications</span>
                  <p className="checkbox-help">Get notified about saved companies and updates</p>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.preferences.weeklyDigest}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, weeklyDigest: e.target.checked }
                    })}
                  />
                  <span>Weekly Digest</span>
                  <p className="checkbox-help">Receive weekly updates about Minnesota business news</p>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.preferences.marketingEmails}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, marketingEmails: e.target.checked }
                    })}
                  />
                  <span>Marketing Emails</span>
                  <p className="checkbox-help">Receive promotional emails and special offers</p>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.preferences.smsNotifications}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, smsNotifications: e.target.checked }
                    })}
                  />
                  <span>SMS Notifications (Coming Soon)</span>
                  <p className="checkbox-help">Receive text message alerts</p>
                </label>
              </div>

              <button
                onClick={() => handleSave('preferences')}
                disabled={saving}
                className="btn-primary"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="tab-content">
              <h3 className="section-title">
                <Shield size={20} />
                Security & Privacy
              </h3>

              <div className="security-section">
                <div className="security-item">
                  <div className="security-info">
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.security.twoFactorEnabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        security: { ...formData.security, twoFactorEnabled: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="security-item">
                  <div className="security-info">
                    <h4>Last Login</h4>
                    <p>{profile?.security.lastLogin ? new Date(profile.security.lastLogin).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSave('security')}
                disabled={saving}
                className="btn-primary"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Security Settings'}
              </button>
            </div>
          )}

          {/* Social Accounts Tab */}
          {activeTab === 'social' && (
            <div className="tab-content">
              <h3 className="section-title">
                <LinkIcon size={20} />
                Connected Accounts
              </h3>

              <div className="social-accounts">
                <div className="social-account-item">
                  <div className="social-account-info">
                    <div className="social-icon google"></div>
                    <div>
                      <h4>Google</h4>
                      <p>{profile?.socialAccounts.google?.connected 
                          ? `Connected: ${profile.socialAccounts.google.email}` 
                          : 'Not connected'}</p>
                    </div>
                  </div>
                  <button className="btn-secondary">
                    {profile?.socialAccounts.google?.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>

                <div className="social-account-item">
                  <div className="social-account-info">
                    <div className="social-icon github"></div>
                    <div>
                      <h4>GitHub</h4>
                      <p>{profile?.socialAccounts.github?.connected 
                          ? `Connected: ${profile.socialAccounts.github.username}` 
                          : 'Not connected'}</p>
                    </div>
                  </div>
                  <button className="btn-secondary">
                    {profile?.socialAccounts.github?.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>

              <div className="help-text">
                <p><strong>Social Login Coming Soon:</strong> Connect your Google or GitHub accounts to enable one-click sign-in.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
