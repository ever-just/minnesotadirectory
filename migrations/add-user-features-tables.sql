-- Migration: Add sophisticated user features (saved companies, activity tracking)
-- Created: 2025-09-06

-- Create saved_companies table for user favorites
CREATE TABLE IF NOT EXISTS saved_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    tags VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, company_id) -- Prevent duplicate saves
);

-- Create indexes for saved companies
CREATE INDEX IF NOT EXISTS saved_companies_user_idx ON saved_companies(user_id);
CREATE INDEX IF NOT EXISTS saved_companies_company_idx ON saved_companies(company_id);
CREATE INDEX IF NOT EXISTS saved_companies_user_company_idx ON saved_companies(user_id, company_id);
CREATE INDEX IF NOT EXISTS saved_companies_saved_at_idx ON saved_companies(saved_at DESC);

-- Create user_activity table for analytics and user insights
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'company_view', 'company_save', 'company_unsave', 'search'
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    search_term VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for user activity
CREATE INDEX IF NOT EXISTS user_activity_user_idx ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_type_idx ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS user_activity_timestamp_idx ON user_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS user_activity_company_idx ON user_activity(company_id);

-- Add table comments
COMMENT ON TABLE saved_companies IS 'User-saved favorite companies with optional notes and tags';
COMMENT ON TABLE user_activity IS 'User activity tracking for analytics and personalization';

-- Add column comments for saved_companies
COMMENT ON COLUMN saved_companies.user_id IS 'Reference to the user who saved the company';
COMMENT ON COLUMN saved_companies.company_id IS 'Reference to the saved company';
COMMENT ON COLUMN saved_companies.saved_at IS 'When the user saved this company';
COMMENT ON COLUMN saved_companies.notes IS 'Optional user notes about this company';
COMMENT ON COLUMN saved_companies.tags IS 'User-defined tags for organizing saved companies';

-- Add column comments for user_activity
COMMENT ON COLUMN user_activity.activity_type IS 'Type of user activity (login, company_view, etc.)';
COMMENT ON COLUMN user_activity.company_id IS 'Company involved in the activity (if applicable)';
COMMENT ON COLUMN user_activity.search_term IS 'Search term used (for search activities)';
COMMENT ON COLUMN user_activity.ip_address IS 'User IP address for security tracking';
COMMENT ON COLUMN user_activity.user_agent IS 'Browser/device information';

-- Verify tables were created
SELECT 'User features tables created successfully' AS status;
