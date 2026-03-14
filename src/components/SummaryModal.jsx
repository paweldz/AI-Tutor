
export function SummaryModal({ subject, sessionData, onClose }) {
  const text = sessionData?.rawSummaryText || "(No summary)";
  const m = sessionData?.metrics;
  const depth = sessionData?.topicDepth;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 580, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ background: subject.gradient, borderRadius: "20px 20px 0 0", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>SAVED TO MEMORY</div><div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{"\ud83d\udccb"} Session Summary {"\u2014"} {subject.label}</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>

          {/* Session metrics bar */}
          {m && m.totalQuestions > 0 && (
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Session Stats</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatPill label="Questions" value={m.totalQuestions} />
                <StatPill label="Correct" value={m.correct} color="#22c55e" />
                <StatPill label="Partial" value={m.partial} color="#f59e0b" />
                <StatPill label="Wrong" value={m.wrong} color="#ef4444" />
                {m.skipped > 0 && <StatPill label="Skipped" value={m.skipped} color="#94a3b8" />}
                <StatPill label="Accuracy" value={m.accuracyPct != null ? m.accuracyPct + "%" : "N/A"} color={m.accuracyPct >= 70 ? "#22c55e" : m.accuracyPct >= 40 ? "#f59e0b" : "#ef4444"} />
                {m.avgHints != null && <StatPill label="Avg hints" value={m.avgHints} />}
                {m.activeMinutes > 0 && <StatPill label="Active time" value={m.activeMinutes + " min"} />}
              </div>
            </div>
          )}

          {/* Topic depth indicators */}
          {depth && Object.keys(depth).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Topic depth:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(depth).map(([topic, level]) => (
                  <span key={topic} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: level === "tested" ? "#dcfce7" : level === "practiced" ? "#fef9c3" : "#f1f5f9", color: level === "tested" ? "#166534" : level === "practiced" ? "#854d0e" : "#475569", fontWeight: 600 }}>
                    {topic}: {level}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence bars */}
          {sessionData?.confidenceScores && Object.keys(sessionData.confidenceScores).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Confidence by topic:</div>
              {Object.entries(sessionData.confidenceScores).map(([topic, pct]) => (
                <div key={topic} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: "#666", width: 100 }}>{topic}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#eee" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 4, background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444", transition: "width .5s" }} /></div>
                  <div style={{ fontSize: 12, fontWeight: 700, width: 32 }}>{pct}%</div>
                </div>
              ))}
            </div>
          )}

          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, lineHeight: 1.7, color: "#333" }}>{text}</pre>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
          <button onClick={() => navigator.clipboard.writeText(text)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + subject.color, background: "transparent", color: subject.color, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\udccb"} Copy</button>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: subject.color, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\u2713"} Done</button>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || "#333" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
