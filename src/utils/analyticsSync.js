/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS SYNC — Fire-and-forget writes to analytics tables.
   All functions are non-blocking and silently catch errors so they
   never interfere with the core tutoring experience.
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";

/** Save a completed session to analytics_sessions */
export function saveSessionAnalytics(subjectId, data, gradeEstimate) {
  if (!supabase || !data.sessionId) return;
  const metrics = data.metrics || {};
  const row = {
    session_id: data.sessionId,
    subject_id: subjectId,
    session_date: data.isoDate || new Date().toISOString().slice(0, 10),

    study_minutes: data.studyTimeMinutes || 0,
    duration_minutes: data.sessionDurationMinutes || 0,
    message_count: data.savedMsgCount || 0,

    questions_total: metrics.totalQuestions || 0,
    questions_correct: metrics.correct || 0,
    questions_partial: metrics.partial || 0,
    questions_wrong: metrics.wrong || 0,
    questions_skipped: metrics.skipped || 0,
    accuracy_pct: metrics.accuracyPct ?? null,
    avg_hints: metrics.avgHints ?? null,
    reasoning_pct: metrics.reasoningPct ?? null,

    is_exam: !!data.isExam,
    exam_mode: data.examMode || null,
    session_type: data.isExam ? "exam" : "tutor",

    estimated_grade_low: gradeEstimate?.low ?? null,
    estimated_grade_high: gradeEstimate?.high ?? null,
    estimated_grade_pct: gradeEstimate?.percentage ?? null,
  };
  supabase.from("analytics_sessions").insert(row)
    .then(({ error }) => { if (error) console.warn("[analytics] saveSession:", error.message); });
}

/** Save a single assessment (question result) — called on each log_assessment */
export function saveAssessment(subjectId, sessionId, entry) {
  if (!supabase) return;
  const row = {
    session_id: sessionId || null,
    subject_id: subjectId,
    topic: entry.topic,
    result: entry.result,
    hints_given: entry.hintsGiven || 0,
    reasoning: !!entry.studentExplainedReasoning,
    question_type: entry.questionType || null,
  };
  supabase.from("analytics_assessments").insert(row)
    .then(({ error }) => { if (error) console.warn("[analytics] saveAssessment:", error.message); });
}

/** Save topic confidence snapshots for a completed session */
export function saveTopicSnapshots(subjectId, data) {
  if (!supabase || !data.sessionId) return;
  const confidenceScores = data.confidenceScores || {};
  const topicDepth = data.topicDepth || {};
  const topicBreakdown = data.metrics?.topicBreakdown || {};
  const topics = Object.keys(confidenceScores);
  if (topics.length === 0) return;

  const rows = topics.map(topic => {
    const tb = topicBreakdown[topic];
    const attempted = tb ? tb.total - (tb.skipped || 0) : 0;
    const topicAcc = attempted > 0
      ? Math.round(((tb.correct + (tb.partial || 0) * 0.5) / attempted) * 100)
      : null;
    return {
      session_id: data.sessionId,
      subject_id: subjectId,
      topic,
      confidence: confidenceScores[topic],
      depth: topicDepth[topic] || null,
      questions: tb?.total || 0,
      accuracy_pct: topicAcc,
      snapshot_date: data.isoDate || new Date().toISOString().slice(0, 10),
    };
  });
  supabase.from("analytics_topic_snapshots").insert(rows)
    .then(({ error }) => { if (error) console.warn("[analytics] saveTopicSnapshots:", error.message); });
}

/** Save a standalone quiz result */
export function saveQuizResult(subjectId, quizType, questions, answers) {
  if (!supabase) return;
  const total = questions.length;
  const correct = answers.filter(a => a.correct).length;
  const row = {
    subject_id: subjectId,
    quiz_type: quizType || "quick",
    questions_total: total,
    questions_correct: correct,
    score_pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    questions_json: questions.map((q, i) => ({
      q: q.q,
      correct: q.correct,
      chosen: answers[i]?.chosen,
      wasCorrect: !!answers[i]?.correct,
      topic: q.topic || null,
    })),
  };
  supabase.from("analytics_quiz_results").insert(row)
    .then(({ error }) => { if (error) console.warn("[analytics] saveQuizResult:", error.message); });
}

/** Save a grade estimate snapshot */
export function saveGradeSnapshot(subjectId, estimate) {
  if (!supabase || !estimate) return;
  const row = {
    subject_id: subjectId,
    grade_low: estimate.low,
    grade_high: estimate.high,
    grade_point: estimate.point,
    percentage: estimate.percentage,
    confidence: estimate.confidence,
    factors_json: estimate.factors || [],
  };
  supabase.from("analytics_grade_history").insert(row)
    .then(({ error }) => { if (error) console.warn("[analytics] saveGradeSnapshot:", error.message); });
}
