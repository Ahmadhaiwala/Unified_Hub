-- Migration: Add notifications table for scheduled notifications
-- This table stores all notifications sent to users (reminders, announcements, etc.)

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'reminder', 'announcement', 'system', etc.
    title TEXT NOT NULL,
    message TEXT,
    reference_id UUID, -- ID of related object (reminder_id, sheet_id, etc.)
    reference_type TEXT, -- 'reminder', 'question_sheet', etc.
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- System can insert notifications (handled by service account/admin)
CREATE POLICY "Service can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Optional: Add count of unread notifications view
CREATE OR REPLACE VIEW user_unread_notification_count AS
SELECT 
    user_id,
    COUNT(*) as unread_count
FROM notifications
WHERE is_read = FALSE
GROUP BY user_id;
