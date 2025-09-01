-- Create user_profiles table for managing user permissions
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles(email);
CREATE INDEX IF NOT EXISTS user_profiles_is_approved_idx ON user_profiles(is_approved);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Only approved users can read all profiles (for admin functionality)
CREATE POLICY "Approved users can read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can update profiles (for approval)
CREATE POLICY "Admins can update profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can insert profiles (manual creation)
CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND is_approved = true 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, is_approved, role)
  VALUES (NEW.id, NEW.email, FALSE, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to check if user is approved
CREATE OR REPLACE FUNCTION is_user_approved(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  approved BOOLEAN;
BEGIN
  SELECT is_approved INTO approved
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(approved, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial admin user (replace with your email)
-- You'll need to run this manually with your actual user ID after first signup
-- INSERT INTO user_profiles (id, email, is_approved, role) 
-- VALUES ('your-user-id-here', 'your-admin-email@example.com', TRUE, 'super_admin')
-- ON CONFLICT (id) DO UPDATE SET is_approved = TRUE, role = 'super_admin';
