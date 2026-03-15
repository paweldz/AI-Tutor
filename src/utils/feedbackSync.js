/* ═══════════════════════════════════════════════════════════════════
   FEEDBACK SYNC — Generate and store LLM-powered qualitative feedback.
   Uses the /api/chat proxy (same as tutoring) to produce structured
   feedback snapshots, then stores them in Supabase for instant access.
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";
import { apiSend, MODEL } from "./api.js";
import { SUBJECTS } from "../config/subjects.js";

/* ── Feedback generation prompts ─────────────────────────────────── */

const PROGRESS_NARRATIVE_PROMPT = `You are an expert educational analyst reviewing a student's recent tutoring sessions. Write a concise, personalised progress narrative.

INPUT: You'll receive session summaries with topics, strengths, weaknesses, accuracy data, and confidence scores.

OUTPUT: Return ONLY valid JSON (no markdown, no backticks):
{
  "summary": "2-3 paragraph narrative covering: what the student has been working on, how they're progressing, notable improvements or concerns, and what to expect next",
  "bullets": ["3-5 key takeaways as short bullet points"],
  "tone": "positive|mixed|needs-attention",
  "sessionsAnalysed": <number>
}

RULES:
- Be honest. If accuracy is low, say so constructively.
- Reference specific topics and numbers.
- Write as an encouraging but truthful tutor.
- Keep the narrative under 200 words.`;

const STRENGTHS_GROWTH_PROMPT = `You are an expert educational analyst. Identify the student's strengths and growth areas from their session data.

INPUT: Session summaries with topics, accuracy, confidence scores, and tutor feedback.

OUTPUT: Return ONLY valid JSON (no markdown, no backticks):
{
  "strengths": [
    {"area": "short label", "evidence": "specific evidence from sessions", "tip": "how to maintain/extend this"}
  ],
  "growthAreas": [
    {"area": "short label", "evidence": "specific evidence", "priority": "high|medium|low", "actionItem": "concrete next step"}
  ],
  "sessionsAnalysed": <number>
}

RULES:
- 3-6 strengths and 3-6 growth areas.
- Every claim must reference actual session data.
- Action items must be specific and actionable (not "study more").
- Priority should reflect impact on grades.`;

const LEARNING_PATTERNS_PROMPT = `You are an expert educational psychologist analysing a student's learning behaviour patterns.

INPUT: Session summaries including topics, question types, hints used, reasoning shown, study times, and accuracy.

OUTPUT: Return ONLY valid JSON (no markdown, no backticks):
{
  "patterns": [
    {"observation": "what you noticed", "evidence": "data supporting it", "suggestion": "how to leverage or address it"}
  ],
  "learningStyle": "brief description of observed learning preferences",
  "sessionsAnalysed": <number>
}

RULES:
- 3-5 patterns maximum.
- Look for: hint dependency, reasoning quality, topic-switching frequency, session length patterns, question type performance, time-of-day patterns.
- Be specific with evidence, not generic.`;

const EXAM_READINESS_PROMPT = `You are an expert GCSE examiner assessing a student's readiness for their exams.

INPUT: Session data including topic coverage, confidence scores, accuracy, grade estimates, and target grades.

OUTPUT: Return ONLY valid JSON (no markdown, no backticks):
{
  "overallReadiness": "strong|on-track|at-risk|behind",
  "summary": "2-3 paragraph assessment of exam readiness",
  "topicReadiness": [
    {"topic": "name", "status": "ready|nearly|needs-work|not-covered", "note": "brief explanation"}
  ],
  "recommendations": ["prioritised list of 3-5 specific actions to improve readiness"],
  "projectedGrade": "estimated grade range if exam was today",
  "sessionsAnalysed": <number>
}

RULES:
- Be realistic about readiness based on actual data.
- Factor in topic coverage gaps.
- Consider both accuracy and confidence scores.`;

const PARENT_LETTER_PROMPT = `You are a professional tutor writing a progress update for a student's parent/guardian.

INPUT: Session summaries with topics, grades, accuracy, strengths, and weaknesses.

OUTPUT: Return ONLY valid JSON (no markdown, no backticks):
{
  "greeting": "Dear Parent/Guardian,",
  "body": "3-4 paragraph professional letter covering: what we've been working on, progress made, areas for improvement, and next steps. Write in first person as the tutor.",
  "keyStats": {"sessions": <n>, "avgAccuracy": "<n>%", "topicsStudied": <n>, "estimatedGrade": "grade range"},
  "sessionsAnalysed": <number>
}

RULES:
- Professional but warm tone.
- Include specific achievements and areas to work on.
- Provide 1-2 suggestions for home support.
- Keep under 250 words.`;

const PROMPTS = {
  progress_narrative: PROGRESS_NARRATIVE_PROMPT,
  strengths_growth: STRENGTHS_GROWTH_PROMPT,
  learning_patterns: LEARNING_PATTERNS_PROMPT,
  exam_readiness: EXAM_READINESS_PROMPT,
  parent_letter: PARENT_LETTER_PROMPT,
};

/* ── Build session context for prompts ───────────────────────────── */

function buildSessionContext(sessions, subjectId, profile) {
  // Filter to subject if specified
  const relevant = subjectId
    ? (sessions[subjectId] || [])
    : Object.entries(sessions).flatMap(([sid, list]) =>
        list.map(s => ({ ...s, _subjectId: sid }))
      );

  if (relevant.length === 0) return { text: "", count: 0 };

  // Take most recent 20 sessions for context
  const recent = relevant.slice(-20);
  const subLabel = subjectId ? SUBJECTS[subjectId]?.label || subjectId : "all subjects";
  const board = subjectId && profile?.examBoards?.[subjectId] ? profile.examBoards[subjectId] : "";
  const targetGrade = subjectId && profile?.targetGrades?.[subjectId] ? profile.targetGrades[subjectId] : "";

  let text = `STUDENT: ${profile?.name || "Student"} | ${profile?.year || "?"} | ${profile?.tier || "?"}\n`;
  text += `SUBJECT: ${subLabel}${board ? " | Board: " + board : ""}${targetGrade ? " | Target Grade: " + targetGrade : ""}\n`;
  text += `SESSIONS (${recent.length} most recent):\n\n`;

  for (const s of recent) {
    const sid = s._subjectId || subjectId;
    const sub = SUBJECTS[sid];
    text += `--- ${s.date || s.isoDate || "Unknown date"}${sub && !subjectId ? " [" + sub.label + "]" : ""} ---\n`;
    if (s.topics?.length) text += `Topics: ${s.topics.join(", ")}\n`;
    if (s.metrics) {
      const m = s.metrics;
      text += `Questions: ${m.totalQuestions || 0} (${m.correct || 0} correct, ${m.partial || 0} partial, ${m.wrong || 0} wrong)\n`;
      if (m.accuracyPct != null) text += `Accuracy: ${m.accuracyPct}%\n`;
      if (m.avgHints != null) text += `Avg hints: ${m.avgHints}\n`;
    }
    if (s.confidenceScores && Object.keys(s.confidenceScores).length) {
      text += `Confidence: ${Object.entries(s.confidenceScores).map(([t, v]) => t + ": " + v + "%").join(", ")}\n`;
    }
    if (s.strengths?.length) text += `Strengths: ${s.strengths.join("; ")}\n`;
    if (s.weaknesses?.length) text += `Weaknesses: ${s.weaknesses.join("; ")}\n`;
    if (s.rawSummaryText) text += `Summary: ${s.rawSummaryText.slice(0, 300)}\n`;
    text += "\n";
  }

  return { text, count: recent.length };
}

/* ── Generate a feedback snapshot ────────────────────────────────── */

export async function generateFeedback(snapshotType, memory, subjectId, profile) {
  const prompt = PROMPTS[snapshotType];
  if (!prompt) throw new Error("Unknown snapshot type: " + snapshotType);

  const sessions = memory?.subjects || {};
  const { text: context, count } = buildSessionContext(sessions, subjectId, profile);
  if (count === 0) throw new Error("No sessions available for feedback generation.");

  const systemPrompt = "You are an expert educational analyst. Your task is to analyse student session data and produce structured feedback.";
  const messages = [
    { role: "user", content: context + "\n\n" + prompt },
  ];

  const raw = await apiSend(systemPrompt, messages, 1500);
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { summary: raw, error: "Failed to parse structured response" };
  }

  return { content: parsed, sessionCount: count };
}

/* ── Save feedback snapshot to Supabase ──────────────────────────── */

export async function saveFeedbackSnapshot(subjectId, snapshotType, content, sessionCount) {
  if (!supabase) return null;
  const today = new Date().toISOString().slice(0, 10);
  const row = {
    subject_id: subjectId || null,
    snapshot_type: snapshotType,
    content,
    session_count: sessionCount,
    period_end: today,
    generated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("feedback_snapshots")
    .insert(row)
    .select("id")
    .single();

  if (error) console.warn("[feedback] saveFeedbackSnapshot:", error.message);
  return data;
}

/* ── Generate and save (combined convenience function) ───────────── */

export async function generateAndSaveFeedback(snapshotType, memory, subjectId, profile) {
  const { content, sessionCount } = await generateFeedback(snapshotType, memory, subjectId, profile);
  await saveFeedbackSnapshot(subjectId, snapshotType, content, sessionCount);
  return content;
}

/* ── Auto-generate Tier 2 snapshots (fire-and-forget after sessions) ── */

export function autoGenerateFeedbackIfDue(memory, subjectId, profile, feedbackFrequency = 5) {
  if (!supabase) return;

  const sessions = memory?.subjects?.[subjectId] || [];
  if (sessions.length === 0) return;

  // Check how many sessions since last feedback snapshot
  supabase
    .from("feedback_snapshots")
    .select("session_count, generated_at")
    .eq("subject_id", subjectId)
    .eq("snapshot_type", "progress_narrative")
    .order("generated_at", { ascending: false })
    .limit(1)
    .then(({ data }) => {
      const lastCount = data?.[0]?.session_count || 0;
      const currentCount = sessions.length;
      const sessionsSinceLast = currentCount - lastCount;

      if (sessionsSinceLast >= feedbackFrequency) {
        // Generate all Tier 2 snapshot types
        const types = ["progress_narrative", "strengths_growth", "learning_patterns"];
        for (const type of types) {
          generateAndSaveFeedback(type, memory, subjectId, profile)
            .then(() => console.log(`[feedback] Auto-generated ${type} for ${subjectId}`))
            .catch(e => console.warn(`[feedback] Auto-gen ${type} failed:`, e.message));
        }
      }
    })
    .catch(e => console.warn("[feedback] autoGenerateCheck failed:", e.message));
}
