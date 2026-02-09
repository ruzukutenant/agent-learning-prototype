-- Add funnel tracking fields to advisor_sessions table

ALTER TABLE advisor_sessions
ADD COLUMN IF NOT EXISTS landing_viewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS name_collection_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS chat_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS chat_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_provided_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS summary_viewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS booking_clicked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS booking_clicked_endpoint TEXT,
ADD COLUMN IF NOT EXISTS call_booked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS call_booked_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS calendly_event_id TEXT;

-- Create index for funnel analysis queries
CREATE INDEX IF NOT EXISTS idx_sessions_funnel_tracking
ON advisor_sessions(landing_viewed_at, chat_completed_at, summary_viewed_at, call_booked_at);

-- Create funnel_events table for detailed tracking
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES advisor_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session
ON funnel_events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_funnel_events_type
ON funnel_events(event_type, created_at);
