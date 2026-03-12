-- ═══════════════════════════════════════════════════════════════════
-- GCSE Tutor Hub — Supabase schema with auth + RLS
--
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- Session memory (summaries per subject)
CREATE TABLE IF NOT EXISTS tutor_memory (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  session_date TEXT NOT NULL,
  summary    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (profile, topic progress, etc.)
CREATE TABLE IF NOT EXISTS tutor_settings (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      TEXT,
  UNIQUE(user_id, key)
);

-- XP (gamification)
CREATE TABLE IF NOT EXISTS tutor_xp (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  total      INTEGER DEFAULT 0,
  history    JSONB DEFAULT '[]'
);

-- Streaks (daily activity tracking)
CREATE TABLE IF NOT EXISTS tutor_streaks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  dates      JSONB DEFAULT '[]'
);

-- ── Row Level Security ──────────────────────────────────────────────

ALTER TABLE tutor_memory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_xp       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_streaks  ENABLE ROW LEVEL SECURITY;

-- Each user can only CRUD their own rows
CREATE POLICY "users_own_memory"   ON tutor_memory   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_settings" ON tutor_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_xp"      ON tutor_xp       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_streaks"  ON tutor_streaks  FOR ALL USING (auth.uid() = user_id);

-- ── Indexes ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_memory_user   ON tutor_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user ON tutor_settings(user_id);
