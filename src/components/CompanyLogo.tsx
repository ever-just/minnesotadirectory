import { useState, useEffect, useRef, useCallback } from 'react';
import { Company, LogoLoadingState, LogoMetadata } from '../lib/types';
import { logoService } from '../services/LogoService';

interface CompanyLogoProps {
  company: Company;
  size?: 'small' | 'medium' | 'large' | 'xl';
  className?: string;
  priority?: boolean; // For above-the-fold images
  onLoad?: (metadata: LogoMetadata) => void;
  onError?: (error: Error) => void;
  showQualityIndicator?: boolean; // Dev mode feature
  enableRetry?: boolean;
  lazy?: boolean;
}

const CompanyLogo = ({ 
  company, 
  size = 'medium',
  className = '',
  priority = false,
  onLoad,
  onError,
  showQualityIndicator = false,
  enableRetry = true,
  lazy = true
}: CompanyLogoProps) => {
  // State management
  const [loadingState, setLoadingState] = useState<LogoLoadingState>({
    status: 'idle',
    currentSource: null,
    retryCount: 0
  });
  
  const [logoMetadata, setLogoMetadata] = useState<LogoMetadata | null>(null);
  const [intersectionObserved, setIntersectionObserved] = useState(!lazy || priority);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const loadStartTime = useRef<number>(0);

  // Size configurations
  const sizeConfig = {
    small: { 
      width: 32, 
      height: 32, 
      className: 'w-8 h-8',
      fontSize: 'text-sm'
    },
    medium: { 
      width: 48, 
      height: 48, 
      className: 'w-12 h-12',
      fontSize: 'text-lg'
    },
    large: { 
      width: 96, 
      height: 96, 
      className: 'w-24 h-24',
      fontSize: 'text-2xl'
    },
    xl: {
      width: 128,
      height: 128,
      className: 'w-32 h-32',
      fontSize: 'text-4xl'
    }
  };

  const currentSize = sizeConfig[size];

  // Fetch logo metadata from service
  const fetchLogoMetadata = useCallback(async () => {
    if (!company.domain && !company.url) {
      setLoadingState({
        status: 'placeholder',
        currentSource: null,
        retryCount: 0
      });
      return;
    }

    try {
      setLoadingState(prev => ({ 
        ...prev, 
        status: 'loading' 
      }));
      loadStartTime.current = Date.now();

      const domain = company.domain || extractDomain(company.url);
      const metadata = await logoService.getCompanyLogo(domain, company.name);
      
      setLogoMetadata(metadata);
      setLoadingState(prev => ({
        ...prev,
        status: 'loaded',
        currentSource: metadata.bestSource || null,
        retryCount: 0
      }));

      onLoad?.(metadata);

    } catch (error) {
      // Reduced console output - only show in development
      if (process.env.NODE_ENV === 'development' && loadingState.retryCount === 0) {
        console.warn(`Logo fetch failed for ${company.name}:`, error);
      }
      
      if (enableRetry && loadingState.retryCount < 2) {
        // Exponential backoff retry
        const delay = Math.pow(2, loadingState.retryCount) * 1000;
        retryTimeoutRef.current = setTimeout(() => {
          setLoadingState(prev => ({
            ...prev,
            retryCount: prev.retryCount + 1
          }));
          fetchLogoMetadata();
        }, delay);
      } else {
        setLoadingState(prev => ({
          ...prev,
          status: 'placeholder',
          currentSource: null,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }));
        onError?.(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }, [company.name, company.domain, company.url, loadingState.retryCount, enableRetry, onLoad, onError]);

  // Reset logo state when company changes (fixes logo mismatch on filter changes)
  useEffect(() => {
    setLoadingState({
      status: 'idle',
      currentSource: null,
      retryCount: 0
    });
    setLogoMetadata(null);
    setImageLoaded(false);
  }, [company.name, company.domain, company.url]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) {
      setIntersectionObserved(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIntersectionObserved(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    const currentContainer = containerRef.current;
    if (currentContainer) {
      observer.observe(currentContainer);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority]);

  // Trigger fetch when intersection is observed
  useEffect(() => {
    if (intersectionObserved && loadingState.status === 'idle') {
      fetchLogoMetadata();
    }
  }, [intersectionObserved, loadingState.status, fetchLogoMetadata]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Handle image load events with smooth transition
  const handleImageLoad = useCallback(() => {
    const loadTime = Date.now() - loadStartTime.current;
    setLoadingState(prev => ({
      ...prev,
      loadTime
    }));
    // Smooth fade-in transition
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    if (!logoMetadata) return;

    // Try fallback source
    if (loadingState.currentSource === logoMetadata.bestSource && logoMetadata.fallbackSource) {
      setLoadingState(prev => ({
        ...prev,
        status: 'fallback',
        currentSource: logoMetadata.fallbackSource || null
      }));
    } else {
      // Final fallback to placeholder
      setLoadingState(prev => ({
        ...prev,
        status: 'placeholder',
        currentSource: null
      }));
    }
  }, [logoMetadata, loadingState.currentSource]);

  // Extract domain from URL utility
  const extractDomain = (url: string): string | null => {
    if (!url) return null;
    try {
      const fullUrl = url.includes('http') ? url : `https://${url}`;
      const domain = new URL(fullUrl).hostname;
      return domain.replace('www.', '');
    } catch {
      return null;
    }
  };

  // Generate placeholder component
  const renderPlaceholder = () => {
    const initial = company.name.charAt(0).toUpperCase();
    const colors = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-teal-600',
      'bg-gradient-to-br from-pink-500 to-rose-600',
      'bg-gradient-to-br from-yellow-500 to-orange-600',
      'bg-gradient-to-br from-indigo-500 to-blue-600',
      'bg-gradient-to-br from-red-500 to-pink-600'
    ];

    const colorIndex = company.name.charCodeAt(0) % colors.length;
    const gradientClass = colors[colorIndex];

    return (
      <div 
        className={`
          ${currentSize.className} 
          ${gradientClass}
          flex items-center justify-center 
          text-white font-semibold rounded-lg
          shadow-sm border border-gray-200
          ${className}
        `}
        role="img"
        aria-label={`${company.name} logo placeholder`}
      >
        <span className={`${currentSize.fontSize} select-none`}>
          {initial}
        </span>
        {showQualityIndicator && (
          <div className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs px-1 rounded text-[10px] leading-none">
            30
          </div>
        )}
      </div>
    );
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div 
      className={`
        ${currentSize.className}
        bg-gray-200 animate-pulse rounded-lg
        border border-gray-300
        ${className}
      `}
      role="img"
      aria-label="Loading company logo"
    />
  );

  // Render logo image with SMOOTH transitions
  const renderLogoImage = () => {
    if (!logoMetadata || !loadingState.currentSource) {
      return renderPlaceholder();
    }

    const source = loadingState.currentSource;
    const isPlaceholder = source.name === 'generated';
    const isFallback = loadingState.status === 'fallback';

    return (
      <div className={`${currentSize.className} ${className} relative overflow-hidden`}>
        {/* Show placeholder until image loads to prevent layout shift */}
        {!imageLoaded && !isPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        <img
          ref={imgRef}
          src={source.url}
          alt={`${company.name} logo`}
          className={`
            w-full h-full object-contain rounded-lg transition-opacity duration-300 ease-in-out
            ${isPlaceholder ? '' : 'bg-gray-50 border border-gray-200'}
            ${isFallback ? 'opacity-80' : ''}
            ${imageLoaded || isPlaceholder ? 'opacity-100' : 'opacity-0'}
          `}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{
            imageRendering: source.format === 'svg' ? 'auto' : '-webkit-optimize-contrast'
          }}
        />
        
        {/* Quality and source indicators for development */}
        {showQualityIndicator && logoMetadata && (
          <div className="absolute -top-1 -right-1 flex gap-1">
            <div className="bg-black text-white text-xs px-1 rounded text-[10px] leading-none">
              Q{Math.round(source.quality)}
            </div>
            {isFallback && (
              <div className="bg-yellow-500 text-white text-xs px-1 rounded text-[10px] leading-none">
                F
              </div>
            )}
            {source.responseTime && source.responseTime > 2000 && (
              <div className="bg-red-500 text-white text-xs px-1 rounded text-[10px] leading-none">
                SLOW
              </div>
            )}
          </div>
        )}

        {/* Loading indicator overlay */}
        {loadingState.status === 'loading' && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  };

  // Main render logic
  return (
    <div ref={containerRef} className="inline-block">
      {loadingState.status === 'idle' && renderLoadingSkeleton()}
      {loadingState.status === 'loading' && !logoMetadata && renderLoadingSkeleton()}
      {loadingState.status === 'placeholder' && renderPlaceholder()}
      {(loadingState.status === 'loaded' || loadingState.status === 'fallback' || loadingState.status === 'loading') && renderLogoImage()}
    </div>
  );
};

export default CompanyLogo;
