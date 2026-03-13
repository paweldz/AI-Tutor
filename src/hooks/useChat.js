import { useState, useRef } from "react";
import { SUBJECTS } from "../config/subjects.js";
import { getSessions, addSessionToMem } from "../utils/storage.js";
import { sbSave, sbSaveSetting } from "../utils/cloudSync.js";
import { apiSend, apiSummary, buildSystemPrompt, buildApiMsgs } from "../utils/api.js";
import { recordTopicStudy } from "../utils/topics.js";
import { TUTOR_TOOLS, executeTool } from "../utils/tools.js";
import { createSessionMetrics, recordMessage, recordAssessment, formatMetricsForPrompt } from "../utils/sessionMetrics.js";

/**
 * Manages the send-message, generate-summary, and auto-save flows.
 * Owns loading/sumLoading/autoSumming state and the sessionsRef.
 */
export function useChat({
  active, profile, memory, sessions, setSessions, mats,
  examMode, voiceMode, convoMode,
  input, setInput, setMemory, setTopicData, gainXP,
}) {
  const [loading, setLoading] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [autoSumming, setAutoSumming] = useState(false);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  // Per-subject session metrics (assessments, active time)
  const metricsRef = useRef({});

  const subject = active ? SUBJECTS[active] : null;
  const curMats = active ? (mats[active] || []) : [];
  const curMem = active ? getSessions(memory, active) : [];
  const msgs = active ? (sessions[active]?.messages || []) : [];

  function getMetrics(sid) {
    if (!metricsRef.current[sid]) metricsRef.current[sid] = createSessionMetrics();
    return metricsRef.current[sid];
  }

  async function send(override) {
    const text = override || input.trim();
    if (!text || loading || !active || !profile) return;
    // Track active time on each user message
    metricsRef.current[active] = recordMessage(getMetrics(active));
    const userMsg = { role: "user", content: text };
    const latest = sessionsRef.current[active]?.messages || [];
    const updated = [...latest, userMsg];
    setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: updated } }));
    if (!override) setInput("");
    setLoading(true);
    const sys = buildSystemPrompt(active, profile, curMem, curMats, examMode, profile.tutorCharacters?.[active]);
    const langName = subject?.label || "the target language";
    const voiceNote = convoMode ? `REAL-TIME CONVERSATION MODE: You and the student are in a live spoken conversation. Keep responses very short (1-2 sentences), natural and conversational. ALWAYS end with a question or prompt to keep the dialogue flowing. Use increasingly more ${langName} as the student improves. Be encouraging and energetic.\n\n` : voiceMode ? `VOICE MODE ACTIVE: Student is speaking aloud (speech-to-text). Keep responses conversational, shorter (2-3 sentences), and end with a question to keep the conversation flowing. Use more ${langName} than usual. If the student's speech has speech-recognition errors, interpret charitably.\n\n` : "";
    const textMats = curMats.filter(m => m.isText);
    const fullSys = voiceNote + (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys;
    const apiMsgs = buildApiMsgs(curMats, updated.map(m => ({ role: m.role, content: m.content })));
    const onAssessment = (entry) => { metricsRef.current[active] = recordAssessment(getMetrics(active), entry); };
    const toolCtx = { memory, profile, active, onAssessment };
    const onToolUse = (name, input) => executeTool(name, input, toolCtx);
    try {
      const reply = await apiSend(fullSys, apiMsgs, 1200, { tools: TUTOR_TOOLS, onToolUse });
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: reply }] } }));
      gainXP(5, "Sent message");
    } catch (e) {
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: "\u274c " + e.message }] } }));
    } finally { setLoading(false); }
  }

  async function genSummary() {
    if (msgs.length < 3 || sumLoading) return;
    setSumLoading(true);
    try {
      const sys = buildSystemPrompt(active, profile, curMem, curMats, false, profile.tutorCharacters?.[active]);
      const metricsBlock = formatMetricsForPrompt(getMetrics(active));
      const data = await apiSummary(sys, msgs, metricsBlock);
      setMemory(prev => addSessionToMem(prev, active, data));
      sbSave(active, data.date, JSON.stringify(data));
      gainXP(25, "Session summary");
      if (data.confidenceScores) {
        setTopicData(prev => {
          let updated = prev;
          for (const [topic, conf] of Object.entries(data.confidenceScores)) {
            updated = recordTopicStudy(updated, active, topic, conf);
          }
          sbSaveSetting("topics", updated);
          return updated;
        });
      }
      return data;
    } catch (e) { console.error("Summary failed:", e); return null; } finally { setSumLoading(false); }
  }

  async function autoSave(sid, chatMsgs, sidMats) {
    if (chatMsgs.length < 6 || autoSumming) return;
    setAutoSumming(true);
    try {
      const sys = buildSystemPrompt(sid, profile, getSessions(memory, sid), sidMats, false, profile.tutorCharacters?.[sid]);
      const metricsBlock = formatMetricsForPrompt(getMetrics(sid));
      const data = await apiSummary(sys, chatMsgs, metricsBlock);
      setMemory(prev => addSessionToMem(prev, sid, data));
      sbSave(sid, data.date, JSON.stringify(data));
    } catch { /* auto-save is best-effort */ } finally { setAutoSumming(false); }
  }

  /** Reset metrics when switching subjects (called externally) */
  function resetMetrics(sid) {
    if (sid) delete metricsRef.current[sid];
  }

  /** Get current metrics for display (e.g. SummaryModal) */
  function getSessionMetrics(sid) {
    return getMetrics(sid || active);
  }

  return { send, genSummary, autoSave, loading, sumLoading, autoSumming, sessionsRef, resetMetrics, getSessionMetrics };
}
