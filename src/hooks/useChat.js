import { useState, useRef } from "react";
import { SUBJECTS } from "../config/subjects.js";
import { getSessions, addSessionToMem } from "../utils/storage.js";
import { sbSave, sbSaveSetting } from "../utils/cloudSync.js";
import { apiSend, apiSummary, buildSystemPrompt, buildApiMsgs } from "../utils/api.js";
import { recordTopicStudy, getTopicsForSubject } from "../utils/topics.js";
import { estimateGrade } from "../utils/grades.js";
import { buildTeacherNotesPrompt } from "../components/TeacherNotes.jsx";
import { buildStudentNotesPrompt } from "../components/StudentNotes.jsx";
import { TUTOR_TOOLS, executeTool } from "../utils/tools.js";
import { createSessionMetrics, recordMessage, recordAssessment, computeMetricsSummary, formatMetricsForPrompt } from "../utils/sessionMetrics.js";

/**
 * Manages the send-message, generate-summary, and auto-save flows.
 * Owns loading/sumLoading/autoSumming state and the sessionsRef.
 */
export function useChat({
  active, profile, memory, sessions, setSessions, mats,
  examSession, voiceMode, convoMode, teacherNotes, studentNotes, events,
  input, setInput, setMemory, setTopicData, gainXP, topicData, customTopics,
}) {
  const [loading, setLoading] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [autoSumming, setAutoSumming] = useState(false);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  // Per-subject session metrics (assessments, active time)
  const metricsRef = useRef({});
  // Track which subjects have already been saved this session to prevent duplicates
  const savedRef = useRef({});

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
    const gradeEst = estimateGrade(memory, events, topicData, profile, active, getTopicsForSubject(active, profile, customTopics));
    const sys = buildSystemPrompt(active, profile, curMem, curMats, examSession, profile.tutorCharacters?.[active], events, gradeEst);
    const langName = subject?.label || "the target language";
    const voiceNote = convoMode ? `REAL-TIME CONVERSATION MODE: You and the student are in a live spoken conversation. Keep responses very short (1-2 sentences), natural and conversational. ALWAYS end with a question or prompt to keep the dialogue flowing. Use increasingly more ${langName} as the student improves. Be encouraging and energetic.\n\n` : voiceMode ? `VOICE MODE ACTIVE: Student is speaking aloud (speech-to-text). Keep responses conversational, shorter (2-3 sentences), and end with a question to keep the conversation flowing. Use more ${langName} than usual. If the student's speech has speech-recognition errors, interpret charitably.\n\n` : "";
    const textMats = curMats.filter(m => m.isText);
    const teacherNotesBlock = teacherNotes ? buildTeacherNotesPrompt(teacherNotes, active) : "";
    const studentNotesBlock = studentNotes ? buildStudentNotesPrompt(studentNotes, active) : "";
    const fullSys = voiceNote + (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys + teacherNotesBlock + studentNotesBlock;
    const apiMsgs = buildApiMsgs(curMats, updated.map(m => ({ role: m.role, content: m.content })), examSession);
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
      const gradeEstSum = estimateGrade(memory, events, topicData, profile, active, getTopicsForSubject(active, profile, customTopics));
      const sys = buildSystemPrompt(active, profile, curMem, curMats, false, profile.tutorCharacters?.[active], events, gradeEstSum);
      const metricsBlock = formatMetricsForPrompt(getMetrics(active));
      const localMetrics = computeMetricsSummary(getMetrics(active));
      const data = await apiSummary(sys, msgs, metricsBlock);
      if (!data.metrics || !data.metrics.totalQuestions) data.metrics = localMetrics;
      if (!data.topicDepth && localMetrics.depthByTopic && Object.keys(localMetrics.depthByTopic).length) data.topicDepth = localMetrics.depthByTopic;
      data.sessionId = crypto.randomUUID();
      data.savedMsgCount = msgs.length;
      // Reliable ISO date for week/month filtering (independent of Claude's date string)
      const _now = new Date();
      data.isoDate = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}-${String(_now.getDate()).padStart(2,"0")}`;
      // Always stamp study time — even for discussion-only sessions
      const rawMetrics = getMetrics(active);
      data.studyTimeMinutes = Math.round(rawMetrics.activeTimeMs / 60000);
      data.sessionDurationMinutes = Math.round((Date.now() - rawMetrics.sessionStartedAt) / 60000);
      // Stamp exam info if this was an exam session
      if (examSession) {
        data.isExam = true;
        data.examMode = examSession.mode;
        data.examDescription = examSession.description || "";
        data.examTimeLimit = examSession.timeLimit || 0;
        data.examDuration = Math.round((Date.now() - examSession.startedAt) / 60000);
      }
      setMemory(prev => addSessionToMem(prev, active, data));
      sbSave(active, data.isoDate || data.date, JSON.stringify(data));
      savedRef.current[active] = msgs.length;
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
    // Skip if already saved manually (same or more messages)
    if (savedRef.current[sid] && savedRef.current[sid] >= chatMsgs.length) return;
    if (chatMsgs.length < 6 || autoSumming) return;
    setAutoSumming(true);
    try {
      const gradeEstAuto = estimateGrade(memory, events, topicData, profile, sid, getTopicsForSubject(sid, profile, customTopics));
      const sys = buildSystemPrompt(sid, profile, getSessions(memory, sid), sidMats, false, profile.tutorCharacters?.[sid], events, gradeEstAuto);
      const metricsBlock = formatMetricsForPrompt(getMetrics(sid));
      const localMetrics = computeMetricsSummary(getMetrics(sid));
      const data = await apiSummary(sys, chatMsgs, metricsBlock);
      if (!data.metrics || !data.metrics.totalQuestions) data.metrics = localMetrics;
      if (!data.topicDepth && localMetrics.depthByTopic && Object.keys(localMetrics.depthByTopic).length) data.topicDepth = localMetrics.depthByTopic;
      data.sessionId = crypto.randomUUID();
      data.savedMsgCount = chatMsgs.length;
      const _now = new Date();
      data.isoDate = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}-${String(_now.getDate()).padStart(2,"0")}`;
      const rawAutoMetrics = getMetrics(sid);
      data.studyTimeMinutes = Math.round(rawAutoMetrics.activeTimeMs / 60000);
      data.sessionDurationMinutes = Math.round((Date.now() - rawAutoMetrics.sessionStartedAt) / 60000);
      if (examSession) {
        data.isExam = true;
        data.examMode = examSession.mode;
        data.examDescription = examSession.description || "";
        data.examTimeLimit = examSession.timeLimit || 0;
        data.examDuration = Math.round((Date.now() - examSession.startedAt) / 60000);
      }
      setMemory(prev => addSessionToMem(prev, sid, data));
      sbSave(sid, data.isoDate || data.date, JSON.stringify(data));
      savedRef.current[sid] = chatMsgs.length;
    } catch { /* auto-save is best-effort */ } finally { setAutoSumming(false); }
  }

  /** Reset metrics and save tracking when switching subjects (called externally) */
  function resetMetrics(sid) {
    if (sid) {
      delete metricsRef.current[sid];
      delete savedRef.current[sid];
    }
  }

  /** Get current metrics for display (e.g. SummaryModal) */
  function getSessionMetrics(sid) {
    return getMetrics(sid || active);
  }

  return { send, genSummary, autoSave, loading, sumLoading, autoSumming, sessionsRef, resetMetrics, getSessionMetrics };
}
