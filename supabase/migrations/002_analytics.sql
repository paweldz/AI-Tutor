-- ═══════════════════════════════════════════════════════════════════
-- ANALYTICS TABLES — Structured event data for progress tracking,
-- charts, and reports. Additive migration — no changes to existing tables.
--
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. analytics_sessions — one row per completed session ─────────

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id               UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id            UUID NOT NULL UNIQUE,
  subject_id            TEXT NOT NULL,
  session_date          DATE NOT NULL,

  -- Timing
  study_minutes         SMALLINT DEFAULT 0,
  duration_minutes      SMALLINT DEFAULT 0,
  message_count         SMALLINT DEFAULT 0,

  -- Aggregated accuracy
  questions_total       SMALLINT DEFAULT 0,
  questions_correct     SMALLINT DEFAULT 0,
  questions_partial     SMALLINT DEFAULT 0,
  questions_wrong       SMALLINT DEFAULT 0,
  questions_skipped     SMALLINT DEFAULT 0,
  accuracy_pct          SMALLINT,
  avg_hints             REAL,
  reasoning_pct         SMALLINT,

  -- Session type
  is_exam               BOOLEAN DEFAULT FALSE,
  exam_mode             TEXT,
  session_type          TEXT NOT NULL DEFAULT 'tutor',

  -- Grade snapshot at time of session
  estimated_grade_low   SMALLINT,
  estimated_grade_high  SMALLINT,
  estimated_grade_pct   SMALLINT,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_as_user_date    ON analytics_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_as_user_subject ON analytics_sessions(user_id, subject_id, session_date);

-- ── 2. analytics_assessments — one row per question answered ──────

CREATE TABLE IF NOT EXISTS analytics_assessments (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      UUID,
  subject_id      TEXT NOT NULL,
  topic           TEXT NOT NULL,

  result          TEXT NOT NULL,
  hints_given     SMALLINT DEFAULT 0,
  reasoning       BOOLEAN DEFAULT FALSE,
  question_type   TEXT,

  assessed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aa_user_subject ON analytics_assessments(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_aa_user_topic   ON analytics_assessments(user_id, subject_id, topic);
CREATE INDEX IF NOT EXISTS idx_aa_session      ON analytics_assessments(session_id);

-- ── 3. analytics_topic_snapshots — confidence per topic per session ──

CREATE TABLE IF NOT EXISTS analytics_topic_snapshots (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL,
  subject_id      TEXT NOT NULL,
  topic           TEXT NOT NULL,

  confidence      SMALLINT NOT NULL,
  depth           TEXT,
  questions       SMALLINT DEFAULT 0,
  accuracy_pct    SMALLINT,

  snapshot_date   DATE NOT NULL,

  UNIQUE(session_id, subject_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_ats_user_topic ON analytics_topic_snapshots(user_id, subject_id, topic, snapshot_date);

-- ── 4. analytics_quiz_results — standalone quiz tracking ──────────

CREATE TABLE IF NOT EXISTS analytics_quiz_results (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id        TEXT NOT NULL,
  quiz_type         TEXT NOT NULL,

  questions_total   SMALLINT NOT NULL,
  questions_correct SMALLINT NOT NULL,
  score_pct         SMALLINT NOT NULL,

  questions_json    JSONB,

  taken_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aqr_user_subject ON analytics_quiz_results(user_id, subject_id, taken_at);

-- ── 5. analytics_grade_history — grade estimate snapshots ─────────

CREATE TABLE IF NOT EXISTS analytics_grade_history (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      TEXT NOT NULL,

  grade_low       SMALLINT NOT NULL,
  grade_high      SMALLINT NOT NULL,
  grade_point     SMALLINT NOT NULL,
  percentage      SMALLINT NOT NULL,
  confidence      SMALLINT NOT NULL,

  factors_json    JSONB,

  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agh_user_subject ON analytics_grade_history(user_id, subject_id, recorded_at);

-- ═══════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE analytics_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_assessments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_topic_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_quiz_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_grade_history  ENABLE ROW LEVEL SECURITY;

-- Users own their own data (CRUD)
CREATE POLICY "own_sessions"   ON analytics_sessions        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_assessments" ON analytics_assessments     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_snapshots"  ON analytics_topic_snapshots  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_quizzes"    ON analytics_quiz_results     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_grades"     ON analytics_grade_history    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parents can SELECT their linked children's analytics
CREATE POLICY "parent_read_sessions" ON analytics_sessions FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM parent_children
    WHERE parent_id = auth.uid() AND child_id = analytics_sessions.user_id AND status = 'confirmed'
  )
);
CREATE POLICY "parent_read_assessments" ON analytics_assessments FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM parent_children
    WHERE parent_id = auth.uid() AND child_id = analytics_assessments.user_id AND status = 'confirmed'
  )
);
CREATE POLICY "parent_read_snapshots" ON analytics_topic_snapshots FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM parent_children
    WHERE parent_id = auth.uid() AND child_id = analytics_topic_snapshots.user_id AND status = 'confirmed'
  )
);
CREATE POLICY "parent_read_quizzes" ON analytics_quiz_results FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM parent_children
    WHERE parent_id = auth.uid() AND child_id = analytics_quiz_results.user_id AND status = 'confirmed'
  )
);
CREATE POLICY "parent_read_grades" ON analytics_grade_history FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM parent_children
    WHERE parent_id = auth.uid() AND child_id = analytics_grade_history.user_id AND status = 'confirmed'
  )
);

-- ── Indexes on parent_children for RLS join performance ───────────
CREATE INDEX IF NOT EXISTS idx_pc_parent_status ON parent_children(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_pc_child         ON parent_children(child_id);
