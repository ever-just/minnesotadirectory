// Advanced Logo System Types
export interface LogoSource {
  name: 'clearbit' | 'brandfetch' | 'google' | 'direct' | 'apple-touch' | 'generated' | 'database';
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

// Database Logo Types
export interface CompanyLogo {
  id: string;
  companyId: string;
  logoData?: string; // Base64 encoded binary data
  logoUrl?: string; // Optional CDN/storage URL
  contentType: string; // image/png, image/svg+xml, etc.
  fileExtension: string; // png, svg, jpg
  fileSize?: number; // Size in bytes
  qualityScore: number; // 0-100 quality rating
  source?: string; // clearbit, google, manual, etc.
  width?: number;
  height?: number;
  isPlaceholder: boolean;
  domain?: string; // Store domain for easy lookup
  createdAt: string;
  updatedAt: string;
}

export interface LogoSourceRecord {
  id: string;
  companyLogoId: string;
  sourceName?: string; // clearbit, google, favicon
  sourceUrl?: string;
  quality: number;
  loadTimeMs?: number;
  lastTested?: string;
  isWorking: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface LogoPerformance {
  id: string;
  companyId: string;
  cacheKey?: string;
  fetchAttempts: number;
  lastFetchAttempt?: string;
  averageLoadTimeMs?: number;
  successRate?: number;
  totalRequests: number;
  successfulRequests: number;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface LogoApiResponse {
  success: boolean;
  logo?: CompanyLogo;
  sources?: LogoSourceRecord[];
  performance?: LogoPerformance;
  error?: string;
}

export interface BatchLogoResponse {
  success: boolean;
  logos: { [companyId: string]: CompanyLogo };
  errors: { [companyId: string]: string };
  stats: {
    total: number;
    successful: number;
    failed: number;
    fromCache: number;
  };
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
  
  // Geographic coordinates for mapping
  latitude?: number;
  longitude?: number;
  geocodedAt?: string;
  geocodingSource?: string;
  geocodingAccuracy?: string;
  
  // Advanced Logo Fields
  id: string;  // UUID from database
  domain?: string;
  logoMetadata?: LogoMetadata;
  logoStatus?: 'pending' | 'loading' | 'loaded' | 'error' | 'fallback';
  logoLastFetch?: string;
  logoQuality?: number;
  hasCustomLogo?: boolean;
  
  // Database Logo Fields
  databaseLogo?: CompanyLogo; // Logo stored in database
  hasLogo?: boolean; // Whether company has a logo in database
  logo_url?: string; // Direct logo URL from database
  logo_source?: string; // Source of the logo (clearbit, google, etc)
  logo_quality?: number; // Quality score of the logo
  logo_is_placeholder?: boolean; // Whether the logo is a placeholder
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
