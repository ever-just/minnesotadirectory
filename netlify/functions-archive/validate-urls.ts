import type { Handler } from '@netlify/functions';

interface ValidationRequest {
  urls: string[];
}

interface ValidationResult {
  url: string;
  isValid: boolean;
  status: number;
  responseTime: number;
  title?: string;
  error?: string;
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { urls }: ValidationRequest = JSON.parse(event.body || '{}');
    
    if (!urls || !Array.isArray(urls)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request: urls array required' })
      };
    }

    console.log(`🔍 Server-side validation of ${urls.length} URLs...`);

    // Validate URLs in parallel with proper error handling
    const validationPromises = urls.map(async (url): Promise<ValidationResult> => {
      const startTime = Date.now();
      
      try {
        // Use fetch with proper timeout and headers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LifeSource-Validator/1.0; +https://minnesotadirectory.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        // Check if it's a successful response
        const isValid = response.status >= 200 && response.status < 400;
        
        console.log(`✅ ${url}: ${response.status} (${responseTime}ms)`);
        
        return {
          url,
          isValid,
          status: response.status,
          responseTime
        };
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // If HEAD fails, try GET for better accuracy
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 8000);
          
          const getResponse = await fetch(url, {
            method: 'GET',
            signal: controller2.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; LifeSource-Validator/1.0)',
              'Accept': 'text/html,application/xhtml+xml'
            }
          });
          
          clearTimeout(timeoutId2);
          const getResponseTime = Date.now() - startTime;
          
          // Extract title from successful GET requests
          let title = undefined;
          if (getResponse.status >= 200 && getResponse.status < 400) {
            try {
              const text = await getResponse.text();
              const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
              if (titleMatch) {
                title = titleMatch[1].trim();
              }
            } catch {
              // Ignore title extraction errors
            }
          }
          
          console.log(`✅ ${url}: ${getResponse.status} (${getResponseTime}ms) via GET`);
          
          return {
            url,
            isValid: getResponse.status >= 200 && getResponse.status < 400,
            status: getResponse.status,
            responseTime: getResponseTime,
            title
          };
          
        } catch (getError) {
          console.log(`❌ ${url}: ${errorMessage} (${responseTime}ms)`);
          
          return {
            url,
            isValid: false,
            status: 0,
            responseTime,
            error: errorMessage
          };
        }
      }
    });

    const results = await Promise.allSettled(validationPromises);
    
    const validationResults: ValidationResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urls[index],
          isValid: false,
          status: 0,
          responseTime: 0,
          error: result.reason?.message || 'Validation failed'
        };
      }
    });

    const validCount = validationResults.filter(r => r.isValid).length;
    console.log(`📊 Validation complete: ${validCount}/${urls.length} URLs are valid`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: validationResults,
        summary: {
          total: urls.length,
          valid: validCount,
          invalid: urls.length - validCount
        }
      })
    };

  } catch (error) {
    console.error('URL validation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export { handler };
