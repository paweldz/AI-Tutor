/* ═══════════════════════════════════════════════════════════════════
   BACKFILL ANALYTICS — One-time population of analytics tables
   from existing tutor_memory data.
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";

/**
 * Parses existing tutor_memory rows and populates analytics_sessions
 * and analytics_topic_snapshots. Safe to run multiple times (upserts).
 * Returns { sessions, snapshots, skipped } counts.
 */
export async function backfillAnalytics() {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: rows, error } = await supabase
    .from("tutor_memory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Failed to load sessions: " + error.message);
  if (!rows?.length) return { sessions: 0, snapshots: 0, skipped: 0 };

  let sessions = 0, snapshots = 0, skipped = 0;

  for (const row of rows) {
    let parsed;
    try { parsed = JSON.parse(row.summary); } catch { skipped++; continue; }
    if (!parsed?.rawSummaryText) { skipped++; continue; }

    const sessionId = parsed.sessionId || crypto.randomUUID();
    const isoDate = parsed.isoDate || (row.created_at ? row.created_at.slice(0, 10) : null);
    if (!isoDate) { skipped++; continue; }

    const metrics = parsed.metrics || {};

    const { error: sesErr } = await supabase
      .from("analytics_sessions")
      .upsert({
        user_id: user.id,
        session_id: sessionId,
        subject_id: row.subject,
        session_date: isoDate,
        study_minutes: parsed.studyTimeMinutes || 0,
        duration_minutes: parsed.sessionDurationMinutes || 0,
        message_count: parsed.savedMsgCount || parsed.messageCount || 0,
        questions_total: metrics.totalQuestions || 0,
        questions_correct: metrics.correct || 0,
        questions_partial: metrics.partial || 0,
        questions_wrong: metrics.wrong || 0,
        questions_skipped: metrics.skipped || 0,
        accuracy_pct: metrics.accuracyPct ?? null,
        avg_hints: metrics.avgHints ?? null,
        reasoning_pct: metrics.reasoningPct ?? null,
        is_exam: !!parsed.isExam,
        exam_mode: parsed.examMode || null,
        session_type: parsed.isExam ? "exam" : "tutor",
        created_at: row.created_at,
      }, { onConflict: "session_id" });

    if (sesErr) { console.warn("[backfill] Session:", sesErr.message); }
    else { sessions++; }

    // Topic snapshots
    const confScores = parsed.confidenceScores || {};
    const topicDepth = parsed.topicDepth || {};
    const topicBreakdown = metrics.topicBreakdown || {};
    const topics = Object.keys(confScores);

    if (topics.length > 0) {
      const snapRows = topics.map(topic => {
        const tb = topicBreakdown[topic];
        const attempted = tb ? tb.total - (tb.skipped || 0) : 0;
        const topicAcc = attempted > 0
          ? Math.round(((tb.correct + (tb.partial || 0) * 0.5) / attempted) * 100)
          : null;
        return {
          user_id: user.id,
          session_id: sessionId,
          subject_id: row.subject,
          topic,
          confidence: confScores[topic],
          depth: topicDepth[topic] || null,
          questions: tb?.total || 0,
          accuracy_pct: topicAcc,
          snapshot_date: isoDate,
        };
      });

      const { error: snapErr } = await supabase
        .from("analytics_topic_snapshots")
        .upsert(snapRows, { onConflict: "session_id,subject_id,topic" });
      if (snapErr) { console.warn("[backfill] Snapshots:", snapErr.message); }
      else { snapshots += topics.length; }
    }
  }

  return { sessions, snapshots, skipped };
}
