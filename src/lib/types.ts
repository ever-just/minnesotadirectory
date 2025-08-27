// Advanced Logo System Types
export interface LogoSource {
  name: 'clearbit' | 'brandfetch' | 'google' | 'direct' | 'apple-touch' | 'generated';
  url: string;
  priority: number;
  quality: number;
  format: 'svg' | 'png' | 'ico' | 'jpg' | 'webp' | 'unknown';
  size?: { width: number; height: number };
  lastTested: string;
  responseTime?: number;
}

export interface LogoMetadata {
  sources: LogoSource[];
  bestSource?: LogoSource;
  fallbackSource?: LogoSource;
  qualityScore: number;
  lastUpdated: string;
  cacheExpiry: string;
  fetchAttempts: number;
  errors: string[];
}

export interface LogoLoadingState {
  status: 'idle' | 'loading' | 'loaded' | 'error' | 'fallback' | 'placeholder';
  currentSource: LogoSource | null;
  retryCount: number;
  lastError?: string;
  loadTime?: number;
}

export interface LogoCacheEntry {
  metadata: LogoMetadata;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

export interface LogoServiceOptions {
  enableCache: boolean;
  cacheTTL: number;
  maxRetries: number;
  timeout: number;
  preferredFormats: string[];
  minQuality: number;
  enableBatch: boolean;
}

// Enhanced Company Interface
export interface Company {
  name: string;
  tradestyle: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  url: string;
  sales: string;
  employees: string;
  description: string;
  industry: string;
  isHeadquarters: boolean;
  naicsDescription: string;
  rawSales?: string;
  ownership?: string;
  ticker?: string;
  employeesSite?: string;
  sicDescription?: string;
  
  // Advanced Logo Fields
  id?: number;
  domain?: string;
  logoMetadata?: LogoMetadata;
  logoStatus?: 'pending' | 'loading' | 'loaded' | 'error' | 'fallback';
  logoLastFetch?: string;
  logoQuality?: number;
  hasCustomLogo?: boolean;
}

export interface IndustryOption {
  value: string;
  label: string;
}

// Smart Chunking Types
export interface IndustryIndex {
  [industry: string]: (Company & { originalIndex: number })[];
}

export interface ChunkingStats {
  totalCompanies: number;
  totalIndustries: number;
  firstChunkSize: number;
  industryCoverage: number;
  missingIndustries: string[];
}
