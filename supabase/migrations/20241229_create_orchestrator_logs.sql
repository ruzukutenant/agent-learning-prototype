-- ============================================
-- Table: orchestrator_logs
-- Purpose: Track Edge Function orchestrator performance and debugging
-- ============================================
CREATE TABLE IF NOT EXISTS orchestrator_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Event tracking
  event TEXT NOT NULL,
  session_id UUID REFERENCES advisor_sessions(id) ON DELETE CASCADE,

  -- Performance and debugging data
  details JSONB DEFAULT '{}'::JSONB,

  -- Metadata
  duration_ms INTEGER,
  error TEXT,
  stack_trace TEXT
);

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_orchestrator_logs_session ON orchestrator_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_logs_created ON orchestrator_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_logs_event ON orchestrator_logs(event);

-- RLS Policy
ALTER TABLE orchestrator_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to logs" ON orchestrator_logs;
CREATE POLICY "Service role has full access to logs" ON orchestrator_logs
  FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE orchestrator_logs IS 'Performance and debugging logs from the Edge Function orchestrator';
COMMENT ON COLUMN orchestrator_logs.event IS 'Event type: conversation_complete, error, tool_call, etc.';
COMMENT ON COLUMN orchestrator_logs.details IS 'Flexible JSON for event-specific data (phase, tool_calls, etc.)';
