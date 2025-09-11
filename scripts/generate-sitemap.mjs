import fs from 'fs';
import { neon } from '@neondatabase/serverless';
import Papa from 'papaparse';

const DOMAIN = 'https://minnesotadirectory.com'; // Update with actual domain when available
const OUTPUT_PATH = 'public/sitemap.xml';
const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function generateSitemap() {
  console.log('🗺️  Generating sitemap with correct company URLs...');
  const urls = [];
  
  // Static routes
  urls.push({
    loc: `${DOMAIN}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '1.0'
  });
  
  urls.push({
    loc: `${DOMAIN}/directory`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '0.8'
  });
  
  // Dynamic company routes - FROM DATABASE with correct URLs
  try {
    console.log('📊 Fetching companies from database...');
    const companies = await sql`
      SELECT name 
      FROM companies 
      ORDER BY sales DESC NULLS LAST
    `;
    
    let companyCount = 0;
    companies.forEach((company) => {
      if (company.name && company.name.trim() !== '') {
        // Use actual company name (URL encoded) to match routing
        const encodedName = encodeURIComponent(company.name);
        urls.push({
          loc: `${DOMAIN}/company/${encodedName}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'monthly',
          priority: '0.6'
        });
        companyCount++;
      }
    });
    
    console.log(`✅ Added ${companyCount} companies with CORRECT URLs`);
    
    // Generate and save XML
    const xml = generateXML(urls);
    fs.writeFileSync(OUTPUT_PATH, xml);
    console.log(`🎉 Sitemap generated successfully with ${urls.length} URLs`);
    console.log(`📍 Saved to: ${OUTPUT_PATH}`);
    console.log(`🔧 URLs now match actual routing: /company/:companyName`);
    
  } catch (error) {
    console.error('❌ Database error:', error);
    console.log('🔄 Falling back to CSV method...');
    await generateFromCSVFallback();
  }
}

// CSV fallback method (with correct URLs)
async function generateFromCSVFallback() {
  try {
    const Papa = await import('papaparse');
    const csvPath = 'public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️  CSV file not found, generating static routes only');
      return generateStaticOnly();
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const urls = [
      { loc: `${DOMAIN}/`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: '1.0' },
      { loc: `${DOMAIN}/directory`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: '0.8' }
    ];
    
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let companyCount = 0;
        results.data.forEach((company) => {
          if (company['Company Name'] && company['Company Name'].trim() !== '') {
            // Use actual company name (URL encoded) 
            const encodedName = encodeURIComponent(company['Company Name']);
            urls.push({
              loc: `${DOMAIN}/company/${encodedName}`,
              lastmod: new Date().toISOString().split('T')[0],
              changefreq: 'monthly',
              priority: '0.6'
            });
            companyCount++;
          }
        });
        
        console.log(`✅ CSV fallback: Added ${companyCount} companies with CORRECT URLs`);
        const xml = generateXML(urls);
        fs.writeFileSync(OUTPUT_PATH, xml);
        console.log(`🎉 Fallback sitemap generated with ${urls.length} URLs`);
      }
    });
  } catch (error) {
    console.error('❌ CSV fallback failed:', error);
    generateStaticOnly();
  }
}

function generateStaticOnly() {
  const urls = [
    { loc: `${DOMAIN}/`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: '1.0' },
    { loc: `${DOMAIN}/directory`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: '0.8' }
  ];
  
  const xml = generateXML(urls);
  fs.writeFileSync(OUTPUT_PATH, xml);
  console.log(`✅ Static-only sitemap generated with ${urls.length} URLs`);
}

function generateXML(urls) {
  const urlElements = urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

// Self-executing function
generateSitemap().catch(console.error);
