-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: advisor_sessions
-- ============================================
CREATE TABLE advisor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User info
  user_name TEXT NOT NULL,
  user_email TEXT,

  -- Business context (collected during interview)
  business_type TEXT,
  business_stage TEXT,
  surface_challenge TEXT,

  -- Constraint diagnosis
  constraint_category TEXT CHECK (constraint_category IN ('strategy', 'execution', 'psychology')),
  constraint_summary TEXT,
  constraint_validated BOOLEAN DEFAULT FALSE,

  -- Readiness scores (1-10 scale)
  clarity_score INTEGER CHECK (clarity_score IS NULL OR (clarity_score BETWEEN 1 AND 10)),
  confidence_score INTEGER CHECK (confidence_score IS NULL OR (confidence_score BETWEEN 1 AND 10)),
  capacity_score INTEGER CHECK (capacity_score IS NULL OR (capacity_score BETWEEN 1 AND 10)),

  -- Routing decision
  endpoint_selected TEXT CHECK (endpoint_selected IN ('EC', 'MIST', 'NURTURE')),

  -- User feedback
  clarity_shift_rating INTEGER CHECK (clarity_shift_rating IS NULL OR (clarity_shift_rating BETWEEN 1 AND 10)),

  -- Session state
  current_phase TEXT DEFAULT 'context' CHECK (current_phase IN ('context', 'exploration', 'diagnosis', 'readiness', 'routing', 'complete')),
  total_turns INTEGER DEFAULT 0,
  completion_status TEXT DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'completed', 'abandoned')),

  -- Full conversation log (JSONB for flexibility)
  conversation_log JSONB DEFAULT '[]'::JSONB,

  -- Email delivery tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  -- Webhook tracking
  webhook_sent BOOLEAN DEFAULT FALSE,
  webhook_sent_at TIMESTAMPTZ,

  -- CRM sync tracking (Ontraport)
  crm_synced BOOLEAN DEFAULT FALSE,
  crm_synced_at TIMESTAMPTZ,
  crm_contact_id TEXT,

  -- Orchestrator conversation state (for resumption, components, etc.)
  conversation_state JSONB DEFAULT '{}'::JSONB
);

-- ============================================
-- Table: advisor_messages
-- ============================================
CREATE TABLE advisor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES advisor_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  turn_number INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('advisor', 'user')),
  message_text TEXT NOT NULL,
  phase TEXT CHECK (phase IN ('context', 'exploration', 'diagnosis', 'readiness', 'routing', 'complete')),

  -- Analysis metadata
  detected_signals JSONB,

  -- Voice-specific metadata
  was_voice BOOLEAN DEFAULT FALSE,
  audio_duration_seconds NUMERIC
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_sessions_email ON advisor_sessions(user_email);
CREATE INDEX idx_sessions_created ON advisor_sessions(created_at DESC);
CREATE INDEX idx_sessions_status ON advisor_sessions(completion_status);
CREATE INDEX idx_sessions_phase ON advisor_sessions(current_phase);
CREATE INDEX idx_messages_session ON advisor_messages(session_id);
CREATE INDEX idx_messages_turn ON advisor_messages(session_id, turn_number);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_advisor_sessions_updated_at
  BEFORE UPDATE ON advisor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- For now, we'll allow all operations from authenticated service role
-- In production, you might want stricter policies

ALTER TABLE advisor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role
CREATE POLICY "Service role has full access to sessions" ON advisor_sessions
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to messages" ON advisor_messages
  FOR ALL USING (true);

-- Policy: Allow anonymous read for specific session (user accessing their own)
CREATE POLICY "Users can read their own session" ON advisor_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can read messages from their session" ON advisor_messages
  FOR SELECT USING (true);
