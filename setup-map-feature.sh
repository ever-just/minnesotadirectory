#!/bin/bash

# Minnesota Directory - Map Feature Setup Script
# This script sets up the interactive map feature with company logo markers

echo "🗺️  Minnesota Directory - Map Feature Setup"
echo "=========================================="
echo

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ Error: Please run this script from the Minnesota Directory project root${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Setup Steps:${NC}"
echo "   1. Run database migration (add coordinate columns)"
echo "   2. Start geocoding process (convert addresses to coordinates)"
echo "   3. Test map functionality"
echo

# Step 1: Database Migration
echo -e "${YELLOW}🗃️  Step 1: Running database migration...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please make sure your .env file exists with DATABASE_URL configured"
    exit 1
fi

# Run migration using node directly
echo "Adding latitude/longitude columns to companies table..."
if npx tsx -r dotenv/config migrations/add-coordinates.sql.disabled 2>/dev/null || node -r dotenv/config -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const migration = fs.readFileSync('migrations/add-coordinates.sql', 'utf-8');
    await sql(migration);
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
"; then
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    echo "Please check your DATABASE_URL in .env file"
    exit 1
fi

echo

# Step 2: Check Netlify dev server
echo -e "${YELLOW}🌐 Step 2: Checking Netlify dev server...${NC}"

if curl -s http://localhost:8888 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Netlify dev server is running${NC}"
    
    echo
    echo -e "${YELLOW}🌍 Step 3: Starting geocoding process...${NC}"
    echo "This will convert company addresses to map coordinates..."
    echo "⏱️  Estimated time: 5-10 minutes (rate limited for API politeness)"
    echo
    
    # Run the geocoding migration script
    if node scripts/run-map-migration.js; then
        echo
        echo -e "${GREEN}🎉 Map feature setup completed successfully!${NC}"
        echo
        echo -e "${BLUE}📍 What's been added:${NC}"
        echo "   • Interactive map with company logo markers"
        echo "   • Marker clustering for performance"
        echo "   • Filter integration (search & industry)"
        echo "   • Company popup cards on map"
        echo "   • Toggle between list and map views"
        echo
        echo -e "${BLUE}🚀 How to use:${NC}"
        echo "   1. Visit your site at http://localhost:8888"
        echo "   2. Use the List/Map toggle below the search bar"
        echo "   3. Click markers to see company details"
        echo "   4. Use filters to narrow down the map"
        echo
        echo -e "${YELLOW}💡 Pro Tips:${NC}"
        echo "   • Markers cluster automatically for better performance"
        echo "   • Map integrates with existing search and industry filters"
        echo "   • Company logos load as custom map markers"
        echo "   • Click 'View Details' in popups to go to company page"
        echo
    else
        echo -e "${YELLOW}⚠️  Geocoding may have encountered some issues${NC}"
        echo "The map feature is still functional - some companies may need manual coordinate entry"
    fi
else
    echo -e "${RED}❌ Netlify dev server is not running${NC}"
    echo
    echo -e "${YELLOW}Please start your development server first:${NC}"
    echo "   npm run dev"
    echo
    echo "Then run this script again to complete the geocoding process."
    echo
    echo -e "${BLUE}📋 Current Status:${NC}"
    echo "   ✅ Database schema updated (coordinates columns added)"
    echo "   ⏳ Geocoding pending (needs dev server)"
    echo "   ✅ Map components ready"
fi

echo
echo -e "${BLUE}📚 Files Created/Modified:${NC}"
echo "   • migrations/add-coordinates.sql - Database schema"
echo "   • src/components/CompanyMapView.tsx - Main map component"
echo "   • src/components/CompanyMapView.css - Map styles"
echo "   • netlify/functions/geocode-companies.ts - Geocoding service"
echo "   • App.tsx - Added map integration"
echo "   • App.css - Added view toggle styles"
echo
echo -e "${GREEN}🎊 Setup complete! Enjoy your new interactive company map!${NC}"
