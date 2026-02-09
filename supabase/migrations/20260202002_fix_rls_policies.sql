-- Fix RLS: tighten existing policies and enable RLS on unprotected tables
--
-- Context: All database access goes through the server using the service role key,
-- which bypasses RLS. The anon key is only used client-side for storage uploads.
-- These policies deny all anon-key database access as a defense-in-depth measure.

-- ─── Fix advisor_sessions: replace permissive USING(true) with deny-all ─────

DROP POLICY IF EXISTS "Service role has full access to sessions" ON advisor_sessions;
DROP POLICY IF EXISTS "Users can read their own session" ON advisor_sessions;

-- Service role bypasses RLS automatically, so no policy needed for it.
-- Deny all access via anon key.
CREATE POLICY "Deny anon access to sessions" ON advisor_sessions
  FOR ALL USING (false);

-- ─── Fix advisor_messages: replace permissive USING(true) with deny-all ─────

DROP POLICY IF EXISTS "Service role has full access to messages" ON advisor_messages;
DROP POLICY IF EXISTS "Users can read messages from their session" ON advisor_messages;

CREATE POLICY "Deny anon access to messages" ON advisor_messages
  FOR ALL USING (false);

-- ─── Enable RLS on tables that had none ─────────────────────────────────────

ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access to funnel_events" ON funnel_events
  FOR ALL USING (false);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access to email_events" ON email_events
  FOR ALL USING (false);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access to invite_codes" ON invite_codes
  FOR ALL USING (false);

ALTER TABLE split_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access to split_tests" ON split_tests
  FOR ALL USING (false);
