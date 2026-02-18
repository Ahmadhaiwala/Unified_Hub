-- Migration: Assignment Enhancements
-- Description: Extends question_sheets for PDF-based assignments with auto and manual reply tracking
-- Date: 2026-02-10

-- ============================================================================
-- 1. EXTEND QUESTION_SHEETS TABLE FOR ASSIGNMENT FEATURES
-- ============================================================================

-- Add subject field (generic text, no predefined values)
ALTER TABLE question_sheets ADD COLUMN IF NOT EXISTS subject VARCHAR(200);

-- Add source tracking fields
ALTER TABLE question_sheets ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'manual' 
  CHECK (source_type IN ('manual', 'pdf', 'message'));

ALTER TABLE question_sheets ADD COLUMN IF NOT EXISTS source_file_path TEXT;

-- Add AI confidence score for auto-detected assignments
ALTER TABLE question_sheets ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3, 2);

-- Create index for subject filtering (supports any subject text)
CREATE INDEX IF NOT EXISTS idx_question_sheets_subject ON question_sheets(subject);

-- Create index for source_type filtering
CREATE INDEX IF NOT EXISTS idx_question_sheets_source_type ON question_sheets(source_type);

-- ============================================================================
-- 2. EXTEND USER_QUESTION_SHEET_ANSWERS FOR MANUAL VS AUTO-DETECTED REPLIES
-- ============================================================================

-- Add submission_type to track manual vs auto-detected replies
ALTER TABLE user_question_sheet_answers ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) DEFAULT 'manual'
  CHECK (submission_type IN ('manual', 'auto_detected'));

-- Create index for submission_type filtering
CREATE INDEX IF NOT EXISTS idx_user_answers_submission_type ON user_question_sheet_answers(submission_type);

-- ============================================================================
-- 3. UPDATE EXISTING DATA (OPTIONAL)
-- ============================================================================

-- Set default source_type for existing question sheets
UPDATE question_sheets 
SET source_type = 'manual' 
WHERE source_type IS NULL;

-- Set default submission_type for existing answers
UPDATE user_question_sheet_answers 
SET submission_type = 'manual' 
WHERE submission_type IS NULL;

-- ============================================================================
-- 4. HELPER VIEWS
-- ============================================================================

-- Update existing view to include new fields
DROP VIEW IF EXISTS question_sheets_with_stats;
CREATE OR REPLACE VIEW question_sheets_with_stats AS
SELECT 
    qs.id,
    qs.group_id,
    qs.creator_id,
    qs.title,
    qs.description,
    qs.subject,
    qs.due_date,
    qs.total_points,
    qs.source_type,
    qs.source_file_path,
    qs.ai_confidence,
    qs.created_at,
    qs.updated_at,
    COUNT(DISTINCT qsq.id) as total_questions
FROM question_sheets qs
LEFT JOIN question_sheet_questions qsq ON qs.id = qsq.question_sheet_id
GROUP BY qs.id, qs.group_id, qs.creator_id, qs.title, qs.description, 
         qs.subject, qs.due_date, qs.total_points, qs.source_type, 
         qs.source_file_path, qs.ai_confidence, qs.created_at, qs.updated_at;

-- Create view for assignment replies with submission type
DROP VIEW IF EXISTS assignment_replies_with_details;

CREATE OR REPLACE VIEW assignment_replies_with_details AS
SELECT 
    uqsa.id,
    uqsa.question_sheet_id,
    uqsa.question_id,
    uqsa.student_id,
    uqsa.answer_text,
    uqsa.message_id,
    uqsa.confidence_score,
    uqsa.is_ai_detected,
    uqsa.submission_type,
    uqsa.submitted_at,
    up.username as student_username,
    up.full_name as student_full_name,
    up.avatar_url as student_avatar
FROM user_question_sheet_answers uqsa
LEFT JOIN user_profiles up ON uqsa.student_id = up.user_id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries (run these to check if migration succeeded):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'question_sheets' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_question_sheet_answers' ORDER BY ordinal_position;
-- SELECT * FROM question_sheets_with_stats LIMIT 5;
-- SELECT * FROM assignment_replies_with_details LIMIT 5;
