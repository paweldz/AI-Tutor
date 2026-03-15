/**
 * BACKFILL ANALYTICS — One-time script to populate analytics tables
 * from existing tutor_memory data.
 *
 * Run from the browser console or as a standalone script after running
 * the 002_analytics.sql migration.
 *
 * Usage (browser console):
 *   import { backfillAnalytics } from '/scripts/backfill-analytics.js';
 *   await backfillAnalytics();
 *
 * Or import and call from a temporary component/button in the app.
 */

import { supabase } from "../src/lib/supabase.js";

export async function backfillAnalytics() {
  if (!supabase) { console.error("[backfill] Supabase not configured"); return; }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error("[backfill] Not authenticated"); return; }

  console.log("[backfill] Starting analytics backfill for user:", user.id);

  // Load all tutor_memory rows for this user
  const { data: rows, error } = await supabase
    .from("tutor_memory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) { console.error("[backfill] Failed to load tutor_memory:", error.message); return; }
  if (!rows?.length) { console.log("[backfill] No sessions to backfill"); return; }

  console.log(`[backfill] Found ${rows.length} tutor_memory rows`);

  let sessionCount = 0, snapshotCount = 0, gradeCount = 0, skipped = 0;

  for (const row of rows) {
    let parsed;
    try { parsed = JSON.parse(row.summary); } catch { skipped++; continue; }
    if (!parsed?.rawSummaryText) { skipped++; continue; }

    const sessionId = parsed.sessionId || crypto.randomUUID();
    const isoDate = parsed.isoDate || (row.created_at ? row.created_at.slice(0, 10) : null);
    if (!isoDate) { skipped++; continue; }

    const metrics = parsed.metrics || {};

    // 1. analytics_sessions
    const sessionRow = {
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
      estimated_grade_low: null,
      estimated_grade_high: null,
      estimated_grade_pct: null,
      created_at: row.created_at,
    };

    const { error: sesErr } = await supabase
      .from("analytics_sessions")
      .upsert(sessionRow, { onConflict: "session_id" });
    if (sesErr) {
      console.warn(`[backfill] Session ${sessionId}: ${sesErr.message}`);
    } else {
      sessionCount++;
    }

    // 2. analytics_topic_snapshots
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
      if (snapErr) {
        console.warn(`[backfill] Snapshots for ${sessionId}: ${snapErr.message}`);
      } else {
        snapshotCount += topics.length;
      }
    }
  }

  console.log(`[backfill] Complete!`);
  console.log(`  Sessions: ${sessionCount} written, ${skipped} skipped`);
  console.log(`  Topic snapshots: ${snapshotCount}`);
  console.log(`  (Grade history and assessments cannot be backfilled — no historical data exists for these)`);
}
