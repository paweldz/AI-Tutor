# Analytics Architecture Plan

## Problem Statement

The app captures rich data during sessions (per-question assessments, timing, confidence, topic depth) but **discards granularity at save time** — only aggregated summaries survive in `tutor_memory`. This makes it impossible to build time-series charts, cross-session comparisons, or meaningful progress reports.

The current storage model (JSON blobs in `tutor_memory`, key-value pairs in `tutor_settings`) was designed for session recall, not analytics.

---

## Current Data Gaps

| Data | Captured? | Persisted? | Problem |
|------|-----------|------------|---------|
| Individual question results | Yes (log_assessment) | No | Lost on page reload; only summary stats saved |
| Quiz results (quick/builder) | Yes | No | Injected as chat text, not structured data |
| Confidence per topic over time | Partially | Last value only | No history — can't chart improvement |
| Grade estimate over time | Computed on fly | No | Can't show grade trajectory |
| Session-to-session accuracy trends | In summary JSON | Buried in blob | Requires parsing every session blob to query |
| Study time per day/week | In summary JSON | Buried in blob | Same — requires client-side aggregation of all sessions |
| Question type distribution | In assessments | No | Lost with assessments |
| Hint dependency over time | In assessments | No | Lost with assessments |

---

## Proposed Architecture

### Principle: Structured event tables + lightweight client aggregation

Instead of storing everything as JSON blobs, introduce **normalized Supabase tables** for the data points that matter for analytics. Keep `tutor_memory` and `tutor_settings` for backward compatibility, but stop relying on them for analytics.

### New Supabase Tables

#### 1. `analytics_sessions` — One row per completed session

```sql
CREATE TABLE analytics_sessions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL UNIQUE,  -- matches sessionId in tutor_memory
  subject_id    TEXT NOT NULL,
  session_date  DATE NOT NULL,         -- local date (YYYY-MM-DD)

  -- Timing
  study_minutes     SMALLINT DEFAULT 0,
  duration_minutes  SMALLINT DEFAULT 0,
  message_count     SMALLINT DEFAULT 0,

  -- Aggregated accuracy
  questions_total   SMALLINT DEFAULT 0,
  questions_correct SMALLINT DEFAULT 0,
  questions_partial SMALLINT DEFAULT 0,
  questions_wrong   SMALLINT DEFAULT 0,
  questions_skipped SMALLINT DEFAULT 0,
  accuracy_pct      SMALLINT,  -- nullable (discussion-only sessions)
  avg_hints         REAL,
  reasoning_pct     SMALLINT,

  -- Session type
  is_exam           BOOLEAN DEFAULT FALSE,
  exam_mode         TEXT,      -- 'paper', 'free', null
  session_type      TEXT NOT NULL DEFAULT 'tutor',  -- 'tutor', 'quick_quiz', 'built_quiz'

  -- Grade snapshot at time of session
  estimated_grade_low   SMALLINT,
  estimated_grade_high  SMALLINT,
  estimated_grade_pct   SMALLINT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_as_user_date ON analytics_sessions(user_id, session_date);
CREATE INDEX idx_as_user_subject ON analytics_sessions(user_id, subject_id);
```

**Why**: Enables `SELECT ... WHERE subject_id = 'spanish' AND session_date BETWEEN ... ORDER BY session_date` without parsing JSON blobs. Each row is small (~200 bytes) and directly queryable.

#### 2. `analytics_assessments` — One row per question answered

```sql
CREATE TABLE analytics_assessments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL,         -- FK to analytics_sessions.session_id
  subject_id    TEXT NOT NULL,
  topic         TEXT NOT NULL,

  result        TEXT NOT NULL,         -- 'correct', 'partial', 'wrong', 'skipped'
  hints_given   SMALLINT DEFAULT 0,
  reasoning     BOOLEAN DEFAULT FALSE, -- student explained reasoning?
  question_type TEXT,                  -- 'recall', 'apply', 'analyse', 'exam', etc.

  assessed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aa_user_subject ON analytics_assessments(user_id, subject_id);
CREATE INDEX idx_aa_user_topic ON analytics_assessments(user_id, subject_id, topic);
CREATE INDEX idx_aa_session ON analytics_assessments(session_id);
```

**Why**: This is the most important table. It preserves the per-question granularity that's currently lost. Enables:
- "How has accuracy on 'quadratic equations' changed over the last 10 sessions?"
- "What topics have the most wrong answers this month?"
- "Is hint dependency decreasing over time?"
- "What question types does the student struggle with?"

#### 3. `analytics_topic_snapshots` — Confidence snapshot per topic per session

```sql
CREATE TABLE analytics_topic_snapshots (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL,
  subject_id    TEXT NOT NULL,
  topic         TEXT NOT NULL,

  confidence    SMALLINT NOT NULL,      -- 0-100
  depth         TEXT,                   -- 'introduced', 'practiced', 'tested'
  questions     SMALLINT DEFAULT 0,     -- how many Qs on this topic in this session
  accuracy_pct  SMALLINT,              -- topic-specific accuracy this session

  snapshot_date DATE NOT NULL,

  UNIQUE(session_id, subject_id, topic)
);

CREATE INDEX idx_ats_user_topic ON analytics_topic_snapshots(user_id, subject_id, topic, snapshot_date);
```

**Why**: Enables time-series confidence charts. "Show me how my Spanish grammar confidence changed from January to March." Currently only the latest value exists in `topicData`.

#### 4. `analytics_quiz_results` — Standalone quiz tracking

```sql
CREATE TABLE analytics_quiz_results (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id    TEXT NOT NULL,
  quiz_type     TEXT NOT NULL,          -- 'quick', 'built', 'event_prep'

  questions_total   SMALLINT NOT NULL,
  questions_correct SMALLINT NOT NULL,
  score_pct         SMALLINT NOT NULL,

  -- Store the full Q&A for review (JSONB, not for querying — just for drill-down)
  questions_json    JSONB,

  taken_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aqr_user_subject ON analytics_quiz_results(user_id, subject_id, taken_at);
```

**Why**: Quizzes currently vanish into chat history. This gives them first-class status for "quiz score over time" charts.

#### 5. `analytics_grade_history` — Grade estimate snapshots

```sql
CREATE TABLE analytics_grade_history (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id    TEXT NOT NULL,

  grade_low     SMALLINT NOT NULL,
  grade_high    SMALLINT NOT NULL,
  grade_point   SMALLINT NOT NULL,
  percentage    SMALLINT NOT NULL,
  confidence    SMALLINT NOT NULL,      -- estimate reliability 0-100

  -- What evidence was used
  factors_json  JSONB,                  -- [{type, value, ...}]

  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agh_user_subject ON analytics_grade_history(user_id, subject_id, recorded_at);
```

**Why**: Enables "grade trajectory" chart — the single most valuable chart for parents. Currently the grade is recomputed from scratch each render with no history.

---

### RLS Policies

All new tables get the standard user-owns-own-data policy, plus a parent-read policy:

```sql
-- Standard: users own their own data
CREATE POLICY "own_data" ON analytics_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parent read: allow parents to SELECT children's analytics
CREATE POLICY "parent_read" ON analytics_sessions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM parent_children
      WHERE parent_id = auth.uid()
        AND child_id = analytics_sessions.user_id
        AND status = 'confirmed'
    )
  );
```

Same pattern for all 5 analytics tables. This is cleaner than the current approach of loosening RLS globally — it's an explicit, auditable read path.

---

### Write Path: When/How Data Gets Written

**On every `log_assessment` tool call** (real-time, during session):
- Buffer in `metricsRef` as today (no change)
- **NEW**: Also push to `analytics_assessments` immediately via a fire-and-forget insert
- This ensures question-level data survives even if the user closes the tab before summary

**On session save** (`genSummary` / `autoSave`):
- Write to `tutor_memory` as today (backward compat)
- **NEW**: Write one row to `analytics_sessions`
- **NEW**: Write N rows to `analytics_topic_snapshots` (one per topic covered)
- **NEW**: Write one row to `analytics_grade_history` (snapshot current estimate)

**On quiz completion** (`onQuizComplete`):
- Inject into chat as today
- **NEW**: Write one row to `analytics_quiz_results`

**Implementation**: Create a new `src/utils/analyticsSync.js` module with:
```
saveSessionAnalytics(data, subjectId, gradeEstimate)
saveAssessment(subjectId, entry)
saveQuizResult(subjectId, quizData)
saveGradeSnapshot(subjectId, estimate)
```

All writes are fire-and-forget (non-blocking, catch errors silently). Analytics should never break the core tutoring experience.

---

### Read Path: How Data Gets Queried

**New module: `src/utils/analyticsQueries.js`**

Thin wrappers around Supabase queries:

```js
// Time-series: confidence for a topic over sessions
getTopicConfidenceHistory(subjectId, topic, dateRange)

// Aggregated: accuracy by topic for a date range
getTopicAccuracyBreakdown(subjectId, dateRange)

// Time-series: grade estimate over time
getGradeHistory(subjectId, dateRange)

// Aggregated: study time by day/week/month
getStudyTimeSeries(subjectId, granularity, dateRange)

// Aggregated: quiz scores over time
getQuizScoreHistory(subjectId, dateRange)

// Aggregated: question type performance
getQuestionTypeBreakdown(subjectId, dateRange)

// Aggregated: hint dependency trend
getHintTrend(subjectId, dateRange)

// Cross-subject: all subjects summary for a date range
getSubjectsSummary(dateRange)

// For parents: same queries but with explicit userId param
getChildTopicHistory(childId, subjectId, topic, dateRange)
// etc.
```

**Parent access**: Same queries, but pass `childId` and rely on the parent-read RLS policy.

---

### Charting Library

**Recommendation: [Recharts](https://recharts.org/)**

- React-native, composable, lightweight (~45KB gzipped)
- Supports line, bar, area, radar, pie charts — all needed for this use case
- Responsive and mobile-friendly (important for this app)
- Well-maintained, large community
- No D3 dependency overhead

Alternative considered: Chart.js (heavier, imperative API doesn't fit React patterns well).

---

### Dashboard Architecture

#### Student Stats Page

| Section | Charts/Widgets | Data Source |
|---------|---------------|-------------|
| **Overview Cards** | Study time (week/month/all), Sessions count, Current streak | `analytics_sessions` |
| **Grade Trajectory** | Line chart: estimated grade per subject over time | `analytics_grade_history` |
| **Accuracy Trend** | Line chart: overall accuracy % per session over time | `analytics_sessions` |
| **Topic Heatmap** | Grid: topics x confidence, color-coded | `analytics_topic_snapshots` (latest) |
| **Topic Progress** | Line chart: confidence for selected topic over time | `analytics_topic_snapshots` |
| **Weak Areas** | Sorted list: topics with lowest accuracy, highest hint usage | `analytics_assessments` aggregate |
| **Quiz Performance** | Bar chart: quiz scores over time | `analytics_quiz_results` |
| **Study Patterns** | Heatmap: study minutes per day-of-week / time-of-day | `analytics_sessions` |
| **Question Analysis** | Pie chart: correct/partial/wrong/skipped breakdown | `analytics_assessments` aggregate |
| **Recommended Focus** | AI-generated list: topics to prioritize based on data | Computed from weakest topics + upcoming events |

#### Parent Portal

| Section | Charts/Widgets | Data Source |
|---------|---------------|-------------|
| **Child Selector** | Tab bar or dropdown for multi-child | `parent_children` |
| **Per-Child Overview** | Grade trajectory (all subjects on one chart) | `analytics_grade_history` |
| **Subject Deep-Dive** | Expandable: accuracy trend, topic progress, quiz scores | All analytics tables |
| **Activity Summary** | Study time per week bar chart, streak status | `analytics_sessions` |
| **Engagement Metrics** | Sessions/week, avg session length, consistency score | `analytics_sessions` |
| **Weak Areas Report** | Cross-subject: which topics need most work | `analytics_assessments` |
| **Event Preparation** | How prepared is the child for upcoming events? | `analytics_topic_snapshots` vs `events` |
| **Export/Share** | PDF report generation (stretch goal) | Aggregated from all tables |

---

### Migration Strategy

This is **additive** — no existing tables change. Steps:

1. **Create new tables** via Supabase migration (002_analytics.sql)
2. **Add write hooks** in `analyticsSync.js` — called alongside existing `sbSave`
3. **Backfill existing data**: One-time script that reads all `tutor_memory` rows, parses the JSON, and populates `analytics_sessions` + `analytics_topic_snapshots` + `analytics_grade_history`. This preserves historical data.
4. **Build dashboard components** incrementally — start with grade trajectory and accuracy trend (highest impact), then add detail views
5. **Parent portal**: Build on same query layer with `childId` parameter

Existing code (`HomeScreen` study time widget, `SessionHistory`, `SummaryModal`, `grades.js`) continues working unchanged. New analytics views live alongside them and can gradually replace the inline calculations.

---

### Recommended Implementation Order

**Phase 1: Foundation (schema + write path)**
- Create migration with all 5 tables + RLS + indexes
- Build `analyticsSync.js` with write functions
- Wire writes into `useChat.js` (session save), `sessionMetrics.js` (assessment), `quizSync.js` (quiz)
- Write backfill script for existing `tutor_memory` data

**Phase 2: Core Charts (student)**
- Install Recharts
- Build `StatsPage` component with: grade trajectory, accuracy trend, study time series
- Replace HomeScreen's inline study-time calculation with analytics query

**Phase 3: Topic Deep-Dive (student)**
- Topic confidence over time chart
- Weak areas / recommended focus panel
- Question type breakdown

**Phase 4: Parent Portal Overhaul**
- Multi-child selector with comparison view
- Per-child grade trajectory (all subjects)
- Activity/engagement metrics
- Weak areas report

**Phase 5: Advanced (stretch)**
- Study pattern heatmap (day-of-week / time-of-day)
- Hint dependency trend
- Cross-subject correlations
- PDF report export
- AI-generated study recommendations based on analytics data

---

### Key Design Decisions

1. **Supabase tables, not client-side aggregation**: The current approach of parsing all session JSON blobs on every render doesn't scale. With 100+ sessions, it's slow and wastes bandwidth. Structured tables with indexes let Supabase do the heavy lifting.

2. **Fire-and-forget writes**: Analytics writes must never block or break the tutoring experience. All inserts are async with caught errors.

3. **Backward compatibility**: `tutor_memory` and `tutor_settings` stay untouched. New code writes to both old and new tables. Old code keeps working.

4. **Per-question persistence**: This is the single biggest improvement. Currently, closing the tab loses all question-level data. Writing assessments immediately fixes this.

5. **Date handling**: All dates stored as `DATE` (not text), all timestamps as `TIMESTAMPTZ`. No more parsing locale strings.

6. **Parent access via RLS**: Clean, auditable parent-read policies instead of loosened global RLS. Parents SELECT from the same tables, filtered by the `parent_children` relationship.
