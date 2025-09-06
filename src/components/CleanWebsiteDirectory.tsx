import React, { useState, useEffect, useMemo } from 'react';
import { Company } from '../lib/types';
import { RealPagesService } from '../services/RealPagesService';
import { Globe, ExternalLink, Loader2 } from 'lucide-react';

interface CleanWebsiteDirectoryProps {
  company: Company;
  companyUrl: string;
  companyName: string;
}

interface CleanPage {
  id: string;
  url: string;
  title: string;
}

const CleanWebsiteDirectory = ({ company, companyUrl, companyName }: CleanWebsiteDirectoryProps) => {
  const [pages, setPages] = useState<CleanPage[]>([]);
  const [allPages, setAllPages] = useState<CleanPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingCount, setShowingCount] = useState(5);

  // Extract domain for lookup
  const domain = useMemo(() => {
    if (!companyUrl) return null;
    try {
      const cleanUrl = companyUrl.includes('http') ? companyUrl : `https://${companyUrl}`;
      return new URL(cleanUrl).hostname.replace('www.', '');
    } catch {
      return null;
    }
  }, [companyUrl]);

  useEffect(() => {
    if (domain || companyName) {
      loadPages();
    }
  }, [companyName, domain]);

  // Function to check if a page is a main/primary page
  const isMainPage = (page: any): boolean => {
    const url = page.url.toLowerCase();
    const title = page.title.toLowerCase();
    
    // Main page indicators
    const mainPagePatterns = [
      // Homepage
      /^\/$|\/home$|\/index/,
      // Core sections
      /\/about(?!\/)|\/company(?!\/)|\/who-we-are(?!\/)/,
      /\/services(?!\/)|\/solutions(?!\/)|\/products(?!\/)/,
      /\/contact(?!\/)|\/get-in-touch(?!\/)/,
      /\/careers(?!\/)|\/jobs(?!\/)|\/employment(?!\/)/,
      /\/news(?!\/)|\/media(?!\/)|\/press(?!\/)/,
      /\/investors(?!\/)|\/investor-relations(?!\/)/,
      /\/locations(?!\/)|\/offices(?!\/)/
    ];
    
    const mainTitlePatterns = [
      /^home$|^about|^services|^products|^solutions/,
      /^contact|^careers|^jobs|^news|^media|^press/,
      /^investors|^locations|^offices/
    ];
    
    // Check URL patterns
    const hasMainUrlPattern = mainPagePatterns.some(pattern => pattern.test(url));
    
    // Check title patterns
    const hasMainTitlePattern = mainTitlePatterns.some(pattern => pattern.test(title));
    
    // Exclude deep pages (more than 2 slashes after domain)
    const pathDepth = (url.match(/\//g) || []).length;
    const isShallowPage = pathDepth <= 3;
    
    return (hasMainUrlPattern || hasMainTitlePattern) && isShallowPage;
  };

  const loadPages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Loading main pages for ${companyName}...`);
      
      const data = await RealPagesService.getRealTopPages(companyName, domain || '');
      
      if (data.success) {
        // Filter to main pages first, then convert to clean format
        const mainPages = data.pages.filter(isMainPage);
        const otherPages = data.pages.filter(page => !isMainPage(page));
        
        // Prioritize main pages, then add other important pages
        const prioritizedPages = [...mainPages, ...otherPages];
        
        const cleanPages: CleanPage[] = prioritizedPages
          .filter(page => page.validationStatus !== 'invalid')
          .map(page => ({
            id: page.id,
            url: page.url,
            title: page.title
          }));
        
        setAllPages(cleanPages);
        setPages(cleanPages.slice(0, showingCount));
        
        console.log(`✅ Loaded ${cleanPages.length} pages for ${companyName} (${mainPages.length} main pages)`);
        console.log(`🏠 Main pages: ${mainPages.slice(0, 3).map(p => p.title).join(', ')}`);
      } else {
        setError(`No pages found for ${companyName}`);
      }
      
    } catch (err) {
      setError('Failed to load pages');
      console.error('Error loading pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const newCount = Math.min(showingCount + 5, allPages.length);
    setShowingCount(newCount);
    setPages(allPages.slice(0, newCount));
    console.log(`📄 Showing ${newCount}/${allPages.length} pages`);
  };

  const handlePageClick = (url: string, title: string) => {
    console.log(`🔗 Opening: ${title} - ${url}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          <span className="text-gray-600">Loading pages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Globe className="text-gray-400" size={16} />
          <span className="text-gray-600 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center">
        <Globe className="mx-auto mb-3 text-gray-400" size={32} />
        <h3 className="font-semibold text-gray-900 mb-2">Website Pages</h3>
        <p className="text-gray-600 text-sm">No pages available for {companyName}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Clean Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Globe className="text-blue-500" size={20} />
          <h3 className="font-semibold text-gray-900">Website Pages</h3>
          <span className="text-sm text-gray-500">({pages.length} pages)</span>
        </div>
      </div>

      {/* Clean Page List */}
      <div className="divide-y divide-gray-100">
        {pages.map((page) => (
          <div
            key={page.id}
            onClick={() => handlePageClick(page.url, page.title)}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {page.title}
              </span>
              <ExternalLink 
                className="text-gray-400 group-hover:text-blue-500 transition-colors" 
                size={16} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {allPages.length > showingCount && (
        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <button
            onClick={loadMore}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            Load More ({allPages.length - showingCount} remaining)
          </button>
        </div>
      )}

      {/* Clean Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Real sitemap data</span>
          <span>{domain}</span>
        </div>
      </div>
    </div>
  );
};

export default CleanWebsiteDirectory;
