/* ═══════════════════════════════════════════════════════════════════
   TOPIC & CONFIDENCE TRACKING
   ═══════════════════════════════════════════════════════════════════ */

import { readJSON, writeJSON, studentKey, getSessions } from "./storage.js";
import { todayStr } from "./xp.js";
import { SUBJECT_TOPICS, getDefaultTopics } from "../config/subjects.js";

/* Extract latest confidence scores across all subjects from memory */
export function getConfidence(memory, sid) {
  const sessions = getSessions(memory, sid);
  if (!sessions.length) return {};
  const merged = {};
  for (const s of sessions) {
    if (s.confidenceScores) Object.assign(merged, s.confidenceScores);
  }
  return merged;
}
export function avgConfidence(scores) {
  const vals = Object.values(scores).filter(v => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : -1;
}

/* Topic progress tracking — { subjectId: { topicName: { studied, lastDate, confidence } } } */
export const TOPIC_KEY = "gcse_topics_v1";
export function loadTopicProgress() { return readJSON(studentKey(TOPIC_KEY), {}); }
export function saveTopicProgress(data) { writeJSON(studentKey(TOPIC_KEY), data); }
export function recordTopicStudy(prev, sid, topic, confidence) {
  const old = prev[sid]?.[topic] || { studied: 0, confidence: 0 };
  return { ...prev, [sid]: { ...prev[sid], [topic]: { studied: old.studied + 1, lastDate: todayStr(), confidence: typeof confidence === "number" ? confidence : old.confidence } } };
}
export function getTopicProgress(data, sid) { return data[sid] || {}; }
export function topicPct(data, sid, profile, customTopics) {
  const topics = getTopicsForSubject(sid, profile, customTopics);
  if (!topics.length) return 0;
  const prog = data[sid] || {};
  const studied = topics.filter(t => prog[t]?.studied > 0).length;
  return Math.round(studied / topics.length * 100);
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOM TOPICS — student-editable topic lists per subject
   Shape: { [subjectId]: string[] }
   When null/empty for a subject, falls back to board/tier defaults.
   ═══════════════════════════════════════════════════════════════════ */

export const CUSTOM_TOPICS_KEY = "gcse_custom_topics_v1";
export function loadCustomTopics() { return readJSON(studentKey(CUSTOM_TOPICS_KEY), {}); }
export function saveCustomTopics(data) { writeJSON(studentKey(CUSTOM_TOPICS_KEY), data); }

/* ═══════════════════════════════════════════════════════════════════
   TEACHER NOTES — dated feedback from real teachers per subject
   Shape: { [subjectId]: Array<{ id, source, date, expires?, focus?, strengths?, weaknesses?, approach? }> }
   ═══════════════════════════════════════════════════════════════════ */

export const TEACHER_NOTES_KEY = "gcse_teacher_notes_v1";
export function loadTeacherNotes() { return readJSON(studentKey(TEACHER_NOTES_KEY), {}); }
export function saveTeacherNotes(data) { writeJSON(studentKey(TEACHER_NOTES_KEY), data); }

/**
 * Resolve the topic list for a subject.
 * Priority: customTopics > board/tier defaults > generic SUBJECT_TOPICS
 */
export function getTopicsForSubject(sid, profile, customTopics) {
  if (customTopics?.[sid]?.length) return customTopics[sid];
  const board = profile?.examBoards?.[sid];
  const tier = profile?.tier;
  return getDefaultTopics(sid, board, tier);
}
