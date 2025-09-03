-- Ensure user profiles exist for all authenticated users
-- This migration creates user_profiles entries for users who don't have them

-- Insert missing user profiles for existing auth.users
INSERT INTO user_profiles (id, email, full_name, status, role, created_at, updated_at, is_approved)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    'approved' as status,
    'user' as role,
    au.created_at,
    NOW() as updated_at,
    true as is_approved
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Create function to automatically create user profile when a new user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, status, role, created_at, updated_at, is_approved)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'approved',
        'user',
        NEW.created_at,
        NOW(),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create user profile for new users
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();
