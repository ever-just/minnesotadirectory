import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = "postgresql://neondb_owner:npg_RaSZ09iyfWAm@ep-winter-recipe-aejsi9db-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

// Corporate address translations for known headquarters
const corporateTranslations = {
  "3M Center": "3M Center Building",
  "Ameriprise Financial Ctr": "Ameriprise Financial Center", 
  "1 Health Dr": "1 Health Drive",
  "1 General Mills Blvd": "1 General Mills Boulevard",
  "1 Hormel Pl": "1 Hormel Place",
  "1 Ecolab Pl": "1 Ecolab Place"
};

/**
 * Comprehensive address standardization function
 * Removes suite numbers, building designations, and standardizes corporate names
 */
function standardizeAddress(rawAddress) {
  if (!rawAddress || rawAddress.trim() === '') {
    return null;
  }

  let cleaned = rawAddress.trim();
  
  // 1. Handle corporate translations first
  const exactMatch = corporateTranslations[cleaned];
  if (exactMatch) {
    return exactMatch;
  }
  
  // 2. Remove suite/unit/apartment designations (most problematic for geocoding)
  cleaned = cleaned
    .replace(/\s+Ste\s+[\w\d#-]+.*$/i, '') // "Ste 100", "Ste A", "Ste 1500"
    .replace(/\s+Suite\s+[\w\d#-]+.*$/i, '') // "Suite 300"  
    .replace(/\s+Unit\s+[\w\d#-]+.*$/i, '') // "Unit 15"
    .replace(/\s+#[\w\d-]+.*$/i, '') // "#200", "#A-5"
    .replace(/\s+Apt\s+[\w\d#-]+.*$/i, '') // "Apt 5B"
    
    // 3. Remove building/floor designations
    .replace(/\s+Bldg\s+[\w\d-]+.*$/i, '') // "Bldg 275-6W"
    .replace(/\s+Building\s+[\w\d-]+.*$/i, '') // "Building A"
    .replace(/\s+Floor\s+\d+.*$/i, '') // "Floor 15"
    .replace(/\s+Fl\s+\d+.*$/i, '') // "Fl 3"
    
    // 4. Remove room numbers
    .replace(/\s+Rm\s+[\w\d-]+.*$/i, '') // "Rm 300"
    .replace(/\s+Room\s+[\w\d-]+.*$/i, '') // "Room 450"
    
    // 5. Clean up extra whitespace and normalize
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim();

  // 6. Handle special corporate address formats
  cleaned = cleaned
    .replace(/^(.+)\s+Ctr$/i, '$1 Center') // "Financial Ctr" → "Financial Center"
    .replace(/^(.+)\s+Blvd$/i, '$1 Boulevard') // Ensure "Blvd" consistency
    .replace(/^(.+)\s+Ave$/i, '$1 Avenue') // Ensure "Ave" consistency
    .replace(/^(.+)\s+St$/i, '$1 Street') // Ensure "St" consistency
    .replace(/^(.+)\s+Dr$/i, '$1 Drive') // Ensure "Dr" consistency
    .replace(/^(.+)\s+Rd$/i, '$1 Road') // Ensure "Rd" consistency
    .replace(/^(.+)\s+Pl$/i, '$1 Place'); // Ensure "Pl" consistency

  return cleaned || null;
}

/**
 * Analyze address improvement potential
 */
function analyzeAddressChanges(original, standardized) {
  const changes = [];
  
  if (!original || !standardized) return changes;
  
  if (original.includes('Ste ') || original.includes('Suite ')) {
    changes.push('Removed suite designation');
  }
  if (original.includes('Bldg ') || original.includes('Building ')) {
    changes.push('Removed building designation');
  }
  if (original.includes('Floor ') || original.includes('Fl ')) {
    changes.push('Removed floor designation');
  }
  if (corporateTranslations[original.trim()]) {
    changes.push('Applied corporate translation');
  }
  
  return changes;
}

/**
 * Test the standardization on sample companies
 */
async function testStandardization() {
  console.log('🧪 Testing Address Standardization Logic\n');
  
  const sampleCompanies = await sql`
    SELECT name, address
    FROM companies 
    WHERE address IS NOT NULL 
    AND address != ''
    AND address NOT LIKE '%Unknown%'
    ORDER BY sales DESC NULLS LAST
    LIMIT 15
  `;
  
  const results = {
    improved: 0,
    unchanged: 0,
    samples: []
  };
  
  sampleCompanies.forEach((company, i) => {
    const original = company.address;
    const standardized = standardizeAddress(original);
    const changes = analyzeAddressChanges(original, standardized);
    
    const improved = original !== standardized;
    if (improved) results.improved++;
    else results.unchanged++;
    
    console.log(`${i + 1}. ${company.name}`);
    console.log(`   BEFORE: "${original}"`);
    console.log(`   AFTER:  "${standardized}"`);
    
    if (changes.length > 0) {
      console.log(`   CHANGES: ${changes.join(', ')}`);
    }
    
    console.log(`   STATUS: ${improved ? '✅ IMPROVED' : '⚪ NO CHANGE'}`);
    console.log('');
    
    results.samples.push({
      company: company.name,
      original,
      standardized,
      improved,
      changes
    });
  });
  
  console.log(`📊 Test Results:`);
  console.log(`   Improved: ${results.improved}/${sampleCompanies.length} (${Math.round(results.improved/sampleCompanies.length*100)}%)`);
  console.log(`   Unchanged: ${results.unchanged}/${sampleCompanies.length}`);
  
  return results;
}

/**
 * Update all companies with standardized addresses
 */
async function updateAllAddresses() {
  console.log('🚀 Standardizing All Company Addresses\n');
  
  // Get all companies with addresses
  const companies = await sql`
    SELECT id, name, address
    FROM companies 
    WHERE address IS NOT NULL 
    AND address != ''
    AND address NOT LIKE '%Unknown%'
    ORDER BY sales DESC NULLS LAST
  `;
  
  console.log(`📊 Processing ${companies.length} companies with addresses...`);
  
  let updated = 0;
  let improved = 0;
  let unchanged = 0;
  
  for (const company of companies) {
    try {
      const standardized = standardizeAddress(company.address);
      
      if (standardized) {
        await sql`
          UPDATE companies 
          SET standardized_address = ${standardized}
          WHERE id = ${company.id}
        `;
        
        updated++;
        
        if (company.address !== standardized) {
          improved++;
          console.log(`✅ ${company.name}: "${company.address}" → "${standardized}"`);
        } else {
          unchanged++;
        }
      }
      
      // Progress indicator
      if (updated % 100 === 0) {
        console.log(`   📈 Processed ${updated}/${companies.length} companies...`);
      }
      
    } catch (error) {
      console.log(`❌ Error updating ${company.name}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Address Standardization Complete!');
  console.log(`   📊 Total Processed: ${updated}`);
  console.log(`   ✅ Improved: ${improved} (${Math.round(improved/updated*100)}%)`);
  console.log(`   ⚪ Unchanged: ${unchanged} (${Math.round(unchanged/updated*100)}%)`);
  
  return { updated, improved, unchanged };
}

/**
 * Verify results by comparing before/after
 */
async function verifyResults() {
  console.log('\n🔍 Verifying Standardization Results\n');
  
  const results = await sql`
    SELECT 
      COUNT(*) as total_companies,
      COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as has_address,
      COUNT(CASE WHEN standardized_address IS NOT NULL THEN 1 END) as has_standardized,
      COUNT(CASE WHEN address != standardized_address THEN 1 END) as improved_addresses
    FROM companies
  `;
  
  const stats = results[0];
  
  console.log('📊 Final Statistics:');
  console.log(`   Total companies: ${stats.total_companies}`);
  console.log(`   Companies with addresses: ${stats.has_address}`);
  console.log(`   Companies with standardized addresses: ${stats.has_standardized}`);
  console.log(`   Addresses improved by standardization: ${stats.improved_addresses}`);
  console.log(`   Improvement rate: ${Math.round(stats.improved_addresses/stats.has_standardized*100)}%`);
  
  // Show some examples of the most problematic addresses that got fixed
  const examples = await sql`
    SELECT name, address, standardized_address
    FROM companies 
    WHERE address IS NOT NULL 
    AND standardized_address IS NOT NULL
    AND address != standardized_address
    AND (address LIKE '%Ste %' OR address LIKE '%Suite %' OR address LIKE '%Bldg %')
    ORDER BY sales DESC NULLS LAST
    LIMIT 10
  `;
  
  if (examples.length > 0) {
    console.log('\n🎯 Top 10 Most Improved Addresses:');
    examples.forEach((company, i) => {
      console.log(`${i + 1}. ${company.name}`);
      console.log(`   BEFORE: "${company.address}"`);
      console.log(`   AFTER:  "${company.standardized_address}"`);
      console.log('');
    });
  }
  
  return stats;
}

// Main execution
// Execute immediately
  async function main() {
    try {
      // Test first
      console.log('='.repeat(60));
      console.log('🧪 PHASE 1: TESTING ADDRESS STANDARDIZATION');
      console.log('='.repeat(60));
      await testStandardization();
      
      console.log('\n' + '='.repeat(60));
      console.log('🚀 PHASE 2: UPDATING ALL ADDRESSES');
      console.log('='.repeat(60));
      await updateAllAddresses();
      
      console.log('\n' + '='.repeat(60));
      console.log('🔍 PHASE 3: VERIFICATION');
      console.log('='.repeat(60));
      await verifyResults();
      
      console.log('\n🎉 Address standardization completed successfully!');
      console.log('💡 Next step: Use standardized_address for geocoding to improve success rates');
      
    } catch (error) {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    }
  }
  
  main();

export { standardizeAddress, analyzeAddressChanges };
