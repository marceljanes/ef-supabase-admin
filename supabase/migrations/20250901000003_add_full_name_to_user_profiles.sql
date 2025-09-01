-- Add full_name column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing records to use email as full_name where full_name is null
UPDATE user_profiles 
SET full_name = email 
WHERE full_name IS NULL OR full_name = '';

-- Create trigger function to automatically set full_name to email for new users
CREATE OR REPLACE FUNCTION set_full_name_from_email()
RETURNS TRIGGER AS $$
BEGIN
    -- If full_name is null or empty, set it to email
    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        NEW.full_name = NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER trigger_set_full_name_on_insert
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_full_name_from_email();

-- Create trigger for UPDATE operations (in case email changes)
CREATE TRIGGER trigger_set_full_name_on_update
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    WHEN (NEW.email IS DISTINCT FROM OLD.email AND (NEW.full_name IS NULL OR NEW.full_name = '' OR NEW.full_name = OLD.email))
    EXECUTE FUNCTION set_full_name_from_email();

-- Optional: Create an index for better performance on full_name searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name ON user_profiles(full_name);
