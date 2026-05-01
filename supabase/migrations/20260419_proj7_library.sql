-- PROJ-7: Coaching Library
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pgvector extension (required for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. documents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  size_bytes  BIGINT NOT NULL DEFAULT 0,
  chunk_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents (created_at DESC);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads documents" ON documents;
CREATE POLICY "Admin reads documents"
  ON documents FOR SELECT
  USING (
    (auth.jwt() ->> 'app_role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Admin inserts documents" ON documents;
CREATE POLICY "Admin inserts documents"
  ON documents FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'app_role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Admin deletes documents" ON documents;
CREATE POLICY "Admin deletes documents"
  ON documents FOR DELETE
  USING (
    (auth.jwt() ->> 'app_role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Coach reads documents" ON documents;
CREATE POLICY "Coach reads documents"
  ON documents FOR SELECT
  USING (
    (auth.jwt() ->> 'app_role') IN ('coach', 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'app_role') IN ('coach', 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. document_chunks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    vector(1024),
  chunk_index  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages chunks" ON document_chunks;
CREATE POLICY "Admin manages chunks"
  ON document_chunks FOR ALL
  USING (
    (auth.jwt() ->> 'app_role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'app_role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'admin'
  );

DROP POLICY IF EXISTS "Authenticated reads chunks" ON document_chunks;
CREATE POLICY "Authenticated reads chunks"
  ON document_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. match_chunks function (pgvector similarity search)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS match_chunks(vector, integer, double precision);
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1024),
  match_count     INT DEFAULT 5,
  min_similarity  FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id            UUID,
  document_id   UUID,
  document_name TEXT,
  content       TEXT,
  similarity    FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    d.name AS document_name,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE 1 - (dc.embedding <=> query_embedding) >= min_similarity
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant execute to authenticated users (coaches need this for search)
GRANT EXECUTE ON FUNCTION match_chunks TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. document_shares
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_shares (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  coach_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, coach_id, client_id)
);

CREATE INDEX IF NOT EXISTS document_shares_coach_id_idx  ON document_shares (coach_id);
CREATE INDEX IF NOT EXISTS document_shares_client_id_idx ON document_shares (client_id);

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach reads own shares" ON document_shares;
CREATE POLICY "Coach reads own shares"
  ON document_shares FOR SELECT
  USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coach inserts shares" ON document_shares;
CREATE POLICY "Coach inserts shares"
  ON document_shares FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coach deletes own shares" ON document_shares;
CREATE POLICY "Coach deletes own shares"
  ON document_shares FOR DELETE
  USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Client reads own shares" ON document_shares;
CREATE POLICY "Client reads own shares"
  ON document_shares FOR SELECT
  USING (auth.uid() = client_id);
