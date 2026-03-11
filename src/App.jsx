import { useState, useRef, useEffect, useCallback, Component } from "react";

/* Extracted utilities & config */
import { renderMd } from "./utils/markdown.jsx";
import { SUBJECTS, SUBJECT_TOPICS, BOARDS, YEARS, TIERS, ALL_SUBJECT_IDS, ALL_SUBJECT_LIST, mySubjects, emptyMats } from "./config/subjects.js";
import { KEYS, readJSON, writeJSON, setActiveStudent, sKey, migrateIfNeeded, loadProfile, saveProfile, loadMemory, saveMemory, getSessions, addSessionToMem, clearSubjectMem, clearAllMem, exportData, importData } from "./utils/storage.js";
import { XP_KEYS, todayStr, loadXP, saveXP, addXP, xpLevel, LEVEL_EMOJIS, loadStreaks, saveStreaks, recordActivity, calcStreak, weekHeatmap } from "./utils/xp.js";
import { getConfidence, avgConfidence, TOPIC_KEY, loadTopicProgress, saveTopicProgress, recordTopicStudy, getTopicProgress, topicPct } from "./utils/topics.js";
import { sbTest, sbSave, sbLoad, mergeMemory, sbSaveSetting, sbLoadSettings } from "./utils/cloudSync.js";
import { MODEL, SUMMARY_PROMPT, apiSend, apiSummary, buildSystemPrompt, buildApiMsgs } from "./utils/api.js";
import { MAX_MB, ACCEPT_TYPES, processFiles } from "./utils/files.js";
import { HAS_MEDIA_RECORDER, speakText, stopSpeaking } from "./utils/speech.js";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";

/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  GCSE TUTOR HUB v2.0                                           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

export const APP_VERSION = "3.4.2 (10 Mar 2026, 10:00)";

const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Source Sans 3', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
@keyframes mi { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
@keyframes db { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-7px) } }
@keyframes ci { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
textarea { outline: none; }
.btn { transition: all .2s; cursor: pointer; }
.btn:hover { opacity: .85; }
.card { transition: all .25s; cursor: pointer; }
.card:hover { transform: translateY(-4px); }
.hb:hover { transform: translateY(-2px); }
.so:hover { transform: scale(1.03); }
@keyframes mp { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4) } 50% { box-shadow: 0 0 0 10px rgba(220,38,38,0) } }
`;

/* Inline definitions removed — now imported from ./utils/ and ./config/ */

/* Extracted components */
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { Setup } from "./components/Setup.jsx";
import { MaterialsPanel } from "./components/MaterialsPanel.jsx";
import { MemoryManager } from "./components/MemoryManager.jsx";
import { SummaryModal } from "./components/SummaryModal.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { SettingsModal } from "./components/SettingsModal.jsx";
import { TopicsPanel } from "./components/TopicsPanel.jsx";
import { QuickQuiz, QuizBuilder } from "./components/QuizComponents.jsx";


/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */

migrateIfNeeded();

/* Set active student from saved profile so per-student keys work on first load */
{ const p = readJSON("gcse_profile_v2"); if (p?.name) setActiveStudent(p.name); }

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [memory, setMemory] = useState(loadMemory);
  const [sessions, setSessions] = useState({});
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const [mats, setMats] = useState(emptyMats);
  const [active, setActiveRaw] = useState(null);
  const [modal, setModal] = useState(null); // "mats"|"memory"|"dash"|"settings"|null
  const [showSum, setShowSum] = useState(null);
  const [examMode, setExamMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [autoSumming, setAutoSumming] = useState(false);
  const [sbSynced, setSbSynced] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [xpData, setXpData] = useState(loadXP);
  const [streakData, setStreakData] = useState(loadStreaks);
  const [quizSubject, setQuizSubject] = useState(null);
  const [topicData, setTopicData] = useState(loadTopicProgress);
  const [topicsFor, setTopicsFor] = useState(null);
  const [buildQuizFor, setBuildQuizFor] = useState(null); // subject for quiz builder
  const [storageFull, setStorageFull] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const lv = xpLevel(xpData.total);
  const streak = calcStreak(streakData.dates);
  const week = weekHeatmap(streakData.dates);

  const subject = active ? SUBJECTS[active] : null;
  const sess = active ? (sessions[active] || {}) : {};
  const msgs = sess.messages || [];
  const curMats = active ? (mats[active] || []) : [];
  const curMem = active ? getSessions(memory, active) : [];
  const totalMem = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  const voiceCfg = subject?.voice?.enabled ? subject.voice : null;

  // Voice state
  const [voiceMode, setVoiceMode] = useState(false);
  const [convoMode, setConvoMode] = useState(false); // continuous conversation loop
  const [speaking, setSpeaking] = useState(false);
  const prevMsgCountRef = useRef(0);
  const sendRef = useRef(null); // avoids stale closure in speech callback
  const convoRef = useRef(false); // tracks convoMode without stale closure
  convoRef.current = convoMode;

  // Speech recognition hook — records audio, transcribes via Whisper
  const { listening, transcribing, start: startMic, stop: stopMic, supported: micSupported } = useSpeechRecognition(
    voiceCfg?.lang || "es-ES",
    useCallback((text, isFinal) => {
      if (text.trim()) {
        setInput(text.trim());
        // Auto-send after Whisper returns transcript
        const t = text.trim();
        setTimeout(() => { setInput(""); if (sendRef.current) sendRef.current(t); }, 400);
      }
    }, [])
  );

  const startMicRef = useRef(startMic);
  startMicRef.current = startMic;

  // Auto-speak new assistant messages when voice mode is on
  useEffect(() => {
    if (!voiceMode || !voiceCfg || !msgs.length) return;
    if (msgs.length > prevMsgCountRef.current) {
      const last = msgs[msgs.length - 1];
      if (last.role === "assistant" && !last.content.startsWith("\u274c")) {
        setSpeaking(true);
        speakText(last.content, voiceCfg, () => {
          setSpeaking(false);
          // In conversation mode, auto-start recording after tutor finishes speaking
          if (convoRef.current) setTimeout(() => startMicRef.current(), 300);
        });
      }
    }
    prevMsgCountRef.current = msgs.length;
  }, [msgs.length, voiceMode, voiceCfg]);

  // Stop speaking when leaving a subject
  useEffect(() => { if (!active) { stopSpeaking(); setSpeaking(false); } }, [active]);

  // Turn off voice/convo mode when switching to a non-voice subject
  useEffect(() => { if (!voiceCfg) { setVoiceMode(false); setConvoMode(false); } }, [voiceCfg]);

  // Warn user if localStorage is full
  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener("storage-full", handler);
    return () => window.removeEventListener("storage-full", handler);
  }, []);

  // Persist memory
  useEffect(() => { saveMemory(memory); }, [memory]);

  // Persist XP and streaks
  useEffect(() => { saveXP(xpData); }, [xpData]);
  useEffect(() => { saveStreaks(streakData); }, [streakData]);

  // Record daily activity whenever they use the app
  useEffect(() => {
    if (profile) setStreakData(prev => recordActivity(prev));
  }, [profile]);

  function gainXP(amount, reason) {
    setXpData(prev => addXP(prev, amount, reason));
    setStreakData(prev => recordActivity(prev));
  }

  // Persist topics
  useEffect(() => { saveTopicProgress(topicData); }, [topicData]);

  // Start a focused session on a specific topic
  function studyTopic(sub, topic) {
    setTopicsFor(null);
    setActive(sub.id);
    setTopicData(prev => recordTopicStudy(prev, sub.id, topic));
    setTimeout(() => {
      if (sendRef.current) sendRef.current("I'd like to study: " + topic);
    }, 800);
  }

  // Save custom quiz results to memory + Supabase
  // Save profile to both localStorage and Supabase
  function updateProfile(p) {
    saveProfile(p); // also calls setActiveStudent
    setProfile(p);
    if (p?.name) {
      // Reload per-student data for the new/updated student
      setMemory(loadMemory());
      setXpData(loadXP());
      setStreakData(loadStreaks());
      setTopicData(loadTopicProgress());
      sbSaveSetting(p.name, "profile", p);
    }
    setModal(null);
  }

  // Switch to a different user
  function switchUser() {
    if (active && msgs.length >= 6) autoSave(active, msgs, curMats);
    stopSpeaking();
    setActiveRaw(null);
    setSessions({});
    setMats(emptyMats());
    setSbSynced(false);
    setDbConnected(false);
    setActiveStudent("");
    setProfile(null);
    saveProfile(null);
    // Reset per-student data to empty (will reload on next login)
    setMemory({ version: 2, subjects: {} });
    setXpData({ total: 0, history: [] });
    setStreakData({ dates: [] });
    setTopicData({});
  }

  // Supabase sync — load memory + profile settings from cloud
  useEffect(() => {
    if (profile && !sbSynced) {
      setSbSynced(true);
      // Load memory
      sbLoad(profile.name).then(cloud => {
        if (cloud) { setMemory(prev => mergeMemory(prev, cloud)); setDbConnected(true); }
      }).catch(() => {});
      // Load profile settings (cloud overrides local if exists)
      sbLoadSettings(profile.name).then(settings => {
        if (settings?.profile) {
          const cloud = settings.profile;
          setProfile(prev => {
            const merged = { ...prev, ...cloud, examBoards: { ...prev.examBoards, ...cloud.examBoards }, tutorCharacters: { ...prev.tutorCharacters, ...cloud.tutorCharacters } };
            saveProfile(merged);
            return merged;
          });
          setDbConnected(true);
        }
        // Load topic progress from cloud
        if (settings?.topics) {
          setTopicData(prev => {
            const merged = { ...prev };
            for (const [sid, topics] of Object.entries(settings.topics)) {
              merged[sid] = { ...merged[sid] };
              for (const [topic, data] of Object.entries(topics)) {
                const local = merged[sid][topic];
                if (!local || (data.studied || 0) > (local.studied || 0)) merged[sid][topic] = data;
              }
            }
            saveTopicProgress(merged);
            return merged;
          });
        }
      }).catch(() => {});
    }
  }, [profile, sbSynced]);

  // Initialise session with welcome message
  function setActive(newId) {
    if (active && msgs.length >= 6 && !autoSumming) autoSave(active, msgs, curMats);
    setActiveRaw(newId);
    setExamMode(false);
    if (newId && !sessions[newId] && profile) {
      const sub = SUBJECTS[newId];
      const board = profile.examBoards?.[newId];
      const memCount = getSessions(memory, newId).length;
      setSessions(prev => ({ ...prev, [newId]: { messages: [{ role: "assistant", content: sub.welcomeMessage(profile, board, memCount) }] } }));
    }
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, loading]);
  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);

  // Send message — direct to Anthropic API
  async function send(override) {
    const text = override || input.trim();
    if (!text || loading || !active || !profile) return;
    const userMsg = { role: "user", content: text };
    // Read latest messages from ref to avoid stale closure (e.g. after quiz summary injection)
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
    try {
      const reply = await apiSend(fullSys, apiMsgs);
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: reply }] } }));
      gainXP(5, "Sent message");
    } catch (e) {
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: "\u274c " + e.message }] } }));
    } finally { setLoading(false); }
  }
  sendRef.current = send; // keep ref fresh for speech callback

  // Generate and save structured summary
  async function genSummary() {
    if (msgs.length < 3 || sumLoading) return;
    setSumLoading(true);
    try {
      const sys = buildSystemPrompt(active, profile, curMem, curMats, false, profile.tutorCharacters?.[active]);
      const data = await apiSummary(sys, msgs);
      setMemory(prev => addSessionToMem(prev, active, data));
      if (profile) sbSave(profile.name, active, data.date, JSON.stringify(data));
      setShowSum(data);
      gainXP(25, "Session summary");
      // Auto-update topic progress from confidence scores
      if (data.confidenceScores) {
        setTopicData(prev => {
          let updated = prev;
          for (const [topic, conf] of Object.entries(data.confidenceScores)) {
            updated = recordTopicStudy(updated, active, topic, conf);
          }
          if (profile) sbSaveSetting(profile.name, "topics", updated);
          return updated;
        });
      }
    } catch (e) { console.error("Summary failed:", e); } finally { setSumLoading(false); }
  }

  // Auto-save on subject switch
  async function autoSave(sid, chatMsgs, sidMats) {
    if (chatMsgs.length < 6 || autoSumming) return;
    setAutoSumming(true);
    try {
      const sys = buildSystemPrompt(sid, profile, getSessions(memory, sid), sidMats, false, profile.tutorCharacters?.[sid]);
      const data = await apiSummary(sys, chatMsgs);
      setMemory(prev => addSessionToMem(prev, sid, data));
      if (profile) sbSave(profile.name, sid, data.date, JSON.stringify(data));
    } catch {} finally { setAutoSumming(false); }
  }

  // Sync quiz results into tutor chat so the tutor can see student progress
  function handleQuizComplete({ questions, answers, subjectId, quizType }) {
    const score = answers.filter(a => a.correct).length;
    const total = questions.length;
    const pct = total ? Math.round(score / total * 100) : 0;
    const subLabel = SUBJECTS[subjectId]?.label || subjectId;
    const wrong = [];
    const right = [];
    questions.forEach((q, i) => {
      const a = answers[i];
      const qText = q.q || "Match terms to definitions";
      if (a?.correct) {
        right.push(qText);
      } else {
        let correctAns = "";
        if (q.type === "mc" || (!q.type && q.options)) {
          const myAns = q.options?.[a?.chosen] || "?";
          correctAns = `I put "${myAns}" but the answer was "${q.options?.[q.correct] || "?"}"`;
        } else if (q.type === "tf") {
          correctAns = `I said ${a?.chosen ? "True" : "False"} but it was ${q.correct ? "True" : "False"}`;
        } else if (q.type === "short" || q.type === "fill") {
          correctAns = `I wrote "${a?.typed || "?"}" but the answer was "${q.answer}"`;
        } else if (q.type === "match") {
          correctAns = `I only matched ${a?.matchScore || 0} out of ${q.pairs?.length || 0} correctly`;
        }
        wrong.push(`- ${qText} — ${correctAns}`);
      }
    });

    let summary = `Hey! I just did a ${subLabel} quiz and got ${score}/${total} (${pct}%).`;
    if (right.length > 0) {
      summary += `\n\nI got these right:\n${right.map(q => `- ${q}`).join("\n")}`;
    }
    if (wrong.length > 0) {
      summary += `\n\nI got these wrong:\n${wrong.join("\n")}`;
    }
    if (wrong.length === 0) {
      summary += "\n\nI got everything right!";
    }
    summary += "\n\nCan you quickly go over the questions I got wrong and then we can continue what we were doing before?";

    // Inject into the matching subject's chat session
    const targetId = subjectId;
    setSessions(prev => {
      const existing = prev[targetId]?.messages || [];
      // If session doesn't exist yet, initialise with a welcome message first
      const base = existing.length > 0 ? existing : (() => {
        const sub = SUBJECTS[targetId];
        const board = profile?.examBoards?.[targetId];
        const memCount = getSessions(memory, targetId).length;
        return sub ? [{ role: "assistant", content: sub.welcomeMessage(profile, board, memCount) }] : [];
      })();
      return { ...prev, [targetId]: { ...prev[targetId], messages: [...base, { role: "user", content: summary }] } };
    });

    // If this subject is currently active, auto-trigger a tutor response to the quiz summary
    if (active === targetId) {
      setTimeout(async () => {
        const cur = sessionsRef.current[targetId]?.messages || [];
        if (!cur.length) return;
        setLoading(true);
        const sys = buildSystemPrompt(targetId, profile, getSessions(memory, targetId), mats[targetId] || [], examMode, profile.tutorCharacters?.[targetId]);
        const textMats = (mats[targetId] || []).filter(m => m.isText);
        const fullSys = (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys;
        const apiMsgs = buildApiMsgs(mats[targetId] || [], cur.map(m => ({ role: m.role, content: m.content })));
        try {
          const reply = await apiSend(fullSys, apiMsgs);
          setSessions(prev => ({ ...prev, [targetId]: { ...prev[targetId], messages: [...(prev[targetId]?.messages || []), { role: "assistant", content: reply }] } }));
        } catch (e) {
          setSessions(prev => ({ ...prev, [targetId]: { ...prev[targetId], messages: [...(prev[targetId]?.messages || []), { role: "assistant", content: "\u274c " + e.message }] } }));
        } finally { setLoading(false); }
      }, 300);
    }
  }

  const basePrompts = active && SUBJECTS[active] ? SUBJECTS[active].quickPrompts(examMode, curMats.length > 0) : [];
  const langGreetings = { spanish: "Habl\u00e9mos en espa\u00f1ol", french: "Parlons en fran\u00e7ais", german: "Lass uns Deutsch sprechen" };
  const langPractice = { spanish: "\u00bfPodemos practicar conversaci\u00f3n?", french: "On peut pratiquer la conversation?", german: "K\u00f6nnen wir \u00fcben?" };
  const greet = langGreetings[active] || "Let's practise speaking";
  const prac = langPractice[active] || "Can we practise conversation?";
  const continuePrompt = curMem.length > 0 ? ["Pick up where we left off last session"] : [];
  const quickPrompts = convoMode ? [greet, prac, "Correct my pronunciation"] : voiceMode ? [greet, "Correct my pronunciation", ...basePrompts] : [...continuePrompt, ...basePrompts];

  if (!profile) return <Setup onDone={updateProfile} />;

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: active && subject ? subject.bg : "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif", transition: "background .4s" }}>
        <style>{GLOBAL_CSS}</style>
        {storageFull && <div style={{ background: "#d32f2f", color: "#fff", padding: "8px 16px", textAlign: "center", fontSize: 13, fontWeight: 600 }}>Your device storage is full — progress may not be saved. Try clearing old sessions in Memory Manager. <button onClick={() => setStorageFull(false)} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", borderRadius: 4, marginLeft: 8, cursor: "pointer", fontSize: 12, padding: "2px 8px" }}>Dismiss</button></div>}

        {/* Modals — only one at a time */}
        {modal === "mats" && active && <MaterialsPanel subject={subject} mats={curMats} onAdd={f => setMats(prev => ({ ...prev, [active]: [...prev[active], ...f] }))} onRemove={id => setMats(prev => ({ ...prev, [active]: prev[active].filter(m => m.id !== id) }))} onClose={() => setModal(null)} />}
        {modal === "memory" && <MemoryManager memory={memory} profile={profile} onClearSubject={sid => setMemory(prev => clearSubjectMem(prev, sid))} onClearAll={() => setMemory(clearAllMem())} onClose={() => setModal(null)} onImport={(p, m) => { saveProfile(p); setProfile(p); setMemory(m); setModal(null); }} />}
        {modal === "dash" && <Dashboard memory={memory} mats={mats} profile={profile} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsModal profile={profile} onSave={updateProfile} onClose={() => setModal(null)} />}
        {showSum && subject && <SummaryModal subject={subject} sessionData={showSum} onClose={() => setShowSum(null)} />}
        {quizSubject && <QuickQuiz subject={quizSubject} profile={profile} memory={memory} topicData={topicData} onClose={() => setQuizSubject(null)} onXP={gainXP} onQuizComplete={handleQuizComplete} />}
        {topicsFor && <TopicsPanel subject={topicsFor} profile={profile} topicData={topicData} onStudy={topic => studyTopic(topicsFor, topic)} onClose={() => setTopicsFor(null)} />}
        {buildQuizFor && <QuizBuilder subject={buildQuizFor} profile={profile} onClose={() => setBuildQuizFor(null)} onXP={gainXP} onQuizComplete={handleQuizComplete} />}

        {/* Header */}
        <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100 }}>
          {active && <button onClick={() => setActive(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#666", padding: "4px 8px", borderRadius: 8 }} aria-label="Back">{"\u2190"}</button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>{profile.name} {"\u00b7"} {profile.year} {"\u00b7"} {profile.tier}{autoSumming ? " \u00b7 saving memory..." : ""}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>{active ? subject.emoji + " " + subject.tutor.name : "Your Tutor Hub by Korona Lab \u00ae"}</div>
          </div>
          {active && (
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setModal("mats")} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: curMats.length ? subject.color : "rgba(0,0,0,0.07)", color: curMats.length ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcce"} {curMats.length ? curMats.length + " File" + (curMats.length > 1 ? "s" : "") : "Materials"}</button>
              <button className="btn" onClick={() => setExamMode(e => !e)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: examMode ? subject.color : "rgba(0,0,0,0.07)", color: examMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcdd"} {examMode ? "Exam ON" : "Exam"}</button>
              <button className="btn" onClick={() => setBuildQuizFor(subject)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.07)", color: "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udee0\ufe0f"} Quiz</button>
              {voiceCfg && <button className="btn" onClick={() => { setVoiceMode(v => { if (v) { stopSpeaking(); setConvoMode(false); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: voiceMode ? "#dc2626" : "rgba(0,0,0,0.07)", color: voiceMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{voiceMode ? "\ud83d\udd0a Voice ON" : "\ud83c\udf99\ufe0f Voice"}</button>}
              {voiceMode && voiceCfg && micSupported && <button className="btn" onClick={() => { setConvoMode(v => { if (!v) { stopSpeaking(); setTimeout(() => startMicRef.current(), 200); } else { stopMic(); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: convoMode ? "#059669" : "rgba(0,0,0,0.07)", color: convoMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700, animation: convoMode ? "mp 2s ease infinite" : "none" }}>{convoMode ? "\ud83d\udd04 Conversation" : "\ud83d\udde3\ufe0f Converse"}</button>}
              <button className="btn" onClick={genSummary} disabled={sumLoading || msgs.length < 3} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: msgs.length >= 3 ? subject.color : "rgba(0,0,0,0.07)", color: msgs.length >= 3 ? "#fff" : "#aaa", fontSize: 11, fontWeight: 700, opacity: sumLoading ? .6 : 1 }}>{sumLoading ? "Saving..." : "\ud83d\udccb Summary"}</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 5 }}>
            {dbConnected && <div style={{ padding: "6px 10px", borderRadius: 20, background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>{"\u2601\ufe0f"} Synced</div>}
            <button className="btn" onClick={() => setModal("settings")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\u2699\ufe0f"}</button>
            <button className="btn" onClick={() => setModal("memory")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83e\udde0"}{totalMem > 0 ? " " + totalMem : ""}</button>
            <button className="btn" onClick={() => setModal("dash")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc68\u200d\ud83d\udc67"}</button>
            <button className="btn" onClick={switchUser} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc64"}</button>
          </div>
        </div>

        {/* Home or Chat */}
        {!active ? (
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px" }}>
            {/* Streak & XP Bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{streak > 0 ? "\ud83d\udd25" : "\u2744\ufe0f"}</span>
                  <div><div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>day streak</div></div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>{week.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ width: "100%", height: 6, borderRadius: 3, background: d.active ? "#22c55e" : "#eee", marginBottom: 2 }} /><div style={{ fontSize: 8, color: "#bbb" }}>{d.day}</div></div>)}</div>
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{LEVEL_EMOJIS[lv.level] || "\ud83c\udfc6"}</span>
                  <div><div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Level {lv.level}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{lv.title}</div></div>
                  <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: "#f0c040" }}>{xpData.total}</div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#eee" }}><div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#f0c040,#f59e0b)", width: Math.min(100, lv.current / lv.next * 100) + "%", transition: "width .5s" }} /></div>
                <div style={{ fontSize: 9, color: "#bbb", marginTop: 3 }}>{lv.current}/{lv.next} XP to Level {lv.level + 1}</div>
              </div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 6 }}>Hello, {profile.name}.</h1>
            <p style={{ color: "#999", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>{totalMem > 0 ? "\ud83e\udde0 " + totalMem + " session" + (totalMem > 1 ? "s" : "") + " in memory." : "Your tutors adapt and remember your progress."}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {mySubjects(profile).map((t, i) => {
                const sc = getSessions(memory, t.id).length, mc = (mats[t.id] || []).length, bd = profile.examBoards?.[t.id];
                const conf = getConfidence(memory, t.id);
                const avg = avgConfidence(conf);
                const confTopics = Object.entries(conf).slice(0, 4);
                const tpct = topicPct(topicData, t.id);
                const tTotal = (SUBJECT_TOPICS[t.id] || []).length;
                const tDone = Object.values(getTopicProgress(topicData, t.id)).filter(v => v.studied > 0).length;
                return (
                  <div key={t.id} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", animation: `ci .4s ease ${i * .06}s both` }}>
                    <div className="card" onClick={() => setActive(t.id)} style={{ background: t.gradient, padding: "18px 16px 14px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>{t.emoji}</div>
                        {avg >= 0 && <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#fff" }}>{avg}%</div>}
                      </div>
                      <div style={{ fontFamily: "'Playfair Display',serif", color: "#fff", fontSize: 16, fontWeight: 700 }}>{t.tutor.name}</div>
                      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>{t.label}{bd ? " \u00b7 " + bd : ""}</div>
                    </div>
                    <div style={{ background: "#fff", padding: "10px 16px" }}>
                      {tTotal > 0 && <div style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginBottom: 2 }}><span>{tDone}/{tTotal} topics</span><span>{tpct}%</span></div><div style={{ height: 4, borderRadius: 2, background: "#eee" }}><div style={{ height: "100%", borderRadius: 2, background: t.color, width: tpct + "%", transition: "width .5s" }} /></div></div>}
                      {confTopics.length > 0 && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>{confTopics.map(([topic, pct]) => <div key={topic} style={{ height: 4, flex: 1, minWidth: 14, borderRadius: 2, background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444" }} title={topic + ": " + pct + "%"} />)}</div>}
                      <div style={{ fontSize: 11, color: t.color, fontWeight: 700, marginBottom: 4 }}>{sc === 0 ? "No sessions yet" : "\ud83e\udde0 " + sc + " session" + (sc > 1 ? "s" : "")}</div>
                      {mc > 0 && <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{"\ud83d\udcce"} {mc} material{mc > 1 ? "s" : ""}</div>}
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button onClick={e => { e.stopPropagation(); setTopicsFor(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: "transparent", color: t.color, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\ud83d\udcdd"} Topics</button>
                        <button onClick={e => { e.stopPropagation(); setQuizSubject(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: "transparent", color: t.color, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\u26a1"} Quick</button>
                        <button onClick={e => { e.stopPropagation(); setBuildQuizFor(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: t.color, color: "#fff", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\ud83d\udee0\ufe0f"} Build</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #eee" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", marginBottom: 10 }}>{"\ud83d\udca1"} Tips</div>
              {[["Quick Quiz", "Tap \u26a1 for 10 instant questions on your weak topics."], ["Quiz Builder", "Tap \ud83d\udee0\ufe0f to customise question types and upload materials."], ["Earn XP", "+5 per message, +25 per summary, +20 per correct answer."], ["Keep your streak", "Open the app daily to build your streak!"]].map(([t, d]) => <div key={t} style={{ display: "flex", gap: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 12, minWidth: 120 }}>{t}</div><div style={{ color: "#888", fontSize: 12 }}>{d}</div></div>)}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 61px)" }}>
            {examMode && <div style={{ background: subject.color, color: "#fff", textAlign: "center", padding: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{"\ud83d\udcdd"} EXAM PRACTICE {"\u2014"} Attempt the question first. Tutor will mark it properly.</div>}
            {convoMode && <div style={{ background: "#059669", color: "#fff", textAlign: "center", padding: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{"\ud83d\udde3\ufe0f"} CONVERSATION MODE {"\u2014"} Speak naturally. {subject.tutor.name} will listen, respond, and keep the conversation going.</div>}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                {msgs.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10, animation: "mi .25s ease" }}>
                    <div style={{ maxWidth: "78%", position: "relative" }}>
                      <div style={{ padding: "11px 15px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? subject.color : "#fff", color: m.role === "user" ? "#fff" : "#1a1a2e", fontSize: 14, lineHeight: 1.65, boxShadow: m.role === "user" ? `0 4px 14px ${subject.color}40` : "0 2px 10px rgba(0,0,0,0.07)", border: m.role === "user" ? "none" : "1px solid rgba(0,0,0,0.07)", whiteSpace: "pre-wrap" }}>{m.role === "assistant" ? renderMd(m.content) : m.content}</div>
                      {voiceCfg && m.role === "assistant" && !m.content.startsWith("\u274c") && (
                        <button onClick={() => { if (speaking) stopSpeaking(); else { setSpeaking(true); speakText(m.content, voiceCfg, () => setSpeaking(false)); } }}
                          style={{ position: "absolute", bottom: -4, right: -4, width: 26, height: 26, borderRadius: "50%", border: "1px solid #eee", background: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
                          title="Listen to this message">{"\ud83d\udd0a"}</button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && <div style={{ display: "flex" }}><div style={{ background: "#fff", borderRadius: 18, padding: "10px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}><div style={{ display: "flex", gap: 5 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: subject.color, animation: `db 1.2s ease ${i * .2}s infinite` }} />)}</div></div></div>}
                <div ref={bottomRef} />
              </div>
            </div>
            <div style={{ padding: "0 22px 5px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {quickPrompts.filter((v, i, a) => a.indexOf(v) === i).map(q => <button key={q} onClick={() => send(q)} style={{ padding: "5px 11px", borderRadius: 20, border: "1.5px solid " + subject.color, background: "transparent", color: subject.color, cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", transition: "all .15s" }}>{q}</button>)}
              </div>
            </div>
            <div style={{ padding: "5px 22px 16px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
              {(listening || transcribing) && <div style={{ maxWidth: 680, margin: "0 auto 6px", padding: "8px 14px", borderRadius: 10, background: transcribing ? "#eff6ff" : "#fef2f2", border: "1px solid " + (transcribing ? "#bfdbfe" : "#fecaca"), fontSize: 12, color: transcribing ? "#1d4ed8" : "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: transcribing ? "#1d4ed8" : "#dc2626", animation: "mp 1.2s ease infinite" }} />{transcribing ? "Transcribing your speech..." : "Recording... tap \ud83c\udf99\ufe0f again when done"}</div>}
              <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={listening ? "Recording..." : transcribing ? "Transcribing..." : examMode ? "Paste your question or attempt here..." : voiceCfg ? "Type or tap \ud83c\udf99\ufe0f to speak..." : "Message " + subject.tutor.name + "..."} rows={1}
                  style={{ flex: 1, padding: "12px 15px", borderRadius: 14, border: `2px solid ${listening ? "#dc2626" : transcribing ? "#1d4ed8" : input ? subject.color : "#e0e0e0"}`, resize: "none", fontSize: 14, lineHeight: 1.5, background: "#fff", maxHeight: 120, overflow: "auto", transition: "border-color .2s", outline: "none" }}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
                {voiceCfg && micSupported && (
                  <button onClick={() => { if (listening) stopMic(); else if (!transcribing) { stopSpeaking(); startMic(); } }} disabled={transcribing}
                    style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: listening ? "#dc2626" : transcribing ? "#93c5fd" : "#fef2f2", color: listening ? "#fff" : transcribing ? "#fff" : "#dc2626", fontSize: 18, cursor: transcribing ? "default" : "pointer", transition: "all .2s", animation: listening ? "mp 1.2s ease infinite" : "none", opacity: transcribing ? 0.6 : 1 }}
                    title={listening ? "Stop recording" : transcribing ? "Transcribing..." : "Speak"}>{listening ? "\u23f9" : "\ud83c\udf99\ufe0f"}</button>
                )}
                <button onClick={() => send()} disabled={!input.trim() || loading}
                  style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: input.trim() && !loading ? subject.color : "#e8e8e8", color: input.trim() && !loading ? "#fff" : "#bbb", fontSize: 17, cursor: input.trim() && !loading ? "pointer" : "default", transition: "all .2s" }}>{"\u2191"}</button>
              </div>
              <div style={{ maxWidth: 680, margin: "4px auto 0", fontSize: 10, color: "#bbb", paddingLeft: 2 }}>Enter to send {"\u00b7"} Shift+Enter new line{voiceCfg && micSupported ? " \u00b7 \ud83c\udf99\ufe0f Tap mic to speak" : ""}</div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
