import { useState, useRef, useEffect } from "react";
import "./global.css";

/* Utilities */
import { SUBJECTS, emptyMats } from "./config/subjects.js";
import { readJSON, setActiveStudent, migrateIfNeeded, loadProfile, saveProfile, loadMemory, saveMemory, getSessions, addSessionToMem, clearSubjectMem, clearAllMem } from "./utils/storage.js";
import { loadXP, addXP, loadStreaks, recordActivity } from "./utils/xp.js";
import { loadTopicProgress, recordTopicStudy } from "./utils/topics.js";
import { sbSave, sbSaveSetting } from "./utils/cloudSync.js";
import { apiSend, apiSummary, buildSystemPrompt, buildApiMsgs } from "./utils/api.js";
import { stopSpeaking } from "./utils/speech.js";
import { buildQuizSummary, injectQuizIntoChat } from "./utils/quizSync.js";
import { getQuickPrompts } from "./utils/quickPrompts.js";

/* Hooks */
import { useVoice } from "./hooks/useVoice.js";
import { usePersistence } from "./hooks/usePersistence.js";
import { useCloudSync } from "./hooks/useCloudSync.js";

/* Components */
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { Setup } from "./components/Setup.jsx";
import { MaterialsPanel } from "./components/MaterialsPanel.jsx";
import { MemoryManager } from "./components/MemoryManager.jsx";
import { SummaryModal } from "./components/SummaryModal.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { SettingsModal } from "./components/SettingsModal.jsx";
import { TopicsPanel } from "./components/TopicsPanel.jsx";
import { QuickQuiz, QuizBuilder } from "./components/QuizComponents.jsx";
import { HomeScreen } from "./components/HomeScreen.jsx";
import { ChatView } from "./components/ChatView.jsx";
import { Header } from "./components/Header.jsx";


migrateIfNeeded();
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
  // Cloud sync — one-time merge on login
  const { dbConnected, resetSync } = useCloudSync({ profile, setProfile, setMemory, setTopicData });
  const [xpData, setXpData] = useState(loadXP);
  const [streakData, setStreakData] = useState(loadStreaks);
  const [quizSubject, setQuizSubject] = useState(null);
  const [topicData, setTopicData] = useState(loadTopicProgress);
  const [topicsFor, setTopicsFor] = useState(null);
  const [buildQuizFor, setBuildQuizFor] = useState(null); // subject for quiz builder
  const [storageFull, setStorageFull] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const subject = active ? SUBJECTS[active] : null;
  const sess = active ? (sessions[active] || {}) : {};
  const msgs = sess.messages || [];
  const curMats = active ? (mats[active] || []) : [];
  const curMem = active ? getSessions(memory, active) : [];
  const totalMem = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  const voiceCfg = subject?.voice?.enabled ? subject.voice : null;

  // Voice — all voice state, TTS, STT, and effects in one hook
  const sendRef = useRef(null);
  const {
    voiceMode, setVoiceMode, convoMode, setConvoMode,
    speaking, setSpeaking, listening, transcribing,
    startMic, stopMic, micSupported, startMicRef,
  } = useVoice({ voiceCfg, msgs, active, sendRef, setInput });

  // Auto-save all state to localStorage + detect storage-full
  usePersistence({ memory, xpData, streakData, topicData, profile, setStreakData, setStorageFull });

  function gainXP(amount, reason) {
    setXpData(prev => addXP(prev, amount, reason));
    setStreakData(prev => recordActivity(prev));
  }

  // Start a focused session on a specific topic
  function studyTopic(sub, topic) {
    setTopicsFor(null);
    setActive(sub.id);
    setTopicData(prev => recordTopicStudy(prev, sub.id, topic));
    setTimeout(() => {
      if (sendRef.current) sendRef.current("I'd like to study: " + topic);
    }, 800);
  }

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
    resetSync();
    setActiveStudent("");
    setProfile(null);
    saveProfile(null);
    // Reset per-student data to empty (will reload on next login)
    setMemory({ version: 2, subjects: {} });
    setXpData({ total: 0, history: [] });
    setStreakData({ dates: [] });
    setTopicData({});
  }

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

  // Sync quiz results into tutor chat
  function handleQuizComplete(result) {
    const summary = buildQuizSummary(result);
    injectQuizIntoChat({
      subjectId: result.subjectId, summary, profile, memory,
      active, sessionsRef, mats, examMode,
      setSessions, setLoading,
    });
  }

  const quickPrompts = getQuickPrompts({ active, examMode, curMats, curMem, voiceMode, convoMode });

  if (!profile) return <Setup onDone={updateProfile} />;

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: active && subject ? subject.bg : "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif", transition: "background .4s" }}>
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

        <Header
          profile={profile} active={active} subject={subject} curMats={curMats}
          examMode={examMode} voiceMode={voiceMode} convoMode={convoMode}
          msgs={msgs} sumLoading={sumLoading} autoSumming={autoSumming}
          dbConnected={dbConnected} totalMem={totalMem} voiceCfg={voiceCfg} micSupported={micSupported}
          setModal={setModal} setExamMode={setExamMode} setBuildQuizFor={setBuildQuizFor}
          setVoiceMode={setVoiceMode} setConvoMode={setConvoMode}
          genSummary={genSummary} setActive={setActive} switchUser={switchUser}
          startMicRef={startMicRef} stopMic={stopMic}
        />

        {!active ? (
          <HomeScreen
            profile={profile} memory={memory} mats={mats} xpData={xpData}
            streakData={streakData} topicData={topicData} totalMem={totalMem}
            onSelectSubject={id => setActive(id)} onQuickQuiz={setQuizSubject}
            onTopics={setTopicsFor} onBuildQuiz={setBuildQuizFor}
          />
        ) : (
          <ChatView
            subject={subject} msgs={msgs} loading={loading} input={input} setInput={setInput}
            onSend={send} examMode={examMode} voiceMode={voiceMode} convoMode={convoMode}
            speaking={speaking} setSpeaking={setSpeaking} listening={listening}
            transcribing={transcribing} quickPrompts={quickPrompts} voiceCfg={voiceCfg}
            micSupported={micSupported} startMic={startMic} stopMic={stopMic}
            bottomRef={bottomRef} inputRef={inputRef}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
