-- Fix group_messeges table to have proper timestamp defaults

-- Add default values for created_at and updated_at
ALTER TABLE group_messeges 
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Update existing NULL timestamps
UPDATE group_messeges 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE group_messeges 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Create a trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_group_messeges_updated_at ON group_messeges;

-- Create the trigger
CREATE TRIGGER update_group_messeges_updated_at
    BEFORE UPDATE ON group_messeges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the changes
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_messeges'
  AND column_name IN ('created_at', 'updated_at');
