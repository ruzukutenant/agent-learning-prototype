-- ============================================
-- Reference Spec Alignment Migration
-- Adds columns for structured data collection
-- ============================================

-- Add missing columns for CONTEXT phase structured data
ALTER TABLE advisor_sessions
ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
ADD COLUMN IF NOT EXISTS volume_indicator TEXT;

-- Add columns for EXPLORATION phase hypothesis formation
ALTER TABLE advisor_sessions
ADD COLUMN IF NOT EXISTS hypothesis_category TEXT CHECK (hypothesis_category IN ('strategy', 'execution', 'energy')),
ADD COLUMN IF NOT EXISTS hypothesis_reasoning TEXT;

-- Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_sessions_acquisition ON advisor_sessions(acquisition_source);
CREATE INDEX IF NOT EXISTS idx_sessions_hypothesis ON advisor_sessions(hypothesis_category);

-- Add comments for documentation
COMMENT ON COLUMN advisor_sessions.acquisition_source IS 'How clients currently find them (referrals, social media, paid ads, content, etc.)';
COMMENT ON COLUMN advisor_sessions.volume_indicator IS 'Number of clients or revenue range (e.g., "5 clients/month" or "$10K/month")';
COMMENT ON COLUMN advisor_sessions.hypothesis_category IS 'Initial hypothesis formed during exploration, before user validation';
COMMENT ON COLUMN advisor_sessions.hypothesis_reasoning IS 'Evidence supporting the hypothesis (saved before diagnosis phase)';

-- Note: clarity_score, confidence_score, capacity_score already exist
-- Note: business_type and surface_challenge already exist
