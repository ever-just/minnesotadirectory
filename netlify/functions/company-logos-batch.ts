import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

/**
 * Batch Company Logos API Endpoint
 * 
 * POST /api/company-logos/batch
 * Returns logos for multiple companies in a single request
 * 
 * Request body:
 * {
 *   companyIds: string[],
 *   options?: {
 *     size?: 'small' | 'medium' | 'large' | 'xl',
 *     format?: 'png' | 'svg' | 'jpg',
 *     quality?: number,
 *     includeMetadata?: boolean
 *   }
 * }
 */

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { companyIds = [], options = {} } = requestBody;
    
    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'companyIds array is required and must not be empty' })
      };
    }

    if (companyIds.length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Maximum 100 company IDs allowed per batch request' })
      };
    }

    const {
      size = 'medium',
      format,
      quality = 0,
      includeMetadata = false
    } = options;

    const minQuality = parseInt(quality.toString());

    console.log(`🎯 Batch fetching logos for ${companyIds.length} companies, size: ${size}, quality: ${minQuality}+`);

    const startTime = Date.now();

    // Fetch all logos in a single query
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
      WHERE cl.company_id = ANY(${companyIds})
        AND cl.quality_score >= ${minQuality}
      ORDER BY cl.company_id, cl.quality_score DESC
    `;

    const queryTime = Date.now() - startTime;

    // Group logos by company (in case there are multiple per company, take highest quality)
    const logoMap = new Map();
    logoResults.forEach(logo => {
      const companyId = logo.companyId;
      if (!logoMap.has(companyId) || logoMap.get(companyId).qualityScore < logo.qualityScore) {
        logoMap.set(companyId, logo);
      }
    });

    // Size mapping for CSS classes
    const sizeMap = {
      small: { width: 32, height: 32, className: 'w-8 h-8' },
      medium: { width: 48, height: 48, className: 'w-12 h-12' },
      large: { width: 96, height: 96, className: 'w-24 h-24' },
      xl: { width: 128, height: 128, className: 'w-32 h-32' }
    };

    const requestedSize = sizeMap[size as keyof typeof sizeMap] || sizeMap.medium;

    // Build response
    const logos: { [companyId: string]: any } = {};
    const errors: { [companyId: string]: string } = {};

    companyIds.forEach(companyId => {
      const logo = logoMap.get(companyId);
      
      if (logo) {
        const logoDataUrl = `data:${logo.contentType};base64,${logo.logoData}`;
        
        logos[companyId] = {
          id: logo.id,
          companyId: logo.companyId,
          companyName: logo.companyName,
          dataUrl: logoDataUrl,
          contentType: logo.contentType,
          fileExtension: logo.fileExtension,
          qualityScore: logo.qualityScore,
          source: logo.source,
          dimensions: {
            original: {
              width: logo.width,
              height: logo.height
            },
            requested: requestedSize
          },
          isPlaceholder: logo.isPlaceholder,
          domain: logo.domain,
          ...(includeMetadata && {
            fileSize: logo.fileSize,
            createdAt: logo.createdAt
          })
        };
      } else {
        errors[companyId] = 'Logo not found';
      }
    });

    const stats = {
      total: companyIds.length,
      successful: Object.keys(logos).length,
      failed: Object.keys(errors).length,
      fromCache: Object.keys(logos).length, // All from database = cached
      queryTime: queryTime
    };

    const response = {
      success: true,
      logos,
      errors,
      stats,
      metadata: {
        requestedSize: size,
        requestedFormat: format,
        minQuality: minQuality,
        cached: true,
        source: 'database'
      }
    };

    // Set cache headers
    const cacheHeaders = {
      ...headers,
      'Cache-Control': 'public, max-age=3600', // 1 hour cache for batch requests
      'Content-Type': 'application/json'
    };

    console.log(`✅ Batch logo request completed: ${stats.successful}/${stats.total} successful in ${queryTime}ms`);

    return {
      statusCode: 200,
      headers: cacheHeaders,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Batch logo API error:', error);
    
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
