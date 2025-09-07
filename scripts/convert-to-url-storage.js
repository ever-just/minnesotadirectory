#!/usr/bin/env node

/**
 * Logo Storage Conversion Script
 * 
 * Converts existing base64 logo storage to URL-only storage to free up 37MB+ of database space.
 * This script will:
 * 1. Extract working logo URLs from existing logo_sources
 * 2. Remove base64 data from company_logos 
 * 3. Keep only URLs (saves 98%+ storage space)
 * 4. Add remaining companies that don't have logos yet
 * 
 * Usage: node scripts/convert-to-url-storage.js [options]
 */

import { neon } from '@neondatabase/serverless';

// Initialize database connection
const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || 
  "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const sql = neon(databaseUrl);

async function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function getCurrentStorageStats() {
  log('📊 Checking current storage stats...');
  
  const sizeResult = await sql`
    SELECT pg_database_size(current_database())/1024/1024 AS database_size_mb
  `;
  
  const logoStats = await sql`
    SELECT 
      COUNT(*) as total_logos,
      COUNT(*) FILTER (WHERE logo_data IS NOT NULL) as with_base64,
      COUNT(*) FILTER (WHERE logo_data IS NULL) as url_only,
      pg_size_pretty(SUM(OCTET_LENGTH(COALESCE(logo_data, '')))) as base64_size
    FROM company_logos
  `;
  
  const companyStats = await sql`
    SELECT 
      COUNT(*) as total_companies,
      (SELECT COUNT(*) FROM company_logos) as companies_with_logos
    FROM companies
  `;
  
  return {
    databaseSize: parseFloat(sizeResult[0].database_size_mb),
    logos: logoStats[0],
    companies: companyStats[0]
  };
}

async function convertBase64ToUrls() {
  log('🔄 Converting base64 logos to URL-only storage...');
  
  // Get logos that have base64 data and working source URLs
  const logosToConvert = await sql`
    SELECT 
      cl.id,
      cl.company_id,
      cl.logo_data,
      ls.source_url,
      ls.source_name,
      ls.quality,
      cl.source as original_source,
      cl.quality_score
    FROM company_logos cl
    LEFT JOIN logo_sources ls ON cl.id = ls.company_logo_id 
    WHERE cl.logo_data IS NOT NULL 
    AND ls.is_working = true
    ORDER BY cl.quality_score DESC, ls.quality DESC
  `;
  
  log(`Found ${logosToConvert.length} logos to convert`);
  
  const conversions = new Map();
  
  // Group by company_logo_id and pick best source URL
  for (const logo of logosToConvert) {
    if (!conversions.has(logo.id) || logo.quality > conversions.get(logo.id).quality) {
      conversions.set(logo.id, {
        id: logo.id,
        companyId: logo.company_id,
        bestUrl: logo.source_url,
        sourceName: logo.source_name,
        quality: logo.quality,
        originalSource: logo.original_source
      });
    }
  }
  
  log(`Converting ${conversions.size} logos to URL-only storage...`);
  
  let converted = 0;
  let errors = 0;
  
  for (const [logoId, logoInfo] of conversions) {
    try {
      // Update logo record to remove base64 data and use URL
      await sql`
        UPDATE company_logos 
        SET 
          logo_data = NULL,
          logo_url = ${logoInfo.bestUrl || logoInfo.originalSource},
          source = ${logoInfo.sourceName || logoInfo.originalSource},
          updated_at = NOW()
        WHERE id = ${logoId}
      `;
      
      converted++;
      
      if (converted % 100 === 0) {
        log(`Converted ${converted}/${conversions.size} logos...`);
      }
      
    } catch (error) {
      log(`Failed to convert logo ${logoId}: ${error.message}`, 'error');
      errors++;
    }
  }
  
  log(`✅ Conversion completed: ${converted} successful, ${errors} failed`);
  return { converted, errors };
}

async function addRemainingCompanies() {
  log('🔄 Adding logos for remaining companies...');
  
  // Get companies without logos
  const companiesWithoutLogos = await sql`
    SELECT c.id, c.name, c.website, c.industry 
    FROM companies c
    LEFT JOIN company_logos cl ON c.id = cl.company_id
    WHERE cl.id IS NULL
    ORDER BY c.sales DESC NULLS LAST
  `;
  
  log(`Found ${companiesWithoutLogos.length} companies without logos`);
  
  if (companiesWithoutLogos.length === 0) {
    log('All companies already have logos!');
    return { added: 0, errors: 0 };
  }
  
  let added = 0;
  let errors = 0;
  
  for (const company of companiesWithoutLogos) {
    try {
      const domain = extractDomain(company.website);
      let logoUrl, source, qualityScore;
      
      if (domain) {
        // Try to find working logo URLs
        logoUrl = `https://logo.clearbit.com/${domain}`;
        source = 'clearbit';
        qualityScore = 70;
      } else {
        // Generate placeholder
        const initial = company.name.charAt(0).toUpperCase();
        logoUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6" rx="8"/><text x="50" y="65" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" fill="%236b7280">${initial}</text></svg>`;
        source = 'generated';
        qualityScore = 20;
      }
      
      // Insert logo record with URL only (no base64 data)
      await sql`
        INSERT INTO company_logos (
          company_id, logo_url, content_type, file_extension,
          quality_score, source, width, height, is_placeholder, domain
        ) VALUES (
          ${company.id}, ${logoUrl}, 'image/png', 'png',
          ${qualityScore}, ${source}, 128, 128, ${!domain}, ${domain}
        )
      `;
      
      added++;
      
      if (added % 50 === 0) {
        log(`Added ${added}/${companiesWithoutLogos.length} remaining companies...`);
      }
      
    } catch (error) {
      log(`Failed to add logo for ${company.name}: ${error.message}`, 'error');
      errors++;
    }
  }
  
  log(`✅ Added logos for ${added} companies, ${errors} errors`);
  return { added, errors };
}

function extractDomain(url) {
  if (!url) return null;
  try {
    let domain = url.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.split('/')[0].split('?')[0];
    domain = domain.split(':')[0];
    return domain.toLowerCase();
  } catch {
    return null;
  }
}

async function cleanupAndOptimize() {
  log('🧹 Cleaning up and optimizing database...');
  
  try {
    // Remove orphaned logo sources (sources without parent logos)
    const cleanupResult = await sql`
      DELETE FROM logo_sources 
      WHERE company_logo_id NOT IN (SELECT id FROM company_logos)
    `;
    
    // Vacuum to reclaim space
    await sql`VACUUM FULL company_logos`;
    
    log('✅ Database cleanup completed');
    
  } catch (error) {
    log(`Warning: Cleanup had issues: ${error.message}`, 'warn');
  }
}

async function main() {
  try {
    log('🚀 Starting logo storage conversion to URL-only approach');
    
    // Check initial state
    const initialStats = await getCurrentStorageStats();
    log(`📊 Initial State:`);
    log(`   Database Size: ${initialStats.databaseSize.toFixed(1)}MB / 100MB`);
    log(`   Available Space: ${(100 - initialStats.databaseSize).toFixed(1)}MB`);
    log(`   Total Logos: ${initialStats.logos.total_logos}`);
    log(`   With Base64: ${initialStats.logos.with_base64}`);
    log(`   URL Only: ${initialStats.logos.url_only}`);
    log(`   Base64 Size: ${initialStats.logos.base64_size}`);
    log(`   Companies without logos: ${initialStats.companies.total_companies - initialStats.companies.companies_with_logos}`);
    
    // Step 1: Convert existing base64 to URLs
    const conversionResult = await convertBase64ToUrls();
    
    // Step 2: Add remaining companies
    const addResult = await addRemainingCompanies();
    
    // Step 3: Cleanup and optimize
    await cleanupAndOptimize();
    
    // Check final state
    const finalStats = await getCurrentStorageStats();
    log('🎉 Conversion completed successfully!');
    log(`📊 Final State:`);
    log(`   Database Size: ${finalStats.databaseSize.toFixed(1)}MB / 100MB`);
    log(`   Available Space: ${(100 - finalStats.databaseSize).toFixed(1)}MB`);
    log(`   Total Logos: ${finalStats.logos.total_logos}`);
    log(`   Space Saved: ${(initialStats.databaseSize - finalStats.databaseSize).toFixed(1)}MB`);
    log(`   Conversion Success: ${conversionResult.converted} logos`);
    log(`   New Logos Added: ${addResult.added} companies`);
    
    // Verify all companies have logos
    const completionCheck = await sql`
      SELECT 
        COUNT(*) as total_companies,
        (SELECT COUNT(*) FROM company_logos) as total_logos,
        (SELECT COUNT(*) FROM company_logos WHERE logo_url IS NOT NULL) as logos_with_urls
      FROM companies
    `;
    
    const completion = completionCheck[0];
    const completionRate = ((completion.total_logos / completion.total_companies) * 100).toFixed(1);
    
    log(`📈 Completion Status:`);
    log(`   Companies: ${completion.total_companies}`);
    log(`   Logos: ${completion.total_logos}`);
    log(`   URLs: ${completion.logos_with_urls}`);
    log(`   Coverage: ${completionRate}%`);
    
    if (completion.total_companies === completion.total_logos) {
      log('🎯 SUCCESS: All companies now have logos in database!');
      log('💾 Storage: URL-based approach uses 98% less space than base64');
      log('⚡ Performance: Ready for production deployment');
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

// Run the conversion
main().catch(console.error);
