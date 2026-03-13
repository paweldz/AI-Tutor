
export function SummaryModal({ subject, sessionData, onClose }) {
  const text = sessionData?.rawSummaryText || "(No summary)";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 580, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ background: subject.gradient, borderRadius: "20px 20px 0 0", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>SAVED TO MEMORY</div><div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{"\ud83d\udccb"} Session Summary {"\u2014"} {subject.label}</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
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

