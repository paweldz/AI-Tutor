/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS QUERIES — Supabase queries for charts and reports.
   All functions return data ready for Recharts consumption.
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";

async function getUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Grade estimate history for a subject (line chart) */
export async function getGradeHistory(subjectId, limit = 30) {
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("analytics_grade_history")
    .select("grade_point, grade_low, grade_high, percentage, confidence, recorded_at")
    .eq("user_id", user.id)
    .eq("subject_id", subjectId)
    .order("recorded_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map(r => ({
    date: r.recorded_at.slice(0, 10),
    grade: r.grade_point,
    low: r.grade_low,
    high: r.grade_high,
    pct: r.percentage,
    confidence: r.confidence,
  }));
}

/** Session accuracy over time for a subject (line chart) */
export async function getAccuracyTrend(subjectId, limit = 30) {
  const user = await getUser();
  if (!user) return [];
  let q = supabase
    .from("analytics_sessions")
    .select("session_date, accuracy_pct, questions_total, avg_hints, reasoning_pct, session_type")
    .eq("user_id", user.id)
    .not("accuracy_pct", "is", null)
    .order("session_date", { ascending: true })
    .limit(limit);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(r => ({
    date: r.session_date,
    accuracy: r.accuracy_pct,
    questions: r.questions_total,
    hints: r.avg_hints,
    reasoning: r.reasoning_pct,
    type: r.session_type,
  }));
}

/** Study time per day for a date range (bar chart) */
export async function getStudyTimeSeries(days = 30, subjectId) {
  const user = await getUser();
  if (!user) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  let q = supabase
    .from("analytics_sessions")
    .select("session_date, study_minutes, duration_minutes, subject_id")
    .eq("user_id", user.id)
    .gte("session_date", sinceStr)
    .order("session_date", { ascending: true });
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error || !data) return [];
  // Aggregate by date
  const byDate = {};
  for (const r of data) {
    if (!byDate[r.session_date]) byDate[r.session_date] = { date: r.session_date, minutes: 0, sessions: 0 };
    byDate[r.session_date].minutes += r.study_minutes || 0;
    byDate[r.session_date].sessions += 1;
  }
  return Object.values(byDate);
}

/** Topic confidence over time (line chart for a specific topic) */
export async function getTopicConfidenceHistory(subjectId, topic, limit = 20) {
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("analytics_topic_snapshots")
    .select("confidence, depth, questions, accuracy_pct, snapshot_date")
    .eq("user_id", user.id)
    .eq("subject_id", subjectId)
    .eq("topic", topic)
    .order("snapshot_date", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map(r => ({
    date: r.snapshot_date,
    confidence: r.confidence,
    depth: r.depth,
    questions: r.questions,
    accuracy: r.accuracy_pct,
  }));
}

/** Latest confidence per topic for a subject (radar/bar chart) */
export async function getTopicConfidenceLatest(subjectId) {
  const user = await getUser();
  if (!user) return [];
  // Get distinct topics with their latest snapshot
  const { data, error } = await supabase
    .from("analytics_topic_snapshots")
    .select("topic, confidence, depth, questions, accuracy_pct, snapshot_date")
    .eq("user_id", user.id)
    .eq("subject_id", subjectId)
    .order("snapshot_date", { ascending: false });
  if (error || !data) return [];
  // Keep only latest per topic
  const seen = new Set();
  const result = [];
  for (const r of data) {
    if (seen.has(r.topic)) continue;
    seen.add(r.topic);
    result.push({
      topic: r.topic,
      confidence: r.confidence,
      depth: r.depth,
      questions: r.questions,
      accuracy: r.accuracy_pct,
      date: r.snapshot_date,
    });
  }
  return result.sort((a, b) => a.confidence - b.confidence);
}

/** Quiz score history (bar chart) */
export async function getQuizScoreHistory(subjectId, limit = 20) {
  const user = await getUser();
  if (!user) return [];
  let q = supabase
    .from("analytics_quiz_results")
    .select("score_pct, questions_total, questions_correct, quiz_type, taken_at, subject_id")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: true })
    .limit(limit);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(r => ({
    date: r.taken_at.slice(0, 10),
    score: r.score_pct,
    total: r.questions_total,
    correct: r.questions_correct,
    type: r.quiz_type,
    subject: r.subject_id,
  }));
}

/** Question type breakdown (pie chart) */
export async function getQuestionTypeBreakdown(subjectId, days = 30) {
  const user = await getUser();
  if (!user) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  let q = supabase
    .from("analytics_assessments")
    .select("result, question_type, hints_given, reasoning")
    .eq("user_id", user.id)
    .gte("assessed_at", sinceStr);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error || !data) return { byResult: [], byType: [], totalHints: 0, totalReasoning: 0, total: 0 };
  // Aggregate by result
  const results = { correct: 0, partial: 0, wrong: 0, skipped: 0 };
  const types = {};
  let totalHints = 0, totalReasoning = 0;
  for (const r of data) {
    results[r.result] = (results[r.result] || 0) + 1;
    const t = r.question_type || "unknown";
    if (!types[t]) types[t] = { type: t, correct: 0, partial: 0, wrong: 0, total: 0 };
    types[t].total++;
    if (r.result === "correct") types[t].correct++;
    else if (r.result === "partial") types[t].partial++;
    else if (r.result === "wrong") types[t].wrong++;
    totalHints += r.hints_given || 0;
    if (r.reasoning) totalReasoning++;
  }
  return {
    byResult: Object.entries(results).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })),
    byType: Object.values(types),
    totalHints,
    totalReasoning,
    total: data.length,
  };
}

/** Weak topics — lowest accuracy topics with enough data */
export async function getWeakTopics(subjectId, days = 60) {
  const user = await getUser();
  if (!user) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  let q = supabase
    .from("analytics_assessments")
    .select("topic, result, hints_given")
    .eq("user_id", user.id)
    .gte("assessed_at", sinceStr);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error || !data) return [];
  const topics = {};
  for (const r of data) {
    if (!topics[r.topic]) topics[r.topic] = { topic: r.topic, correct: 0, partial: 0, wrong: 0, total: 0, hints: 0 };
    const t = topics[r.topic];
    t.total++;
    if (r.result === "correct") t.correct++;
    else if (r.result === "partial") t.partial++;
    else if (r.result === "wrong") t.wrong++;
    t.hints += r.hints_given || 0;
  }
  return Object.values(topics)
    .filter(t => t.total >= 2)
    .map(t => ({
      ...t,
      accuracy: Math.round(((t.correct + t.partial * 0.5) / t.total) * 100),
      avgHints: +(t.hints / t.total).toFixed(1),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** Summary stats for overview cards */
export async function getOverviewStats(days = 30) {
  const user = await getUser();
  if (!user) return null;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("analytics_sessions")
    .select("study_minutes, questions_total, questions_correct, questions_partial, accuracy_pct, subject_id, session_date")
    .eq("user_id", user.id)
    .gte("session_date", sinceStr);
  if (error || !data) return null;
  let totalMinutes = 0, totalQuestions = 0, totalCorrect = 0, totalPartial = 0;
  const subjects = new Set();
  for (const r of data) {
    totalMinutes += r.study_minutes || 0;
    totalQuestions += r.questions_total || 0;
    totalCorrect += r.questions_correct || 0;
    totalPartial += r.questions_partial || 0;
    subjects.add(r.subject_id);
  }
  return {
    sessions: data.length,
    totalMinutes,
    totalQuestions,
    accuracy: totalQuestions > 0 ? Math.round(((totalCorrect + totalPartial * 0.5) / totalQuestions) * 100) : null,
    subjects: subjects.size,
  };
}
