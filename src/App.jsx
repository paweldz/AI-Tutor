import { useState, useRef, useEffect, useCallback } from "react";

import { SUBJECTS, emptyMats } from "./config/subjects.js";
import { readJSON, setActiveStudent, migrateIfNeeded, loadProfile, saveProfile, loadMemory, saveMemory, getSessions, addSessionToMem, clearSubjectMem, clearAllMem } from "./utils/storage.js";
import { loadXP, saveXP, addXP, loadStreaks, saveStreaks, recordActivity } from "./utils/xp.js";
import { loadTopicProgress, saveTopicProgress, recordTopicStudy } from "./utils/topics.js";
import { sbSave, sbLoad, mergeMemory, sbSaveSetting, sbLoadSettings } from "./utils/cloudSync.js";
import { apiSend, apiSummary, buildSystemPrompt, buildApiMsgs } from "./utils/api.js";
import { speakText, stopSpeaking } from "./utils/speech.js";
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
import { HomeScreen } from "./components/HomeScreen.jsx";
import { ChatView } from "./components/ChatView.jsx";
import { Header } from "./components/Header.jsx";


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
