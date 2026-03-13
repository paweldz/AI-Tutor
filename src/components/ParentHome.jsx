import { useState, useEffect } from "react";
import { SUBJECTS } from "../config/subjects.js";
import { loadChildren, loadChildData, removeChildLink } from "../utils/parentSync.js";
import { xpLevel, LEVEL_EMOJIS, calcStreak } from "../utils/xp.js";
import { confidenceColor } from "../styles/tokens.js";

function ChildCard({ child, onView, onRemove }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const confirmed = child.status === "confirmed";

  useEffect(() => {
    if (!confirmed || !child.child_id) return;
    setLoading(true);
    loadChildData(child.child_id).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [child.child_id, confirmed]);

  const profile = data?.profile;
  const xp = data?.xp || { total: 0 };
  const streaks = data?.streaks || { dates: [] };
  const memory = data?.memory || { version: 2, subjects: {} };
  const lv = xpLevel(xp.total);
  const streak = calcStreak(streaks.dates);
  const totalSessions = Object.values(memory.subjects).reduce((a, s) => a + s.length, 0);
  const subjects = profile?.subjects?.map(id => SUBJECTS[id]).filter(Boolean) || [];

  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #eee", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "18px 20px", background: confirmed ? "linear-gradient(135deg,#1a1a2e,#302b63)" : "#f5f5f5" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: confirmed ? "#fff" : "#666", fontFamily: "'Playfair Display',serif" }}>
              {child.child_name || child.child_email || "Child"}
            </div>
            {confirmed && profile && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {profile.year} {"\u00b7"} {profile.tier} {"\u00b7"} {subjects.length} subjects
              </div>
            )}
            {!confirmed && (
              <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                {child.status === "pending" ? "Waiting for confirmation..." : "Rejected"}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {confirmed && (
              <button onClick={() => onView(child)} style={{ padding: "6px 14px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                View {"\u2192"}
              </button>
            )}
            <button onClick={() => onRemove(child)} style={{ padding: "6px 10px", borderRadius: 10, border: "none", background: "rgba(255,0,0,0.1)", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                {"\u2715"}
            </button>
          </div>
        </div>
      </div>

      {confirmed && !loading && data && (
        <div style={{ padding: "14px 20px" }}>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, background: "#f8f8f8", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{streak}</div>
              <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>{streak > 0 ? "\ud83d\udd25" : "\u2744\ufe0f"} Streak</div>
            </div>
            <div style={{ flex: 1, background: "#f8f8f8", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f0c040" }}>{xp.total}</div>
              <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>{LEVEL_EMOJIS[lv.level] || "\ud83c\udfc6"} XP</div>
            </div>
            <div style={{ flex: 1, background: "#f8f8f8", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{totalSessions}</div>
              <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>{"\ud83e\udde0"} Sessions</div>
            </div>
          </div>

          {/* Subject progress */}
          {subjects.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {subjects.map(sub => {
                const sessions = memory.subjects[sub.id] || [];
                const last = sessions[sessions.length - 1];
                const confScores = last?.confidenceScores || {};
                const avg = Object.values(confScores).length > 0 ? Math.round(Object.values(confScores).reduce((a, b) => a + b, 0) / Object.values(confScores).length) : -1;
                return (
                  <div key={sub.id} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #eee" }}>
                    <div style={{ background: sub.gradient, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{sub.emoji}</span>
                      <div>
                        <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{sub.label}</div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 9 }}>{sessions.length} sessions</div>
                      </div>
                      {avg >= 0 && <div style={{ marginLeft: "auto", background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 700, color: "#fff" }}>{avg}%</div>}
                    </div>
                    {Object.entries(confScores).length > 0 && (
                      <div style={{ padding: "6px 10px", background: "#fafafa" }}>
                        {Object.entries(confScores).slice(0, 3).map(([topic, pct]) => (
                          <div key={topic} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                            <div style={{ fontSize: 9, color: "#888", width: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic}</div>
                            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#eee" }}>
                              <div style={{ height: "100%", borderRadius: 2, background: confidenceColor(pct), width: pct + "%" }} />
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "#666", width: 24 }}>{pct}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmed && loading && (
        <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 12 }}>Loading data...</div>
      )}
    </div>
  );
}

export function ParentHome({ profile, onLinkChild, onViewChild, switchUser }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  function refresh() {
    setLoading(true);
    loadChildren().then(c => { setChildren(c); setLoading(false); }).catch(() => setLoading(false));
  }

  async function handleRemove(child) {
    if (!confirm("Remove " + (child.child_name || "this child") + " from your dashboard?")) return;
    await removeChildLink(child.id);
    refresh();
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 4 }}>
        Hello, {profile.name}.
      </h1>
      <p style={{ color: "#999", fontSize: 13, marginBottom: 24 }}>
        {children.filter(c => c.status === "confirmed").length > 0
          ? "Your children's progress at a glance."
          : "Link your children's accounts to see their progress."}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={onLinkChild} style={{ flex: 1, padding: "14px 18px", borderRadius: 14, border: "2px dashed rgba(0,0,0,0.15)", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
          {"\u2795"} Link a Child
        </button>
        <button onClick={refresh} style={{ padding: "14px 18px", borderRadius: 14, border: "1px solid #eee", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#666" }}>
          {"\ud83d\udd04"}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Loading children...</div>
      ) : children.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 18, padding: "40px 24px", textAlign: "center", border: "1px solid #eee" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{"\ud83d\udc68\u200d\ud83d\udc67"}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>No children linked yet</div>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>Click "Link a Child" to connect your child's account and view their progress.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {children.map(child => (
            <ChildCard key={child.id} child={child} onView={onViewChild} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
