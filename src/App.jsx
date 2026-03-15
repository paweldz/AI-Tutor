import { useState, useRef, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./global.css";

import { SUBJECTS, emptyMats } from "./config/subjects.js";
import { getSessions, deleteSessionFromMem, clearSubjectMem, clearAllMem } from "./utils/storage.js";
import { addXP, recordActivity } from "./utils/xp.js";
import { buildQuizSummary, injectQuizIntoChat } from "./utils/quizSync.js";
import { saveQuizResult } from "./utils/analyticsSync.js";
import { sbDeleteSession } from "./utils/cloudSync.js";
import { getQuickPrompts } from "./utils/quickPrompts.js";
import { updateEvent, deleteEvent, completeEvent, eventToMemoryEntry } from "./utils/events.js";

import { useAuth } from "./hooks/useAuth.js";
import { useVoice } from "./hooks/useVoice.js";
import { usePersistence } from "./hooks/usePersistence.js";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { useChat } from "./hooks/useChat.js";
import { useSessionManager } from "./hooks/useSessionManager.js";

import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { Setup } from "./components/Setup.jsx";
import { HomeScreen } from "./components/HomeScreen.jsx";
import { ChatView } from "./components/ChatView.jsx";
import { Header } from "./components/Header.jsx";
import { ModalLayer } from "./components/ModalLayer.jsx";
import { Calculator } from "./components/Calculator.jsx";
import { ExamSetup } from "./components/ExamSetup.jsx";
import { MarkPaperSetup } from "./components/MarkPaperSetup.jsx";
import { EventModal } from "./components/EventModal.jsx";
import { EventComplete } from "./components/EventComplete.jsx";
import { DashboardPage } from "./components/DashboardPage.jsx";
import { ParentHome } from "./components/ParentHome.jsx";
import { ParentChildView } from "./components/ParentChildView.jsx";
import { LinkChildModal } from "./components/LinkChildModal.jsx";
import { ChildLinkBanner } from "./components/ChildLinkBanner.jsx";

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut, resetPassword, authEnabled } = useAuth();
  const [profile, setProfile] = useState(null);
  const [memory, setMemory] = useState({ version: 2, subjects: {} });
  const [sessions, setSessions] = useState({});
  const [mats, setMats] = useState(emptyMats);
  const [active, setActiveRaw] = useState(null);
  const [modal, setModal] = useState(null);
  const [showSum, setShowSum] = useState(null);
  const [examSession, setExamSession] = useState(null);
  const [showExamSetup, setShowExamSetup] = useState(false);
  const [input, setInput] = useState("");
  const [xpData, setXpData] = useState({ total: 0, history: [] });
  const [streakData, setStreakData] = useState({ dates: [] });
  const [topicData, setTopicData] = useState({});
  const [customTopics, setCustomTopics] = useState({});
  const [teacherNotes, setTeacherNotes] = useState({});
  const [studentNotes, setStudentNotes] = useState({});
  const [quizSubject, setQuizSubject] = useState(null);
  const [topicsFor, setTopicsFor] = useState(null);
  const [buildQuizFor, setBuildQuizFor] = useState(null);
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null); // null | "new" | event object
  const [completingEvent, setCompletingEvent] = useState(null);
  const [viewingChild, setViewingChild] = useState(null);
  const [showLinkChild, setShowLinkChild] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showMarkPaper, setShowMarkPaper] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sendRef = useRef(null);

  const subject = active ? SUBJECTS[active] : null;
  const msgs = active ? (sessions[active]?.messages || []) : [];
  const curMats = active ? (mats[active] || []) : [];
  const curMem = active ? getSessions(memory, active) : [];
  const totalMem = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  const voiceCfg = subject?.voice?.enabled ? subject.voice : null;
  const examMode = !!examSession;

  function gainXP(amount, reason) {
    setXpData(prev => addXP(prev, amount, reason));
    setStreakData(prev => recordActivity(prev));
  }

  function handleSaveCustomTopics(subjectId, topics) {
    setCustomTopics(prev => {
      const updated = { ...prev };
      if (topics) {
        updated[subjectId] = topics;
      } else {
        delete updated[subjectId];
      }
      return updated;
    });
  }

  function handleSaveTeacherNotes(subjectId, notes) {
    setTeacherNotes(prev => ({ ...prev, [subjectId]: notes }));
  }

  function handleSaveStudentNotes(subjectId, notes) {
    setStudentNotes(prev => ({ ...prev, [subjectId]: notes }));
  }

  const { dbConnected, syncing, resetSync } = useCloudSync({ user, profile, setProfile, setMemory, setTopicData, setCustomTopics, setXpData, setStreakData, setTeacherNotes, setStudentNotes, setEvents });

  const {
    voiceMode, setVoiceMode, convoMode, setConvoMode,
    speaking, setSpeaking, listening, transcribing,
    startMic, stopMic, micSupported, startMicRef,
  } = useVoice({ voiceCfg, msgs, active, sendRef, setInput });

  const { cancelPendingSaves } = usePersistence({ memory, xpData, streakData, topicData, customTopics, teacherNotes, studentNotes, events, profile, setStreakData });

  const { send, genSummary, autoSave, loading, sumLoading, autoSumming, sessionsRef, resetMetrics, getSessionMetrics } = useChat({
    active, profile, memory, sessions, setSessions, mats,
    examSession, voiceMode, convoMode, teacherNotes, studentNotes, events,
    input, setInput, setMemory, setTopicData, gainXP, topicData, customTopics,
  });
  useEffect(() => { sendRef.current = send; });

  const { setActive, updateProfile, switchUser, studyTopic } = useSessionManager({
    active, sessions, msgs, curMats, profile, memory, autoSumming,
    xpData, streakData, topicData, customTopics,
    setActiveRaw, setSessions, setMats, setExamSession, setProfile, setMemory,
    setXpData, setStreakData, setTopicData, setCustomTopics, setModal, resetSync, cancelPendingSaves, autoSave, sendRef, signOut,
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
    saveQuizResult(result.subjectId, result.quizType, result.questions, result.answers);
  }

  function handleSessionAction(type, data) {
    if (!active || !sendRef.current) return;
    setTimeout(() => {
      if (type === "continue") {
        sendRef.current("I'd like to continue studying: " + data);
      } else if (type === "strengthen") {
        sendRef.current("I'm struggling with " + data + ". Can you help me strengthen this topic with practice questions?");
      } else if (type === "quiz") {
        const topics = Array.isArray(data) ? data.join(", ") : data;
        sendRef.current("Quiz me on: " + topics);
      } else if (type === "continue_session") {
        const s = data;
        const topicList = (s.topics || []).join(", ");
        const weakList = Object.entries(s.confidenceScores || {}).filter(([, v]) => v < 60).map(([t]) => t).join(", ");
        let msg = "Let's pick up from my session on " + s.date + ".";
        if (topicList) msg += " We covered: " + topicList + ".";
        if (weakList) msg += " I was weakest on: " + weakList + ".";
        msg += " What should we focus on?";
        sendRef.current(msg);
      }
    }, 300);
  }

  async function handleDeleteSession(subjectId, idx, session) {
    setMemory(prev => deleteSessionFromMem(prev, subjectId, idx));
    const deleted = await sbDeleteSession(subjectId, session);
    if (!deleted) console.warn("[App] Cloud delete failed for session:", session.date, session.sessionId);
  }

  function handleStartExam(session) {
    setExamSession(session);
    setShowExamSetup(false);
    // If paper mode, inject the paper into the chat as an opening message
    if (session.mode === "paper" && session.paperMats.length > 0) {
      const fileNames = session.paperMats.map(m => m.name).join(", ");
      const desc = session.description ? ` (${session.description})` : "";
      const timeNote = session.timeLimit ? ` I have ${session.timeLimit} minutes.` : "";
      setTimeout(() => {
        if (sendRef.current) sendRef.current(`I've uploaded my past paper${desc}: ${fileNames}. Please extract all the questions and take me through them one at a time, marking my answer before moving to the next.${timeNote}`);
      }, 300);
    }
  }

  function handleEndExam() {
    if (!examSession) return;
    // Auto-save the exam session if substantial
    if (active && msgs.length >= 4) {
      autoSave(active, msgs, curMats);
    }
    setExamSession(null);
  }

  function handleStartMarkPaper(session) {
    setShowMarkPaper(false);
    // Inject uploaded files as subject materials so the API can see them
    const allFiles = [...session.paperMats, ...session.schemeMats];
    if (allFiles.length && active) {
      setMats(prev => ({ ...prev, [active]: [...(prev[active] || []), ...allFiles] }));
    }
    // Build the opening message
    const desc = session.description ? ` (${session.description})` : "";
    const paperNames = session.paperMats.map(m => m.name).join(", ");
    const hasScheme = session.schemeMats.length > 0;
    const schemeNames = session.schemeMats.map(m => m.name).join(", ");
    let msg = `I've uploaded my completed test${desc}: ${paperNames}. Please mark my answers carefully.`;
    if (hasScheme) {
      msg += ` I've also uploaded the official mark scheme: ${schemeNames}. Use it to mark accurately against the real criteria.`;
    } else {
      msg += " I don't have the mark scheme, so please use your knowledge of GCSE marking standards.";
    }
    msg += " Go through each question, tell me what marks I'd get and why, then give me a total score and overall feedback at the end.";
    setTimeout(() => {
      if (sendRef.current) sendRef.current(msg);
    }, 400);
  }

  // ── Event handlers ──
  function handleSaveEvent(ev) {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id);
      return idx >= 0 ? updateEvent(prev, ev.id, ev) : [...prev, ev];
    });
  }

  function handleDeleteEvent(id) {
    setEvents(prev => deleteEvent(prev, id));
  }

  function handleCompleteEvent(id, result) {
    setEvents(prev => completeEvent(prev, id, result));
    // Save completed event to tutor memory
    const ev = events.find(e => e.id === id);
    if (ev) {
      const completed = { ...ev, status: "completed", completedAt: new Date().toISOString(), ...result };
      const memEntry = eventToMemoryEntry(completed);
      setMemory(prev => {
        const subSessions = prev.subjects?.[ev.subjectId] || [];
        return { ...prev, subjects: { ...prev.subjects, [ev.subjectId]: [...subSessions, memEntry] } };
      });
    }
  }

  const quickPrompts = getQuickPrompts({ active, examMode, curMats, curMem, voiceMode, convoMode });

  // Auth gate: require login when Supabase is configured
  if (authEnabled && authLoading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading...</div>
    </div>
  );
  if (authEnabled && !user) return <AuthScreen onSignIn={signIn} onSignUp={signUp} onReset={resetPassword} />;

  // Wait for cloud sync to finish restoring profile before showing Setup
  if (syncing) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>{"\ud83e\udde0"}</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600 }}>Restoring your data...</div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 }}>Loading profile, sessions & progress</div>
      </div>
    </div>
  );

  if (!profile) return <Setup onDone={updateProfile} />;

  const isParent = profile.role === "parent";

  // ── Parent view: child detail or parent home ──
  if (isParent && viewingChild) {
    return (
      <ErrorBoundary>
        <ParentChildView child={viewingChild} onBack={() => setViewingChild(null)} />
      </ErrorBoundary>
    );
  }

  if (isParent) {
    return (
      <ErrorBoundary>
        <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif" }}>
          {/* Parent header */}
          <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>{profile.name} {"\u00b7"} Parent</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>Parent Dashboard</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {dbConnected && <div style={{ padding: "6px 10px", borderRadius: 20, background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>{"\u2601\ufe0f"} Synced</div>}
              <button className="btn" onClick={() => setModal("settings")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\u2699\ufe0f"}</button>
              <button className="btn" onClick={switchUser} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc64"}</button>
            </div>
          </div>

          {modal === "settings" && <ModalLayer modal={modal} setModal={setModal} active={null} subject={null} showSum={null} setShowSum={setShowSum} quizSubject={null} setQuizSubject={setQuizSubject} topicsFor={null} setTopicsFor={setTopicsFor} buildQuizFor={null} setBuildQuizFor={setBuildQuizFor} memory={memory} setMemory={setMemory} profile={profile} setProfile={setProfile} topicData={topicData} customTopics={customTopics} mats={mats} setMats={setMats} curMats={[]} updateProfile={updateProfile} studyTopic={studyTopic} gainXP={gainXP} onQuizComplete={handleQuizComplete} onSaveCustomTopics={handleSaveCustomTopics} teacherNotes={teacherNotes} onSaveTeacherNotes={handleSaveTeacherNotes} studentNotes={studentNotes} onSaveStudentNotes={handleSaveStudentNotes} onSessionAction={handleSessionAction} onDeleteSession={handleDeleteSession} clearSubjectMem={clearSubjectMem} clearAllMem={clearAllMem} />}
          {showLinkChild && <LinkChildModal onClose={() => setShowLinkChild(false)} onLinked={() => {}} />}

          <ParentHome
            profile={profile}
            onLinkChild={() => setShowLinkChild(true)}
            onViewChild={child => setViewingChild(child)}
            switchUser={switchUser}
          />
        </div>
      </ErrorBoundary>
    );
  }

  const mainView = (
    <div style={{ minHeight: "100vh", background: active && subject ? subject.bg : "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif", transition: "background .4s" }}>
      <ModalLayer
        modal={modal} setModal={setModal} active={active} subject={subject}
        showSum={showSum} setShowSum={setShowSum}
        quizSubject={quizSubject} setQuizSubject={setQuizSubject}
        topicsFor={topicsFor} setTopicsFor={setTopicsFor}
        buildQuizFor={buildQuizFor} setBuildQuizFor={setBuildQuizFor}
        memory={memory} setMemory={setMemory} profile={profile} setProfile={setProfile}
        topicData={topicData} customTopics={customTopics} mats={mats} setMats={setMats} curMats={curMats}
        updateProfile={updateProfile} studyTopic={studyTopic}
        gainXP={gainXP} onQuizComplete={handleQuizComplete} onSaveCustomTopics={handleSaveCustomTopics}
        teacherNotes={teacherNotes} onSaveTeacherNotes={handleSaveTeacherNotes}
        studentNotes={studentNotes} onSaveStudentNotes={handleSaveStudentNotes}
        onSessionAction={handleSessionAction} onDeleteSession={handleDeleteSession}
        clearSubjectMem={clearSubjectMem} clearAllMem={clearAllMem}
        events={events}
      />

      {showExamSetup && subject && <ExamSetup subject={subject} onStart={handleStartExam} onClose={() => setShowExamSetup(false)} />}
      {showMarkPaper && subject && <MarkPaperSetup subject={subject} onStart={handleStartMarkPaper} onClose={() => setShowMarkPaper(false)} />}

      {editingEvent && (
        <EventModal
          subjectId={editingEvent !== "new" ? editingEvent.subjectId : active}
          profile={profile}
          customTopics={customTopics}
          event={editingEvent !== "new" ? editingEvent : null}
          onSave={handleSaveEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {completingEvent && (
        <EventComplete
          event={completingEvent}
          profile={profile}
          onComplete={handleCompleteEvent}
          onClose={() => setCompletingEvent(null)}
        />
      )}

      {showCalc && active && subject && (
        <Calculator
          subjectColor={subject.color}
          onClose={() => setShowCalc(false)}
          onSendToChat={(text) => { setInput(prev => prev ? prev + " " + text : text); inputRef.current?.focus(); }}
        />
      )}

      <Header
        profile={profile} active={active} subject={subject} curMats={curMats}
        examMode={examMode} examSession={examSession} voiceMode={voiceMode} convoMode={convoMode}
        msgs={msgs} sumLoading={sumLoading} autoSumming={autoSumming}
        dbConnected={dbConnected} totalMem={totalMem} voiceCfg={voiceCfg} micSupported={micSupported}
        teacherNotes={teacherNotes} studentNotes={studentNotes} curMem={curMem} events={events}
        setModal={setModal} setShowExamSetup={setShowExamSetup} onEndExam={handleEndExam} setBuildQuizFor={setBuildQuizFor}
        setQuizSubject={setQuizSubject} setTopicsFor={setTopicsFor}
        setVoiceMode={setVoiceMode} setConvoMode={setConvoMode}
        genSummary={handleGenSummary} setActive={setActive} switchUser={switchUser}
        startMicRef={startMicRef} stopMic={stopMic}
        onAddEvent={() => setEditingEvent("new")}
        onCompleteEvent={ev => setCompletingEvent(ev)}
        onEditEvent={ev => setEditingEvent(ev)}
        onDeleteEvent={handleDeleteEvent}
        onOpenCalculator={() => setShowCalc(true)}
        onMarkPaper={() => setShowMarkPaper(true)}
      />

      {!active ? (
        <>
          <ChildLinkBanner />
          <HomeScreen
            profile={profile} memory={memory} mats={mats} xpData={xpData}
            streakData={streakData} topicData={topicData} customTopics={customTopics} totalMem={totalMem}
            events={events}
            onSelectSubject={id => setActive(id)} onQuickQuiz={setQuizSubject}
            onTopics={setTopicsFor} onBuildQuiz={setBuildQuizFor}
            onEditEvent={ev => setEditingEvent(ev)}
            onAddEvent={() => setEditingEvent("new")}
            onCompleteEvent={ev => setCompletingEvent(ev)}
            onDeleteEvent={handleDeleteEvent}
          />
        </>
      ) : (
        <ChatView
          subject={subject} msgs={msgs} loading={loading} input={input} setInput={setInput}
          onSend={send} examMode={examMode} examSession={examSession} onEndExam={handleEndExam}
          voiceMode={voiceMode} convoMode={convoMode}
          speaking={speaking} setSpeaking={setSpeaking} listening={listening}
          transcribing={transcribing} quickPrompts={quickPrompts} voiceCfg={voiceCfg}
          micSupported={micSupported} startMic={startMic} stopMic={stopMic}
          bottomRef={bottomRef} inputRef={inputRef}
        />
      )}
    </div>
  );

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage memory={memory} mats={mats} profile={profile} xpData={xpData} streakData={streakData} events={events} onAddEvent={() => setEditingEvent("new")} onEditEvent={ev => setEditingEvent(ev)} onCompleteEvent={ev => setCompletingEvent(ev)} onDeleteEvent={handleDeleteEvent} />} />
        <Route path="*" element={mainView} />
      </Routes>
    </ErrorBoundary>
  );
}
