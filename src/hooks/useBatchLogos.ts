import { useState, useEffect, useCallback, useRef } from 'react';
import { Company, LogoMetadata } from '../lib/types';
import { logoService } from '../services/LogoService';

interface BatchLogoState {
  loading: boolean;
  loaded: boolean;
  progress: number; // 0-100
  errors: string[];
  logoMap: Map<string, LogoMetadata>;
  stats: {
    total: number;
    processed: number;
    cached: number;
    failed: number;
    avgLoadTime: number;
  };
}

interface UseBatchLogosOptions {
  batchSize: number;
  delayBetweenBatches: number;
  enableAutoLoad: boolean;
  priorityCompanies: string[]; // Company names to load first
}

export const useBatchLogos = (
  companies: Company[], 
  options: Partial<UseBatchLogosOptions> = {}
) => {
  const defaultOptions: UseBatchLogosOptions = {
    batchSize: 10, // Reduced from 20 to 10 for better browser stability
    delayBetweenBatches: 500, // Increased from 200ms to 500ms to reduce browser stress
    enableAutoLoad: true,
    priorityCompanies: []
  };

  const opts = { ...defaultOptions, ...options };
  
  const [state, setState] = useState<BatchLogoState>({
    loading: false,
    loaded: false,
    progress: 0,
    errors: [],
    logoMap: new Map(),
    stats: {
      total: 0,
      processed: 0,
      cached: 0,
      failed: 0,
      avgLoadTime: 0
    }
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const loadTimesRef = useRef<number[]>([]);

  // Extract domain utility
  const extractDomain = useCallback((url: string): string | null => {
    if (!url) return null;
    try {
      const fullUrl = url.includes('http') ? url : `https://${url}`;
      const domain = new URL(fullUrl).hostname;
      return domain.replace('www.', '');
    } catch {
      return null;
    }
  }, []);

  // Generate batch loading key for company
  const getCompanyKey = useCallback((company: Company): string => {
    return `${company.name}_${company.domain || extractDomain(company.url) || 'unknown'}`;
  }, [extractDomain]);

  // Process a batch of companies
  const processBatch = useCallback(async (
    batch: Company[], 
    batchIndex: number,
    totalBatches: number,
    signal: AbortSignal
  ): Promise<void> => {
    if (signal.aborted) return;

    const batchStartTime = Date.now();
    
    try {
      // Prepare companies for batch processing
      const companyData = batch.map(company => ({
        name: company.name,
        domain: company.domain || extractDomain(company.url)
      }));

      // Use the LogoService batch method
      const results = await logoService.batchGetLogos(companyData);
      
      if (signal.aborted) return;

      const batchLoadTime = Date.now() - batchStartTime;
      loadTimesRef.current.push(batchLoadTime);

      // Update state with results
      setState(prevState => {
        const newLogoMap = new Map(prevState.logoMap);
        let cached = prevState.stats.cached;
        let failed = prevState.stats.failed;

        results.forEach((metadata, index) => {
          const company = batch[index];
          const key = getCompanyKey(company);
          newLogoMap.set(key, metadata);

          // Update stats
          if (metadata.errors.length > 0) {
            failed++;
          }
          // Check if result was from cache (simplified check)
          if (metadata.sources.some(source => source.lastTested && 
              new Date(metadata.lastUpdated).getTime() - new Date(source.lastTested).getTime() < 1000)) {
            cached++;
          }
        });

        const processed = prevState.stats.processed + batch.length;
        const progress = Math.round((processed / prevState.stats.total) * 100);
        const avgLoadTime = loadTimesRef.current.reduce((a, b) => a + b, 0) / loadTimesRef.current.length;

        return {
          ...prevState,
          logoMap: newLogoMap,
          progress,
          stats: {
            ...prevState.stats,
            processed,
            cached,
            failed,
            avgLoadTime
          }
        };
      });

      // Reduced logging - only log major milestones
      if (batchIndex === 0 || (batchIndex + 1) % 10 === 0 || batchIndex === totalBatches - 1) {
        console.log(`Logo batch ${batchIndex + 1}/${totalBatches} completed: ${batch.length} companies in ${batchLoadTime}ms`);
      }

    } catch (error) {
      if (signal.aborted) return;
      
      console.warn(`Batch ${batchIndex + 1} failed:`, error);
      setState(prevState => ({
        ...prevState,
        errors: [...prevState.errors, `Batch ${batchIndex + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        stats: {
          ...prevState.stats,
          processed: prevState.stats.processed + batch.length,
          failed: prevState.stats.failed + batch.length
        }
      }));
    }
  }, [extractDomain, getCompanyKey]);

  // Main batch loading function
  const loadLogos = useCallback(async (forceReload = false): Promise<void> => {
    if (state.loading && !forceReload) return;
    if (companies.length === 0) return;

    // Cancel any existing loading
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Reset state
    setState(prevState => ({
      ...prevState,
      loading: true,
      loaded: false,
      progress: 0,
      errors: [],
      logoMap: forceReload ? new Map() : prevState.logoMap,
      stats: {
        total: companies.length,
        processed: 0,
        cached: 0,
        failed: 0,
        avgLoadTime: 0
      }
    }));

    loadTimesRef.current = [];

    try {
      // Sort companies: priority first, then alphabetical
      const sortedCompanies = [...companies].sort((a, b) => {
        const aIsPriority = opts.priorityCompanies.includes(a.name);
        const bIsPriority = opts.priorityCompanies.includes(b.name);
        
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        return a.name.localeCompare(b.name);
      });

      // Create batches
      const batches: Company[][] = [];
      for (let i = 0; i < sortedCompanies.length; i += opts.batchSize) {
        batches.push(sortedCompanies.slice(i, i + opts.batchSize));
      }

      console.log(`Starting batch logo loading: ${companies.length} companies in ${batches.length} batches`);

      // Process batches with delay
      for (let i = 0; i < batches.length; i++) {
        if (signal.aborted) break;

        await processBatch(batches[i], i, batches.length, signal);

        // Add delay between batches (except for the last one)
        if (i < batches.length - 1 && opts.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, opts.delayBetweenBatches));
        }
      }

      if (!signal.aborted) {
        setState(prevState => ({
          ...prevState,
          loading: false,
          loaded: true
        }));

        console.log(`✅ Logo loading completed: ${companies.length} companies processed`);
      }

    } catch (error) {
      if (!signal.aborted) {
        console.error('Batch logo loading failed:', error);
        setState(prevState => ({
          ...prevState,
          loading: false,
          errors: [...prevState.errors, `Batch loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }));
      }
    }
  }, [companies, opts, state.loading, processBatch]);

  // Get logo metadata for a specific company
  const getLogoMetadata = useCallback((company: Company): LogoMetadata | null => {
    const key = getCompanyKey(company);
    return state.logoMap.get(key) || null;
  }, [state.logoMap, getCompanyKey]);

  // Check if a company's logo has been loaded
  const isLogoLoaded = useCallback((company: Company): boolean => {
    const key = getCompanyKey(company);
    return state.logoMap.has(key);
  }, [state.logoMap, getCompanyKey]);

  // Get loading stats
  const getStats = useCallback(() => state.stats, [state.stats]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (opts.enableAutoLoad && companies.length > 0 && !state.loaded && !state.loading) {
      loadLogos();
    }
  }, [opts.enableAutoLoad, companies.length, state.loaded, state.loading, loadLogos]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    loading: state.loading,
    loaded: state.loaded,
    progress: state.progress,
    errors: state.errors,
    stats: state.stats,
    
    // Methods
    loadLogos,
    getLogoMetadata,
    isLogoLoaded,
    getStats,
    
    // Utilities
    cancel: () => abortControllerRef.current?.abort(),
    retry: () => loadLogos(true)
  };
};
