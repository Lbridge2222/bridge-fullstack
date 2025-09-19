-- RAG System Setup Migration
-- Creates tables for Ask Ivy's knowledge base and vector search capabilities

-- Create knowledge base documents table
-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS knowledge_documents CASCADE;

CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('policy', 'course_info', 'objection_handling', 'sales_script', 'faq', 'best_practice')),
    category VARCHAR(100),
    tags TEXT[], -- Array of tags for better organization
    metadata JSONB DEFAULT '{}', -- Additional metadata like author, version, etc.
    embedding VECTOR(768), -- Gemini embedding-001 dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_idx 
ON knowledge_documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index for document type and category filtering
CREATE INDEX IF NOT EXISTS knowledge_documents_type_category_idx 
ON knowledge_documents (document_type, category) 
WHERE is_active = TRUE;

-- Create index for full-text search on title and content
CREATE INDEX IF NOT EXISTS knowledge_documents_search_idx 
ON knowledge_documents 
USING gin (to_tsvector('english', title || ' ' || content))
WHERE is_active = TRUE;

-- Create RAG query history table for analytics and improvement
-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS rag_query_history CASCADE;

CREATE TABLE rag_query_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_type VARCHAR(50), -- lead_info, course_info, objection_handling, etc.
    context JSONB DEFAULT '{}', -- Lead context, call state, etc.
    retrieved_documents UUID[] DEFAULT '{}', -- Array of document IDs that were retrieved
    response_text TEXT,
    response_sources TEXT[] DEFAULT '{}', -- Sources used in response
    user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5), -- 1-5 rating
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID, -- To group related queries
    lead_id UUID -- Reference to the lead if applicable
);

-- Create index for query analytics
CREATE INDEX IF NOT EXISTS rag_query_history_type_idx 
ON rag_query_history (query_type, created_at);

-- Create index for lead-specific queries
CREATE INDEX IF NOT EXISTS rag_query_history_lead_idx 
ON rag_query_history (lead_id, created_at);

-- Create function to update the updated_at timestamp
-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at (if not exists)
DROP TRIGGER IF EXISTS update_knowledge_documents_updated_at ON knowledge_documents;
CREATE TRIGGER update_knowledge_documents_updated_at 
    BEFORE UPDATE ON knowledge_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for active knowledge documents with search capabilities
-- Drop existing view if it exists to avoid conflicts
DROP VIEW IF EXISTS active_knowledge_documents CASCADE;

CREATE VIEW active_knowledge_documents AS
SELECT 
    id,
    title,
    content,
    document_type,
    category,
    tags,
    metadata,
    created_at,
    updated_at,
    -- Pre-computed search vectors for better performance
    to_tsvector('english', title || ' ' || content) as search_vector
FROM knowledge_documents
WHERE is_active = TRUE;

-- Create function for hybrid search (vector + text search)
-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS hybrid_search(TEXT, VECTOR, TEXT[], TEXT[], INTEGER, FLOAT) CASCADE;

CREATE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(768),
    document_types TEXT[] DEFAULT NULL,
    categories TEXT[] DEFAULT NULL,
    limit_count INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    content TEXT,
    document_type VARCHAR(50),
    category VARCHAR(100),
    similarity_score FLOAT,
    rank_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kd.id,
        kd.title,
        kd.content,
        kd.document_type,
        kd.category,
        -- Vector similarity score (cosine similarity)
        (1 - (kd.embedding <=> query_embedding)) as similarity_score,
        -- Combined rank score (vector similarity + text search rank)
        (
            (1 - (kd.embedding <=> query_embedding)) * 0.7 + 
            ts_rank(to_tsvector('english', kd.title || ' ' || kd.content), plainto_tsquery('english', query_text)) * 0.3
        ) as rank_score
    FROM knowledge_documents kd
    WHERE kd.is_active = TRUE
        AND (document_types IS NULL OR kd.document_type = ANY(document_types))
        AND (categories IS NULL OR kd.category = ANY(categories))
        AND (1 - (kd.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY rank_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some initial knowledge base documents (skip if already exist)
INSERT INTO knowledge_documents (title, content, document_type, category, tags) VALUES
(
    'Computer Science Course Overview',
    'Our Computer Science program is a comprehensive 12-month intensive course designed to prepare students for careers in software development. The curriculum covers modern programming languages, data structures, algorithms, web development, mobile development, and software engineering best practices. Students work on real-world projects and build a professional portfolio. The program includes career support, job placement assistance, and access to our network of 200+ industry partners. Graduates have a 95% job placement rate with an average salary increase of 40%.',
    'course_info',
    'Computer Science',
    ARRAY['programming', 'software development', 'career outcomes', 'job placement']
),
(
    'Cost Objection Handling Strategy',
    'When prospects raise concerns about cost, follow this proven objection handling framework: 1) Acknowledge the concern: "I understand that investment in education is a significant decision." 2) Reframe the value: "Let me share how we calculate ROI on this investment." 3) Provide evidence: Share success stories of graduates who increased their income by 40% on average. 4) Offer solutions: Discuss flexible payment plans, scholarships, and financing options. 5) Create urgency: "The next cohort starts in 8 weeks, and we have limited spots available." Always end with a question to maintain engagement.',
    'objection_handling',
    'Pricing',
    ARRAY['cost objection', 'pricing', 'ROI', 'payment plans']
),
(
    'Portfolio Review Process',
    'Portfolio reviews are conducted within 48 hours of lead qualification. The process includes: 1) Initial assessment of 3-5 projects demonstrating technical skills. 2) Technical interview covering problem-solving and coding abilities. 3) Feedback session with actionable recommendations. 4) Pathway discussion based on skill level and career goals. 5) Next steps planning including application timeline and preparation requirements. This process helps us understand the candidate''s technical foundation and provides personalized guidance for their learning journey.',
    'best_practice',
    'Admissions',
    ARRAY['portfolio', 'technical interview', 'assessment', 'admissions']
),
(
    'Lead Qualification Criteria',
    'High-quality leads typically demonstrate: 1) Clear career goals and motivation for career change. 2) Previous experience or strong interest in technology. 3) Commitment to full-time intensive learning. 4) Financial readiness or financing plan. 5) Geographic proximity to campus or remote learning capability. 6) Realistic timeline expectations. 7) Strong communication skills and professional demeanor. Score leads on each criterion (1-10) and prioritize those with total scores above 70.',
    'best_practice',
    'Lead Qualification',
    ARRAY['qualification', 'scoring', 'criteria', 'assessment']
),
(
    'Follow-up Best Practices',
    'Effective follow-up strategy: 1) Initial contact within 24 hours of lead generation. 2) Personalized email with relevant course information. 3) Phone call within 48 hours to answer questions and assess fit. 4) Portfolio review scheduling for qualified leads. 5) Weekly touchpoints with valuable content (success stories, industry insights). 6) Application deadline reminders with urgency. 7) Post-application support and next steps guidance. Track all interactions and adjust approach based on lead response and engagement level.',
    'best_practice',
    'Follow-up',
    ARRAY['follow-up', 'nurturing', 'communication', 'engagement']
);

-- Create function to get contextual recommendations
-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS get_contextual_recommendations(JSONB, VARCHAR) CASCADE;

CREATE FUNCTION get_contextual_recommendations(
    lead_context JSONB,
    call_state VARCHAR(50) DEFAULT 'active'
)
RETURNS TABLE (
    recommendation TEXT,
    document_type VARCHAR(50),
    priority INTEGER
) AS $$
DECLARE
    lead_course TEXT;
    lead_stage TEXT;
BEGIN
    -- Extract context
    lead_course := lead_context->>'courseInterest';
    lead_stage := lead_context->>'statusType';
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN call_state = 'idle' AND lead_stage = 'enquiry' THEN 
                'Schedule portfolio review and send course information package'
            WHEN call_state = 'active' AND lead_course IS NOT NULL THEN 
                'Discuss ' || lead_course || ' curriculum and career outcomes'
            WHEN call_state = 'wrapup' THEN 
                'Set clear next steps and follow-up timeline'
            ELSE 
                'Provide personalized guidance based on lead profile'
        END as recommendation,
        'best_practice' as document_type,
        1 as priority;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE knowledge_documents IS 'Knowledge base documents for Ask Ivy RAG system';
COMMENT ON TABLE rag_query_history IS 'History of RAG queries for analytics and improvement';
COMMENT ON FUNCTION hybrid_search IS 'Performs hybrid vector and text search on knowledge documents';
COMMENT ON FUNCTION get_contextual_recommendations IS 'Generates contextual recommendations based on lead and call state';
