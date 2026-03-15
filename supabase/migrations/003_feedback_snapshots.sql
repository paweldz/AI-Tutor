-- ═══════════════════════════════════════════════════════════════════
-- FEEDBACK SNAPSHOTS — LLM-generated qualitative feedback stored
-- for instant retrieval on the Tutor Feedback Dashboard.
--
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feedback_snapshots (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      TEXT,                        -- null = cross-subject
  snapshot_type   TEXT NOT NULL,               -- 'progress_narrative', 'strengths', 'growth_areas', 'learning_patterns', 'exam_readiness', 'parent_letter'
  content         JSONB NOT NULL,              -- structured: { summary, bullets[], actionItems[], ... }
  session_count   INT DEFAULT 0,               -- how many sessions informed this snapshot
  period_start    DATE,
  period_end      DATE,
  generated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fs_user_type    ON feedback_snapshots(user_id, snapshot_type);
CREATE INDEX IF NOT EXISTS idx_fs_user_subject ON feedback_snapshots(user_id, subject_id, snapshot_type);
CREATE INDEX IF NOT EXISTS idx_fs_user_date    ON feedback_snapshots(user_id, generated_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE feedback_snapshots ENABLE ROW LEVEL SECURITY;

-- Users own their own data
CREATE POLICY "own_feedback" ON feedback_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parents can read linked children's feedback
CREATE POLICY "parent_read_feedback" ON feedback_snapshots
  FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM parent_children
      WHERE parent_id = auth.uid() AND child_id = feedback_snapshots.user_id AND status = 'confirmed'
    )
  );
