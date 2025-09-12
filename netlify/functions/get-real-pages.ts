import { Handler } from '@netlify/functions';
import { promises as fs } from 'fs';
import path from 'path';

export const handler: Handler = async (event) => {
  // Allow only GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Get domain from query parameters
  const domain = event.queryStringParameters?.domain;

  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    // Try different possible paths for the data file
    const possiblePaths = [
      path.join(process.cwd(), 'data/real-pages-lookup.json'),
      path.join(process.cwd(), '../data/real-pages-lookup.json'),
      path.join(__dirname, '../../data/real-pages-lookup.json'),
      path.join('/var/task/data/real-pages-lookup.json'),
      path.join('/opt/build/repo/data/real-pages-lookup.json'),
    ];
    
    let fileContent = null;
    let successPath = null;
    
    for (const filePath of possiblePaths) {
      try {
        fileContent = await fs.readFile(filePath, 'utf-8');
        successPath = filePath;
        console.log('Successfully read from:', filePath);
        break;
      } catch (err) {
        console.log('Failed to read from:', filePath);
      }
    }
    
    if (!fileContent) {
      throw new Error('Could not find real-pages-lookup.json in any expected location');
    }
    
    const realPagesData = JSON.parse(fileContent);
    
    // If a domain is specified, return only that domain's data
    if (domain) {
      const domainData = realPagesData[domain];
      if (!domainData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Domain not found', domain }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ [domain]: domainData }),
      };
    }
    
    // If no domain specified, return a list of available domains
    const availableDomains = Object.keys(realPagesData);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        availableDomains,
        totalDomains: availableDomains.length,
        message: 'Specify a domain parameter to get pages for a specific domain'
      }),
    };
  } catch (error) {
    console.error('Error serving real pages data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};
