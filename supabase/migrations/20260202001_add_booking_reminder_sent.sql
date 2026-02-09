-- Add booking_reminder_sent flag to prevent duplicate booking reminder emails
ALTER TABLE advisor_sessions ADD COLUMN IF NOT EXISTS booking_reminder_sent boolean DEFAULT false;
