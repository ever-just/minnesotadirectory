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

  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    // Read the file at runtime to avoid bundling
    const filePath = path.join(process.cwd(), 'src/data/real-pages-lookup.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const realPagesData = JSON.parse(fileContent);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(realPagesData),
    };
  } catch (error) {
    console.error('Error serving real pages data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
