import React, { useState, useEffect } from 'react';
import { Company } from '../lib/types';
import { SitemapRankingService } from '../services/SitemapRankingService';
import { RealisticSitemapService } from '../services/RealisticSitemapService';
import { 
  Globe, 
  FileText, 
  Folder, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Star
} from 'lucide-react';

interface RankedWebsiteStructureProps {
  company: Company;
  companyUrl: string;
  companyName: string;
}

interface RankedPage {
  url: string;
  title: string;
  priority: number;
  changeFreq: string;
  lastModified?: string;
  pageType: string;
  importanceScore: number;
  rankingFactors: any;
}

interface RankedSitemapStructure {
  domain: string;
  companyName: string;
  totalPages: number;
  topPages: RankedPage[];
  remainingPages: RankedPage[];
  pagesByCategory: { [category: string]: RankedPage[] };
  rankingStats: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    categoryCounts: { [category: string]: number };
  };
}

const RankedWebsiteStructure = ({ company, companyUrl, companyName }: RankedWebsiteStructureProps) => {
  const [structure, setStructure] = useState<RankedSitemapStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMorePages, setShowMorePages] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Extract domain for analysis
  const extractDomain = (url: string): string | null => {
    if (!url) return null;
    try {
      const cleanUrl = url.includes('http') ? url : `https://${url}`;
      const domain = new URL(cleanUrl).hostname;
      return domain.replace('www.', '');
    } catch {
      return null;
    }
  };

  const domain = extractDomain(companyUrl);

  useEffect(() => {
    if (domain) {
      console.log(`🎯 RankedWebsiteStructure mounted for: ${company.name} (${domain})`);
      fetchRankedStructure();
    }
  }, [company.name, domain]);

  const fetchRankedStructure = async () => {
    if (!domain) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🎯 Fetching and ranking sitemap data for ${company.name}...`);
      
      // First get realistic sitemap data
      const sitemapData = await RealisticSitemapService.getRealisticSitemapData(company.name, domain);
      
      if (sitemapData.success && sitemapData.structure) {
        // Now rank the pages
        const rankedStructure = await SitemapRankingService.rankSitemapPages(
          company.name,
          domain,
          sitemapData.structure.pages
        );
        
        setStructure(rankedStructure);
        setLastRefresh(new Date());
        
        console.log(`✅ Ranked ${rankedStructure.totalPages} pages for ${company.name}`);
        console.log(`🏆 Top page: "${rankedStructure.topPages[0]?.title}" (Score: ${rankedStructure.topPages[0]?.importanceScore})`);
        console.log(`📊 Categories: ${Object.keys(rankedStructure.pagesByCategory).join(', ')}`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch ranked website structure:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10b981'; // Green
    if (score >= 70) return '#f59e0b'; // Yellow
    if (score >= 50) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getPageTypeIcon = (pageType: string) => {
    switch (pageType) {
      case 'homepage': return '🏠';
      case 'about': return 'ℹ️';
      case 'services': return '🔧';
      case 'products': return '📦';
      case 'healthcare': return '🏥';
      case 'contact': return '📞';
      case 'careers': return '💼';
      case 'news': return '📰';
      case 'investors': return '📈';
      case 'locations': return '📍';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div style={{
        margin: '2rem 0',
        padding: '2rem',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#6b7280', marginBottom: '1rem' }} size={32} />
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Analyzing and ranking website structure...</p>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Discovering and prioritizing pages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        margin: '2rem 0',
        padding: '2rem',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca'
      }}>
        <AlertCircle style={{ color: '#ef4444', marginBottom: '1rem' }} size={24} />
        <p style={{ color: '#dc2626', fontWeight: '600', marginBottom: '0.5rem' }}>Analysis Failed</p>
        <p style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>{error}</p>
        <button 
          onClick={fetchRankedStructure}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!structure) {
    return (
      <div style={{
        margin: '2rem 0',
        padding: '2rem',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <Globe style={{ color: '#6b7280', marginBottom: '1rem' }} size={32} />
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '1rem' }}>No website structure data available</p>
        <button 
          onClick={fetchRankedStructure}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          Analyze & Rank Website
        </button>
      </div>
    );
  }

  const displayPages = selectedCategory === 'all' 
    ? (showMorePages ? [...structure.topPages, ...structure.remainingPages] : structure.topPages)
    : structure.pagesByCategory[selectedCategory] || [];

  return (
    <div style={{
      margin: '2rem 0',
      padding: '2rem',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #f3f4f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <TrendingUp style={{ color: '#6b7280' }} size={24} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
            Ranked Website Directory
          </h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastRefresh && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <CheckCircle size={14} />
              <span>Ranked: {formatDate(lastRefresh.toISOString())}</span>
              <span style={{ 
                background: '#dcfce7', 
                color: '#166534', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}>
                Cached
              </span>
            </div>
          )}
          <button 
            onClick={fetchRankedStructure}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              background: '#f9fafb',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#374151'
            }}
            title="Re-analyze and rank"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Statistics Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
          <BarChart3 style={{ color: '#3b82f6', margin: '0 auto 0.5rem' }} size={20} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>{structure.totalPages.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Pages</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
          <Star style={{ color: '#10b981', margin: '0 auto 0.5rem' }} size={20} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>{structure.rankingStats.highestScore}</div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Top Score</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '1rem', background: '#fefce8', borderRadius: '8px' }}>
          <TrendingUp style={{ color: '#eab308', margin: '0 auto 0.5rem' }} size={20} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ca8a04' }}>{Math.round(structure.rankingStats.averageScore)}</div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Avg Score</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '1rem', background: '#fdf4ff', borderRadius: '8px' }}>
          <Folder style={{ color: '#a855f7', margin: '0 auto 0.5rem' }} size={20} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9333ea' }}>{Object.keys(structure.pagesByCategory).length}</div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Categories</div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
          Filter by Category:
        </label>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            fontSize: '0.875rem',
            color: '#374151'
          }}
        >
          <option value="all">All Pages ({structure.totalPages})</option>
          {Object.entries(structure.pagesByCategory).map(([category, pages]) => (
            <option key={category} value={category}>
              {category} ({pages.length})
            </option>
          ))}
        </select>
      </div>

      {/* Top Pages List */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          fontSize: '1rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          <Star style={{ color: '#f59e0b' }} size={18} />
          <span>
            {selectedCategory === 'all' ? 'Top 20 Most Important Pages' : `${selectedCategory} Pages`}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gap: '0.75rem'
        }}>
          {displayPages.slice(0, showMorePages ? displayPages.length : 20).map((page, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: index < 5 ? '#fefce8' : '#f9fafb',
                border: `1px solid ${index < 5 ? '#fde047' : '#e5e7eb'}`,
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                {/* Ranking Position */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  background: index < 3 ? '#fbbf24' : index < 10 ? '#60a5fa' : '#9ca3af',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.875rem',
                  fontWeight: '700'
                }}>
                  {selectedCategory === 'all' ? (showMorePages ? index + 1 : index + 1) : index + 1}
                </div>

                {/* Page Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span>{getPageTypeIcon(page.pageType)}</span>
                    <span style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>
                      {page.title}
                    </span>
                    <span style={{
                      background: getScoreColor(page.importanceScore),
                      color: 'white',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {page.importanceScore}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {page.url.replace(`https://${domain}`, '')} • 
                    Priority: {page.priority.toFixed(2)} • 
                    {page.changeFreq} • 
                    {page.lastModified ? `Updated ${formatDate(page.lastModified)}` : 'No update date'}
                  </div>
                </div>

                {/* External Link */}
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    color: '#374151',
                    textDecoration: 'none'
                  }}
                  title="Visit page"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {selectedCategory === 'all' && structure.remainingPages.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => setShowMorePages(!showMorePages)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                margin: '0 auto',
                padding: '0.75rem 1.5rem',
                background: showMorePages ? '#f3f4f6' : '#3b82f6',
                color: showMorePages ? '#374151' : 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {showMorePages ? (
                <>
                  <ChevronUp size={16} />
                  Show Top 20 Only
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Load All {structure.remainingPages.length} Remaining Pages
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Ranking Methodology */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#f8fafc',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#64748b'
      }}>
        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
          🎯 Ranking Methodology
        </div>
        <div>
          Pages ranked by: Sitemap Priority (30%) + Page Type (25%) + Content Relevance (20%) + URL Structure (15%) + Freshness (10%)
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Last analyzed:</strong> {lastRefresh ? formatDate(lastRefresh.toISOString()) : 'Never'} • 
          <strong>Domain:</strong> {structure.domain} • 
          <strong>Source:</strong> Cached Database Analysis
        </div>
      </div>
    </div>
  );

  function getPageTypeIcon(pageType: string): string {
    switch (pageType) {
      case 'homepage': return '🏠';
      case 'about': return 'ℹ️';
      case 'services': return '🔧';
      case 'products': return '📦';
      case 'healthcare': return '🏥';
      case 'contact': return '📞';
      case 'careers': return '💼';
      case 'news': return '📰';
      case 'investors': return '📈';
      case 'locations': return '📍';
      case 'legal': return '⚖️';
      case 'support': return '🆘';
      default: return '📄';
    }
  }
};

export default RankedWebsiteStructure;
