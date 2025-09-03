-- Create freelancer_projects table
CREATE TABLE freelancer_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('development', 'design', 'writing', 'marketing', 'consulting', 'other')),
    budget_min INTEGER,
    budget_max INTEGER,
    currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF')),
    deadline DATE,
    skills_required TEXT[], -- Array of required skills
    project_type TEXT NOT NULL DEFAULT 'fixed' CHECK (project_type IN ('fixed', 'hourly', 'ongoing')),
    remote_allowed BOOLEAN DEFAULT true,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    freelancer_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create freelancer_proposals table
CREATE TABLE freelancer_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES freelancer_projects(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    proposal_text TEXT NOT NULL,
    proposed_budget INTEGER,
    proposed_timeline INTEGER, -- in days
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(project_id, freelancer_id) -- One proposal per freelancer per project
);

-- Create indexes for better query performance
CREATE INDEX idx_freelancer_projects_client_id ON freelancer_projects(client_id);
CREATE INDEX idx_freelancer_projects_freelancer_id ON freelancer_projects(freelancer_id);
CREATE INDEX idx_freelancer_projects_status ON freelancer_projects(status);
CREATE INDEX idx_freelancer_projects_category ON freelancer_projects(category);
CREATE INDEX idx_freelancer_projects_created_at ON freelancer_projects(created_at);

CREATE INDEX idx_freelancer_proposals_project_id ON freelancer_proposals(project_id);
CREATE INDEX idx_freelancer_proposals_freelancer_id ON freelancer_proposals(freelancer_id);
CREATE INDEX idx_freelancer_proposals_status ON freelancer_proposals(status);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_freelancer_projects_updated_at BEFORE UPDATE ON freelancer_projects
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_freelancer_proposals_updated_at BEFORE UPDATE ON freelancer_proposals
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE freelancer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_proposals ENABLE ROW LEVEL SECURITY;

-- Create policies for freelancer_projects
CREATE POLICY "Anyone can view projects" ON freelancer_projects FOR SELECT USING (true);

-- Authenticated users can insert projects
CREATE POLICY "Authenticated users can create projects" ON freelancer_projects FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND client_id = auth.uid()
);

-- Only project owner can update their projects
CREATE POLICY "Project owners can update projects" ON freelancer_projects FOR UPDATE USING (
    client_id = auth.uid()
);

-- Only project owner can delete their projects
CREATE POLICY "Project owners can delete projects" ON freelancer_projects FOR DELETE USING (
    client_id = auth.uid()
);

-- Create policies for freelancer_proposals
CREATE POLICY "Anyone can view proposals" ON freelancer_proposals FOR SELECT USING (true);

-- Authenticated users can create proposals
CREATE POLICY "Authenticated users can create proposals" ON freelancer_proposals FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND freelancer_id = auth.uid()
);

-- Only proposal owner can update their proposals
CREATE POLICY "Proposal owners can update proposals" ON freelancer_proposals FOR UPDATE USING (
    freelancer_id = auth.uid()
);

-- Only proposal owner can delete their proposals
CREATE POLICY "Proposal owners can delete proposals" ON freelancer_proposals FOR DELETE USING (
    freelancer_id = auth.uid()
);

-- Grant permissions
GRANT ALL ON freelancer_projects TO authenticated;
GRANT ALL ON freelancer_proposals TO authenticated;
GRANT SELECT ON freelancer_projects TO anon;
GRANT SELECT ON freelancer_proposals TO anon;

-- Insert some dummy data
INSERT INTO freelancer_projects (
    title, description, category, budget_min, budget_max, currency, deadline, 
    skills_required, project_type, remote_allowed, location, client_id
) VALUES 
(
    'E-Commerce Website Development',
    'Looking for an experienced developer to build a modern e-commerce website with React/Next.js and Stripe integration. The site should be mobile-responsive and include admin dashboard.',
    'development',
    5000,
    8000,
    'EUR',
    '2025-03-15',
    ARRAY['React', 'Next.js', 'TypeScript', 'Stripe', 'CSS'],
    'fixed',
    true,
    'Remote',
    (SELECT id FROM user_profiles WHERE email LIKE '%@%' LIMIT 1)
),
(
    'Mobile App UI/UX Design',
    'Need a talented designer to create a modern, user-friendly interface for a fitness tracking mobile app. Should include wireframes, mockups, and a complete design system.',
    'design',
    2000,
    4000,
    'EUR',
    '2025-02-28',
    ARRAY['Figma', 'UI/UX', 'Mobile Design', 'Prototyping'],
    'fixed',
    true,
    'Remote',
    (SELECT id FROM user_profiles WHERE email LIKE '%@%' LIMIT 1)
),
(
    'Content Writing for Tech Blog',
    'Looking for a technical writer to create engaging blog posts about AI, machine learning, and software development. 10 articles per month, 1500-2000 words each.',
    'writing',
    50,
    80,
    'EUR',
    NULL,
    ARRAY['Technical Writing', 'AI/ML', 'SEO', 'Research'],
    'hourly',
    true,
    'Remote',
    (SELECT id FROM user_profiles WHERE email LIKE '%@%' LIMIT 1)
),
(
    'Digital Marketing Campaign',
    'Need a digital marketing expert to launch and manage a comprehensive campaign for a new SaaS product. Includes social media, content marketing, and paid advertising.',
    'marketing',
    3000,
    6000,
    'EUR',
    '2025-04-01',
    ARRAY['Google Ads', 'Facebook Ads', 'Content Marketing', 'Analytics'],
    'fixed',
    false,
    'Zurich, Switzerland',
    (SELECT id FROM user_profiles WHERE email LIKE '%@%' LIMIT 1)
),
(
    'Business Strategy Consulting',
    'Seeking an experienced business consultant to help develop go-to-market strategy for a fintech startup. Need someone with experience in financial services.',
    'consulting',
    150,
    250,
    'EUR',
    '2025-03-31',
    ARRAY['Business Strategy', 'Fintech', 'Market Analysis', 'Financial Services'],
    'hourly',
    true,
    'Remote',
    (SELECT id FROM user_profiles WHERE email LIKE '%@%' LIMIT 1)
);
