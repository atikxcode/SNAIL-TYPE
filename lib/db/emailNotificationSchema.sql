-- PostgreSQL Email Notifications and Preferences Schema

-- Table for storing email notification records
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'daily_summary', 'streak_reminder', 'achievement_unlocked', etc.
    subject TEXT NOT NULL,
    content TEXT NOT NULL, -- HTML content of the email
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending', 'sent', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for user notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_summaries BOOLEAN DEFAULT true,
    streak_reminders BOOLEAN DEFAULT true,
    achievement_notifications BOOLEAN DEFAULT true,
    weekly_recaps BOOLEAN DEFAULT true,
    friend_activities BOOLEAN DEFAULT true,
    comeback_campaigns BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'normal' CHECK (email_frequency IN ('lite', 'normal', 'full')), -- How often to send emails
    timezone VARCHAR(50) DEFAULT 'UTC', -- User's timezone for scheduling
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON email_notifications(sent_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update the updated_at column
CREATE TRIGGER update_email_notifications_updated_at 
    BEFORE UPDATE ON email_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_prefs_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Example usage for scheduling a notification:
-- INSERT INTO email_notifications (user_id, type, subject, content, scheduled_at, status)
-- VALUES (
--     'user-id-here', 
--     'streak_reminder', 
--     'Don''t break your streak!',
--     '<html>...</html>',
--     NOW() + INTERVAL '1 day',
--     'scheduled'
-- );