import { useState } from "react";
import { getTopicProgress, getTopicsForSubject } from "../utils/topics.js";
import { getDefaultTopics } from "../config/subjects.js";
import { confidenceColor } from "../styles/tokens.js";

export function TopicsPanel({ subject, profile, topicData, customTopics, onStudy, onClose, onSaveCustomTopics }) {
  const topics = getTopicsForSubject(subject.id, profile, customTopics);
  const prog = getTopicProgress(topicData, subject.id);
  const studied = topics.filter(t => prog[t]?.studied > 0).length;
  const pct = topics.length ? Math.round(studied / topics.length * 100) : 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [newTopic, setNewTopic] = useState("");
  const [wasReset, setWasReset] = useState(false);

  function startEdit() {
    setDraft([...topics]);
    setNewTopic("");
    setWasReset(false);
    setEditing(true);
  }
  function cancelEdit() { setEditing(false); }
  function saveEdit() {
    if (onSaveCustomTopics) {
      if (wasReset) {
        // Clear custom topics so it falls back to board/tier defaults
        onSaveCustomTopics(subject.id, null);
      } else {
        const cleaned = draft.map(t => t.trim()).filter(Boolean);
        if (cleaned.length > 0) onSaveCustomTopics(subject.id, cleaned);
      }
    }
    setEditing(false);
  }
  function resetToDefaults() {
    const board = profile?.examBoards?.[subject.id];
    const tier = profile?.tier;
    setDraft([...getDefaultTopics(subject.id, board, tier)]);
    setWasReset(true);
  }
  function addTopic() {
    const trimmed = newTopic.trim();
    if (trimmed && !draft.includes(trimmed)) {
      setDraft(prev => [...prev, trimmed]);
      setNewTopic("");
      setWasReset(false);
    }
  }
  function removeTopic(i) { setDraft(prev => prev.filter((_, idx) => idx !== i)); setWasReset(false); }
  function moveTopic(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    setDraft(prev => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  }

  const isCustom = !!(customTopics?.[subject.id]?.length);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>EXAM TOPICS{isCustom ? " (customised)" : ""}</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div>
            {!editing && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{studied}/{topics.length} topics covered &middot; {pct}% complete</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!editing && onSaveCustomTopics && (
              <button onClick={startEdit} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
            )}
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
          </div>
        </div>

        {!editing && (
          <>
            <div style={{ padding: "6px 22px 8px" }}>
              <div style={{ height: 6, borderRadius: 3, background: "#eee" }}><div style={{ height: "100%", borderRadius: 3, background: subject.gradient, width: pct + "%", transition: "width .5s" }} /></div>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 22px 22px" }}>
              {topics.map((topic, i) => {
                const p = prog[topic];
                const conf = p?.confidence || 0;
                const count = p?.studied || 0;
                const confColor = confidenceColor(conf);
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
          </>
        )}

        {editing && (
          <div style={{ overflowY: "auto", flex: 1, padding: "12px 22px 22px" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Drag topics to reorder, remove unwanted ones, or add your own.</div>
            {draft.map((topic, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid #e8e8e8", marginBottom: 4, background: "#fafafa" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                  <button onClick={() => moveTopic(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", fontSize: 10, color: i === 0 ? "#ddd" : "#888", padding: 0, lineHeight: 1 }}>{"\u25b2"}</button>
                  <button onClick={() => moveTopic(i, 1)} disabled={i === draft.length - 1} style={{ background: "none", border: "none", cursor: i === draft.length - 1 ? "default" : "pointer", fontSize: 10, color: i === draft.length - 1 ? "#ddd" : "#888", padding: 0, lineHeight: 1 }}>{"\u25bc"}</button>
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1a1a2e" }}>{topic}</div>
                <button onClick={() => removeTopic(i)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>{"\u2715"}</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTopic()}
                placeholder="Add a topic..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none" }}
              />
              <button onClick={addTopic} disabled={!newTopic.trim()} style={{ background: subject.color, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: newTopic.trim() ? "pointer" : "default", opacity: newTopic.trim() ? 1 : 0.4 }}>Add</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={resetToDefaults} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Reset to defaults</button>
              <button onClick={cancelEdit} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 1.5, padding: "10px 0", borderRadius: 10, border: "none", background: subject.color, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save topics</button>
            </div>
            <div style={{ fontSize: 10, color: "#bbb", marginTop: 8, textAlign: "center" }}>{draft.length} topic{draft.length !== 1 ? "s" : ""}</div>
          </div>
        )}
      </div>
    </div>
  );
}
