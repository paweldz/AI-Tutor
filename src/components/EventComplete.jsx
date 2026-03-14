import { useState } from "react";
import { SUBJECTS } from "../config/subjects.js";
import { eventTypeInfo } from "../utils/events.js";

const ASSESSMENTS = [
  { value: 1, emoji: "\ud83d\ude29", label: "Struggled" },
  { value: 2, emoji: "\ud83d\ude1f", label: "Difficult" },
  { value: 3, emoji: "\ud83d\ude10", label: "OK" },
  { value: 4, emoji: "\ud83d\ude0a", label: "Good" },
  { value: 5, emoji: "\ud83e\udd29", label: "Aced it" },
];

export function EventComplete({ event, onComplete, onClose }) {
  const sub = SUBJECTS[event.subjectId];
  const typeInfo = eventTypeInfo(event.type);
  const color = sub?.color || "#6366f1";

  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [selfAssessment, setSelfAssessment] = useState(null);
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");

  function handleSubmit() {
    onComplete(event.id, {
      score: score !== "" ? Number(score) : null,
      maxScore: maxScore !== "" ? Number(maxScore) : null,
      selfAssessment,
      reflection: { wentWell: wentWell.trim(), toImprove: toImprove.trim() },
    });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>How did it go?</div>
              <div style={{ fontSize: 13, color: color, marginTop: 2 }}>{typeInfo.emoji} {event.title}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#999", cursor: "pointer" }}>{"\u2715"}</button>
          </div>
        </div>

        <div style={{ padding: "16px 24px 24px" }}>
          {/* Score */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Score (optional)</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <input type="number" value={score} onChange={e => setScore(e.target.value)} placeholder="Score" min="0" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }} />
              <span style={{ color: "#999", fontSize: 16 }}>/</span>
              <input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)} placeholder="Max" min="1" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }} />
            </div>
            {score !== "" && maxScore !== "" && Number(maxScore) > 0 && (
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color }}>
                {Math.round(Number(score) / Number(maxScore) * 100)}%
              </div>
            )}
          </div>

          {/* Self assessment */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>How did you feel? (optional)</label>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {ASSESSMENTS.map(a => (
                <button key={a.value} onClick={() => setSelfAssessment(selfAssessment === a.value ? null : a.value)} style={{ flex: 1, padding: "8px 4px", borderRadius: 12, border: selfAssessment === a.value ? `2px solid ${color}` : "2px solid #eee", background: selfAssessment === a.value ? color + "14" : "#fff", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 22 }}>{a.emoji}</div>
                  <div style={{ fontSize: 9, color: selfAssessment === a.value ? color : "#999", fontWeight: 600, marginTop: 2 }}>{a.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* What went well */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>What went well? (optional)</label>
            <textarea value={wentWell} onChange={e => setWentWell(e.target.value)} placeholder="Topics I felt confident about, questions I answered well..." rows={2} style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 13, marginTop: 6, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          {/* What to improve */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>What can you improve? (optional)</label>
            <textarea value={toImprove} onChange={e => setToImprove(e.target.value)} placeholder="Topics I struggled with, things to revise..." rows={2} style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 13, marginTop: 6, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { onComplete(event.id, { score: null, maxScore: null, selfAssessment: null, reflection: { wentWell: "", toImprove: "" } }); onClose(); }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `2px solid ${color}`, background: "transparent", color, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Just mark done
            </button>
            <button onClick={handleSubmit} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: color, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Save & Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
