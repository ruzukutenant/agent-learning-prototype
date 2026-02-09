-- Invite/Referral Code System
-- Users get 3 invite codes after completing their assessment
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  generated_by_session_id UUID REFERENCES advisor_sessions(id),
  generated_by_email VARCHAR(255),
  redeemed_by_email VARCHAR(255),
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX idx_invite_codes_session ON invite_codes(generated_by_session_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
