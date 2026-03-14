/* ═══════════════════════════════════════════════════════════════════
   TOPIC & CONFIDENCE TRACKING (pure functions, no localStorage)
   ═══════════════════════════════════════════════════════════════════ */

import { getSessions } from "./storage.js";
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
