-- Add 'complete' to the allowed phase values for both tables

-- Update advisor_sessions constraint
ALTER TABLE advisor_sessions
DROP CONSTRAINT IF EXISTS advisor_sessions_current_phase_check;

ALTER TABLE advisor_sessions
ADD CONSTRAINT advisor_sessions_current_phase_check
CHECK (current_phase IN ('context', 'exploration', 'diagnosis', 'readiness', 'routing', 'complete'));

-- Update advisor_messages constraint
ALTER TABLE advisor_messages
DROP CONSTRAINT IF EXISTS advisor_messages_phase_check;

ALTER TABLE advisor_messages
ADD CONSTRAINT advisor_messages_phase_check
CHECK (phase IN ('context', 'exploration', 'diagnosis', 'readiness', 'routing', 'complete'));
