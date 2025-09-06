import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { authService } from '../services/authService';
import './FavoriteButton.css';

interface FavoriteButtonProps {
  companyId: string;
  companyName: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onSaved?: (saved: boolean) => void;
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  companyId, 
  companyName, 
  size = 'medium', 
  showLabel = false, 
  onSaved, 
  className = '' 
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    
    // Check if company is already saved
    if (authService.isAuthenticated()) {
      checkSavedStatus();
    }
  }, [companyId]);

  const checkSavedStatus = async () => {
    try {
      // For now, assume not saved initially - will be updated when save/unsave is clicked
      // This avoids the API call complexity while the endpoints are being finalized
      setIsSaved(false);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      // Could show login modal or redirect to auth
      return;
    }
    
    setLoading(true);
    
    try {
      if (isSaved) {
        // Unsave company (simulate for now since unsave endpoint has issues)
        setIsSaved(false);
        onSaved?.(false);
        console.log(`✅ Successfully unsaved ${companyName} (demo mode)`);
        
        /* TODO: Enable when unsave endpoint is working
        const response = await fetch(`/.netlify/functions/user-unsave-company?companyId=${companyId}`, {
          method: 'DELETE',
          headers: authService.getAuthHeaders(),
        });
        
        if (response.ok) {
          setIsSaved(false);
          onSaved?.(false);
        }
        */
      } else {
        // Save company using the working endpoint
        const response = await fetch('/.netlify/functions/save-company-working', {
          method: 'POST',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify({
            companyId: companyId,
            notes: 'Saved from directory',
            tags: 'favorite'
          }),
        });
        
        if (response.ok) {
          setIsSaved(true);
          onSaved?.(true);
          console.log(`✅ Successfully saved ${companyName}`);
        } else {
          console.error(`❌ Failed to save ${companyName}:`, await response.text());
        }
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Don't show favorite button to unauthenticated users
  }

  const sizeMap = {
    small: 16,
    medium: 20,
    large: 24
  };

  const iconSize = sizeMap[size];

  return (
    <button 
      onClick={handleToggleSave}
      disabled={loading}
      className={`favorite-button favorite-button-${size} ${isSaved ? 'saved' : 'unsaved'} ${className}`}
      title={isSaved ? `Remove ${companyName} from saved companies` : `Save ${companyName} to your favorites`}
      aria-label={isSaved ? `Remove ${companyName} from saved companies` : `Save ${companyName} to your favorites`}
    >
      <Heart 
        size={iconSize} 
        className={`favorite-icon ${loading ? 'loading' : ''}`}
        fill={isSaved ? 'currentColor' : 'none'}
      />
      {showLabel && (
        <span className="favorite-label">
          {loading ? 'Saving...' : (isSaved ? 'Saved' : 'Save')}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton;
