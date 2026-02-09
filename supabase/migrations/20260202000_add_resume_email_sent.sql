-- Add resume_email_sent column to track idle session recovery emails
ALTER TABLE advisor_sessions ADD COLUMN IF NOT EXISTS resume_email_sent BOOLEAN DEFAULT FALSE;
