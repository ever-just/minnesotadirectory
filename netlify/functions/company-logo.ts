import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

/**
 * Company Logo API Endpoint
 * 
 * GET /api/company-logo/{companyId}
 * Returns logo data for a specific company from the database
 * 
 * Query parameters:
 * - size: desired size (small=32, medium=48, large=96, xl=128) - default: medium
 * - format: preferred format (png, svg, jpg) - returns best available
 * - quality: minimum quality score (0-100) - default: 0
 */

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const { companyId } = event.pathParameters || {};
    
    if (!companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Company ID is required' })
      };
    }

    const { size = 'medium', format, quality = '0' } = event.queryStringParameters || {};
    const minQuality = parseInt(quality);

    console.log(`🎯 Fetching logo for company: ${companyId}, size: ${size}, quality: ${minQuality}+`);

    // Get logo from database
    const logoResults = await sql`
      SELECT 
        cl.id,
        cl.company_id as "companyId",
        cl.logo_data as "logoData",
        cl.logo_url as "logoUrl", 
        cl.content_type as "contentType",
        cl.file_extension as "fileExtension",
        cl.file_size as "fileSize",
        cl.quality_score as "qualityScore",
        cl.source,
        cl.width,
        cl.height,
        cl.is_placeholder as "isPlaceholder",
        cl.domain,
        cl.created_at as "createdAt",
        c.name as "companyName"
      FROM company_logos cl
      INNER JOIN companies c ON cl.company_id = c.id
      WHERE cl.company_id = ${companyId}
        AND cl.quality_score >= ${minQuality}
      ORDER BY cl.quality_score DESC
      LIMIT 1
    `;

    if (logoResults.length === 0) {
      // No logo found, return placeholder info
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Logo not found',
          companyId,
          suggestion: 'Use the populate-logo-database script to fetch logos'
        })
      };
    }

    const logo = logoResults[0];
    
    // If requesting specific format and we don't have it, note that
    if (format && logo.fileExtension !== format) {
      console.log(`⚠️  Requested ${format} but have ${logo.fileExtension}`);
    }

    // Return logo as data URL for easy frontend usage
    const logoDataUrl = `data:${logo.contentType};base64,${logo.logoData}`;

    // Size mapping for CSS classes
    const sizeMap = {
      small: { width: 32, height: 32, className: 'w-8 h-8' },
      medium: { width: 48, height: 48, className: 'w-12 h-12' },
      large: { width: 96, height: 96, className: 'w-24 h-24' },
      xl: { width: 128, height: 128, className: 'w-32 h-32' }
    };

    const response = {
      success: true,
      logo: {
        id: logo.id,
        companyId: logo.companyId,
        companyName: logo.companyName,
        dataUrl: logoDataUrl,
        contentType: logo.contentType,
        fileExtension: logo.fileExtension,
        fileSize: logo.fileSize,
        qualityScore: logo.qualityScore,
        source: logo.source,
        dimensions: {
          original: {
            width: logo.width,
            height: logo.height
          },
          requested: sizeMap[size as keyof typeof sizeMap] || sizeMap.medium
        },
        isPlaceholder: logo.isPlaceholder,
        domain: logo.domain,
        createdAt: logo.createdAt
      },
      metadata: {
        cached: true, // Always cached since from database
        loadTime: 0, // Instant from database
        source: 'database'
      }
    };

    // Set appropriate cache headers for logos
    const cacheHeaders = {
      ...headers,
      'Cache-Control': logo.isPlaceholder ? 
        'public, max-age=3600' : // 1 hour for placeholders
        'public, max-age=86400', // 24 hours for real logos
      'ETag': `"${logo.id}-${logo.qualityScore}"`,
      'Last-Modified': new Date(logo.createdAt).toUTCString()
    };

    return {
      statusCode: 200,
      headers: cacheHeaders,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Logo API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
