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
      SELECT id, name, industry, sales, employees, address, city, state, postal_code as "postalCode", 
             phone, website, description, tradestyle, ticker, ownership,
             naics_description as "naicsDescription", sic_description as "sicDescription", 
             is_headquarters as "isHeadquarters", employees_site as "employeesSite",
             latitude, longitude, geocodedat as "geocodedAt", geocodingsource as "geocodingSource", geocodingaccuracy as "geocodingAccuracy",
             CASE 
               WHEN website IS NOT NULL AND website != '' THEN
                 REGEXP_REPLACE(
                   REGEXP_REPLACE(website, '^https?://(www\.)?', '', 'i'),
                   '/.*$', ''
                 )
               ELSE NULL
             END as domain
      FROM companies 
      ORDER BY sales DESC NULLS LAST
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
      geocodingAccuracy: company.geocodingAccuracy
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
