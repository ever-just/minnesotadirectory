-- Migration: Add standardized_address column for improved geocoding
-- Date: 2025-01-04
-- Purpose: Store cleaned/standardized addresses for better geocoding success rates

-- Add the standardized_address column
ALTER TABLE companies 
ADD COLUMN standardized_address TEXT;

-- Add index for faster lookups and queries
CREATE INDEX idx_companies_standardized_address 
ON companies (standardized_address) 
WHERE standardized_address IS NOT NULL;

-- Add comment to document purpose
COMMENT ON COLUMN companies.standardized_address IS 'Cleaned and standardized version of address field for improved geocoding accuracy. Removes suite numbers, building designations, and standardizes corporate campus names.';
