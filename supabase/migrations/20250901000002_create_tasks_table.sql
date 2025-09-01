-- Create tasks table for PMI Kanban board
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'demand', 'in-progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    question_count INTEGER DEFAULT 10,
    exam_code TEXT,
    category TEXT,
    difficulty TEXT DEFAULT 'mixed' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'mixed')),
    due_date DATE,
    tags TEXT[], -- Array of tag strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for better query performance
CREATE INDEX idx_tasks_author_id ON tasks(author_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Anyone can view tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own tasks or assigned tasks" ON tasks FOR UPDATE USING (
    auth.uid() = author_id OR auth.uid() = assignee_id
);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = author_id);

-- Grant permissions
GRANT ALL ON tasks TO authenticated;
GRANT SELECT ON tasks TO anon;
