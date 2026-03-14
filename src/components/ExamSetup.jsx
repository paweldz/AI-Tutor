import { useState, useRef } from "react";
import { processFiles } from "../utils/files.js";

/**
 * Exam Setup modal — appears when student taps "Exam Mode" in the Tests menu.
 * Offers two modes:
 *   1. Free Practice — type questions/answers in chat, tutor marks them
 *   2. Past Paper — upload a paper (photo/PDF/text), AI extracts questions and walks through them
 *
 * Optional: time limit, description.
 */
export function ExamSetup({ subject, onStart, onClose }) {
  const [mode, setMode] = useState("free");
  const [timeLimit, setTimeLimit] = useState(0);
  const [description, setDescription] = useState("");
  const [paperMats, setPaperMats] = useState([]);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const canStart = mode === "free" || paperMats.length > 0;

  function handleFiles(files) {
    processFiles(files, mats => setPaperMats(prev => [...prev, ...mats]), err => setError(err));
  }

  function handleStart() {
    if (!canStart) return;
    onStart({
      mode,
      timeLimit,
      description: description.trim(),
      paperMats,
      subjectId: subject.id,
      startedAt: Date.now(),
    });
  }

  const TIME_OPTIONS = [
    { value: 0, label: "No limit" },
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1h 30m" },
    { value: 120, label: "2 hours" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>EXAM PRACTICE</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>

        <div style={{ padding: 22 }}>
          {/* Mode selection */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Practice Mode</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <ModeCard
              emoji={"\ud83d\udcdd"}
              title="Free Practice"
              desc="Type exam questions or answers — your tutor marks and explains"
              active={mode === "free"}
              color={subject.color}
              onClick={() => setMode("free")}
            />
            <ModeCard
              emoji={"\ud83d\udcc4"}
              title="Past Paper"
              desc="Upload a past paper — tutor extracts questions and walks you through each one"
              active={mode === "paper"}
              color={subject.color}
              onClick={() => setMode("paper")}
            />
          </div>

          {/* Past paper upload */}
          {mode === "paper" && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Upload Past Paper</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div onClick={() => fileRef.current?.click()} style={{ flex: 1, border: "2px dashed #ddd", borderRadius: 12, padding: "16px 14px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{"\ud83d\udcce"}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>Upload file</div>
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>PDF, photo, or text</div>
                  <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                </div>
                <div onClick={() => cameraRef.current?.click()} style={{ flex: 1, border: "2px dashed #ddd", borderRadius: 12, padding: "16px 14px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{"\ud83d\udcf7"}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>Take photo</div>
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Snap your paper</div>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                </div>
              </div>
              {paperMats.length > 0 && (
                <div>
                  {paperMats.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{m.isPdf ? "\ud83d\udcc4" : m.isImg ? "\ud83d\uddbc\ufe0f" : "\ud83d\udcdd"}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                      <button onClick={() => setPaperMats(prev => prev.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 11 }}>{"\u2715"}</button>
                    </div>
                  ))}
                </div>
              )}
              {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}
            </div>
          )}

          {/* Description */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Description (optional)</div>
          <div style={{ marginBottom: 18 }}>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Paper 2 Higher, June 2024, Topic 5 assessment"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Time limit */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Time Limit (optional)</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
            {TIME_OPTIONS.map(t => (
              <button
                key={t.value}
                onClick={() => setTimeLimit(t.value)}
                style={{
                  padding: "8px 14px", borderRadius: 10,
                  border: "2px solid " + (timeLimit === t.value ? subject.color : "#e0e0e0"),
                  background: timeLimit === t.value ? subject.color + "15" : "#fff",
                  color: timeLimit === t.value ? subject.color : "#666",
                  fontWeight: timeLimit === t.value ? 700 : 400,
                  fontSize: 12, cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: canStart ? subject.color : "#e0e0e0",
              color: canStart ? "#fff" : "#aaa",
              fontWeight: 700, fontSize: 15, cursor: canStart ? "pointer" : "default",
            }}
          >
            {mode === "paper" ? "\ud83d\udcc4 Start Past Paper Practice" : "\ud83d\udcdd Start Exam Practice"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeCard({ emoji, title, desc, active, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, padding: "14px 12px", borderRadius: 12, cursor: "pointer",
        border: "2px solid " + (active ? color : "#e0e0e0"),
        background: active ? color + "10" : "#fafafa",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : "#1a1a2e", marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 10, color: "#888", lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}
