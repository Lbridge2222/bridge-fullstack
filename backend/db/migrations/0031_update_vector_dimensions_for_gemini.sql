-- Update vector dimensions for Gemini embeddings
-- Changes from 1536 dimensions (OpenAI) to 768 dimensions (Gemini)

-- Check if we need to update the vector dimensions
DO $$
BEGIN
    -- Check if the embedding column exists and has the wrong dimension
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_documents' 
        AND column_name = 'embedding' 
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- First, drop the view that depends on the table
        DROP VIEW IF EXISTS active_knowledge_documents;
        
        -- Drop the existing vector index
        DROP INDEX IF EXISTS knowledge_documents_embedding_idx;
        
        -- Clear existing embeddings (they'll be regenerated)
        UPDATE knowledge_documents SET embedding = NULL;
        
        -- Update the embedding column to use 768 dimensions
        ALTER TABLE knowledge_documents 
        ALTER COLUMN embedding TYPE VECTOR(768);
        
        -- Recreate the vector index with the new dimensions
        CREATE INDEX knowledge_documents_embedding_idx 
        ON knowledge_documents 
        USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
        
        -- Recreate the view
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
        
        RAISE NOTICE 'Updated vector dimensions from 1536 to 768 for Gemini embeddings';
    ELSE
        RAISE NOTICE 'Vector dimensions already updated or table does not exist';
    END IF;
END $$;

-- Update the hybrid search function to use 768 dimensions
CREATE OR REPLACE FUNCTION hybrid_search(
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

COMMENT ON FUNCTION hybrid_search IS 'Updated hybrid search function for Gemini embeddings (768 dimensions)';
