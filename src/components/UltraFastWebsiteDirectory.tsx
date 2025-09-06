import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Company } from '../lib/types';
import { UltraFastRankingService } from '../services/UltraFastRankingService';
import { RealisticSitemapService } from '../services/RealisticSitemapService';
import { 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock
} from 'lucide-react';

interface UltraFastWebsiteDirectoryProps {
  company: Company;
  companyUrl: string;
  companyName: string;
}

interface FastRankedPage {
  url: string;
  title: string;
  score: number;
  type: string;
  priority: number;
}

const UltraFastWebsiteDirectory = ({ company, companyUrl, companyName }: UltraFastWebsiteDirectoryProps) => {
  const [topPages, setTopPages] = useState<FastRankedPage[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // OPTIMIZATION: Memoized domain extraction
  const domain = useMemo(() => {
    if (!companyUrl) return null;
    try {
      const cleanUrl = companyUrl.includes('http') ? companyUrl : `https://${companyUrl}`;
      return new URL(cleanUrl).hostname.replace('www.', '');
    } catch {
      return null;
    }
  }, [companyUrl]);

  // OPTIMIZATION: Debounced fetch function
  const fetchUltraFastRanking = useCallback(async () => {
    if (!domain) return;
    
    const startTime = performance.now();
    setLoading(true);
    
    try {
      console.log(`⚡ ULTRA-FAST analysis starting for ${company.name}...`);
      
      // STEP 1: Get sitemap data (optimized)
      const sitemapData = await RealisticSitemapService.getRealisticSitemapData(company.name, domain);
      
      if (sitemapData.success && sitemapData.structure) {
        // STEP 2: Ultra-fast ranking
        const ranking = await UltraFastRankingService.rankPagesUltraFast(
          company.name,
          domain,
          sitemapData.structure.pages
        );
        
        // STEP 3: Update state (batch update for speed)
        setTopPages(ranking.topPages);
        setTotalPages(ranking.totalPages);
        setProcessingTime(ranking.processingTime);
        setLastRefresh(new Date());
        
        const totalTime = performance.now() - startTime;
        console.log(`🚀 ULTRA-FAST complete: ${ranking.totalPages} pages ranked in ${totalTime.toFixed(1)}ms`);
        console.log(`🏆 Top 3 pages:`, ranking.topPages.slice(0, 3).map(p => `${p.title} (${p.score})`));
      }
      
    } catch (err) {
      console.error('❌ Ultra-fast ranking failed:', err);
    } finally {
      setLoading(false);
    }
  }, [company.name, domain]);

  // OPTIMIZATION: Effect with dependency array
  useEffect(() => {
    if (domain) {
      fetchUltraFastRanking();
    }
  }, [domain, fetchUltraFastRanking]);

  // OPTIMIZATION: Memoized page type icons
  const getPageIcon = useMemo(() => {
    const iconMap = new Map([
      ['home', '🏠'], ['about', 'ℹ️'], ['services', '🔧'], ['products', '📦'],
      ['healthcare', '🏥'], ['contact', '📞'], ['careers', '💼'], ['news', '📰'],
      ['investors', '📈'], ['locations', '📍'], ['legal', '⚖️'], ['support', '🆘'],
      ['page', '📄']
    ]);
    
    return (type: string) => iconMap.get(type) || '📄';
  }, []);

  // OPTIMIZATION: Memoized score color calculation
  const getScoreColor = useMemo(() => {
    return (score: number) => {
      if (score >= 85) return '#10b981';
      if (score >= 70) return '#f59e0b';
      if (score >= 50) return '#f97316';
      return '#ef4444';
    };
  }, []);

  // OPTIMIZATION: Memoized display pages
  const displayPages = useMemo(() => {
    return showAll ? topPages : topPages.slice(0, 20);
  }, [topPages, showAll]);

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
        <Zap style={{ animation: 'pulse 1s infinite', color: '#3b82f6', marginBottom: '1rem' }} size={32} />
        <p style={{ color: '#3b82f6', fontSize: '1.1rem', fontWeight: '600' }}>Ultra-Fast Analysis in Progress...</p>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Ranking pages by importance...</p>
      </div>
    );
  }

  if (topPages.length === 0) {
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
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '1rem' }}>Ready for Ultra-Fast Analysis</p>
        <button 
          onClick={fetchUltraFastRanking}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            margin: '0 auto',
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
          <Zap size={18} />
          Analyze & Rank Website
        </button>
      </div>
    );
  }

  return (
    <div style={{
      margin: '2rem 0',
      padding: '2rem',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Ultra-Fast Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #f3f4f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <TrendingUp style={{ color: '#3b82f6' }} size={24} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
            Top 20 Most Important Pages
          </h3>
          <span style={{
            background: '#dbeafe',
            color: '#1e40af',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            ULTRA-FAST
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Performance Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <Clock size={14} />
            <span>{processingTime.toFixed(1)}ms</span>
            <span>•</span>
            <span>{totalPages.toLocaleString()} pages</span>
          </div>
          
          {lastRefresh && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <CheckCircle size={14} />
              <span>Cached</span>
            </div>
          )}
          
          <button 
            onClick={fetchUltraFastRanking}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              background: '#f9fafb',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#374151'
            }}
            title="Re-analyze"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top Pages Grid - OPTIMIZED RENDERING */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {displayPages.map((page, index) => (
          <div 
            key={`${page.url}-${index}`} // Stable keys for performance
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: index < 3 ? '#fef3c7' : index < 10 ? '#dbeafe' : '#f9fafb',
              border: `1px solid ${index < 3 ? '#f59e0b' : index < 10 ? '#60a5fa' : '#e5e7eb'}`,
              borderRadius: '8px',
              transition: 'transform 0.1s ease', // Faster transition
              cursor: 'pointer'
            }}
            onClick={() => window.open(page.url, '_blank')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              {/* Ranking Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: index < 3 ? '#f59e0b' : index < 10 ? '#3b82f6' : '#6b7280',
                color: 'white',
                borderRadius: '50%',
                fontSize: '0.875rem',
                fontWeight: '700'
              }}>
                {index + 1}
              </div>

              {/* Page Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1rem' }}>{getPageIcon(page.type)}</span>
                  <span style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>
                    {page.title}
                  </span>
                  <span style={{
                    background: getScoreColor(page.score),
                    color: 'white',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {page.score}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {page.url.replace(`https://${domain}`, '')} • Priority: {page.priority.toFixed(2)}
                </div>
              </div>

              {/* External Link */}
              <ExternalLink 
                style={{ color: '#6b7280', cursor: 'pointer' }} 
                size={16}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(page.url, '_blank');
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Load More - OPTIMIZED */}
      {topPages.length > 20 && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              margin: '0 auto',
              padding: '0.75rem 1.5rem',
              background: showAll ? '#f3f4f6' : '#3b82f6',
              color: showAll ? '#374151' : 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.1s ease'
            }}
          >
            {showAll ? (
              <>
                <ChevronUp size={16} />
                Show Top 20 Only
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Load All Pages ({totalPages.toLocaleString()})
              </>
            )}
          </button>
        </div>
      )}

      {/* Performance Footer */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#f0f9ff',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#0369a1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={16} />
          <span style={{ fontWeight: '600' }}>
            Ultra-Fast Analysis: {totalPages.toLocaleString()} pages ranked in {processingTime.toFixed(1)}ms
          </span>
        </div>
        
        <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
          Domain: {domain} • Source: Cached Database Simulation
        </div>
      </div>
    </div>
  );
};

export default UltraFastWebsiteDirectory;
