-- Migration: Group Enhancements (Member Management + Document Sharing)
-- Description: Adds support for file attachments and enhanced member management
-- Date: 2026-02-01

-- ============================================================================
-- 1. CREATE STORAGE BUCKET FOR GROUP DOCUMENTS
-- ============================================================================

-- Create storage bucket for group documents (if using Supabase Storage)
-- Note: This may need to be done via Supabase Dashboard if SQL bucket creation is not supported
-- INSERT INTO storage.buckets (id, name, public) VALUES ('group-documents', 'group-documents', false);

-- ============================================================================
-- 2. GROUP ATTACHMENTS TABLE
-- ============================================================================

-- Table to store file/document attachments shared in groups
CREATE TABLE IF NOT EXISTS group_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path in storage bucket
    file_type VARCHAR(100) NOT NULL, -- MIME type (e.g., 'application/pdf', 'image/png')
    file_size BIGINT NOT NULL, -- Size in bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_attachments_group_id ON group_attachments(group_id);
CREATE INDEX IF NOT EXISTS idx_group_attachments_message_id ON group_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_group_attachments_uploader_id ON group_attachments(uploader_id);
CREATE INDEX IF NOT EXISTS idx_group_attachments_created_at ON group_attachments(created_at DESC);

-- ============================================================================
-- 3. ENHANCE GROUP_MEMBERS TABLE (ADD ROLE SUPPORT)
-- ============================================================================

-- Add role column to group_members if it doesn't exist
-- This allows tracking of admins vs regular members
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'group_members' AND column_name = 'role'
    ) THEN
        ALTER TABLE group_members 
        ADD COLUMN role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member'));
    END IF;
END $$;

-- Add joined_at timestamp if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'group_members' AND column_name = 'joined_at'
    ) THEN
        ALTER TABLE group_members 
        ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing group creators to be admins
-- This assumes the creator_id in chat_groups table represents the admin
UPDATE group_members gm
SET role = 'admin'
FROM chat_groups cg
WHERE gm.group_id = cg.id 
  AND gm.user_id = cg.creator_id
  AND gm.role = 'member';

-- ============================================================================
-- 4. ADD AVATAR SUPPORT TO CHAT_GROUPS
-- ============================================================================

-- Add avatar_url column to chat_groups if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_groups' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE chat_groups 
        ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on group_attachments
ALTER TABLE group_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments in groups they are members of
CREATE POLICY group_attachments_select_policy ON group_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_attachments.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Policy: Users can upload attachments to groups they are members of
CREATE POLICY group_attachments_insert_policy ON group_attachments
    FOR INSERT
    WITH CHECK (
        auth.uid() = uploader_id
        AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_attachments.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own attachments, or admins can delete any attachment
CREATE POLICY group_attachments_delete_policy ON group_attachments
    FOR DELETE
    USING (
        auth.uid() = uploader_id
        OR EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_attachments.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- ============================================================================
-- 5. STORAGE POLICIES (for Supabase Storage)
-- ============================================================================

-- Note: These policies should be created in Supabase Dashboard or via SQL if supported
-- 
-- Bucket: group-documents
-- 
-- SELECT Policy: "Group members can view documents"
-- USING: (
--   EXISTS (
--     SELECT 1 FROM group_members
--     WHERE group_members.group_id::text = (storage.foldername(name))[1]
--     AND group_members.user_id = auth.uid()
--   )
-- )
--
-- INSERT Policy: "Group members can upload documents"
-- WITH CHECK: (
--   EXISTS (
--     SELECT 1 FROM group_members
--     WHERE group_members.group_id::text = (storage.foldername(name))[1]
--     AND group_members.user_id = auth.uid()
--   )
-- )
--
-- DELETE Policy: "Uploader or admin can delete documents"
-- USING: (
--   auth.uid()::text = (storage.foldername(name))[2]
--   OR EXISTS (
--     SELECT 1 FROM group_members
--     WHERE group_members.group_id::text = (storage.foldername(name))[1]
--     AND group_members.user_id = auth.uid()
--     AND group_members.role = 'admin'
--   )
-- )

-- ============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for group_attachments
DROP TRIGGER IF EXISTS update_group_attachments_updated_at ON group_attachments;
CREATE TRIGGER update_group_attachments_updated_at
    BEFORE UPDATE ON group_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. HELPER VIEWS (OPTIONAL)
-- ============================================================================

-- View to get attachment details with user information
CREATE OR REPLACE VIEW group_attachments_with_user AS
SELECT 
    ga.id,
    ga.group_id,
    ga.message_id,
    ga.uploader_id,
    ga.file_name,
    ga.file_path,
    ga.file_type,
    ga.file_size,
    ga.created_at,
    ga.updated_at,
    u.email as uploader_email,
    up.username as uploader_username,
    up.full_name as uploader_full_name,
    up.avatar_url as uploader_avatar
FROM group_attachments ga
LEFT JOIN auth.users u ON ga.uploader_id = u.id
LEFT JOIN user_profiles up ON ga.uploader_id = up.user_id;

-- View to get group members with user details
CREATE OR REPLACE VIEW group_members_with_details AS
SELECT 
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    gm.joined_at,
    u.email,
    up.username,
    up.full_name,
    up.avatar_url,
    up.bio
FROM group_members gm
LEFT JOIN auth.users u ON gm.user_id = u.id
LEFT JOIN user_profiles up ON gm.user_id = up.user_id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries (run these to check if migration succeeded):
-- SELECT COUNT(*) FROM group_attachments;
-- SELECT * FROM group_members_with_details LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'group_attachments';
