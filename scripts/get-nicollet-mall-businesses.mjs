#!/usr/bin/env node

/**
 * Google Places API Script - 250 Nicollet Mall Businesses
 * 
 * This script uses the Google Cloud Places API to find all businesses
 * registered at 250 Nicollet Mall, Minneapolis, MN 55401
 * 
 * Setup:
 * 1. Get a Google Cloud Places API key from: https://console.cloud.google.com/
 * 2. Enable the Places API (New) for your project
 * 3. Set your API key: export GOOGLE_PLACES_API_KEY=your_api_key_here
 * 4. Run: node scripts/get-nicollet-mall-businesses.mjs
 */

import { Client } from '@googlemaps/google-maps-services-js';
import fs from 'fs';
import path from 'path';

// Configuration
const TARGET_ADDRESS = '250 Nicollet Mall, Minneapolis, MN 55401';
const SEARCH_RADIUS = 50; // meters - very small radius to focus on the specific building
const OUTPUT_FILE = 'nicollet-mall-businesses.json';

class NicolletMallBusinessFinder {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('❌ Google Places API key is required. Set GOOGLE_PLACES_API_KEY environment variable.');
    }
    
    this.client = new Client({});
    this.apiKey = apiKey;
    this.businesses = [];
  }

  /**
   * Find all businesses at 250 Nicollet Mall
   */
  async findBusinesses() {
    console.log('🔍 Searching for businesses at 250 Nicollet Mall, Minneapolis, MN 55401...');
    console.log(`📍 Using search radius: ${SEARCH_RADIUS} meters\n`);

    try {
      // Step 1: Geocode the address to get precise coordinates
      const coordinates = await this.geocodeAddress(TARGET_ADDRESS);
      console.log(`📊 Address coordinates: ${coordinates.lat}, ${coordinates.lng}\n`);

      // Step 2: Search for businesses using multiple methods
      console.log('🏢 Searching for businesses using multiple approaches...\n');
      
      // Method 1: Nearby search for all business types
      await this.nearbySearch(coordinates);
      
      // Method 2: Text search for the specific address
      await this.textSearch();
      
      // Method 3: Search for specific business types commonly found in office buildings
      await this.searchByBusinessTypes(coordinates);

      // Step 3: Remove duplicates and enhance results
      this.deduplicateResults();
      
      // Step 4: Get detailed information for each business
      await this.enhanceBusinessDetails();

      // Step 5: Save results
      await this.saveResults();

      console.log(`\n✅ Found ${this.businesses.length} unique businesses at 250 Nicollet Mall`);
      console.log(`📄 Results saved to: ${OUTPUT_FILE}\n`);

      this.displaySummary();

    } catch (error) {
      console.error('❌ Error finding businesses:', error.message);
      if (error.response?.data?.error_message) {
        console.error('📝 API Error:', error.response.data.error_message);
      }
      process.exit(1);
    }
  }

  /**
   * Geocode the target address to get precise coordinates
   */
  async geocodeAddress(address) {
    console.log(`📍 Geocoding address: ${address}`);
    
    const response = await this.client.geocode({
      params: {
        address: address,
        key: this.apiKey,
      },
    });

    if (response.data.results.length === 0) {
      throw new Error(`❌ Could not geocode address: ${address}`);
    }

    const location = response.data.results[0].geometry.location;
    console.log(`✅ Geocoding successful: ${location.lat}, ${location.lng}`);
    
    return location;
  }

  /**
   * Search for nearby businesses using coordinates
   */
  async nearbySearch(coordinates) {
    console.log('🔍 Method 1: Nearby search for all business types...');

    try {
      const response = await this.client.placesNearby({
        params: {
          location: coordinates,
          radius: SEARCH_RADIUS,
          type: 'establishment', // All types of businesses
          key: this.apiKey,
        },
      });

      const places = response.data.results || [];
      console.log(`📊 Nearby search found: ${places.length} places`);
      
      this.addBusinesses(places, 'nearby_search');

    } catch (error) {
      console.warn(`⚠️ Nearby search failed: ${error.message}`);
    }
  }

  /**
   * Text search for businesses at the specific address
   */
  async textSearch() {
    console.log('🔍 Method 2: Text search for specific address...');

    const queries = [
      '250 Nicollet Mall Minneapolis',
      '250 Nicollet Mall Minneapolis MN',
      'businesses 250 Nicollet Mall Minneapolis',
      'offices 250 Nicollet Mall Minneapolis',
      'companies 250 Nicollet Mall Minneapolis'
    ];

    for (const query of queries) {
      try {
        console.log(`  📝 Searching: "${query}"`);
        
        const response = await this.client.textSearch({
          params: {
            query: query,
            key: this.apiKey,
          },
        });

        const places = response.data.results || [];
        console.log(`    📊 Found: ${places.length} places`);
        
        // Filter results to only include those at or very near our target address
        const filtered = places.filter(place => 
          this.isAtTargetLocation(place, TARGET_ADDRESS)
        );
        
        console.log(`    ✅ Filtered to target location: ${filtered.length} places`);
        this.addBusinesses(filtered, 'text_search');

        // Small delay between requests to respect rate limits
        await this.delay(200);

      } catch (error) {
        console.warn(`⚠️ Text search failed for "${query}": ${error.message}`);
      }
    }
  }

  /**
   * Search for specific business types commonly found in office buildings
   */
  async searchByBusinessTypes(coordinates) {
    console.log('🔍 Method 3: Searching by specific business types...');

    const businessTypes = [
      'accounting',
      'bank',
      'dentist',
      'doctor',
      'insurance_agency',
      'lawyer',
      'real_estate_agency',
      'restaurant',
      'store',
      'finance',
      'health',
      'food',
      'professional_services'
    ];

    for (const type of businessTypes) {
      try {
        console.log(`  🏢 Searching for: ${type}`);
        
        const response = await this.client.placesNearby({
          params: {
            location: coordinates,
            radius: SEARCH_RADIUS,
            type: type,
            key: this.apiKey,
          },
        });

        const places = response.data.results || [];
        console.log(`    📊 Found: ${places.length} ${type} businesses`);
        
        this.addBusinesses(places, `type_search_${type}`);

        // Small delay between requests
        await this.delay(200);

      } catch (error) {
        console.warn(`⚠️ Type search failed for "${type}": ${error.message}`);
      }
    }
  }

  /**
   * Check if a place is at our target location
   */
  isAtTargetLocation(place, targetAddress) {
    const formatted_address = place.formatted_address || '';
    const name = place.name || '';
    
    // Check if address contains key identifiers
    const addressMatches = 
      formatted_address.includes('250 Nicollet') ||
      formatted_address.includes('Nicollet Mall') ||
      name.includes('250 Nicollet');

    return addressMatches;
  }

  /**
   * Add businesses to our collection with source tracking
   */
  addBusinesses(places, source) {
    for (const place of places) {
      // Add source information
      place._search_source = source;
      place._found_at = new Date().toISOString();
      
      this.businesses.push(place);
    }
  }

  /**
   * Remove duplicate businesses based on place_id
   */
  deduplicateResults() {
    console.log(`\n🔄 Deduplicating results...`);
    console.log(`📊 Before deduplication: ${this.businesses.length} businesses`);

    const uniquePlaces = new Map();
    
    for (const business of this.businesses) {
      const id = business.place_id;
      
      if (!uniquePlaces.has(id)) {
        uniquePlaces.set(id, business);
      } else {
        // Merge sources if duplicate found
        const existing = uniquePlaces.get(id);
        const existingSources = Array.isArray(existing._search_sources) 
          ? existing._search_sources 
          : [existing._search_source];
        const newSource = business._search_source;
        
        existing._search_sources = [...new Set([...existingSources, newSource])];
      }
    }

    this.businesses = Array.from(uniquePlaces.values());
    console.log(`✅ After deduplication: ${this.businesses.length} unique businesses\n`);
  }

  /**
   * Get detailed information for each business
   */
  async enhanceBusinessDetails() {
    console.log('🔍 Getting detailed information for each business...\n');

    for (let i = 0; i < this.businesses.length; i++) {
      const business = this.businesses[i];
      
      try {
        console.log(`  📊 ${i + 1}/${this.businesses.length}: ${business.name}`);
        
        const response = await this.client.placeDetails({
          params: {
            place_id: business.place_id,
            fields: [
              'name',
              'formatted_address',
              'geometry',
              'types',
              'business_status',
              'formatted_phone_number',
              'international_phone_number',
              'website',
              'url',
              'rating',
              'user_ratings_total',
              'opening_hours',
              'price_level',
              'reviews'
            ].join(','),
            key: this.apiKey,
          },
        });

        // Merge detailed information with existing data
        const details = response.data.result;
        Object.assign(business, details);

        // Small delay between requests
        await this.delay(100);

      } catch (error) {
        console.warn(`    ⚠️ Failed to get details for ${business.name}: ${error.message}`);
      }
    }

    console.log('✅ Business details enhancement complete\n');
  }

  /**
   * Save results to JSON file
   */
  async saveResults() {
    const output = {
      search_metadata: {
        target_address: TARGET_ADDRESS,
        search_radius_meters: SEARCH_RADIUS,
        search_date: new Date().toISOString(),
        total_businesses_found: this.businesses.length,
        api_methods_used: [
          'geocoding',
          'nearby_search',
          'text_search',
          'type_specific_search'
        ]
      },
      businesses: this.businesses.map(business => ({
        // Core identification
        place_id: business.place_id,
        name: business.name,
        
        // Contact information
        formatted_address: business.formatted_address,
        formatted_phone_number: business.formatted_phone_number,
        international_phone_number: business.international_phone_number,
        website: business.website,
        
        // Location data
        geometry: business.geometry,
        
        // Business information
        types: business.types,
        business_status: business.business_status,
        rating: business.rating,
        user_ratings_total: business.user_ratings_total,
        price_level: business.price_level,
        
        // Hours and reviews
        opening_hours: business.opening_hours,
        reviews: business.reviews,
        
        // Search metadata
        search_sources: business._search_sources || [business._search_source],
        found_at: business._found_at
      }))
    };

    await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved to: ${OUTPUT_FILE}`);
  }

  /**
   * Display summary of findings
   */
  displaySummary() {
    console.log('📋 BUSINESS SUMMARY');
    console.log('===================');
    
    this.businesses.forEach((business, index) => {
      console.log(`\n${index + 1}. ${business.name || 'Unnamed Business'}`);
      console.log(`   📍 ${business.formatted_address || 'Address not available'}`);
      console.log(`   📞 ${business.formatted_phone_number || 'Phone not available'}`);
      console.log(`   🌐 ${business.website || 'Website not available'}`);
      console.log(`   ⭐ Rating: ${business.rating ? `${business.rating}/5 (${business.user_ratings_total} reviews)` : 'No ratings'}`);
      console.log(`   🏢 Types: ${business.types ? business.types.join(', ') : 'Not specified'}`);
      console.log(`   📊 Status: ${business.business_status || 'Unknown'}`);
    });

    // Business type analysis
    console.log('\n📊 BUSINESS TYPE ANALYSIS');
    console.log('==========================');
    const typeCount = {};
    
    this.businesses.forEach(business => {
      if (business.types) {
        business.types.forEach(type => {
          typeCount[type] = (typeCount[type] || 0) + 1;
        });
      }
    });

    const sortedTypes = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    sortedTypes.forEach(([type, count]) => {
      console.log(`  ${type}: ${count} businesses`);
    });
  }

  /**
   * Utility function to add delays between API calls
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  console.log('🏢 Google Places API - 250 Nicollet Mall Business Finder');
  console.log('========================================================\n');

  // Get API key from environment variable
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: GOOGLE_PLACES_API_KEY environment variable not set');
    console.log('\n📝 Setup Instructions:');
    console.log('1. Go to: https://console.cloud.google.com/');
    console.log('2. Create a project or select existing project');
    console.log('3. Enable the "Places API (New)" for your project');
    console.log('4. Create an API key in Credentials section');
    console.log('5. Set the API key: export GOOGLE_PLACES_API_KEY=your_api_key_here');
    console.log('6. Run this script again\n');
    process.exit(1);
  }

  try {
    const finder = new NicolletMallBusinessFinder(apiKey);
    await finder.findBusinesses();
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);




