-- ============================================================
-- PROJ-7: Wissens-Bibliothek (RAG)
-- Dieses SQL in Supabase SQL Editor ausführen:
-- supabase.com → Projekt → SQL Editor → "New Query" → Paste → Run
-- ============================================================

-- 1. pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Dokumente-Tabelle
CREATE TABLE IF NOT EXISTS documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  size_bytes  BIGINT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dokument-Chunks mit Voyage AI Embeddings (voyage-3 = 1024 Dimensionen)
CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id  UUID REFERENCES documents(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    vector(1024),
  chunk_index  INT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index für schnelle Ähnlichkeitssuche
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 5. Suchfunktion für ähnliche Chunks
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1024),
  match_count     INT DEFAULT 5,
  min_similarity  FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  id            UUID,
  content       TEXT,
  document_name TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    d.name AS document_name,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE 1 - (dc.embedding <=> query_embedding) > min_similarity
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. RLS deaktivieren (wird in PROJ-5 mit Auth gesichert)
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;
