import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Custom hook to manage scroll restoration for SPA navigation
export const useScrollRestoration = () => {
  const location = useLocation();

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Store current scroll position when navigating away
      sessionStorage.setItem(`scroll-${location.pathname}`, window.scrollY.toString());
    };

    // Store scroll position when location changes (before navigation)
    const currentPath = location.pathname;
    sessionStorage.setItem(`scroll-${currentPath}`, window.scrollY.toString());

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location]);

  // Restore scroll position when coming back to a page
  const restoreScrollPosition = (pathname: string = location.pathname) => {
    const savedPosition = sessionStorage.getItem(`scroll-${pathname}`);
    if (savedPosition) {
      const scrollY = parseInt(savedPosition, 10);
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollY,
          behavior: 'instant' // No smooth scrolling for restoration
        });
      });
      return true;
    }
    return false;
  };

  return { restoreScrollPosition };
};
