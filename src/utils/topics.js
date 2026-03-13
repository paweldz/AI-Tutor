/* ═══════════════════════════════════════════════════════════════════
   TOPIC & CONFIDENCE TRACKING
   ═══════════════════════════════════════════════════════════════════ */

import { readJSON, writeJSON, studentKey, getSessions } from "./storage.js";
import { todayStr } from "./xp.js";
import { SUBJECT_TOPICS } from "../config/subjects.js";

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
export function topicPct(data, sid) {
  const topics = SUBJECT_TOPICS[sid] || [];
  if (!topics.length) return 0;
  const prog = data[sid] || {};
  const studied = topics.filter(t => prog[t]?.studied > 0).length;
  return Math.round(studied / topics.length * 100);
}
