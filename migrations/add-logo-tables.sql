-- Logo Database Migration
-- Adds tables for storing company logos in database instead of external API calls
-- Date: December 2024

-- Company logos table - stores the actual logo data
CREATE TABLE IF NOT EXISTS company_logos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    logo_data TEXT, -- Base64 encoded binary data
    logo_url VARCHAR(1000), -- Optional CDN/storage URL
    content_type VARCHAR(50) NOT NULL, -- image/png, image/svg+xml, etc.
    file_extension VARCHAR(10) NOT NULL, -- png, svg, jpg
    file_size INTEGER, -- Size in bytes
    quality_score INTEGER DEFAULT 0, -- 0-100 quality rating
    source VARCHAR(50), -- clearbit, google, manual, etc.
    width INTEGER,
    height INTEGER,
    is_placeholder BOOLEAN DEFAULT false,
    domain VARCHAR(255), -- Store domain for easy lookup
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Logo sources table - tracks multiple logo sources tested for each company
CREATE TABLE IF NOT EXISTS logo_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_logo_id UUID REFERENCES company_logos(id) ON DELETE CASCADE NOT NULL,
    source_name VARCHAR(50), -- clearbit, google, favicon
    source_url VARCHAR(1000),
    quality INTEGER DEFAULT 0,
    load_time_ms INTEGER,
    last_tested TIMESTAMP,
    is_working BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Logo performance table - tracks logo loading performance and analytics
CREATE TABLE IF NOT EXISTS logo_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    cache_key VARCHAR(255),
    fetch_attempts INTEGER DEFAULT 0,
    last_fetch_attempt TIMESTAMP,
    average_load_time_ms INTEGER,
    success_rate DECIMAL(5,2),
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS company_logos_company_idx ON company_logos(company_id);
CREATE INDEX IF NOT EXISTS company_logos_domain_idx ON company_logos(domain);
CREATE INDEX IF NOT EXISTS company_logos_quality_idx ON company_logos(quality_score);
CREATE INDEX IF NOT EXISTS company_logos_source_idx ON company_logos(source);
CREATE INDEX IF NOT EXISTS company_logos_unique_company ON company_logos(company_id);

CREATE INDEX IF NOT EXISTS logo_sources_company_logo_idx ON logo_sources(company_logo_id);
CREATE INDEX IF NOT EXISTS logo_sources_source_name_idx ON logo_sources(source_name);
CREATE INDEX IF NOT EXISTS logo_sources_working_idx ON logo_sources(is_working);

CREATE INDEX IF NOT EXISTS logo_performance_company_idx ON logo_performance(company_id);
CREATE INDEX IF NOT EXISTS logo_performance_cache_key_idx ON logo_performance(cache_key);
CREATE INDEX IF NOT EXISTS logo_performance_success_rate_idx ON logo_performance(success_rate);

-- Add some useful comments for documentation
COMMENT ON TABLE company_logos IS 'Stores company logo data in database instead of relying on external APIs';
COMMENT ON COLUMN company_logos.logo_data IS 'Base64 encoded logo image data';
COMMENT ON COLUMN company_logos.quality_score IS 'Logo quality score 0-100, higher is better';
COMMENT ON TABLE logo_sources IS 'Tracks multiple logo sources tested for each company';
COMMENT ON TABLE logo_performance IS 'Performance analytics for logo loading';

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_company_logos_updated_at 
    BEFORE UPDATE ON company_logos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logo_performance_updated_at 
    BEFORE UPDATE ON logo_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Logo database tables created successfully!' as status;
