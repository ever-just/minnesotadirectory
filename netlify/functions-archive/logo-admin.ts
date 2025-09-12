import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

/**
 * Logo Administration API Endpoint
 * 
 * Provides admin functionality for logo management:
 * - GET: Get logo statistics and management data
 * - POST: Upload/update company logo
 * - DELETE: Remove company logo
 * 
 * All operations require admin authentication (simple secret key for now)
 */

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Simple admin authentication
  const adminKey = event.headers.authorization?.replace('Bearer ', '');
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'change-me-in-production';
  
  if (adminKey !== expectedKey) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized. Admin access required.' })
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      return await handleGetStats();
    } else if (event.httpMethod === 'POST') {
      return await handleUploadLogo(event);
    } else if (event.httpMethod === 'DELETE') {
      return await handleDeleteLogo(event);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Logo admin API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }

  async function handleGetStats() {
    console.log('🔍 Fetching logo statistics...');

    // Get comprehensive logo statistics
    const statsResults = await sql`
      SELECT 
        COUNT(*) as total_logos,
        COUNT(*) FILTER (WHERE is_placeholder = false) as real_logos,
        COUNT(*) FILTER (WHERE is_placeholder = true) as placeholders,
        COUNT(DISTINCT source) as unique_sources,
        AVG(quality_score) as avg_quality,
        MIN(quality_score) as min_quality,
        MAX(quality_score) as max_quality,
        AVG(file_size) as avg_file_size,
        SUM(file_size) as total_storage_bytes
      FROM company_logos
    `;

    // Get source breakdown
    const sourceStats = await sql`
      SELECT 
        source,
        COUNT(*) as count,
        AVG(quality_score) as avg_quality,
        AVG(file_size) as avg_size
      FROM company_logos
      WHERE source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
    `;

    // Get quality distribution
    const qualityDistribution = await sql`
      SELECT 
        CASE 
          WHEN quality_score >= 90 THEN 'excellent'
          WHEN quality_score >= 75 THEN 'good'
          WHEN quality_score >= 50 THEN 'fair'
          WHEN quality_score >= 25 THEN 'poor'
          ELSE 'very-poor'
        END as quality_tier,
        COUNT(*) as count
      FROM company_logos
      GROUP BY quality_tier
      ORDER BY quality_score DESC
    `;

    // Get companies without logos
    const missingLogos = await sql`
      SELECT 
        COUNT(*) as companies_without_logos
      FROM companies c
      LEFT JOIN company_logos cl ON c.id = cl.company_id
      WHERE cl.id IS NULL
    `;

    // Get recent additions
    const recentLogos = await sql`
      SELECT 
        cl.id,
        cl.source,
        cl.quality_score as "qualityScore",
        cl.is_placeholder as "isPlaceholder",
        cl.created_at as "createdAt",
        c.name as "companyName"
      FROM company_logos cl
      INNER JOIN companies c ON cl.company_id = c.id
      ORDER BY cl.created_at DESC
      LIMIT 10
    `;

    const stats = statsResults[0];
    const totalStorageMB = Math.round(parseInt(stats.total_storage_bytes || '0') / (1024 * 1024) * 100) / 100;

    const response = {
      success: true,
      statistics: {
        overview: {
          totalLogos: parseInt(stats.total_logos),
          realLogos: parseInt(stats.real_logos),
          placeholders: parseInt(stats.placeholders),
          uniqueSources: parseInt(stats.unique_sources),
          companiesWithoutLogos: parseInt(missingLogos[0].companies_without_logos)
        },
        quality: {
          average: Math.round(parseFloat(stats.avg_quality || '0') * 10) / 10,
          minimum: parseInt(stats.min_quality || '0'),
          maximum: parseInt(stats.max_quality || '0'),
          distribution: qualityDistribution
        },
        storage: {
          totalBytes: parseInt(stats.total_storage_bytes || '0'),
          totalMB: totalStorageMB,
          averageFileSize: Math.round(parseFloat(stats.avg_file_size || '0'))
        },
        sources: sourceStats,
        recent: recentLogos
      },
      generated: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  }

  async function handleUploadLogo(event: any) {
    const requestBody = JSON.parse(event.body || '{}');
    const { companyId, logoData, contentType, source = 'manual', qualityScore = 85 } = requestBody;

    if (!companyId || !logoData || !contentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'companyId, logoData, and contentType are required' })
      };
    }

    console.log(`🔄 Uploading logo for company: ${companyId}`);

    // Validate base64 data
    try {
      Buffer.from(logoData, 'base64');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid base64 logoData' })
      };
    }

    // Get company info
    const companyResults = await sql`
      SELECT id, name, website FROM companies WHERE id = ${companyId}
    `;

    if (companyResults.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Company not found' })
      };
    }

    const company = companyResults[0];
    const logoSize = Buffer.from(logoData, 'base64').length;
    
    // Extract domain from website
    let domain = null;
    if (company.website) {
      try {
        domain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      } catch {
        // ignore domain extraction errors
      }
    }

    // Determine file extension from content type
    const fileExtension = contentType.includes('svg') ? 'svg' :
                         contentType.includes('png') ? 'png' :
                         contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' :
                         'png';

    // Delete existing logo if present
    await sql`
      DELETE FROM company_logos WHERE company_id = ${companyId}
    `;

    // Insert new logo
    const logoResults = await sql`
      INSERT INTO company_logos (
        company_id, logo_data, content_type, file_extension, file_size,
        quality_score, source, is_placeholder, domain
      ) VALUES (
        ${companyId}, ${logoData}, ${contentType}, ${fileExtension}, ${logoSize},
        ${qualityScore}, ${source}, false, ${domain}
      )
      RETURNING id, created_at
    `;

    const newLogo = logoResults[0];

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Logo uploaded successfully for ${company.name}`,
        logo: {
          id: newLogo.id,
          companyId,
          companyName: company.name,
          fileSize: logoSize,
          qualityScore,
          source,
          createdAt: newLogo.created_at
        }
      })
    };
  }

  async function handleDeleteLogo(event: any) {
    const { companyId } = event.pathParameters || {};
    
    if (!companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Company ID is required' })
      };
    }

    console.log(`🗑️  Deleting logo for company: ${companyId}`);

    const deleteResults = await sql`
      DELETE FROM company_logos 
      WHERE company_id = ${companyId}
      RETURNING id, company_id
    `;

    if (deleteResults.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Logo not found for this company' })
      };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Logo deleted successfully for company ${companyId}`,
        deletedLogoId: deleteResults[0].id
      })
    };
  }
};
