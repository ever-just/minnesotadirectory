#!/usr/bin/env node

/**
 * Logo URL Database Population Script (URL-Based Storage)
 * 
 * This script stores logo URLs and metadata in the database instead of base64 data
 * to avoid the 100MB database storage limit. Much more efficient and practical.
 * 
 * Usage: node scripts/populate-logo-urls.js [options]
 * Options:
 *   --batch-size=100    Number of companies to process in each batch
 *   --delay=1000       Delay between batches in milliseconds
 *   --dry-run          Don't actually save to database, just test
 *   --force            Re-process companies that already have logos
 *   --company-id=uuid   Process only specific company ID
 *   --verbose          Show detailed logging
 */

import { neon } from '@neondatabase/serverless';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// Configuration
const config = {
  batchSize: parseInt(process.env.BATCH_SIZE) || 100,
  delay: parseInt(process.env.DELAY) || 1000,
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  verbose: process.argv.includes('--verbose'),
  companyId: process.argv.find(arg => arg.startsWith('--company-id='))?.split('=')[1],
  maxRetries: 3,
  timeout: 15000, // Shorter timeout for URL validation
  logoSources: [
    { name: 'clearbit', url: 'https://logo.clearbit.com/{domain}', priority: 1 },
    { name: 'google-favicon', url: 'https://www.google.com/s2/favicons?domain={domain}&sz=128', priority: 2 }
  ]
};

// Initialize database connection
const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || 
  "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or NETLIFY_DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(databaseUrl);

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

async function validateLogoUrl(url, timeout = config.timeout) {
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
      const loadTime = Date.now() - startTime;
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const contentType = response.headers['content-type'] || 'image/png';
      const contentLength = parseInt(response.headers['content-length'] || '0');
      
      // Basic validation - check if response looks like an image
      if (contentLength < 100) {
        reject(new Error('Response too small to be a valid image'));
        return;
      }
      
      resolve({
        url: url,
        contentType: contentType,
        size: contentLength,
        loadTime: loadTime,
        status: response.statusCode
      });
      
      // Drain the response to prevent memory issues
      response.on('data', () => {});
      response.on('end', () => {});
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function findBestLogoForDomain(domain, companyName) {
  const results = {
    bestLogoUrl: null,
    sources: [],
    errors: []
  };
  
  verboseLog(`Finding best logo for ${companyName} (${domain})`);
  
  for (const source of config.logoSources) {
    const sourceUrl = source.url.replace('{domain}', domain);
    const startTime = Date.now();
    
    try {
      verboseLog(`Validating ${source.name}: ${sourceUrl}`);
      const logoInfo = await validateLogoUrl(sourceUrl);
      const loadTime = Date.now() - startTime;
      
      // Calculate quality score based on source priority and response
      let qualityScore = source.priority === 1 ? 90 : 70;
      
      // Adjust based on file size (larger usually better for logos)
      if (logoInfo.size > 5000) qualityScore += 10;
      else if (logoInfo.size < 1000) qualityScore -= 10;
      
      // Adjust based on content type
      if (logoInfo.contentType.includes('svg')) qualityScore += 10;
      else if (logoInfo.contentType.includes('png')) qualityScore += 5;
      
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
      if (!results.bestLogoUrl || qualityScore > results.bestLogoUrl.qualityScore) {
        const fileExtension = logoInfo.contentType.includes('svg') ? 'svg' :
                            logoInfo.contentType.includes('png') ? 'png' :
                            logoInfo.contentType.includes('jpeg') || logoInfo.contentType.includes('jpg') ? 'jpg' :
                            'png';
        
        results.bestLogoUrl = {
          logoUrl: sourceUrl,
          contentType: logoInfo.contentType,
          fileExtension: fileExtension,
          fileSize: logoInfo.size,
          qualityScore: qualityScore,
          source: source.name,
          isPlaceholder: false,
          domain: domain
        };
      }
      
      // If we found a high-quality logo, we can stop searching
      if (qualityScore >= 80) {
        verboseLog(`High-quality logo found from ${source.name}, stopping search`);
        break;
      }
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      verboseLog(`Failed to validate ${source.name}: ${error.message}`);
      
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

async function generatePlaceholderLogoUrl(companyName, domain) {
  // Generate a placeholder logo URL that can be computed on the fly
  const initial = companyName.charAt(0).toUpperCase();
  
  return {
    logoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6" rx="8"/><text x="50" y="65" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" fill="%236b7280">${initial}</text></svg>`,
    contentType: 'image/svg+xml',
    fileExtension: 'svg',
    fileSize: 200, // Estimated small size for placeholder
    qualityScore: 20,
    source: 'generated',
    width: 100,
    height: 100,
    isPlaceholder: true,
    domain: domain
  };
}

async function saveLogoUrlToDatabase(companyId, logoData, sources) {
  if (config.dryRun) {
    log(`DRY RUN: Would save logo URL for company ${companyId} (${logoData.source}, ${logoData.qualityScore}/100)`, 'info');
    return;
  }
  
  try {
    // Insert the logo record using only URLs (no base64 data)
    const logoInsertResult = await sql`
      INSERT INTO company_logos (
        company_id, logo_url, content_type, file_extension, 
        file_size, quality_score, source, width, height, 
        is_placeholder, domain
      ) VALUES (
        ${companyId}, ${logoData.logoUrl}, ${logoData.contentType}, ${logoData.fileExtension}, 
        ${logoData.fileSize || null}, ${logoData.qualityScore}, ${logoData.source}, 
        ${logoData.width || 100}, ${logoData.height || 100}, ${logoData.isPlaceholder}, ${logoData.domain}
      ) RETURNING id
    `;
    
    const logoId = logoInsertResult[0].id;
    verboseLog(`Logo URL saved with ID: ${logoId}`);
    
    // Insert source records
    if (sources.length > 0) {
      for (const source of sources) {
        await sql`
          INSERT INTO logo_sources (
            company_logo_id, source_name, source_url, quality, 
            load_time_ms, last_tested, is_working, error_message
          ) VALUES (
            ${logoId}, ${source.sourceName}, ${source.sourceUrl}, ${source.quality},
            ${source.loadTimeMs || null}, ${source.lastTested}, ${source.isWorking}, ${source.errorMessage}
          )
        `;
      }
      verboseLog(`Saved ${sources.length} logo sources`);
    }
    
    return { id: logoId };
    
  } catch (error) {
    log(`Failed to save logo for company ${companyId}: ${error.message}`, 'error');
    throw error;
  }
}

async function processCompany(company) {
  const domain = extractDomain(company.website);
  
  if (!domain) {
    verboseLog(`No domain found for ${company.name}, generating placeholder`);
    const placeholderLogo = await generatePlaceholderLogoUrl(company.name, null);
    await saveLogoUrlToDatabase(company.id, placeholderLogo, []);
    return { success: true, type: 'placeholder' };
  }
  
  try {
    const logoResult = await findBestLogoForDomain(domain, company.name);
    
    if (logoResult.bestLogoUrl) {
      await saveLogoUrlToDatabase(company.id, logoResult.bestLogoUrl, logoResult.sources);
      return { 
        success: true, 
        type: 'fetched', 
        quality: logoResult.bestLogoUrl.qualityScore,
        source: logoResult.bestLogoUrl.source 
      };
    } else {
      // No logo found, create placeholder
      verboseLog(`No logo found for ${company.name}, generating placeholder`);
      const placeholderLogo = await generatePlaceholderLogoUrl(company.name, domain);
      await saveLogoUrlToDatabase(company.id, placeholderLogo, logoResult.sources);
      return { success: true, type: 'placeholder' };
    }
    
  } catch (error) {
    log(`Error processing ${company.name}: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('🚀 Starting logo URL database population script');
  log(`Configuration: batchSize=${config.batchSize}, delay=${config.delay}ms, dryRun=${config.dryRun}`);
  log('📊 Storage Strategy: URL-based (avoiding 100MB database limit)');
  
  const stats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    placeholder: 0,
    fetched: 0
  };
  
  try {
    // Get companies to process using direct SQL
    let companiesList;
    
    if (config.companyId) {
      companiesList = await sql`
        SELECT id, name, website, industry 
        FROM companies 
        WHERE id = ${config.companyId}
      `;
    } else if (!config.force) {
      // Only process companies that don't have logos yet
      companiesList = await sql`
        SELECT c.id, c.name, c.website, c.industry 
        FROM companies c
        LEFT JOIN company_logos cl ON c.id = cl.company_id
        WHERE cl.id IS NULL
        ORDER BY c.sales DESC NULLS LAST
      `;
    } else {
      // Process all companies (force mode)
      companiesList = await sql`
        SELECT id, name, website, industry 
        FROM companies 
        ORDER BY sales DESC NULLS LAST
      `;
    }
    
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
    log('🎉 Logo URL population completed!');
    log(`📊 Final Stats:`);
    log(`   Total companies: ${stats.total}`);
    log(`   Processed: ${stats.processed}`);
    log(`   Successful: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    log(`   Failed: ${stats.failed}`);
    log(`   Logo URLs saved: ${stats.fetched}`);
    log(`   Placeholders: ${stats.placeholder}`);
    
    if (config.dryRun) {
      log('🔍 DRY RUN MODE - No changes were made to the database');
    } else {
      log('💾 All logo URLs stored successfully in database (space-efficient)');
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

// Run the script
main().catch(console.error);
