import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL || 'postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { limit = '50', page = '1' } = event.queryStringParameters || {};
    const limitNum = Math.min(parseInt(limit), 3000);
    const pageNum = Math.max(parseInt(page), 1);
    const offset = (pageNum - 1) * limitNum;

    const companiesRaw = await sql`
      SELECT c.id, c.name, c.industry, c.sales, c.employees, c.address, c.city, c.state, c.postal_code as "postalCode", 
             c.phone, c.website, 
             COALESCE(c.agent_description, c.description) as description,
             c.tradestyle, c.ticker, c.ownership,
             c.naics_description as "naicsDescription", c.sic_description as "sicDescription", 
             c.is_headquarters as "isHeadquarters", c.employees_site as "employeesSite",
             c.latitude, c.longitude, c.geocodedat as "geocodedAt", c.geocodingsource as "geocodingSource", c.geocodingaccuracy as "geocodingAccuracy",
             cl.logo_url, cl.source as logo_source, cl.quality_score as logo_quality,
             cl.is_placeholder as logo_is_placeholder,
             c.wikipedia_title as "wikipediaTitle", c.wikipedia_url as "wikipediaUrl", 
             c.wikipedia_summary as "wikipediaSummary", c.wikipedia_description as "wikipediaDescription",
             c.wikipedia_metrics as "wikipediaMetrics", c.wikipedia_last_updated as "wikipediaLastUpdated",
             c.wikipedia_status as "wikipediaStatus",
             CASE 
               WHEN c.website IS NOT NULL AND c.website != '' THEN
                 REGEXP_REPLACE(
                   REGEXP_REPLACE(c.website, '^https?://(www\.)?', '', 'i'),
                   '/.*$', ''
                 )
               ELSE NULL
             END as domain
      FROM companies c
      LEFT JOIN company_logos cl ON c.id = cl.company_id
      ORDER BY c.sales DESC NULLS LAST
      LIMIT ${limitNum}
      OFFSET ${offset}
    `;
    
    // Map database fields to frontend-expected fields
    const companies = companiesRaw.map(company => ({
      ...company,
      url: company.website,  // Map website → url for frontend compatibility
      employees: company.employees?.toString() || '0',  // Ensure string format
      sales: company.sales?.toString() || '0',
      // Convert coordinate strings to numbers for map usage
      latitude: company.latitude ? parseFloat(company.latitude) : undefined,
      longitude: company.longitude ? parseFloat(company.longitude) : undefined,
      geocodedAt: company.geocodedAt,
      geocodingSource: company.geocodingSource,
      geocodingAccuracy: company.geocodingAccuracy,
      // Logo fields from database
      logo_url: company.logo_url || null,
      logo_source: company.logo_source || null,
      logo_quality: company.logo_quality || 0,
      logo_is_placeholder: company.logo_is_placeholder || false,
      has_logo: !!company.logo_url
    }));

    // Get total count from database
    const totalCountResult = await sql`
      SELECT COUNT(*) as total_count FROM companies;
    `;
    const totalCompanies = parseInt(totalCountResult[0].total_count);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        companies: companies,
        total: totalCompanies,  // ✅ Real total from database
        returned: companies.length,  // How many returned this request
        success: true
      })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch companies',
        companies: [],
        total: 0,
        success: false
      })
    };
  }
};
