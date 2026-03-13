import { useState, useEffect } from "react";
import { SUBJECTS } from "../config/subjects.js";
import { loadChildData } from "../utils/parentSync.js";
import { xpLevel, LEVEL_EMOJIS, calcStreak, weekHeatmap } from "../utils/xp.js";
import { confidenceColor } from "../styles/tokens.js";
import { ViewAsChildBanner } from "./ViewAsChildBanner.jsx";

export function ParentChildView({ child, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!child.child_id) return;
    setLoading(true);
    loadChildData(child.child_id).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [child.child_id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif" }}>
      <ViewAsChildBanner childName={child.child_name || "Child"} onBack={onBack} />
      <div style={{ textAlign: "center", padding: 80, color: "#aaa" }}>Loading...</div>
    </div>
  );

  if (!data || !data.profile) return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif" }}>
      <ViewAsChildBanner childName={child.child_name || "Child"} onBack={onBack} />
      <div style={{ textAlign: "center", padding: 80, color: "#aaa" }}>No data available yet. Your child hasn't started any sessions.</div>
    </div>
  );

  const profile = data.profile;
  const memory = data.memory;
  const xp = data.xp;
  const streaks = data.streaks;
  const lv = xpLevel(xp.total);
  const streak = calcStreak(streaks.dates);
  const week = weekHeatmap(streaks.dates);
  const subjects = (profile.subjects || []).map(id => SUBJECTS[id]).filter(Boolean);
  const totalSessions = Object.values(memory.subjects).reduce((a, s) => a + s.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif" }}>
      <ViewAsChildBanner childName={profile.name || child.child_name || "Child"} onBack={onBack} />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 22px" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#302b63)", borderRadius: 18, padding: "24px 28px", marginBottom: 24, color: "#fff" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 4 }}>CHILD PROGRESS REPORT</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{profile.name}'s Progress</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{profile.year} {"\u00b7"} {profile.tier} {"\u00b7"} {totalSessions} sessions</div>
        </div>

        {/* Streak & XP */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{streak > 0 ? "\ud83d\udd25" : "\u2744\ufe0f"}</span>
              <div><div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>day streak</div></div>
            </div>
            <div style={{ display: "flex", gap: 3 }}>{week.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ width: "100%", height: 6, borderRadius: 3, background: d.active ? "#22c55e" : "#eee", marginBottom: 2 }} /><div style={{ fontSize: 8, color: "#bbb" }}>{d.day}</div></div>)}</div>
          </div>
          <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{LEVEL_EMOJIS[lv.level] || "\ud83c\udfc6"}</span>
              <div><div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Level {lv.level}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{lv.title}</div></div>
              <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: "#f0c040" }}>{xp.total}</div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#eee" }}><div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#f0c040,#f59e0b)", width: Math.min(100, lv.current / lv.next * 100) + "%", transition: "width .5s" }} /></div>
            <div style={{ fontSize: 9, color: "#bbb", marginTop: 3 }}>{lv.current}/{lv.next} XP to Level {lv.level + 1}</div>
          </div>
        </div>

        {/* Subject cards */}
        <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 14 }}>Subjects</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {subjects.map(sub => {
            const sessions = memory.subjects[sub.id] || [];
            const last = sessions[sessions.length - 1];
            const confScores = last?.confidenceScores || {};
            const topicData = data.topics?.[sub.id] || {};
            const topicsStudied = Object.values(topicData).filter(v => v.studied > 0).length;
            const bd = profile.examBoards?.[sub.id];

            return (
              <div key={sub.id} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}>
                <div style={{ background: sub.gradient, padding: "18px 16px 14px" }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{sub.emoji}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", color: "#fff", fontSize: 16, fontWeight: 700 }}>{sub.tutor.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>{sub.label}{bd ? " \u00b7 " + bd : ""}</div>
                </div>
                <div style={{ background: "#fff", padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sub.color, marginBottom: 4 }}>
                    {sessions.length === 0 ? "No sessions yet" : "\ud83e\udde0 " + sessions.length + " session" + (sessions.length > 1 ? "s" : "")}
                  </div>
                  {topicsStudied > 0 && <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{"\ud83d\udcdd"} {topicsStudied} topics studied</div>}
                  {Object.entries(confScores).length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {Object.entries(confScores).slice(0, 4).map(([topic, pct]) => (
                        <div key={topic} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <div style={{ fontSize: 10, color: "#888", width: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic}</div>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#eee" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: confidenceColor(pct), width: pct + "%" }} />
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#666", width: 28 }}>{pct}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Session summaries */}
        <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 14 }}>Recent Sessions</div>
        {totalSessions === 0 ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, textAlign: "center", color: "#aaa", fontSize: 14, border: "1px solid #eee" }}>No sessions yet.</div>
        ) : (
          subjects.map(sub => {
            const sessions = memory.subjects[sub.id] || [];
            if (sessions.length === 0) return null;
            return sessions.slice(-3).reverse().map((ses, i) => (
              <div key={sub.id + "-" + i} style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid " + (sub.color || "#999") + "33" }}>
                <div style={{ padding: "9px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 8, background: sub.gradient }}>
                  <span>{sub.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{sub.label}</span>
                  <span style={{ marginLeft: "auto", opacity: 0.7, fontSize: 11 }}>{ses.date}</span>
                </div>
                <div style={{ padding: "10px 14px", whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6, color: "#444", background: "#fafafa" }}>
                  {ses.rawSummaryText || "(No summary)"}
                </div>
              </div>
            ));
          })
        )}
      </div>
    </div>
  );
}
