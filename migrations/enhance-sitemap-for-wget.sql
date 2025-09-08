-- ENHANCED SITEMAP SCHEMA FOR WGET-BASED MIGRATION
-- Adds fields needed for relevant page extraction and careers prioritization

-- Add new fields to website_pages table
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS relevance_score INTEGER DEFAULT 0;
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS is_careers_page BOOLEAN DEFAULT FALSE;
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS title_text TEXT;
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS crawl_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(20) DEFAULT 'wget';
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS careers_keywords TEXT;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS website_pages_relevance_idx ON website_pages(relevance_score DESC);
CREATE INDEX IF NOT EXISTS website_pages_careers_idx ON website_pages(is_careers_page);
CREATE INDEX IF NOT EXISTS website_pages_crawl_status_idx ON website_pages(crawl_status);
CREATE INDEX IF NOT EXISTS website_pages_extraction_method_idx ON website_pages(extraction_method);

-- Create migration progress tracking table
CREATE TABLE IF NOT EXISTS sitemap_migration_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) NOT NULL,
    website_url VARCHAR(500),
    migration_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    pages_found INTEGER DEFAULT 0,
    careers_pages_found INTEGER DEFAULT 0,
    relevant_pages_stored INTEGER DEFAULT 0,
    avg_relevance_score DECIMAL(5,2),
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    extraction_method VARCHAR(20) DEFAULT 'wget',
    batch_number INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for migration tracking
CREATE INDEX IF NOT EXISTS migration_progress_company_idx ON sitemap_migration_progress(company_id);
CREATE INDEX IF NOT EXISTS migration_progress_status_idx ON sitemap_migration_progress(migration_status);
CREATE INDEX IF NOT EXISTS migration_progress_batch_idx ON sitemap_migration_progress(batch_number);
CREATE INDEX IF NOT EXISTS migration_progress_careers_idx ON sitemap_migration_progress(careers_pages_found);

-- Create unique constraint to prevent duplicate company processing
CREATE UNIQUE INDEX IF NOT EXISTS migration_progress_company_unique_idx ON sitemap_migration_progress(company_id);

-- Add comments for documentation
COMMENT ON TABLE sitemap_migration_progress IS 'Tracks progress of wget-based sitemap migration for each company';
COMMENT ON COLUMN website_pages.relevance_score IS 'Relevance score 0-100 calculated during wget extraction';
COMMENT ON COLUMN website_pages.is_careers_page IS 'TRUE if page contains careers/jobs content';
COMMENT ON COLUMN website_pages.careers_keywords IS 'Comma-separated keywords that matched careers patterns';
COMMENT ON COLUMN website_pages.extraction_method IS 'Method used to discover page: wget, sitemap, manual';

-- Create view for quick migration status overview
CREATE OR REPLACE VIEW migration_status_overview AS
SELECT 
    migration_status,
    COUNT(*) as company_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    AVG(relevant_pages_stored) as avg_pages_stored,
    SUM(careers_pages_found) as total_careers_pages,
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
         THEN EXTRACT(EPOCH FROM (completed_at - started_at))/60 
         ELSE NULL END) as avg_processing_minutes
FROM sitemap_migration_progress 
GROUP BY migration_status
ORDER BY 
    CASE migration_status
        WHEN 'completed' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'pending' THEN 3
        WHEN 'failed' THEN 4
        ELSE 5
    END;

-- Create view for careers page coverage analysis
CREATE OR REPLACE VIEW careers_coverage_analysis AS
SELECT 
    CASE 
        WHEN careers_pages_found > 0 THEN 'Has Careers Pages'
        ELSE 'No Careers Pages Found'
    END as careers_status,
    COUNT(*) as companies,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    AVG(relevant_pages_stored) as avg_total_pages,
    MAX(careers_pages_found) as max_careers_pages
FROM sitemap_migration_progress 
WHERE migration_status = 'completed'
GROUP BY careers_pages_found > 0;

-- Create view for top performing companies (most relevant pages found)
CREATE OR REPLACE VIEW top_sitemap_discoveries AS
SELECT 
    c.name as company_name,
    c.website,
    smp.relevant_pages_stored,
    smp.careers_pages_found,
    smp.avg_relevance_score,
    smp.processing_time_ms,
    smp.completed_at
FROM sitemap_migration_progress smp
JOIN companies c ON smp.company_id = c.id
WHERE smp.migration_status = 'completed'
ORDER BY smp.relevant_pages_stored DESC, smp.avg_relevance_score DESC
LIMIT 100;

-- Create function to get migration statistics
CREATE OR REPLACE FUNCTION get_migration_stats()
RETURNS TABLE(
    total_companies INTEGER,
    completed_companies INTEGER,
    failed_companies INTEGER,
    processing_companies INTEGER,
    success_rate DECIMAL,
    careers_coverage_rate DECIMAL,
    avg_pages_per_company DECIMAL,
    total_relevant_pages INTEGER,
    total_careers_pages INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_companies,
        COUNT(*) FILTER (WHERE migration_status = 'completed')::INTEGER as completed_companies,
        COUNT(*) FILTER (WHERE migration_status = 'failed')::INTEGER as failed_companies,
        COUNT(*) FILTER (WHERE migration_status = 'processing')::INTEGER as processing_companies,
        ROUND(
            COUNT(*) FILTER (WHERE migration_status = 'completed') * 100.0 / 
            NULLIF(COUNT(*), 0), 2
        ) as success_rate,
        ROUND(
            COUNT(*) FILTER (WHERE migration_status = 'completed' AND careers_pages_found > 0) * 100.0 / 
            NULLIF(COUNT(*) FILTER (WHERE migration_status = 'completed'), 0), 2
        ) as careers_coverage_rate,
        ROUND(AVG(relevant_pages_stored) FILTER (WHERE migration_status = 'completed'), 1) as avg_pages_per_company,
        COALESCE(SUM(relevant_pages_stored) FILTER (WHERE migration_status = 'completed'), 0)::INTEGER as total_relevant_pages,
        COALESCE(SUM(careers_pages_found) FILTER (WHERE migration_status = 'completed'), 0)::INTEGER as total_careers_pages
    FROM sitemap_migration_progress;
END;
$$ LANGUAGE plpgsql;
