-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add new fields to question_sheet_questions for structured data
ALTER TABLE question_sheet_questions 
ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64); -- To prevent duplicate processing

-- Create embeddings table for similarity search
CREATE TABLE IF NOT EXISTS question_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES question_sheet_questions(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL, -- Denormalized for faster filtering by assignment
    embedding vector(1536), -- optimize for OpenAI text-embedding-3-small
    model VARCHAR(50) DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster vector similarity search
-- Note: IVFFlat requires some data to be effective, HNSW is better for empty tables but more expensive
-- We'll use HNSW if available, otherwise IVFFlat or none until data grows
CREATE INDEX IF NOT EXISTS idx_question_embeddings_embedding 
ON question_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for assignment lookup
CREATE INDEX IF NOT EXISTS idx_question_embeddings_assignment_id 
ON question_embeddings(assignment_id);
