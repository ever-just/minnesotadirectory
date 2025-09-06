#!/usr/bin/env node

/**
 * Logo Database Population Script
 * 
 * This script fetches logos for all companies and stores them in the database
 * instead of relying on external API calls. It uses the existing MCP logo server
 * and stores the results in the new logo database tables.
 * 
 * Usage: node scripts/populate-logo-database.js [options]
 * Options:
 *   --batch-size=100    Number of companies to process in each batch
 *   --delay=1000       Delay between batches in milliseconds
 *   --dry-run          Don't actually save to database, just test
 *   --force            Re-process companies that already have logos
 *   --company-id=uuid   Process only specific company ID
 *   --verbose          Show detailed logging
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, isNull, or } from 'drizzle-orm';
import { companies, companyLogos, logoSources, logoPerformance } from '../db/schema.ts';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// Configuration
const config = {
  batchSize: parseInt(process.env.BATCH_SIZE) || 50,
  delay: parseInt(process.env.DELAY) || 2000,
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  verbose: process.argv.includes('--verbose'),
  companyId: process.argv.find(arg => arg.startsWith('--company-id='))?.split('=')[1],
  maxRetries: 3,
  timeout: 30000,
  logoSources: [
    { name: 'clearbit', url: 'https://logo.clearbit.com/{domain}', priority: 1 },
    { name: 'logo-dev', url: 'https://img.logo.dev/{domain}?token=pk_X-HFGGJsQquTbZRUaIPhvw', priority: 2 },
    { name: 'google-favicon', url: 'https://www.google.com/s2/favicons?domain={domain}&sz=128', priority: 3 }
  ]
};

// Initialize database connection
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL or NEON_DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function verboseLog(message) {
  if (config.verbose) {
    log(message, 'verbose');
  }
}

function extractDomain(url) {
  if (!url) return null;
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//, '');
    // Remove www. if present
    domain = domain.replace(/^www\./, '');
    // Remove path and query parameters
    domain = domain.split('/')[0].split('?')[0];
    // Remove port if present
    domain = domain.split(':')[0];
    return domain.toLowerCase();
  } catch (error) {
    verboseLog(`Failed to extract domain from ${url}: ${error.message}`);
    return null;
  }
}

function getCompanyName(domain) {
  if (!domain) return 'unknown';
  const parts = domain.split('.');
  return parts.length > 1 ? parts[0] : domain;
}

async function fetchLogoFromUrl(url, timeout = config.timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const request = client.get(url, {
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (response) => {
      const chunks = [];
      const loadTime = Date.now() - startTime;
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = response.headers['content-type'] || 'image/png';
        
        // Basic validation - check if it's actually an image
        if (buffer.length < 100) {
          reject(new Error('Response too small to be a valid image'));
          return;
        }
        
        // Check for common image signatures
        const signature = buffer.toString('hex', 0, 8).toLowerCase();
        const isValidImage = 
          signature.startsWith('89504e47') || // PNG
          signature.startsWith('ffd8ff') ||   // JPEG
          signature.startsWith('47494638') || // GIF
          buffer.toString('utf8', 0, 5) === '<?xml' || // SVG
          signature.startsWith('424d'); // BMP
        
        if (!isValidImage) {
          reject(new Error('Response does not appear to be a valid image'));
          return;
        }
        
        resolve({
          data: buffer,
          contentType: contentType,
          size: buffer.length,
          loadTime: loadTime,
          dimensions: null // Could add image dimension detection here
        });
      });
      
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function fetchLogoForDomain(domain, companyName) {
  const results = {
    bestLogo: null,
    sources: [],
    errors: []
  };
  
  verboseLog(`Fetching logo for ${companyName} (${domain})`);
  
  for (const source of config.logoSources) {
    const sourceUrl = source.url.replace('{domain}', domain);
    const startTime = Date.now();
    
    try {
      verboseLog(`Trying ${source.name}: ${sourceUrl}`);
      const logoData = await fetchLogoFromUrl(sourceUrl);
      const loadTime = Date.now() - startTime;
      
      // Calculate quality score
      let qualityScore = source.priority === 1 ? 90 : source.priority === 2 ? 75 : 60;
      
      // Adjust based on file size (larger usually better quality)
      if (logoData.size > 10000) qualityScore += 10;
      else if (logoData.size < 1000) qualityScore -= 20;
      
      // Adjust based on content type
      if (logoData.contentType.includes('svg')) qualityScore += 15;
      else if (logoData.contentType.includes('png')) qualityScore += 5;
      
      qualityScore = Math.max(0, Math.min(100, qualityScore));
      
      const logoSource = {
        sourceName: source.name,
        sourceUrl: sourceUrl,
        quality: qualityScore,
        loadTimeMs: loadTime,
        lastTested: new Date().toISOString(),
        isWorking: true,
        errorMessage: null
      };
      
      results.sources.push(logoSource);
      
      // If this is the best logo so far, use it
      if (!results.bestLogo || qualityScore > results.bestLogo.qualityScore) {
        const fileExtension = logoData.contentType.includes('svg') ? 'svg' :
                            logoData.contentType.includes('png') ? 'png' :
                            logoData.contentType.includes('jpeg') || logoData.contentType.includes('jpg') ? 'jpg' :
                            'png';
        
        results.bestLogo = {
          logoData: logoData.data.toString('base64'),
          contentType: logoData.contentType,
          fileExtension: fileExtension,
          fileSize: logoData.size,
          qualityScore: qualityScore,
          source: source.name,
          width: logoData.dimensions?.width || null,
          height: logoData.dimensions?.height || null,
          isPlaceholder: false,
          domain: domain
        };
      }
      
      // If we found a high-quality logo, we can stop searching
      if (qualityScore >= 85) {
        verboseLog(`High-quality logo found from ${source.name}, stopping search`);
        break;
      }
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      verboseLog(`Failed to fetch from ${source.name}: ${error.message}`);
      
      results.sources.push({
        sourceName: source.name,
        sourceUrl: sourceUrl,
        quality: 0,
        loadTimeMs: loadTime,
        lastTested: new Date().toISOString(),
        isWorking: false,
        errorMessage: error.message
      });
      
      results.errors.push(`${source.name}: ${error.message}`);
    }
  }
  
  return results;
}

async function generatePlaceholderLogo(companyName, domain) {
  // Generate a simple placeholder logo
  const initial = companyName.charAt(0).toUpperCase();
  
  // Create a simple SVG placeholder
  const svg = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" fill="#f3f4f6" rx="8"/>
    <text x="64" y="80" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
          text-anchor="middle" fill="#6b7280">${initial}</text>
  </svg>`;
  
  return {
    logoData: Buffer.from(svg).toString('base64'),
    contentType: 'image/svg+xml',
    fileExtension: 'svg',
    fileSize: svg.length,
    qualityScore: 10,
    source: 'generated',
    width: 128,
    height: 128,
    isPlaceholder: true,
    domain: domain
  };
}

async function saveLogoToDatabase(companyId, logoData, sources) {
  if (config.dryRun) {
    log(`DRY RUN: Would save logo for company ${companyId}`, 'info');
    return;
  }
  
  try {
    // Insert the logo record
    const [logoRecord] = await db.insert(companyLogos).values({
      companyId: companyId,
      logoData: logoData.logoData,
      logoUrl: null, // We're storing data directly, not using external URLs
      contentType: logoData.contentType,
      fileExtension: logoData.fileExtension,
      fileSize: logoData.fileSize,
      qualityScore: logoData.qualityScore,
      source: logoData.source,
      width: logoData.width,
      height: logoData.height,
      isPlaceholder: logoData.isPlaceholder,
      domain: logoData.domain
    }).returning();
    
    verboseLog(`Logo saved with ID: ${logoRecord.id}`);
    
    // Insert source records
    if (sources.length > 0) {
      const sourceRecords = sources.map(source => ({
        companyLogoId: logoRecord.id,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        quality: source.quality,
        loadTimeMs: source.loadTimeMs,
        lastTested: source.lastTested,
        isWorking: source.isWorking,
        errorMessage: source.errorMessage
      }));
      
      await db.insert(logoSources).values(sourceRecords);
      verboseLog(`Saved ${sourceRecords.length} logo sources`);
    }
    
    // Update performance tracking
    await db.insert(logoPerformance).values({
      companyId: companyId,
      cacheKey: `logo_${companyId}`,
      fetchAttempts: sources.length,
      lastFetchAttempt: new Date().toISOString(),
      totalRequests: 1,
      successfulRequests: logoData.qualityScore > 0 ? 1 : 0,
      successRate: logoData.qualityScore > 0 ? 100 : 0
    }).onConflictDoUpdate({
      target: logoPerformance.companyId,
      set: {
        fetchAttempts: sources.length,
        lastFetchAttempt: new Date().toISOString(),
        totalRequests: sql`total_requests + 1`,
        successfulRequests: sql`successful_requests + ${logoData.qualityScore > 0 ? 1 : 0}`,
        updatedAt: new Date().toISOString()
      }
    });
    
    return logoRecord;
    
  } catch (error) {
    log(`Failed to save logo for company ${companyId}: ${error.message}`, 'error');
    throw error;
  }
}

async function processCompany(company) {
  const domain = extractDomain(company.website);
  
  if (!domain) {
    verboseLog(`No domain found for ${company.name}, generating placeholder`);
    const placeholderLogo = await generatePlaceholderLogo(company.name, null);
    await saveLogoToDatabase(company.id, placeholderLogo, []);
    return { success: true, type: 'placeholder' };
  }
  
  try {
    const logoResult = await fetchLogoForDomain(domain, company.name);
    
    if (logoResult.bestLogo) {
      await saveLogoToDatabase(company.id, logoResult.bestLogo, logoResult.sources);
      return { 
        success: true, 
        type: 'fetched', 
        quality: logoResult.bestLogo.qualityScore,
        source: logoResult.bestLogo.source 
      };
    } else {
      // No logo found, create placeholder
      verboseLog(`No logo found for ${company.name}, generating placeholder`);
      const placeholderLogo = await generatePlaceholderLogo(company.name, domain);
      await saveLogoToDatabase(company.id, placeholderLogo, logoResult.sources);
      return { success: true, type: 'placeholder' };
    }
    
  } catch (error) {
    log(`Error processing ${company.name}: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('🚀 Starting logo database population script');
  log(`Configuration: batchSize=${config.batchSize}, delay=${config.delay}ms, dryRun=${config.dryRun}`);
  
  const stats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    placeholder: 0,
    fetched: 0,
    skipped: 0
  };
  
  try {
    // Get companies to process
    let companiesQuery = db.select().from(companies);
    
    if (config.companyId) {
      companiesQuery = companiesQuery.where(eq(companies.id, config.companyId));
    } else if (!config.force) {
      // Only process companies that don't have logos yet
      companiesQuery = companiesQuery.where(
        isNull(
          db.select({ id: companyLogos.id })
            .from(companyLogos)
            .where(eq(companyLogos.companyId, companies.id))
            .limit(1)
        )
      );
    }
    
    const companiesList = await companiesQuery;
    stats.total = companiesList.length;
    
    log(`Found ${stats.total} companies to process`);
    
    if (stats.total === 0) {
      log('No companies to process. Use --force to re-process existing logos.');
      return;
    }
    
    // Process in batches
    for (let i = 0; i < companiesList.length; i += config.batchSize) {
      const batch = companiesList.slice(i, i + config.batchSize);
      const batchNum = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(stats.total / config.batchSize);
      
      log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} companies)`);
      
      // Process batch
      const batchResults = await Promise.allSettled(
        batch.map(company => processCompany(company))
      );
      
      // Update stats
      batchResults.forEach((result, index) => {
        stats.processed++;
        
        if (result.status === 'fulfilled' && result.value.success) {
          stats.successful++;
          if (result.value.type === 'placeholder') {
            stats.placeholder++;
          } else if (result.value.type === 'fetched') {
            stats.fetched++;
          }
          
          verboseLog(`✅ ${batch[index].name}: ${result.value.type}${
            result.value.quality ? ` (quality: ${result.value.quality})` : ''
          }`);
        } else {
          stats.failed++;
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          log(`❌ ${batch[index].name}: ${error}`, 'error');
        }
      });
      
      // Progress update
      const progress = ((stats.processed / stats.total) * 100).toFixed(1);
      log(`Progress: ${stats.processed}/${stats.total} (${progress}%) - Success: ${stats.successful}, Failed: ${stats.failed}`);
      
      // Delay between batches to be nice to external services
      if (i + config.batchSize < companiesList.length) {
        verboseLog(`Waiting ${config.delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
    }
    
    // Final stats
    log('🎉 Logo population completed!');
    log(`📊 Final Stats:`);
    log(`   Total companies: ${stats.total}`);
    log(`   Processed: ${stats.processed}`);
    log(`   Successful: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    log(`   Failed: ${stats.failed}`);
    log(`   Logos fetched: ${stats.fetched}`);
    log(`   Placeholders: ${stats.placeholder}`);
    
    if (config.dryRun) {
      log('🔍 DRY RUN MODE - No changes were made to the database');
    }
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the script
main().catch(console.error);
