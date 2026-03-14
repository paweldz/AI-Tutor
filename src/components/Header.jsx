import { useState, useRef, useEffect } from "react";
import { stopSpeaking } from "../utils/speech.js";
import { getActiveNotes } from "./TeacherNotes.jsx";
import { getStudentNoteCount } from "./StudentNotes.jsx";
import { getSubjectEvents, getReminders, daysUntil, formatEventDate, eventTypeInfo } from "../utils/events.js";

function TestMenu({ subject, examMode, examSession, setShowExamSetup, onEndExam, setBuildQuizFor, setQuizSubject }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const items = [
    { emoji: "\u26a1", label: "Quick Test", desc: "10 auto-generated questions", onClick: () => { setQuizSubject(subject); setOpen(false); } },
    { emoji: "\ud83d\udee0\ufe0f", label: "Build Test", desc: "Customise question types & count", onClick: () => { setBuildQuizFor(subject); setOpen(false); } },
    examMode
      ? { emoji: "\u23f9", label: "End Exam", desc: examSession?.mode === "paper" ? "Past paper practice" : "Free exam practice", active: true, onClick: () => { onEndExam(); setOpen(false); } }
      : { emoji: "\ud83d\udcdd", label: "Exam Mode", desc: "Free practice or past paper", onClick: () => { setShowExamSetup(true); setOpen(false); } },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn" onClick={() => setOpen(o => !o)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: examMode ? subject.color : "rgba(0,0,0,0.07)", color: examMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>
        {"\ud83c\udfaf"} Tests {open ? "\u25b4" : "\u25be"}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid rgba(0,0,0,0.08)", minWidth: 220, zIndex: 200, overflow: "hidden", animation: "ci .15s ease" }}>
          {items.map((it, i) => (
            <button key={i} onClick={it.onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: it.active ? (subject.color + "14") : "transparent", border: "none", borderBottom: i < items.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>{it.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: it.active ? subject.color : "#1a1a2e" }}>{it.label}</div>
                <div style={{ fontSize: 10, color: "#999" }}>{it.desc}</div>
              </div>
              {it.active && <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: 4, background: subject.color }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesMenu({ subject, teacherNoteCount, studentNoteCount, setModal }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const total = teacherNoteCount + studentNoteCount;

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const items = [
    { emoji: "\ud83d\udccc", label: "My Notes", desc: "Post-it reminders & key facts", count: studentNoteCount, onClick: () => { setModal("studentNotes"); setOpen(false); } },
    { emoji: "\ud83c\udfeb", label: "Teacher Notes", desc: "Feedback from your teachers", count: teacherNoteCount, onClick: () => { setModal("teacherNotes"); setOpen(false); } },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn" onClick={() => setOpen(o => !o)} style={{ position: "relative", padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: total > 0 ? "#f59e0b" : "rgba(0,0,0,0.07)", color: total > 0 ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>
        {"\ud83d\udcdd"} Notes {open ? "\u25b4" : "\u25be"}
        {total > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{total}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid rgba(0,0,0,0.08)", minWidth: 230, zIndex: 200, overflow: "hidden", animation: "ci .15s ease" }}>
          {items.map((it, i) => (
            <button key={i} onClick={it.onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "transparent", border: "none", borderBottom: i < items.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>{it.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{it.label}</div>
                <div style={{ fontSize: 10, color: "#999" }}>{it.desc}</div>
              </div>
              {it.count > 0 && <span style={{ background: subject.color + "18", color: subject.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{it.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewMenu({ subject, msgs, sumLoading, sessionCount, genSummary, setModal }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const canSummarise = msgs.length >= 3 && !sumLoading;

  const items = [
    { emoji: "\ud83d\udccb", label: sumLoading ? "Saving..." : "Save Summary", desc: "Summarise & save this session", disabled: !canSummarise, onClick: () => { if (canSummarise) { genSummary(); setOpen(false); } } },
    { emoji: "\ud83d\udcda", label: "Past Sessions", desc: sessionCount + " session" + (sessionCount !== 1 ? "s" : "") + " in memory", disabled: sessionCount === 0, onClick: () => { setModal("history"); setOpen(false); } },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn" onClick={() => setOpen(o => !o)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: sessionCount > 0 ? subject.color : "rgba(0,0,0,0.07)", color: sessionCount > 0 ? "#fff" : "#666", fontSize: 11, fontWeight: 700, opacity: sumLoading ? 0.6 : 1 }}>
        {"\ud83d\udccb"} Review {open ? "\u25b4" : "\u25be"}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid rgba(0,0,0,0.08)", minWidth: 230, zIndex: 200, overflow: "hidden", animation: "ci .15s ease" }}>
          {items.map((it, i) => (
            <button key={i} onClick={it.onClick} disabled={it.disabled} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "transparent", border: "none", borderBottom: i < items.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", cursor: it.disabled ? "default" : "pointer", textAlign: "left", opacity: it.disabled ? 0.4 : 1 }}>
              <span style={{ fontSize: 18 }}>{it.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{it.label}</div>
                <div style={{ fontSize: 10, color: "#999" }}>{it.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventsMenu({ subject, events, onAddEvent, onCompleteEvent, onEditEvent, onDeleteEvent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const subjectEvents = getSubjectEvents(events, subject.id);
  const upcoming = subjectEvents.filter(e => e.status === "upcoming");
  const completed = subjectEvents.filter(e => e.status === "completed").slice(-3);
  const hasEvents = subjectEvents.length > 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn" onClick={() => setOpen(o => !o)} style={{ position: "relative", padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: upcoming.length > 0 ? "#6366f1" : "rgba(0,0,0,0.07)", color: upcoming.length > 0 ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>
        {"\ud83d\udcc5"} Events {open ? "\u25b4" : "\u25be"}
        {upcoming.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{upcoming.length}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid rgba(0,0,0,0.08)", minWidth: 280, maxWidth: 340, zIndex: 200, overflow: "hidden", animation: "ci .15s ease" }}>
          {/* Add event button */}
          <button onClick={() => { onAddEvent(); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 18 }}>{"\u2795"}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: subject.color }}>Add Event</div>
              <div style={{ fontSize: 10, color: "#999" }}>Test, mock, homework, deadline...</div>
            </div>
          </button>

          {/* Upcoming events */}
          {upcoming.length > 0 && (
            <>
              <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Upcoming</div>
              {upcoming.map(ev => {
                const ti = eventTypeInfo(ev.type);
                const days = daysUntil(ev.date);
                const urgent = days <= 1;
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                    <span style={{ fontSize: 16 }}>{ti.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                      <div style={{ fontSize: 10, color: urgent ? "#ef4444" : "#999", fontWeight: urgent ? 700 : 400 }}>{formatEventDate(ev.date)}{ev.topics?.length > 0 ? " \u00b7 " + ev.topics.slice(0, 2).join(", ") : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); onCompleteEvent(ev); setOpen(false); }} title="Mark complete" style={{ background: "#22c55e", border: "none", borderRadius: 6, width: 24, height: 24, color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2713"}</button>
                      <button onClick={(e) => { e.stopPropagation(); onEditEvent(ev); setOpen(false); }} title="Edit" style={{ background: "#eee", border: "none", borderRadius: 6, width: 24, height: 24, color: "#666", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u270e"}</button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev.id); }} title="Delete" style={{ background: "#fee2e2", border: "none", borderRadius: 6, width: 24, height: 24, color: "#ef4444", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Completed events */}
          {completed.length > 0 && (
            <>
              <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Completed</div>
              {completed.map(ev => {
                const ti = eventTypeInfo(ev.type);
                const scoreText = ev.score != null && ev.maxScore ? `${ev.score}/${ev.maxScore} (${Math.round(ev.score / ev.maxScore * 100)}%)` : ev.score != null ? `${ev.score}` : "";
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.03)", opacity: 0.7 }}>
                    <span style={{ fontSize: 16 }}>{ti.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"\u2713"} {ev.title}</div>
                      <div style={{ fontSize: 10, color: "#999" }}>{formatEventDate(ev.date)}{scoreText ? " \u00b7 " + scoreText : ""}</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!hasEvents && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "#999", textAlign: "center" }}>No events for {subject.label} yet</div>
          )}
        </div>
      )}
    </div>
  );
}

export function Header({
  profile, active, subject, curMats, examMode, examSession, voiceMode, convoMode,
  msgs, sumLoading, autoSumming, dbConnected, totalMem, voiceCfg, micSupported,
  teacherNotes, studentNotes, curMem, events,
  setModal, setShowExamSetup, onEndExam, setBuildQuizFor, setQuizSubject, setTopicsFor,
  setVoiceMode, setConvoMode,
  genSummary, setActive, switchUser, startMicRef, stopMic,
  onAddEvent, onCompleteEvent, onEditEvent, onDeleteEvent
}) {
  const reminders = getReminders(events || []);
  return (
    <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100 }}>
      {active && <button onClick={() => setActive(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#666", padding: "4px 8px", borderRadius: 8 }} aria-label="Back">{"\u2190"}</button>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>{profile.name}{profile.year ? " \u00b7 " + profile.year : ""}{profile.tier ? " \u00b7 " + profile.tier : ""}{autoSumming ? " \u00b7 saving memory..." : ""}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>{active ? subject.emoji + " " + subject.tutor.name : "Your Tutor Hub by Korona Lab \u00ae"}</div>
      </div>
      {active && (
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setTopicsFor(subject)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.07)", color: "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcdd"} Topics</button>
          <TestMenu subject={subject} examMode={examMode} examSession={examSession} setShowExamSetup={setShowExamSetup} onEndExam={onEndExam} setBuildQuizFor={setBuildQuizFor} setQuizSubject={setQuizSubject} />
          <NotesMenu subject={subject} teacherNoteCount={active ? getActiveNotes(teacherNotes, active).length : 0} studentNoteCount={active ? getStudentNoteCount(studentNotes, active) : 0} setModal={setModal} />
          <EventsMenu subject={subject} events={events || []} onAddEvent={onAddEvent} onCompleteEvent={onCompleteEvent} onEditEvent={onEditEvent} onDeleteEvent={onDeleteEvent} />
          <button className="btn" onClick={() => setModal("mats")} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: curMats.length ? subject.color : "rgba(0,0,0,0.07)", color: curMats.length ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcce"} {curMats.length ? curMats.length + " File" + (curMats.length > 1 ? "s" : "") : "Materials"}</button>
          {voiceCfg && <button className="btn" onClick={() => { setVoiceMode(v => { if (v) { stopSpeaking(); setConvoMode(false); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: voiceMode ? "#dc2626" : "rgba(0,0,0,0.07)", color: voiceMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{voiceMode ? "\ud83d\udd0a Voice ON" : "\ud83c\udf99\ufe0f Voice"}</button>}
          {voiceMode && voiceCfg && micSupported && <button className="btn" onClick={() => { setConvoMode(v => { if (!v) { stopSpeaking(); setTimeout(() => startMicRef.current(), 200); } else { stopMic(); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: convoMode ? "#059669" : "rgba(0,0,0,0.07)", color: convoMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700, animation: convoMode ? "mp 2s ease infinite" : "none" }}>{convoMode ? "\ud83d\udd04 Conversation" : "\ud83d\udde3\ufe0f Converse"}</button>}
          <ReviewMenu subject={subject} msgs={msgs} sumLoading={sumLoading} sessionCount={curMem.length} genSummary={genSummary} setModal={setModal} />
        </div>
      )}
      <div style={{ display: "flex", gap: 5 }}>
        {reminders.length > 0 && !active && (
          <div style={{ position: "relative", padding: "6px 10px", borderRadius: 20, background: "#f59e0b", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", cursor: "default" }} title={reminders.map(e => e.title + " — " + formatEventDate(e.date)).join("\n")}>
            {"\ud83d\udcc5"}
            <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{reminders.length}</span>
          </div>
        )}
        {!active && <button className="btn" onClick={() => setModal("dash")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 13, cursor: "pointer" }} title="Stats">{"\ud83d\udcca"}</button>}
        <button className="btn" onClick={() => setModal("settings")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 13, cursor: "pointer" }} title="Settings">{"\u2699\ufe0f"}</button>
        <div style={{ padding: "6px 10px", borderRadius: 20, background: dbConnected ? "#059669" : "#dc2626", color: "#fff", fontSize: 13, display: "flex", alignItems: "center" }} title={dbConnected ? "Synced" : "Not synced"}>{"\u2601\ufe0f"}</div>
        <button className="btn" onClick={switchUser} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 13, cursor: "pointer" }} title="Switch User">{"\ud83d\udc64"}</button>
      </div>
    </div>
  );
}
