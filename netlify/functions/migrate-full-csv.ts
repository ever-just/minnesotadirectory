import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// CSV parsing function (same as frontend)
function parseCSVData(csvData: string) {
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
    
    const company: any = {};
    headers.forEach((header, index) => {
      company[header] = values[index] || '';
    });
    
    return {
      name: company['Company Name'] || '',
      tradestyle: company['Tradestyle'] || null,
      address: company['Address Line 1'] || null,
      city: company['City'] || '',
      state: company['State Or Province'] || 'Minnesota',
      postalCode: company['Postal Code'] || null,
      phone: company['Phone'] || null,
      website: company['URL'] || null,
      sales: company['Sales (USD)'] ? parseFloat(company['Sales (USD)']) || null : null,
      employees: company['Employees (Total)'] ? parseInt(company['Employees (Total)']) || null : null,
      description: company['Business Description'] || null,
      industry: company['D&B Hoovers Industry'] || null,
      isHeadquarters: company['Is Headquarters'] === 'true',
      naicsDescription: company['NAICS 2022 Description'] || null,
      ownership: company['Ownership Type'] || null,
      ticker: company['Ticker'] || null,
      sicDescription: company['US 8-Digit SIC Description'] || null,
      employeesSite: company['Employees (Single Site)'] || null
    };
  }).filter(Boolean);
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🚀 Starting FULL CSV migration to populate all 2,765 companies...');
    
    // Fetch the CSV file from the public directory
    const csvUrl = 'https://minnesotadirectory.org/ForMinnesotacompanies.org%20$10M%20+%2010+%20ppl%20+%20MN%20Only.csv';
    console.log(`📥 Fetching CSV from: ${csvUrl}`);
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`📊 CSV downloaded, size: ${csvText.length} characters`);
    
    // Parse the CSV data
    const companies = parseCSVData(csvText);
    console.log(`✅ Parsed ${companies.length} companies from CSV`);
    
    if (companies.length === 0) {
      throw new Error('No companies found in CSV data');
    }
    
    // Clear existing data to avoid duplicates
    console.log('🧹 Clearing existing company data...');
    await sql`DELETE FROM companies`;
    await sql`DELETE FROM industries`;
    
    // Insert companies in batches for better performance
    const batchSize = 100;
    let inserted = 0;
    
    console.log(`📦 Starting batch insertion (${batchSize} companies per batch)...`);
    
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      try {
        for (const company of batch) {
          await sql`
            INSERT INTO companies (
              name, industry, sales, employees, address, city, state, 
              postal_code, phone, website, description, tradestyle, 
              ticker, ownership, naics_description, sic_description, 
              is_headquarters, employees_site
            )
            VALUES (
              ${company.name}, ${company.industry}, ${company.sales}, 
              ${company.employees}, ${company.address}, ${company.city}, 
              ${company.state}, ${company.postalCode}, ${company.phone}, 
              ${company.website}, ${company.description}, ${company.tradestyle}, 
              ${company.ticker}, ${company.ownership}, ${company.naicsDescription}, 
              ${company.sicDescription}, ${company.isHeadquarters}, ${company.employeesSite}
            )
          `;
        }
        
        inserted += batch.length;
        const progress = Math.round((inserted / companies.length) * 100);
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${inserted}/${companies.length} companies (${progress}%)`);
        
      } catch (batchError) {
        console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        // Continue with next batch rather than failing completely
      }
    }
    
    // Create industries lookup table
    console.log('🏭 Creating industries lookup table...');
    const uniqueIndustries = [...new Set(
      companies
        .map(c => c.industry)
        .filter(Boolean)
    )].sort();
    
    for (const industry of uniqueIndustries) {
      const count = companies.filter(c => c.industry === industry).length;
      await sql`
        INSERT INTO industries (name, company_count)
        VALUES (${industry}, ${count})
        ON CONFLICT (name) DO UPDATE SET company_count = ${count}
      `;
    }
    
    // Verify final counts
    const [{ count: finalCompanyCount }] = await sql`SELECT COUNT(*) as count FROM companies`;
    const [{ count: finalIndustryCount }] = await sql`SELECT COUNT(*) as count FROM industries`;
    
    const result = {
      status: '🎉 FULL MIGRATION SUCCESSFUL',
      timestamp: new Date().toISOString(),
      source: {
        csvUrl: csvUrl,
        totalParsed: companies.length
      },
      migrated: {
        companies: parseInt(finalCompanyCount),
        industries: parseInt(finalIndustryCount)
      },
      performance: {
        batchSize: batchSize,
        totalBatches: Math.ceil(companies.length / batchSize),
        successRate: `${Math.round((inserted / companies.length) * 100)}%`
      },
      message: `Successfully migrated ${finalCompanyCount} companies and ${finalIndustryCount} industries to production database`
    };
    
    console.log('🎉 MIGRATION COMPLETE:', result);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: '❌ MIGRATION FAILED',
        timestamp: new Date().toISOString(),
        error: error.message,
        details: 'Check function logs for more information'
      }, null, 2)
    };
  }
};
