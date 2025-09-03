-- Add created_by field to questions table to track who created each question
-- This will reference the user_profiles table and link to full_name for display

-- Add the created_by column to questions table (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'created_by') THEN
        ALTER TABLE questions 
        ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for better performance on queries by creator (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_questions_created_by') THEN
        CREATE INDEX idx_questions_created_by ON questions(created_by);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN questions.created_by IS 'References auth.users(id) - tracks who created the question';

-- Update existing questions to have a default creator (optional - can be left NULL)
-- In production, you might want to set this to a specific admin user ID
-- UPDATE questions SET created_by = 'some-admin-user-uuid' WHERE created_by IS NULL;
