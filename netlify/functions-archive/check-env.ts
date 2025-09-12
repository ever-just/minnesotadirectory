import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  try {
    // Check all environment variables related to Google
    const googleEnvs = {
      GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || 'NOT_SET',
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'NOT_SET',
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'NOT_SET',
      // Check all env vars that contain 'google'
      allGoogleVars: Object.keys(process.env).filter(key => 
        key.toLowerCase().includes('google')
      )
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        googleEnvironmentVars: googleEnvs,
        message: 'Environment variable check complete'
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
