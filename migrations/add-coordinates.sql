-- Add geographic coordinates to companies table for mapping functionality
-- This migration adds latitude, longitude, and geocoding metadata

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS geocoding_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS geocoding_accuracy VARCHAR(20);

-- Create spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_companies_coordinates 
ON companies (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for geocoding status tracking
CREATE INDEX IF NOT EXISTS idx_companies_geocoded 
ON companies (geocoded_at) 
WHERE geocoded_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.latitude IS 'Geographic latitude coordinate (decimal degrees)';
COMMENT ON COLUMN companies.longitude IS 'Geographic longitude coordinate (decimal degrees)';
COMMENT ON COLUMN companies.geocoded_at IS 'Timestamp when geocoding was last performed';
COMMENT ON COLUMN companies.geocoding_source IS 'Source used for geocoding (nominatim, google, manual)';
COMMENT ON COLUMN companies.geocoding_accuracy IS 'Accuracy level of geocoding result (exact, approximate, city)';
