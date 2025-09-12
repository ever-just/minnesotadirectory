import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { companies } from '../../db/schema';
import { isNull, eq, and } from 'drizzle-orm';

// Interface for geocoding results
interface GeocodingResult {
  latitude: number;
  longitude: number;
  accuracy: 'exact' | 'approximate' | 'city' | 'region';
  source: 'nominatim' | 'google' | 'manual';
  error?: string;
}

// Rate limiting for API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Nominatim geocoding (free, but rate-limited)
async function geocodeWithNominatim(address: string, city: string, state: string, postalCode?: string): Promise<GeocodingResult | null> {
  try {
    // Construct address for better results
    const fullAddress = `${address}, ${city}, ${state}${postalCode ? ` ${postalCode}` : ''}, USA`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    // Use Nominatim with proper headers
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MinnesotaDirectory/1.0 (contact@minnesotadirectory.com)' // Required by Nominatim
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lon)) {
      return null;
    }
    
    // Determine accuracy based on result type
    let accuracy: GeocodingResult['accuracy'] = 'approximate';
    if (result.address?.house_number) {
      accuracy = 'exact';
    } else if (result.address?.city || result.address?.town) {
      accuracy = 'city';
    } else if (result.address?.state) {
      accuracy = 'region';
    }
    
    return {
      latitude: lat,
      longitude: lon,
      accuracy,
      source: 'nominatim'
    };
    
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

// Google Maps geocoding (paid, high accuracy fallback)
async function geocodeWithGoogle(address: string, city: string, state: string, postalCode?: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }
  
  try {
    const fullAddress = `${address}, ${city}, ${state}${postalCode ? ` ${postalCode}` : ''}, USA`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }
    
    const result = data.results[0];
    const location = result.geometry.location;
    
    // Determine accuracy from location_type
    let accuracy: GeocodingResult['accuracy'] = 'approximate';
    if (result.geometry.location_type === 'ROOFTOP') {
      accuracy = 'exact';
    } else if (result.geometry.location_type === 'RANGE_INTERPOLATED') {
      accuracy = 'approximate';
    } else {
      accuracy = 'city';
    }
    
    return {
      latitude: location.lat,
      longitude: location.lng,
      accuracy,
      source: 'google'
    };
    
  } catch (error) {
    console.error('Google geocoding error:', error);
    return null;
  }
}

// Main geocoding function with fallback
async function geocodeAddress(address: string, city: string, state: string, postalCode?: string): Promise<GeocodingResult | null> {
  // First try Nominatim (free)
  let result = await geocodeWithNominatim(address, city, state, postalCode);
  
  // If Nominatim fails or gives low accuracy, try Google as fallback
  if (!result || result.accuracy === 'region') {
    await delay(100); // Small delay between services
    const googleResult = await geocodeWithGoogle(address, city, state, postalCode);
    if (googleResult && (!result || googleResult.accuracy === 'exact')) {
      result = googleResult;
    }
  }
  
  return result;
}

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Parse request body
  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }

  const { batchSize = 10, skipExisting = true } = requestBody;

  try {
    // Initialize database connection
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql);

    // Get companies that need geocoding
    const companiesToGeocode = await db
      .select()
      .from(companies)
      .where(
        skipExisting 
          ? isNull(companies.latitude)
          : undefined
      )
      .limit(batchSize);

    console.log(`Found ${companiesToGeocode.length} companies to geocode`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Process companies one by one (to respect rate limits)
    for (const company of companiesToGeocode) {
      try {
        console.log(`Geocoding: ${company.name} - ${company.city}, ${company.state}`);
        
        // Skip if no address data
        if (!company.address || !company.city || !company.state) {
          results.failed++;
          results.errors.push(`${company.name}: Missing address data`);
          continue;
        }

        // Geocode the address
        const geocodeResult = await geocodeAddress(
          company.address,
          company.city,
          company.state,
          company.postalCode || undefined
        );

        if (geocodeResult) {
          // Update company with coordinates
          await db
            .update(companies)
            .set({
              latitude: geocodeResult.latitude.toString(),
              longitude: geocodeResult.longitude.toString(),
              geocodedAt: new Date(),
              geocodingSource: geocodeResult.source,
              geocodingAccuracy: geocodeResult.accuracy
            })
            .where(eq(companies.id, company.id));

          results.successful++;
          results.details.push({
            company: company.name,
            coordinates: [geocodeResult.latitude, geocodeResult.longitude],
            accuracy: geocodeResult.accuracy,
            source: geocodeResult.source
          });
          
          console.log(`✅ ${company.name}: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
        } else {
          results.failed++;
          results.errors.push(`${company.name}: Geocoding failed`);
          console.log(`❌ ${company.name}: Geocoding failed`);
        }

        results.processed++;
        
        // Respect rate limits (1 request per second for Nominatim)
        await delay(1100);
        
      } catch (error) {
        results.failed++;
        results.errors.push(`${company.name}: ${error}`);
        console.error(`Error geocoding ${company.name}:`, error);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        results,
        message: `Geocoded ${results.successful} companies successfully`
      })
    };

  } catch (error) {
    console.error('Geocoding function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
