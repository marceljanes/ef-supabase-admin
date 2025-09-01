-- Create knowledge table (main documents)
CREATE TABLE IF NOT EXISTS knowledge (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    category VARCHAR(100),
    tags TEXT[], -- Array of tags
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    file_path VARCHAR(500), -- Optional file path if document is uploaded
    document_type VARCHAR(50) DEFAULT 'text', -- text, pdf, markdown, etc.
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0
);

-- Create knowledge_chunks table (chunks/sections of documents)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id SERIAL PRIMARY KEY,
    knowledge_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
    chunk_order INTEGER NOT NULL DEFAULT 1, -- Order of chunk within document
    title VARCHAR(255),
    content TEXT NOT NULL,
    chunk_type VARCHAR(50) DEFAULT 'text', -- text, code, table, list, etc.
    metadata JSONB, -- Additional metadata for the chunk
    word_count INTEGER DEFAULT 0,
    tokens INTEGER DEFAULT 0, -- For AI/embedding purposes
    embedding VECTOR(1536), -- For semantic search (OpenAI embeddings)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_knowledge_id ON knowledge_chunks(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_order ON knowledge_chunks(knowledge_id, chunk_order);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type ON knowledge_chunks(chunk_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_knowledge_updated_at ON knowledge;
CREATE TRIGGER update_knowledge_updated_at
    BEFORE UPDATE ON knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_chunks_updated_at ON knowledge_chunks;
CREATE TRIGGER update_knowledge_chunks_updated_at
    BEFORE UPDATE ON knowledge_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update word count and reading time
CREATE OR REPLACE FUNCTION calculate_knowledge_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate word count (simple word count based on spaces)
    NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
    
    -- Calculate reading time (assuming 200 words per minute)
    NEW.reading_time_minutes = GREATEST(1, ROUND(NEW.word_count / 200.0));
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic stats calculation
DROP TRIGGER IF EXISTS calculate_knowledge_stats_trigger ON knowledge;
CREATE TRIGGER calculate_knowledge_stats_trigger
    BEFORE INSERT OR UPDATE OF content ON knowledge
    FOR EACH ROW
    EXECUTE FUNCTION calculate_knowledge_stats();

-- Create function to automatically update chunk word count
CREATE OR REPLACE FUNCTION calculate_chunk_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate word count for chunk
    NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
    
    -- Estimate tokens (rough estimate: 1 token ≈ 0.75 words)
    NEW.tokens = ROUND(NEW.word_count * 0.75);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for chunk stats calculation
DROP TRIGGER IF EXISTS calculate_chunk_stats_trigger ON knowledge_chunks;
CREATE TRIGGER calculate_chunk_stats_trigger
    BEFORE INSERT OR UPDATE OF content ON knowledge_chunks
    FOR EACH ROW
    EXECUTE FUNCTION calculate_chunk_stats();

-- Insert some sample data for testing
INSERT INTO knowledge (title, description, content, category, tags, created_by) VALUES
('Azure Fundamentals Overview', 'Comprehensive guide to Azure cloud services', 'Azure is Microsoft''s cloud computing platform...', 'Cloud Computing', ARRAY['azure', 'cloud', 'microsoft'], 'admin'),
('Project Management Best Practices', 'Essential practices for successful project management', 'Project management involves planning, executing, and closing projects...', 'Management', ARRAY['project-management', 'leadership', 'planning'], 'admin'),
('JavaScript ES6 Features', 'Modern JavaScript features and syntax', 'ES6 introduced many new features to JavaScript...', 'Programming', ARRAY['javascript', 'es6', 'programming'], 'admin');

-- Insert corresponding chunks
INSERT INTO knowledge_chunks (knowledge_id, chunk_order, title, content, chunk_type) VALUES
(1, 1, 'Introduction to Azure', 'Azure is a comprehensive cloud computing platform...', 'text'),
(1, 2, 'Core Azure Services', 'The main services in Azure include Virtual Machines...', 'text'),
(1, 3, 'Azure Pricing Models', 'Azure offers several pricing models...', 'text'),
(2, 1, 'Project Planning Phase', 'The planning phase is crucial for project success...', 'text'),
(2, 2, 'Execution and Monitoring', 'During execution, regular monitoring is essential...', 'text'),
(3, 1, 'Arrow Functions', 'Arrow functions provide a concise syntax...', 'code'),
(3, 2, 'Template Literals', 'Template literals allow embedded expressions...', 'code');

-- Enable RLS (Row Level Security) for knowledge tables
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge table
-- Everyone can read knowledge documents
CREATE POLICY "Anyone can view knowledge" ON knowledge FOR SELECT USING (true);

-- Only admins can insert, update, or delete knowledge documents
CREATE POLICY "Admins can insert knowledge" ON knowledge FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profile 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND status = 'approved'
    )
);

CREATE POLICY "Admins can update knowledge" ON knowledge FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_profile 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND status = 'approved'
    )
);

CREATE POLICY "Admins can delete knowledge" ON knowledge FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_profile 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND status = 'approved'
    )
);

-- Create policies for knowledge_chunks table
-- Everyone can read knowledge chunks
CREATE POLICY "Anyone can view knowledge chunks" ON knowledge_chunks FOR SELECT USING (true);

-- Only admins can insert, update, or delete knowledge chunks
CREATE POLICY "Admins can insert knowledge chunks" ON knowledge_chunks FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profile 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND status = 'approved'
    )
);

CREATE POLICY "Admins can update knowledge chunks" ON knowledge_chunks FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_profile 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND status = 'approved'
    )
);

CREATE POLICY "Admins can delete knowledge chunks" ON knowledge_chunks FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_profile 
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND status = 'approved'
    )
);

-- Grant permissions
GRANT SELECT ON knowledge TO authenticated;
GRANT SELECT ON knowledge_chunks TO authenticated;
GRANT ALL ON knowledge TO service_role;
GRANT ALL ON knowledge_chunks TO service_role;
