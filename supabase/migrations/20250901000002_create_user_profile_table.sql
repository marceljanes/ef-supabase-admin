-- Create user_profiless table for user management and approval system
CREATE TABLE IF NOT EXISTS user_profiless (
    idx SERIAL PRIMARY KEY,
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_approved BOOLEAN GENERATED ALWAYS AS (status = 'approved') STORED
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiless_id ON user_profiless(id);
CREATE INDEX idx_user_profiless_email ON user_profiless(email);
CREATE INDEX idx_user_profiless_status ON user_profiless(status);
CREATE INDEX idx_user_profiless_role ON user_profiless(role);

-- Create RLS policies
ALTER TABLE user_profiless ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON user_profiless
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        -- Users can only update specific fields, not role or status
        role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
        status = (SELECT status FROM user_profiles WHERE id = auth.uid())
    );

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND status = 'approved'
        )
    );

-- Allow admins to update user profiles (approve/reject, change roles)
CREATE POLICY "Admins can update user profiles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND status = 'approved'
        )
    );

-- Allow system to insert new user profiles (for auth triggers)
CREATE POLICY "System can insert user profiles" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, status, role)
    VALUES (NEW.id, NEW.email, 'pending', 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user_profiles on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update user_profiles updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create function to approve user
CREATE OR REPLACE FUNCTION approve_user(user_id UUID, approver_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        status = 'approved',
        approved_by = approver_id,
        approved_at = NOW(),
        rejection_reason = NULL
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject user
CREATE OR REPLACE FUNCTION reject_user(user_id UUID, approver_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        status = 'rejected',
        approved_by = approver_id,
        approved_at = NOW(),
        rejection_reason = reason
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
