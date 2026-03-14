import { useState, useEffect } from "react";
import { renderMd } from "../utils/markdown.jsx";
import { speakText, stopSpeaking } from "../utils/speech.js";

function ExamTimer({ examSession, onTimeUp }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!examSession?.timeLimit || !examSession?.startedAt) return;
    const endTime = examSession.startedAt + examSession.timeLimit * 60 * 1000;

    function tick() {
      const left = Math.max(0, endTime - Date.now());
      setRemaining(left);
      if (left <= 0 && onTimeUp) onTimeUp();
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [examSession, onTimeUp]);

  if (remaining === null) return null;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isLow = remaining < 5 * 60 * 1000;

  return (
    <span style={{ fontWeight: 800, color: isLow ? "#fef2f2" : "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "monospace", animation: isLow ? "mp 1s ease infinite" : "none" }}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

export function ChatView({
  subject, msgs, loading, input, setInput, onSend,
  examMode, examSession, onEndExam, voiceMode, convoMode,
  speaking, setSpeaking, listening, transcribing,
  quickPrompts, voiceCfg, micSupported,
  startMic, stopMic, bottomRef, inputRef
}) {
  const [timeUp, setTimeUp] = useState(false);

  // Reset timeUp when exam session changes
  useEffect(() => { setTimeUp(false); }, [examSession]);

  function handleTimeUp() {
    setTimeUp(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 61px)" }}>
      {examMode && (
        <div style={{ background: examSession?.mode === "paper" ? "linear-gradient(90deg," + subject.color + ",#1a1a2e)" : subject.color, color: "#fff", textAlign: "center", padding: "8px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span>
            {examSession?.mode === "paper" ? "\ud83d\udcc4 PAST PAPER PRACTICE" : "\ud83d\udcdd EXAM PRACTICE"}
            {examSession?.description ? " \u2014 " + examSession.description : ""}
          </span>
          {examSession?.timeLimit > 0 && <ExamTimer examSession={examSession} onTimeUp={handleTimeUp} />}
          <button onClick={onEndExam} style={{ marginLeft: 8, padding: "3px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>End Exam</button>
        </div>
      )}
      {timeUp && (
        <div style={{ background: "#dc2626", color: "#fff", textAlign: "center", padding: 8, fontSize: 13, fontWeight: 700 }}>
          Time's up! You can keep working or end the exam now.
        </div>
      )}
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
          {quickPrompts.filter((v, i, a) => a.indexOf(v) === i).map(q => <button key={q} onClick={() => onSend(q)} style={{ padding: "5px 11px", borderRadius: 20, border: "1.5px solid " + subject.color, background: "transparent", color: subject.color, cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", transition: "all .15s" }}>{q}</button>)}
        </div>
      </div>
      <div style={{ padding: "5px 22px 16px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        {(listening || transcribing) && <div style={{ maxWidth: 680, margin: "0 auto 6px", padding: "8px 14px", borderRadius: 10, background: transcribing ? "#eff6ff" : "#fef2f2", border: "1px solid " + (transcribing ? "#bfdbfe" : "#fecaca"), fontSize: 12, color: transcribing ? "#1d4ed8" : "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: transcribing ? "#1d4ed8" : "#dc2626", animation: "mp 1.2s ease infinite" }} />{transcribing ? "Transcribing your speech..." : "Recording... tap \ud83c\udf99\ufe0f again when done"}</div>}
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={listening ? "Recording..." : transcribing ? "Transcribing..." : examMode ? (examSession?.mode === "paper" ? "Type your answer..." : "Paste your question or attempt here...") : voiceCfg ? "Type or tap \ud83c\udf99\ufe0f to speak..." : "Message " + subject.tutor.name + "..."} rows={1}
            style={{ flex: 1, padding: "12px 15px", borderRadius: 14, border: `2px solid ${listening ? "#dc2626" : transcribing ? "#1d4ed8" : input ? subject.color : "#e0e0e0"}`, resize: "none", fontSize: 14, lineHeight: 1.5, background: "#fff", maxHeight: 120, overflow: "auto", transition: "border-color .2s", outline: "none" }}
            onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
          {voiceCfg && micSupported && (
            <button onClick={() => { if (listening) stopMic(); else if (!transcribing) { stopSpeaking(); startMic(); } }} disabled={transcribing}
              style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: listening ? "#dc2626" : transcribing ? "#93c5fd" : "#fef2f2", color: listening ? "#fff" : transcribing ? "#fff" : "#dc2626", fontSize: 18, cursor: transcribing ? "default" : "pointer", transition: "all .2s", animation: listening ? "mp 1.2s ease infinite" : "none", opacity: transcribing ? 0.6 : 1 }}
              title={listening ? "Stop recording" : transcribing ? "Transcribing..." : "Speak"}>{listening ? "\u23f9" : "\ud83c\udf99\ufe0f"}</button>
          )}
          <button onClick={() => onSend()} disabled={!input.trim() || loading}
            style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: input.trim() && !loading ? subject.color : "#e8e8e8", color: input.trim() && !loading ? "#fff" : "#bbb", fontSize: 17, cursor: input.trim() && !loading ? "pointer" : "default", transition: "all .2s" }}>{"\u2191"}</button>
        </div>
        <div style={{ maxWidth: 680, margin: "4px auto 0", fontSize: 10, color: "#bbb", paddingLeft: 2 }}>Enter to send {"\u00b7"} Shift+Enter new line{voiceCfg && micSupported ? " \u00b7 \ud83c\udf99\ufe0f Tap mic to speak" : ""}</div>
      </div>
    </div>
  );
}
