import { SUBJECT_TOPICS } from "../config/subjects.js";
import { getTopicProgress } from "../utils/topics.js";

export function TopicsPanel({ subject, profile, topicData, onStudy, onClose }) {
  const topics = SUBJECT_TOPICS[subject.id] || [];
  const prog = getTopicProgress(topicData, subject.id);
  const studied = topics.filter(t => prog[t]?.studied > 0).length;
  const pct = topics.length ? Math.round(studied / topics.length * 100) : 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>EXAM TOPICS</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{studied}/{topics.length} topics covered \u00b7 {pct}% complete</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: "6px 22px 8px" }}>
          <div style={{ height: 6, borderRadius: 3, background: "#eee" }}><div style={{ height: "100%", borderRadius: 3, background: subject.gradient, width: pct + "%", transition: "width .5s" }} /></div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 22px 22px" }}>
          {topics.map((topic, i) => {
            const p = prog[topic];
            const conf = p?.confidence || 0;
            const count = p?.studied || 0;
            const confColor = conf >= 70 ? "#22c55e" : conf >= 40 ? "#f59e0b" : conf > 0 ? "#ef4444" : "#e0e0e0";
            return (
              <div key={topic} onClick={() => onStudy(topic)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #f0f0f0", marginBottom: 6, cursor: "pointer", background: count > 0 ? "#fafffe" : "#fff", transition: "all .15s" }} className="so">
                <div style={{ width: 32, height: 32, borderRadius: 10, background: count > 0 ? confColor + "20" : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: count > 0 ? confColor : "#ccc", flexShrink: 0 }}>
                  {count > 0 ? (conf >= 70 ? "\u2713" : conf >= 40 ? "\u25cf" : "!") : (i + 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{topic}</div>
                  {count > 0 && <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>Studied {count}x {p.lastDate ? "\u00b7 last " + p.lastDate : ""}{conf > 0 ? " \u00b7 " + conf + "%" : ""}</div>}
                </div>
                {count > 0 && <div style={{ width: 36, height: 4, borderRadius: 2, background: "#eee", flexShrink: 0 }}><div style={{ height: "100%", borderRadius: 2, background: confColor, width: conf + "%" }} /></div>}
                <div style={{ color: subject.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{count > 0 ? "Review" : "Start"} {"\u203a"}</div>
              </div>
            );
          })}
          {topics.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#aaa" }}>No topic breakdown available for this subject yet.</div>}
        </div>
      </div>
    </div>
  );
}

