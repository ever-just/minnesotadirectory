import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { domain, company } = event.queryStringParameters || {};
    
    if (!domain) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Domain parameter required' })
      };
    }

    console.log(`🎯 Fetching REAL top pages for domain: ${domain}`);

    const sql = neon(process.env.NETLIFY_DATABASE_URL!);
    
    // Get the actual top 20 pages from the database that have been ranked and validated
    const pages = await sql`
      SELECT 
        wp.id,
        wp.url,
        wp.title,
        wp.priority,
        wp.change_freq as "changeFreq",
        wp.last_modified as "lastModified",
        wp.importance_score as "importanceScore",
        wp.page_category as "category",
        wp.ranking_factors as "rankingFactors",
        ws.total_pages as "totalPages",
        ws.domain,
        ws.last_analyzed as "lastAnalyzed"
      FROM website_pages wp
      JOIN website_structures ws ON wp.website_structure_id = ws.id
      WHERE ws.domain = ${domain}
        AND wp.is_top_page = true
        AND wp.importance_score > 0
      ORDER BY wp.importance_score DESC
      LIMIT 20
    `;

    if (pages.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: `No ranked pages found for ${domain}`,
          pages: [],
          company: { name: company || 'Unknown', domain, totalPages: 0 }
        })
      };
    }

    console.log(`✅ Found ${pages.length} real ranked pages for ${domain}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pages: pages.map(page => ({
          id: page.id,
          url: page.url,
          title: page.title,
          priority: page.priority,
          changeFreq: page.changeFreq,
          lastModified: page.lastModified,
          importanceScore: page.importanceScore,
          category: page.category,
          rankingFactors: page.rankingFactors
        })),
        company: {
          name: company || 'Unknown',
          domain: pages[0]?.domain || domain,
          totalPages: pages[0]?.totalPages || 0,
          lastAnalyzed: pages[0]?.lastAnalyzed
        }
      })
    };

  } catch (error) {
    console.error('Error fetching real top pages:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch real top pages',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export { handler };
