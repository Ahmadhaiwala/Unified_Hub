-- Migration: Admin Features (Reminders & Question Sheets)
-- Description: Adds support for admin reminders and question sheet assignments with AI linking
-- Date: 2026-02-08

-- ============================================================================
-- 1. REMINDERS TABLE
-- ============================================================================

-- Table to store admin-created reminders for group members
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_group_id ON reminders(group_id);
CREATE INDEX IF NOT EXISTS idx_reminders_creator_id ON reminders(creator_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_created_at ON reminders(created_at DESC);

-- ============================================================================
-- 2. USER REMINDER STATUS TABLE
-- ============================================================================

-- Table to track which users have acknowledged/read reminders
CREATE TABLE IF NOT EXISTS user_reminder_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reminder_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reminder_status_reminder_id ON user_reminder_status(reminder_id);
CREATE INDEX IF NOT EXISTS idx_user_reminder_status_user_id ON user_reminder_status(user_id);

-- ============================================================================
-- 3. QUESTION SHEETS TABLE
-- ============================================================================

-- Table to store question sheets/assignments
CREATE TABLE IF NOT EXISTS question_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_sheets_group_id ON question_sheets(group_id);
CREATE INDEX IF NOT EXISTS idx_question_sheets_creator_id ON question_sheets(creator_id);
CREATE INDEX IF NOT EXISTS idx_question_sheets_due_date ON question_sheets(due_date);
CREATE INDEX IF NOT EXISTS idx_question_sheets_created_at ON question_sheets(created_at DESC);

-- ============================================================================
-- 4. QUESTION SHEET QUESTIONS TABLE
-- ============================================================================

-- Table to store individual questions within a question sheet
CREATE TABLE IF NOT EXISTS question_sheet_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_sheet_id UUID NOT NULL REFERENCES question_sheets(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL DEFAULT 1,
    points INTEGER DEFAULT 0,
    expected_answer TEXT, -- Optional, for AI validation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_sheet_questions_sheet_id ON question_sheet_questions(question_sheet_id);
CREATE INDEX IF NOT EXISTS idx_question_sheet_questions_order ON question_sheet_questions(question_sheet_id, question_order);

-- ============================================================================
-- 5. USER QUESTION SHEET ANSWERS TABLE
-- ============================================================================

-- Table to store student answers (both manual and AI-detected)
CREATE TABLE IF NOT EXISTS user_question_sheet_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_sheet_id UUID NOT NULL REFERENCES question_sheets(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES question_sheet_questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    message_id UUID REFERENCES group_messeges(id) ON DELETE SET NULL, -- Link to chat message if AI-detected
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    is_ai_detected BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, student_id) -- One answer per student per question
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_question_answers_sheet_id ON user_question_sheet_answers(question_sheet_id);
CREATE INDEX IF NOT EXISTS idx_user_question_answers_question_id ON user_question_sheet_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_answers_student_id ON user_question_sheet_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_user_question_answers_message_id ON user_question_sheet_answers(message_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can view reminders in their groups
CREATE POLICY reminders_select_policy ON reminders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = reminders.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Policy: Only group admins can create reminders
CREATE POLICY reminders_insert_policy ON reminders
    FOR INSERT
    WITH CHECK (
        auth.uid() = creator_id
        AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = reminders.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- Policy: Only creator (admin) can update reminders
CREATE POLICY reminders_update_policy ON reminders
    FOR UPDATE
    USING (auth.uid() = creator_id);

-- Policy: Only creator (admin) can delete reminders
CREATE POLICY reminders_delete_policy ON reminders
    FOR DELETE
    USING (auth.uid() = creator_id);

-- Enable RLS on user_reminder_status
ALTER TABLE user_reminder_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reminder status
CREATE POLICY user_reminder_status_select_policy ON user_reminder_status
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own reminder status
CREATE POLICY user_reminder_status_insert_policy ON user_reminder_status
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable RLS on question_sheets
ALTER TABLE question_sheets ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can view question sheets
CREATE POLICY question_sheets_select_policy ON question_sheets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = question_sheets.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Policy: Only group admins can create question sheets
CREATE POLICY question_sheets_insert_policy ON question_sheets
    FOR INSERT
    WITH CHECK (
        auth.uid() = creator_id
        AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = question_sheets.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- Policy: Only creator (admin) can update question sheets
CREATE POLICY question_sheets_update_policy ON question_sheets
    FOR UPDATE
    USING (auth.uid() = creator_id);

-- Policy: Only creator (admin) can delete question sheets
CREATE POLICY question_sheets_delete_policy ON question_sheets
    FOR DELETE
    USING (auth.uid() = creator_id);

-- Enable RLS on question_sheet_questions
ALTER TABLE question_sheet_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can view questions if they can view the sheet
CREATE POLICY question_sheet_questions_select_policy ON question_sheet_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM question_sheets qs
            JOIN group_members gm ON gm.group_id = qs.group_id
            WHERE qs.id = question_sheet_questions.question_sheet_id
            AND gm.user_id = auth.uid()
        )
    );

-- Policy: System/backend can insert questions (no user-facing inserts)
CREATE POLICY question_sheet_questions_insert_policy ON question_sheet_questions
    FOR INSERT
    WITH CHECK (true); -- Backend service will handle this

-- Enable RLS on user_question_sheet_answers
ALTER TABLE user_question_sheet_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own answers, admins can view all in their group
CREATE POLICY user_question_answers_select_policy ON user_question_sheet_answers
    FOR SELECT
    USING (
        auth.uid() = student_id
        OR EXISTS (
            SELECT 1 FROM question_sheets qs
            JOIN group_members gm ON gm.group_id = qs.group_id
            WHERE qs.id = user_question_sheet_answers.question_sheet_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
    );

-- Policy: Students can insert their own answers, system can insert AI-detected answers
CREATE POLICY user_question_answers_insert_policy ON user_question_sheet_answers
    FOR INSERT
    WITH CHECK (
        auth.uid() = student_id
        OR is_ai_detected = true -- Allow backend to insert AI-detected answers
    );

-- Policy: Students can update their own answers
CREATE POLICY user_question_answers_update_policy ON user_question_sheet_answers
    FOR UPDATE
    USING (auth.uid() = student_id);

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger for reminders updated_at
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for question_sheets updated_at
DROP TRIGGER IF EXISTS update_question_sheets_updated_at ON question_sheets;
CREATE TRIGGER update_question_sheets_updated_at
    BEFORE UPDATE ON question_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. HELPER VIEWS
-- ============================================================================

-- View to get reminders with read status for a specific user
CREATE OR REPLACE VIEW user_reminders_with_status AS
SELECT 
    r.id,
    r.group_id,
    r.creator_id,
    r.title,
    r.description,
    r.due_date,
    r.priority,
    r.created_at,
    r.updated_at,
    CASE 
        WHEN urs.read_at IS NOT NULL THEN true 
        ELSE false 
    END as is_read,
    urs.read_at
FROM reminders r
LEFT JOIN user_reminder_status urs ON r.id = urs.reminder_id AND urs.user_id = auth.uid();

-- View to get question sheets with completion statistics
CREATE OR REPLACE VIEW question_sheets_with_stats AS
SELECT 
    qs.id,
    qs.group_id,
    qs.creator_id,
    qs.title,
    qs.description,
    qs.due_date,
    qs.total_points,
    qs.created_at,
    qs.updated_at,
    COUNT(DISTINCT qsq.id) as total_questions
FROM question_sheets qs
LEFT JOIN question_sheet_questions qsq ON qs.id = qsq.question_sheet_id
GROUP BY qs.id, qs.group_id, qs.creator_id, qs.title, qs.description, 
         qs.due_date, qs.total_points, qs.created_at, qs.updated_at;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries (run these to check if migration succeeded):
-- SELECT COUNT(*) FROM reminders;
-- SELECT COUNT(*) FROM question_sheets;
-- SELECT * FROM user_reminders_with_status LIMIT 5;
-- SELECT * FROM question_sheets_with_stats LIMIT 5;
