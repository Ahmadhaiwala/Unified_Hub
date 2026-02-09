-- Migration: AI Chat History Table
-- Description: Creates table for storing AI chat conversations
-- Date: 2026-02-05

-- ============================================================================
-- AI CHAT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    group_id UUID REFERENCES chat_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_group_id ON ai_chat_history(group_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_created_at ON ai_chat_history(created_at DESC);

-- ============================================================================
-- ASSIGNMENT ANSWERS TABLE (for answer linking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assignment_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    message_id UUID NOT NULL REFERENCES group_messeges(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_answers_assignment_id ON assignment_answers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_answers_student_id ON assignment_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_answers_group_id ON assignment_answers(group_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on ai_chat_history
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own chat history
CREATE POLICY ai_chat_history_select_policy ON ai_chat_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own messages
CREATE POLICY ai_chat_history_insert_policy ON ai_chat_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable RLS on assignment_answers
ALTER TABLE assignment_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own answers
CREATE POLICY assignment_answers_select_policy ON assignment_answers
    FOR SELECT
    USING (
        auth.uid() = student_id
        OR EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = assignment_answers.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- Policy: System can insert answers (no user-facing inserts)
CREATE POLICY assignment_answers_insert_policy ON assignment_answers
    FOR INSERT
    WITH CHECK (true);  -- This will be called from backend service

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for ai_chat_history updated_at
DROP TRIGGER IF EXISTS update_ai_chat_history_updated_at ON ai_chat_history;
CREATE TRIGGER update_ai_chat_history_updated_at
    BEFORE UPDATE ON ai_chat_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
