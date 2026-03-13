import { useState } from "react";
import { getSessions } from "../utils/storage.js";
import { confidenceColor } from "../styles/tokens.js";

function SessionCard({ session, index, subject, expanded, onToggle, onAction }) {
  const m = session.metrics;
  const depth = session.topicDepth;
  const conf = session.confidenceScores;
  const topics = session.topics || [];
  const weakTopics = conf ? Object.entries(conf).filter(([, v]) => v < 60).map(([t]) => t) : [];
  const summary = session.rawSummaryText || "";

  return (
    <div style={{ borderRadius: 14, border: "1px solid #f0f0f0", marginBottom: 8, overflow: "hidden", background: "#fff" }}>
      {/* Collapsed header — always visible */}
      <button onClick={onToggle} style={{ width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: subject.color + "14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: subject.color, flexShrink: 0 }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{session.date}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {topics.length > 0 ? topics.join(", ") : summary.slice(0, 60) || "No summary"}
          </div>
        </div>
        {m && m.totalQuestions > 0 && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: m.accuracyPct >= 70 ? "#22c55e" : m.accuracyPct >= 40 ? "#f59e0b" : "#ef4444" }}>{m.accuracyPct}%</div>
            <div style={{ fontSize: 9, color: "#999" }}>{m.totalQuestions} Q</div>
          </div>
        )}
        <span style={{ fontSize: 12, color: "#ccc", flexShrink: 0, transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "none" }}>{"\u25bc"}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #f5f5f5" }}>
          {/* Stats bar */}
          {m && m.totalQuestions > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "10px 0 8px" }}>
              <Stat label="Correct" value={m.correct} color="#22c55e" />
              <Stat label="Partial" value={m.partial} color="#f59e0b" />
              <Stat label="Wrong" value={m.wrong} color="#ef4444" />
              {m.avgHints != null && <Stat label="Avg hints" value={m.avgHints} />}
              {m.activeMinutes > 0 && <Stat label="Time" value={m.activeMinutes + "m"} />}
            </div>
          )}

          {/* Topic depth */}
          {depth && Object.keys(depth).length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {Object.entries(depth).map(([topic, level]) => (
                <span key={topic} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: level === "tested" ? "#dcfce7" : level === "practiced" ? "#fef9c3" : "#f1f5f9", color: level === "tested" ? "#166534" : level === "practiced" ? "#854d0e" : "#475569", fontWeight: 600 }}>
                  {topic}: {level}
                </span>
              ))}
            </div>
          )}

          {/* Confidence bars */}
          {conf && Object.keys(conf).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {Object.entries(conf).map(([topic, pct]) => (
                <div key={topic} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ fontSize: 11, color: "#666", width: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={topic}>{topic}</div>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#eee" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: confidenceColor(pct) }} /></div>
                  <div style={{ fontSize: 10, fontWeight: 700, width: 28, textAlign: "right", color: confidenceColor(pct) }}>{pct}%</div>
                </div>
              ))}
            </div>
          )}

          {/* Summary text */}
          {summary && (
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 10, maxHeight: 120, overflowY: "auto", background: "#fafafa", borderRadius: 10, padding: "10px 12px" }}>
              {summary.slice(0, 500)}{summary.length > 500 ? "..." : ""}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {topics.length > 0 && (
              <ActionBtn label={"Continue: " + topics[0]} color={subject.color} onClick={() => onAction("continue", topics[0])} />
            )}
            {weakTopics.length > 0 && (
              <ActionBtn label={"Strengthen: " + weakTopics[0]} color="#ef4444" onClick={() => onAction("strengthen", weakTopics[0])} />
            )}
            {topics.length > 0 && (
              <ActionBtn label="Quiz me on this" color="#8b5cf6" onClick={() => onAction("quiz", topics)} />
            )}
            <ActionBtn label="Pick up where I left off" color="#6b7280" onClick={() => onAction("continue_session", session)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 40 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || "#333" }}>{value}</div>
      <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid " + color, background: "transparent", color, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}

export function SessionHistory({ subject, memory, onAction, onClose }) {
  const sessions = getSessions(memory, subject.id);
  const [expandedIdx, setExpandedIdx] = useState(sessions.length > 0 ? sessions.length - 1 : null);

  // Show newest first
  const reversed = [...sessions].reverse();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>PAST SESSIONS</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""} in memory</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "12px 22px 22px" }}>
          {reversed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{"\ud83d\udcda"}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>No sessions yet</div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>Start chatting with your tutor and save a summary to build your session history.</div>
            </div>
          ) : (
            reversed.map((session, i) => {
              const realIdx = sessions.length - 1 - i;
              return (
                <SessionCard
                  key={realIdx}
                  session={session}
                  index={realIdx}
                  subject={subject}
                  expanded={expandedIdx === realIdx}
                  onToggle={() => setExpandedIdx(expandedIdx === realIdx ? null : realIdx)}
                  onAction={onAction}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
