-- PROJ-5: Benutzerkonten & optionaler Login
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. goal_profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goal_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goal_profile"
  ON goal_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. roadmaps
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmaps (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own roadmap"
  ON roadmaps
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. completions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS completions (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  item_ids    JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own completions"
  ON completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
