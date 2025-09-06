import { Company } from '../lib/types';
import { Link } from 'react-router-dom';
import { useCallback, useRef } from 'react';
import CompanyCard from './CompanyCard';
import SkeletonLoader from './SkeletonLoader';

interface CompanyGridProps {
  companies: Company[];
  loading: boolean;
  showSkeleton?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const CompanyGrid = ({ companies, loading, showSkeleton = false, onLoadMore, hasMore }: CompanyGridProps) => {
  const observerRef = useRef<IntersectionObserver>();
  
  // Debug logging
  console.log(`🔧 CompanyGrid render: loading=${loading}, companies.length=${companies.length}, hasMore=${hasMore}`);
  
  // Intersection Observer for infinite scroll
  const lastCompanyRef = useCallback((node: HTMLAnchorElement | null) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && onLoadMore) {
        console.log('🔄 Triggering load more...');
        onLoadMore();
      }
    }, {
      rootMargin: '100px' // Trigger loading 100px before reaching the end
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, onLoadMore]);

  if (showSkeleton || (loading && companies.length === 0)) {
    console.log('🎨 SHOWING SKELETON: showSkeleton=', showSkeleton, 'loading=', loading, 'companies.length=', companies.length);
    return (
      <div className="company-grid-container">
        <div className="company-grid">
          <SkeletonLoader count={12} variant="company-card" />
        </div>
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
          Loading companies from database...
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="no-results">
        <div>No companies found matching your criteria.</div>
        <div className="no-results-suggestion">Try adjusting your search or industry filter.</div>
      </div>
    );
  }

  return (
    <div className="company-grid-container">
      <div className="company-grid">
        {companies.map((company, index) => {
          const isLast = index === companies.length - 1;
          
          return (
            <Link 
              key={`${company.name}-${company.city}-${index}`}
              to={`/company/${encodeURIComponent(company.name)}`} 
              className="company-card-link"
              style={{ textDecoration: 'none', color: 'inherit' }}
              ref={isLast ? lastCompanyRef : null}
            >
              <CompanyCard 
                company={company} 
                priority={index < 50} // First 50 companies get priority loading
              />
            </Link>
          );
        })}
      </div>
      
      {/* Loading More State with Skeleton */}
      {loading && companies.length > 0 && (
        <div className="loading-more">
          <SkeletonLoader count={6} variant="company-card" className="skeleton-loading-more" />
        </div>
      )}
      
      {/* End of Results State */}
      {!hasMore && companies.length > 500 && (
        <div className="end-of-results">
          <div className="end-message">
            ✅ All {companies.length.toLocaleString()} companies loaded
          </div>
          <div className="end-suggestion">
            Use the industry filter or search to find specific companies.
          </div>
        </div>
      )}
      
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <div>Visible: {companies.length} | Has More: {hasMore ? 'Yes' : 'No'} | Loading: {loading ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default CompanyGrid;
