-- Add enhanced business descriptions to companies table
-- This migration adds new_description column while preserving existing descriptions
-- The new descriptions will follow Business Model Canvas structure

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS new_description TEXT;

-- Add metadata columns for tracking the description rewrite process
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS description_status VARCHAR(50) DEFAULT 'original',
ADD COLUMN IF NOT EXISTS description_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS description_approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS description_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS description_version INTEGER DEFAULT 1;

-- Create indexes for efficient querying during the rewrite process
CREATE INDEX IF NOT EXISTS idx_companies_description_status 
ON companies (description_status);

CREATE INDEX IF NOT EXISTS idx_companies_description_generated 
ON companies (description_generated_at) 
WHERE description_generated_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.new_description IS 'Enhanced business description following Business Model Canvas structure';
COMMENT ON COLUMN companies.description_status IS 'Status: original, generated, reviewed, approved, active';
COMMENT ON COLUMN companies.description_generated_at IS 'Timestamp when new description was generated';
COMMENT ON COLUMN companies.description_approved_at IS 'Timestamp when new description was approved for use';
COMMENT ON COLUMN companies.description_source IS 'Source of information: llm_api, wikipedia, manual, hybrid';
COMMENT ON COLUMN companies.description_version IS 'Version number for tracking description iterations';


