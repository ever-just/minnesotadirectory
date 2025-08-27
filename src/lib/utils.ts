import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CompanyData {
  [key: string]: string;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Domain extraction utility for company logos
export const extractDomain = (url: string): string | null => {
  if (!url) return null;
  try {
    // Add protocol if missing
    const fullUrl = url.includes('http') ? url : `https://${url}`;
    const domain = new URL(fullUrl).hostname;
    return domain.replace('www.', '');
  } catch {
    return null;
  }
};

// Generate company logo URLs based on domain
export const generateLogoUrls = (domain: string | null) => {
  if (!domain) {
    return {
      logoUrl: null,
      logoFallbackUrl: null,
      hasLogo: false
    };
  }

  return {
    logoUrl: `https://logo.clearbit.com/${domain}`,
    logoFallbackUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    hasLogo: true
  };
};

export const parseCSVData = (csvData: string) => {
  // CSV parsing logic remains the same
  const rows = csvData.split('\n');
  const headers = rows[0].split(',').map(h => h.replace(/"/g, ''));
  
  return rows.slice(1).map((row, index) => {
    if (!row.trim()) return null;
    
    // Handle commas within quoted fields
    const values: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.replace(/"/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue.replace(/"/g, ''));
    
    const company: CompanyData = {};
    headers.forEach((header, index) => {
      company[header] = values[index] || '';
    });
    
    // Extract logo information
    const url = company['URL'] || '';
    const domain = extractDomain(url);
    const logoData = generateLogoUrls(domain);
    
    return {
      name: company['Company Name'] || '',
      tradestyle: company['Tradestyle'] || '',
      address: company['Address Line 1'] || '',
      city: company['City'] || '',
      state: company['State Or Province'] || '',
      postalCode: company['Postal Code'] || '',
      phone: company['Phone'] || '',
      url: url,
      sales: company['Sales (USD)'] || '',
      employees: company['Employees (Total)'] || '',
      description: company['Business Description'] || '',
      industry: company['D&B Hoovers Industry'] || '',
      isHeadquarters: company['Is Headquarters'] === 'true',
      naicsDescription: company['NAICS 2022 Description'] || '',
      ownership: company['Ownership Type'] || '',
      ticker: company['Ticker'] || '',
      employeesSite: company['Employees (Single Site)'] || '',
      sicDescription: company['US 8-Digit SIC Description'] || '',
      
      // Logo fields
      id: index,
      domain: domain,
      logoUrl: logoData.logoUrl,
      logoFallbackUrl: logoData.logoFallbackUrl,
      hasLogo: logoData.hasLogo,
      logoLastUpdated: new Date().toISOString()
    };
  }).filter(Boolean);
};

export const formatSales = (sales: string): string => {
  if (!sales) return 'N/A';
  
  const num = parseFloat(sales);
  if (isNaN(num)) return 'N/A';
  
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(1)}M`;
  } else {
    return `$${num.toLocaleString()}`;
  }
};

import type { Company } from './types';

export const getUniqueIndustries = (companies: Company[]) => {
  const industries = new Set<string>();

  companies.forEach((company: Company) => {
    if (company.industry) {
      industries.add(company.industry);
    }
  });
  
  return Array.from(industries).sort();
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if it's a 10-digit number
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

export const formatNumber = (numStr: string): string => {
  if (!numStr) return 'N/A';
  
  const num = parseFloat(numStr);
  if (isNaN(num)) return numStr;
  
  return num.toLocaleString();
};

// Smart Chunking Functions
import { IndustryIndex, ChunkingStats } from './types';

export const buildIndustryIndex = (companies: Company[]): IndustryIndex => {
  console.log('🏭 Building industry index...');
  const index: IndustryIndex = {};
  
  companies.forEach((company, originalIndex) => {
    const industry = company.industry || 'Unknown';
    
    if (!index[industry]) {
      index[industry] = [];
    }
    
    index[industry].push({
      ...company,
      originalIndex // Track position in full dataset
    });
  });
  
  // Sort companies within each industry by sales (high to low)
  Object.keys(index).forEach(industry => {
    index[industry].sort((a, b) => {
      const salesA = parseFloat(a.sales) || 0;
      const salesB = parseFloat(b.sales) || 0;
      return salesB - salesA;
    });
  });
  
  console.log(`✅ Industry index built: ${Object.keys(index).length} industries`);
  return index;
};

export const createSmartChunk = (
  allCompanies: Company[], 
  industryIndex: IndustryIndex, 
  chunkSize: number = 500
): Company[] => {
  const smartChunk: Company[] = [];
  const industryCount = Object.keys(industryIndex).length;
  
  console.log(`🎯 Creating smart chunk with ${industryCount} industries for ${chunkSize} slots`);
  
  // Step 1: Include top company from each industry (guarantees coverage)
  Object.keys(industryIndex).forEach(industry => {
    const topCompany = industryIndex[industry][0]; // Already sorted by sales
    if (topCompany) {
      smartChunk.push(topCompany);
    }
  });
  
  console.log(`✅ Added ${smartChunk.length} companies (1 per industry)`);
  
  // Step 2: Fill remaining slots with highest-sales companies not already included
  const usedCompanies = new Set(smartChunk.map(c => `${c.name}-${c.city}`));
  const remainingSlots = chunkSize - smartChunk.length;
  
  const filler = allCompanies
    .filter(company => !usedCompanies.has(`${company.name}-${company.city}`))
    .sort((a, b) => {
      const salesA = parseFloat(a.sales) || 0;
      const salesB = parseFloat(b.sales) || 0;
      return salesB - salesA;
    })
    .slice(0, remainingSlots);
    
  smartChunk.push(...filler);
  
  console.log(`✅ Added ${filler.length} high-sales companies to fill chunk`);
  console.log(`🎯 Smart chunk complete: ${smartChunk.length} companies`);
  
  return smartChunk;
};

export const validateIndustryCoverage = (firstChunk: Company[], industryIndex: IndustryIndex): ChunkingStats => {
  const chunkIndustries = new Set(firstChunk.map(c => c.industry));
  const allIndustries = new Set(Object.keys(industryIndex));
  
  const coverage = chunkIndustries.size / allIndustries.size;
  const missing = [...allIndustries].filter(i => !chunkIndustries.has(i));
  
  const stats: ChunkingStats = {
    totalCompanies: firstChunk.length,
    totalIndustries: allIndustries.size,
    firstChunkSize: firstChunk.length,
    industryCoverage: coverage,
    missingIndustries: missing
  };
  
  console.log(`🎯 Industry Coverage Validation:`);
  console.log(`✅ Covered: ${chunkIndustries.size}/${allIndustries.size} (${(coverage * 100).toFixed(1)}%)`);
  
  if (missing.length > 0) {
    console.error(`❌ FAILED: ${missing.length} missing industries:`, missing);
    return stats;
  }
  
  console.log('✅ PASSED: All industries covered in first chunk');
  return stats;
};
