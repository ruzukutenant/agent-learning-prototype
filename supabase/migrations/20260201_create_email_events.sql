-- Email events tracking table
CREATE TABLE IF NOT EXISTS email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resend_email_id TEXT,
  email_type TEXT NOT NULL, -- 'summary', 'resume', 'reminder', 'call_taker_notification'
  recipient TEXT NOT NULL,
  session_id UUID REFERENCES advisor_sessions(id),
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed'
  bounce_type TEXT, -- 'hard', 'soft'
  bounce_reason TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_events_recipient ON email_events(recipient);
CREATE INDEX idx_email_events_recipient_bounce ON email_events(recipient, bounce_type) WHERE bounce_type IS NOT NULL;
CREATE INDEX idx_email_events_resend_id ON email_events(resend_email_id);
CREATE INDEX idx_email_events_status ON email_events(status);
CREATE INDEX idx_email_events_status_created ON email_events(status, created_at);
CREATE INDEX idx_email_events_created_at ON email_events(created_at);
CREATE INDEX idx_email_events_updated_at ON email_events(updated_at);

-- Add email_bounced flag to advisor_sessions
ALTER TABLE advisor_sessions ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN DEFAULT FALSE;

-- Index on user_email (used by booking webhooks, bounce marking, email lookups)
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON advisor_sessions(user_email);
