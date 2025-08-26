import fs from 'fs';
import Papa from 'papaparse';

const DOMAIN = 'https://minnesotadirectory.com'; // Update with actual domain when available
const OUTPUT_PATH = 'public/sitemap.xml';

async function generateSitemap() {
  console.log('🗺️  Generating sitemap...');
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
  
  // Dynamic company routes
  try {
    const csvPath = 'public/ForMinnesotacompanies.org $10M + 10+ ppl + MN Only.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️  CSV file not found:', csvPath);
      console.log('📄 Generating sitemap with static routes only...');
    } else {
      const csvData = fs.readFileSync(csvPath, 'utf8');
      
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          let companyCount = 0;
          results.data.forEach((company, index) => {
            if (company['Company Name'] && company['Company Name'].trim() !== '') {
              urls.push({
                loc: `${DOMAIN}/company/${index}`,
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'monthly',
                priority: '0.6'
              });
              companyCount++;
            }
          });
          
          console.log(`📊 Added ${companyCount} company pages to sitemap`);
          
          // Generate and save XML
          const xml = generateXML(urls);
          fs.writeFileSync(OUTPUT_PATH, xml);
          console.log(`✅ Sitemap generated successfully with ${urls.length} URLs`);
          console.log(`📍 Saved to: ${OUTPUT_PATH}`);
        },
        error: (error) => {
          console.error('❌ Error parsing CSV:', error);
          // Generate with just static routes
          generateStaticSitemap();
        }
      });
    }
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    // Fallback to static sitemap
    generateStaticSitemap();
  }
  
  function generateStaticSitemap() {
    const xml = generateXML(urls);
    fs.writeFileSync(OUTPUT_PATH, xml);
    console.log(`✅ Static sitemap generated with ${urls.length} URLs`);
  }
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
