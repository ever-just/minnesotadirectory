# Archived Netlify Functions

This directory contains utility, migration, and development functions that are not needed for production deployment.

## Why archived?
The production build was failing with "JavaScript heap out of memory" errors because Netlify was trying to bundle 50+ functions. By moving non-essential functions here, we reduced the production functions to only 11 essential ones.

## Categories of archived functions:

### Migration Scripts
- migrate-csv.ts
- migrate-full-csv.ts
- execute-migration.ts
- add-map-columns.ts

### Geocoding Utilities
- geocode-companies.ts
- fast-geocode.ts
- precise-geocode-remaining.ts
- exact-address-geocode.ts
- google-business-geocode.ts
- google-hq-geocode.ts
- google-places-geocode.ts
- manual-geocode.ts
- precise-address-geocode.ts
- simple-address-geocode.ts
- smart-geocode.ts
- turbo-geocode.ts
- add-coordinate-variance.ts
- spread-coordinates.ts

### Testing & Debug Functions
- test-database.ts
- test-google-api.ts
- debug-flow.ts
- check-env.ts
- check-status.js
- check-status.ts
- assess-damage.js

### Logo Management
- company-logo.ts
- company-logos-batch.ts
- logo-admin.ts

### Web Scraping/Analysis
- get-website-structure.ts
- get-website-structure-local.ts
- get-real-sitemap.ts
- get-real-top-pages.ts
- get-top-pages-real.ts
- initialize-sitemap-queue.ts
- process-sitemap-queue.ts

### Other Utilities
- cleanup-duplicates.ts
- validate-urls.ts
- companies-api.ts
- companies-api-local.ts

### Disabled Functions
- profile-get.ts.disabled
- profile-update.ts.disabled
- utils/stackAuth.ts
- utils/stackAuth.ts.disabled

## To use these functions locally:
Copy them back to `netlify/functions/` when needed for development or one-time operations.
