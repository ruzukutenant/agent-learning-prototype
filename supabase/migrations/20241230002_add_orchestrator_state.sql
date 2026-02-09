-- Add conversation_state column to store full orchestrator state
ALTER TABLE advisor_sessions
ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT NULL;

-- Add index for querying by constraint hypothesis
CREATE INDEX IF NOT EXISTS idx_sessions_constraint ON advisor_sessions(constraint_category);

-- Add comment for documentation
COMMENT ON COLUMN advisor_sessions.conversation_state IS 'Full orchestrator conversation state (ConversationState object)';
