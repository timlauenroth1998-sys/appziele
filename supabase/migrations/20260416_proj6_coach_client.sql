-- PROJ-6: Coach-Klienten-Ansicht
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. coach_client_relations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_client_relations (
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'active', 'declined')),
  invited_email TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coach_id, client_id)
);

CREATE INDEX IF NOT EXISTS coach_client_relations_coach_id_idx
  ON coach_client_relations (coach_id);
CREATE INDEX IF NOT EXISTS coach_client_relations_client_id_idx
  ON coach_client_relations (client_id);

ALTER TABLE coach_client_relations ENABLE ROW LEVEL SECURITY;

-- Coach can read their own rows
CREATE POLICY "Coach reads own relations"
  ON coach_client_relations FOR SELECT
  USING (auth.uid() = coach_id);

-- Client can read rows where they are the client
CREATE POLICY "Client reads own relations"
  ON coach_client_relations FOR SELECT
  USING (auth.uid() = client_id);

-- Coach can insert rows with themselves as coach
CREATE POLICY "Coach inserts own relations"
  ON coach_client_relations FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Coach can update their own rows
CREATE POLICY "Coach updates own relations"
  ON coach_client_relations FOR UPDATE
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Client can update rows where they are the client (e.g. accept/decline)
CREATE POLICY "Client updates own relations"
  ON coach_client_relations FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Coach can delete their own rows
CREATE POLICY "Coach deletes own relations"
  ON coach_client_relations FOR DELETE
  USING (auth.uid() = coach_id);

-- Client can delete rows where they are the client (disconnect from coach)
CREATE POLICY "Client deletes own relations"
  ON coach_client_relations FOR DELETE
  USING (auth.uid() = client_id);


-- 2. area_permissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS area_permissions (
  coach_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  life_area_id TEXT NOT NULL,
  is_visible   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coach_id, client_id, life_area_id)
);

CREATE INDEX IF NOT EXISTS area_permissions_coach_id_idx
  ON area_permissions (coach_id);
CREATE INDEX IF NOT EXISTS area_permissions_client_id_idx
  ON area_permissions (client_id);

ALTER TABLE area_permissions ENABLE ROW LEVEL SECURITY;

-- Client manages own permission rows (insert/update/delete)
CREATE POLICY "Client selects own area permissions"
  ON area_permissions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Client inserts own area permissions"
  ON area_permissions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Client updates own area permissions"
  ON area_permissions FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Client deletes own area permissions"
  ON area_permissions FOR DELETE
  USING (auth.uid() = client_id);

-- Coach can read rows where they are the coach
CREATE POLICY "Coach reads area permissions"
  ON area_permissions FOR SELECT
  USING (auth.uid() = coach_id);


-- 3. roadmap_comments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id    TEXT NOT NULL,
  comment    TEXT NOT NULL CHECK (char_length(comment) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS roadmap_comments_coach_id_idx
  ON roadmap_comments (coach_id);
CREATE INDEX IF NOT EXISTS roadmap_comments_client_id_idx
  ON roadmap_comments (client_id);
CREATE INDEX IF NOT EXISTS roadmap_comments_item_id_idx
  ON roadmap_comments (item_id);

ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;

-- Coach inserts own comments
CREATE POLICY "Coach inserts own comments"
  ON roadmap_comments FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Coach reads own comments
CREATE POLICY "Coach reads own comments"
  ON roadmap_comments FOR SELECT
  USING (auth.uid() = coach_id);

-- Coach deletes own comments
CREATE POLICY "Coach deletes own comments"
  ON roadmap_comments FOR DELETE
  USING (auth.uid() = coach_id);

-- Client reads comments directed to them
CREATE POLICY "Client reads own comments"
  ON roadmap_comments FOR SELECT
  USING (auth.uid() = client_id);


-- 4. Coach-read access to goal_profiles/roadmaps of connected clients
-- ─────────────────────────────────────────────────────────────────────────────
-- Allow a coach to SELECT a client's goal_profile IF the coach has an active
-- coach_client_relations row with that client.
CREATE POLICY "Coach reads connected client goal_profiles"
  ON goal_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_client_relations ccr
      WHERE ccr.coach_id  = auth.uid()
        AND ccr.client_id = goal_profiles.user_id
        AND ccr.status    = 'active'
    )
  );

CREATE POLICY "Coach reads connected client roadmaps"
  ON roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_client_relations ccr
      WHERE ccr.coach_id  = auth.uid()
        AND ccr.client_id = roadmaps.user_id
        AND ccr.status    = 'active'
    )
  );
