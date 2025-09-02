import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  count?: number;
  variant?: 'company-card' | 'company-list' | 'text' | 'circle';
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  count = 1, 
  variant = 'company-card',
  className = '' 
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div key={index} className={`skeleton skeleton-${variant} ${className}`}>
      {variant === 'company-card' && (
        <>
          <div className="skeleton-logo"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-subtitle"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-tags">
              <div className="skeleton-tag"></div>
              <div className="skeleton-tag"></div>
            </div>
          </div>
        </>
      )}
      
      {variant === 'company-list' && (
        <>
          <div className="skeleton-list-logo"></div>
          <div className="skeleton-list-content">
            <div className="skeleton-list-title"></div>
            <div className="skeleton-list-subtitle"></div>
          </div>
        </>
      )}
      
      {variant === 'text' && <div className="skeleton-text-line"></div>}
      
      {variant === 'circle' && <div className="skeleton-circle"></div>}
    </div>
  ));

  return <>{skeletons}</>;
};

export default SkeletonLoader;
