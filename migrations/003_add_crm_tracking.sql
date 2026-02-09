-- Migration: Add CRM tracking columns for Ontraport integration
-- Run this in Supabase SQL Editor

-- Add CRM sync tracking columns
ALTER TABLE advisor_sessions
ADD COLUMN IF NOT EXISTS crm_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS crm_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS crm_contact_id TEXT;

-- Add conversation_state if not exists (for orchestrator state)
ALTER TABLE advisor_sessions
ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT '{}'::JSONB;

-- Verify columns added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'advisor_sessions'
AND column_name IN ('crm_synced', 'crm_synced_at', 'crm_contact_id', 'conversation_state');
