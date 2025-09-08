import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    // Check what Google API keys are available
    const googleKeys = {
      GOOGLE_PLACES_API_KEY: !!process.env.GOOGLE_PLACES_API_KEY,
      GOOGLE_MAPS_API_KEY: !!process.env.GOOGLE_MAPS_API_KEY,
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      // Show first 10 chars if available
      places_key_preview: process.env.GOOGLE_PLACES_API_KEY?.substring(0, 10) || 'not_found',
      maps_key_preview: process.env.GOOGLE_MAPS_API_KEY?.substring(0, 10) || 'not_found'
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        googleAPIStatus: googleKeys,
        message: 'Environment check complete'
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
