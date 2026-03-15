/* ═══════════════════════════════════════════════════════════════════
   FEEDBACK QUERIES — Load feedback snapshots and session-level
   qualitative data from Supabase for the Tutor Feedback Dashboard.
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";

/** Get latest feedback snapshot of a given type */
export async function getLatestSnapshot(snapshotType, subjectId = null) {
  if (!supabase) return null;
  let q = supabase
    .from("feedback_snapshots")
    .select("*")
    .eq("snapshot_type", snapshotType)
    .order("generated_at", { ascending: false })
    .limit(1);

  if (subjectId) {
    q = q.eq("subject_id", subjectId);
  } else {
    q = q.is("subject_id", null);
  }

  const { data, error } = await q;
  if (error) { console.warn("[feedback] getLatestSnapshot:", error.message); return null; }
  return data?.[0] || null;
}

/** Get all snapshots of a given type (history) */
export async function getSnapshotHistory(snapshotType, subjectId = null, limit = 10) {
  if (!supabase) return [];
  let q = supabase
    .from("feedback_snapshots")
    .select("*")
    .eq("snapshot_type", snapshotType)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (subjectId) {
    q = q.eq("subject_id", subjectId);
  } else {
    q = q.is("subject_id", null);
  }

  const { data, error } = await q;
  if (error) { console.warn("[feedback] getSnapshotHistory:", error.message); return []; }
  return data || [];
}

/** Get all latest snapshots for a subject (or cross-subject) */
export async function getAllLatestSnapshots(subjectId = null) {
  if (!supabase) return {};

  const types = ["progress_narrative", "strengths_growth", "learning_patterns"];
  const results = await Promise.all(
    types.map(type => getLatestSnapshot(type, subjectId))
  );

  const snapshots = {};
  types.forEach((type, i) => {
    if (results[i]) snapshots[type] = results[i];
  });
  return snapshots;
}

/** Count sessions since the last feedback was generated for a subject */
export async function getSessionsSinceLastFeedback(subjectId) {
  if (!supabase) return { total: 0, sinceLastFeedback: 0 };

  const [sessionsRes, feedbackRes] = await Promise.all([
    supabase
      .from("analytics_sessions")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", subjectId),
    supabase
      .from("feedback_snapshots")
      .select("session_count, generated_at")
      .eq("subject_id", subjectId)
      .eq("snapshot_type", "progress_narrative")
      .order("generated_at", { ascending: false })
      .limit(1),
  ]);

  const total = sessionsRes.count || 0;
  const lastCount = feedbackRes.data?.[0]?.session_count || 0;
  const lastDate = feedbackRes.data?.[0]?.generated_at || null;

  return {
    total,
    sinceLastFeedback: total - lastCount,
    lastGeneratedAt: lastDate,
  };
}

/** Get recent session summaries from tutor_memory (Tier 1 data) */
export async function getRecentSessionFeedback(subjectId = null, limit = 5) {
  if (!supabase) return [];

  let q = supabase
    .from("tutor_memory")
    .select("subject, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (subjectId) {
    q = q.eq("subject", subjectId);
  }

  const { data, error } = await q;
  if (error) { console.warn("[feedback] getRecentSessionFeedback:", error.message); return []; }

  return (data || []).map(row => {
    let parsed;
    try { parsed = JSON.parse(row.summary); } catch { parsed = null; }
    return {
      subject: row.subject,
      date: parsed?.date || row.created_at?.slice(0, 10),
      isoDate: row.created_at?.slice(0, 10),
      topics: parsed?.topics || [],
      strengths: parsed?.strengths || [],
      weaknesses: parsed?.weaknesses || [],
      rawSummaryText: parsed?.rawSummaryText || "",
      confidenceScores: parsed?.confidenceScores || {},
      metrics: parsed?.metrics || null,
    };
  });
}
