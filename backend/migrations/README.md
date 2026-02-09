# Database Migration Guide

## Group Enhancements Migration

This migration adds support for:
- 📎 **Document/File Sharing** in group chats
- 👥 **Enhanced Member Management** with roles (admin/member)
- 🔒 **Row Level Security** policies for secure access

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `001_group_enhancements.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd c:\Users\haiwa\fsd1\project1\backend

# Run the migration
supabase db push migrations/001_group_enhancements.sql
```

### Option 3: Using psql (if you have direct database access)

```bash
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f migrations/001_group_enhancements.sql
```

## Post-Migration Steps

### 1. Create Storage Bucket

The SQL migration includes commented instructions for creating the storage bucket. You'll need to create it manually via the Supabase Dashboard:

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Name: `group-documents`
4. Public: **OFF** (private bucket)
5. Click **Create Bucket**

### 2. Configure Storage Policies

After creating the bucket, add these policies in the **Policies** tab:

**SELECT Policy** - "Group members can view documents"
```sql
(
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id::text = (storage.foldername(name))[1]
    AND group_members.user_id = auth.uid()
  )
)
```

**INSERT Policy** - "Group members can upload documents"
```sql
(
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id::text = (storage.foldername(name))[1]
    AND group_members.user_id = auth.uid()
  )
)
```

**DELETE Policy** - "Uploader or admin can delete"
```sql
(
  auth.uid()::text = (storage.foldername(name))[2]
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id::text = (storage.foldername(name))[1]
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
)
```

## Verification

After running the migration, verify with these queries:

```sql
-- Check if table was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'group_attachments';

-- Check if role column was added to group_members
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'group_members' AND column_name = 'role';

-- View group members with details
SELECT * FROM group_members_with_details LIMIT 5;
```

## What Changed

### New Tables
- ✅ `group_attachments` - Stores file metadata for shared documents

### Modified Tables
- ✅ `group_members` - Added `role` and `joined_at` columns

### New Views
- ✅ `group_attachments_with_user` - Attachments with uploader details
- ✅ `group_members_with_details` - Members with user profile info

### Security
- ✅ RLS policies for secure access to attachments
- ✅ Storage bucket policies (manual setup required)

## Rollback

If you need to rollback this migration:

```sql
-- Drop views
DROP VIEW IF EXISTS group_attachments_with_user;
DROP VIEW IF EXISTS group_members_with_details;

-- Drop table
DROP TABLE IF EXISTS group_attachments CASCADE;

-- Remove columns from group_members
ALTER TABLE group_members DROP COLUMN IF EXISTS role;
ALTER TABLE group_members DROP COLUMN IF EXISTS joined_at;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

## Notes

- File storage path format: `{group_id}/{uploader_id}/{filename}`
- Default max file size: 10MB (configurable in backend)
- Supported file types: PDF, images, documents (configurable in backend)
