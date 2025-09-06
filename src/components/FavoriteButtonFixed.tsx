import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { authService } from '../services/authService';
import { optimizedSavedCompaniesService } from '../services/optimizedSavedCompaniesService';
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
    
    // Check saved status instantly with optimized service
    if (companyId) {
      setIsSaved(optimizedSavedCompaniesService.isCompanySavedOptimized(companyId));
    }
  }, [companyId]);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔍 Heart button clicked!', { 
      companyId, 
      companyIdType: typeof companyId, 
      companyIdLength: companyId?.length,
      companyName, 
      isAuthenticated 
    });
    
    if (!isAuthenticated) {
      console.log('❌ User not authenticated - cannot save company');
      return;
    }
    
    if (!companyId) {
      console.log('❌ No company ID provided', { companyId, type: typeof companyId });
      return;
    }
    
    setLoading(true);
    console.log(`🎯 ${isSaved ? 'Unsaving' : 'Saving'} ${companyName} (ID: ${companyId})`);
    
    try {
      if (isSaved) {
        // Unsave with optimized service (instant)
        setIsSaved(false);
        onSaved?.(false);
        
        const success = await optimizedSavedCompaniesService.unsaveCompanyOptimized(companyId, companyName);
        if (success) {
          console.log(`💔 Removed ${companyName} from your favorites`);
        } else {
          // Rollback on error
          setIsSaved(true);
          console.error(`❌ Failed to unsave ${companyName}`);
        }
      } else {
        // Save with optimized service (instant)
        console.log(`🚀 Saving ${companyName} instantly...`);
        
        setIsSaved(true);
        onSaved?.(true);
        
        const success = await optimizedSavedCompaniesService.saveCompanyOptimized(companyId, companyName);
        if (success) {
          console.log(`✅ Successfully saved ${companyName} to your favorites!`);
        } else {
          // Rollback on error
          setIsSaved(false);
          console.error(`❌ Failed to save ${companyName}`);
        }
      }
    } catch (error) {
      console.error('❌ Heart button error:', error);
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
      title={isSaved ? `Remove ${companyName} from favorites` : `Save ${companyName} to your favorites`}
      aria-label={isSaved ? `Remove ${companyName} from favorites` : `Save ${companyName} to your favorites`}
    >
      <Star 
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
