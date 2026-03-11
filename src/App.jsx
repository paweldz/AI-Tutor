import { useState, useRef, useEffect } from "react";
import "./global.css";

import { SUBJECTS, emptyMats } from "./config/subjects.js";
import { readJSON, setActiveStudent, migrateIfNeeded, loadProfile, loadMemory, getSessions, clearSubjectMem, clearAllMem } from "./utils/storage.js";
import { loadXP, addXP, loadStreaks, recordActivity } from "./utils/xp.js";
import { loadTopicProgress } from "./utils/topics.js";
import { buildQuizSummary, injectQuizIntoChat } from "./utils/quizSync.js";
import { getQuickPrompts } from "./utils/quickPrompts.js";

import { useVoice } from "./hooks/useVoice.js";
import { usePersistence } from "./hooks/usePersistence.js";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { useChat } from "./hooks/useChat.js";
import { useSessionManager } from "./hooks/useSessionManager.js";

import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { Setup } from "./components/Setup.jsx";
import { HomeScreen } from "./components/HomeScreen.jsx";
import { ChatView } from "./components/ChatView.jsx";
import { Header } from "./components/Header.jsx";
import { StorageFullBanner, ModalLayer } from "./components/ModalLayer.jsx";

migrateIfNeeded();
{ const p = readJSON("gcse_profile_v2"); if (p?.name) setActiveStudent(p.name); }

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [memory, setMemory] = useState(loadMemory);
  const [sessions, setSessions] = useState({});
  const [mats, setMats] = useState(emptyMats);
  const [active, setActiveRaw] = useState(null);
  const [modal, setModal] = useState(null);
  const [showSum, setShowSum] = useState(null);
  const [examMode, setExamMode] = useState(false);
  const [input, setInput] = useState("");
  const [xpData, setXpData] = useState(loadXP);
  const [streakData, setStreakData] = useState(loadStreaks);
  const [topicData, setTopicData] = useState(loadTopicProgress);
  const [quizSubject, setQuizSubject] = useState(null);
  const [topicsFor, setTopicsFor] = useState(null);
  const [buildQuizFor, setBuildQuizFor] = useState(null);
  const [storageFull, setStorageFull] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sendRef = useRef(null);

  const subject = active ? SUBJECTS[active] : null;
  const msgs = active ? (sessions[active]?.messages || []) : [];
  const curMats = active ? (mats[active] || []) : [];
  const curMem = active ? getSessions(memory, active) : [];
  const totalMem = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  const voiceCfg = subject?.voice?.enabled ? subject.voice : null;

  function gainXP(amount, reason) {
    setXpData(prev => addXP(prev, amount, reason));
    setStreakData(prev => recordActivity(prev));
  }

  const { dbConnected, resetSync } = useCloudSync({ profile, setProfile, setMemory, setTopicData });

  const {
    voiceMode, setVoiceMode, convoMode, setConvoMode,
    speaking, setSpeaking, listening, transcribing,
    startMic, stopMic, micSupported, startMicRef,
  } = useVoice({ voiceCfg, msgs, active, sendRef, setInput });

  usePersistence({ memory, xpData, streakData, topicData, profile, setStreakData, setStorageFull });

  const { send, genSummary, autoSave, loading, sumLoading, autoSumming, sessionsRef } = useChat({
    active, profile, memory, sessions, setSessions, mats,
    examMode, voiceMode, convoMode,
    input, setInput, setMemory, setTopicData, gainXP,
  });
  useEffect(() => { sendRef.current = send; });

  const { setActive, updateProfile, switchUser, studyTopic } = useSessionManager({
    active, sessions, msgs, curMats, profile, memory, autoSumming,
    setActiveRaw, setSessions, setMats, setExamMode, setProfile, setMemory,
    setXpData, setStreakData, setTopicData, setModal, resetSync, autoSave, sendRef,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, loading]);
  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);

  async function handleGenSummary() {
    const data = await genSummary();
    if (data) setShowSum(data);
  }

  function handleQuizComplete(result) {
    const summary = buildQuizSummary(result);
    injectQuizIntoChat({
      subjectId: result.subjectId, summary, profile, memory,
      active, sessionsRef, mats, examMode,
      setSessions, setLoading: () => {},
    });
  }

  const quickPrompts = getQuickPrompts({ active, examMode, curMats, curMem, voiceMode, convoMode });

  if (!profile) return <Setup onDone={updateProfile} />;

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: active && subject ? subject.bg : "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif", transition: "background .4s" }}>
        {storageFull && <StorageFullBanner onDismiss={() => setStorageFull(false)} />}

        <ModalLayer
          modal={modal} setModal={setModal} active={active} subject={subject}
          showSum={showSum} setShowSum={setShowSum}
          quizSubject={quizSubject} setQuizSubject={setQuizSubject}
          topicsFor={topicsFor} setTopicsFor={setTopicsFor}
          buildQuizFor={buildQuizFor} setBuildQuizFor={setBuildQuizFor}
          memory={memory} setMemory={setMemory} profile={profile} setProfile={setProfile}
          topicData={topicData} mats={mats} setMats={setMats} curMats={curMats}
          updateProfile={updateProfile} studyTopic={studyTopic}
          gainXP={gainXP} onQuizComplete={handleQuizComplete}
          clearSubjectMem={clearSubjectMem} clearAllMem={clearAllMem}
        />

        <Header
          profile={profile} active={active} subject={subject} curMats={curMats}
          examMode={examMode} voiceMode={voiceMode} convoMode={convoMode}
          msgs={msgs} sumLoading={sumLoading} autoSumming={autoSumming}
          dbConnected={dbConnected} totalMem={totalMem} voiceCfg={voiceCfg} micSupported={micSupported}
          setModal={setModal} setExamMode={setExamMode} setBuildQuizFor={setBuildQuizFor}
          setVoiceMode={setVoiceMode} setConvoMode={setConvoMode}
          genSummary={handleGenSummary} setActive={setActive} switchUser={switchUser}
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
