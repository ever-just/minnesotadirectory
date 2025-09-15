import React, { useState, useEffect, useCallback } from 'react';
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

  const checkSavedStatus = useCallback(async () => {
    try {
      // Check localStorage to see if this company is saved
      const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
      const isSaved = savedIds.includes(companyId);
      setIsSaved(isSaved);
      console.log(`🔍 Company ${companyName} saved status: ${isSaved}`);
    } catch (error) {
      console.error('Error checking saved status:', error);
      setIsSaved(false);
    }
  }, [companyId, companyName]);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    
    // Check if company is already saved
    if (authService.isAuthenticated()) {
      checkSavedStatus();
    }
  }, [companyId, checkSavedStatus]);

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
        // Unsave company - update localStorage immediately
        const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
        const updatedIds = savedIds.filter(id => id !== companyId);
        localStorage.setItem('savedCompanies', JSON.stringify(updatedIds));
        
        setIsSaved(false);
        onSaved?.(false);
        console.log(`✅ Successfully unsaved ${companyName} from localStorage`);
        
        // Background API call to sync with server (don't wait for it)
        fetch(`/.netlify/functions/favorites-remove?companyId=${companyId}`, {
          method: 'DELETE',
          headers: authService.getAuthHeaders(),
        }).catch(() => {
          console.log(`⚠️ Background unsave API failed, but localStorage updated`);
        });
      } else {
        // Save company - update localStorage immediately
        const savedIds = JSON.parse(localStorage.getItem('savedCompanies') || '[]') as string[];
        if (!savedIds.includes(companyId)) {
          savedIds.push(companyId);
          localStorage.setItem('savedCompanies', JSON.stringify(savedIds));
        }
        
        setIsSaved(true);
        onSaved?.(true);
        console.log(`✅ Successfully saved ${companyName} to localStorage`);
        
        // Background API call to sync with server (don't wait for it)
        fetch('/.netlify/functions/favorites-save', {
          method: 'POST',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify({
            companyId: companyId,
            notes: 'Saved from directory',
            tags: 'favorite'
          }),
        }).catch(() => {
          console.log(`⚠️ Background save API failed, but localStorage updated`);
        });
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
