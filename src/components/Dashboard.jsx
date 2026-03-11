import { ALL_SUBJECT_LIST, mySubjects } from "../config/subjects.js";
import { getSessions } from "../utils/storage.js";

export function Dashboard({ memory, mats, profile, onClose }) {
  const subs = mySubjects(profile);
  const allSums = Object.entries(memory.subjects || {}).flatMap(([id, sums]) => (sums || []).map(s => ({ ...s, tutor: ALL_SUBJECT_LIST.find(t => t.id === id) || { emoji: "", label: id, gradient: "#999", color: "#999" } }))).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 760, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "22px 26px", background: "linear-gradient(135deg,#1a1a2e,#302b63)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 2 }}>PARENT DASHBOARD</div>
            <div style={{ color: "#fff", fontSize: 20, fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{profile.name}'s Progress</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>{profile.year} {"\u00b7"} {profile.tier} {"\u00b7"} {allSums.length} sessions</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>{"\u2715"} Close</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
            {subs.map(t => {
              const sums = getSessions(memory, t.id), ls = sums[sums.length - 1], mc = (mats[t.id] || []).length;
              return (
                <div key={t.id} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #eee" }}>
                  <div style={{ background: t.gradient, padding: "14px 16px", color: "#fff" }}><div style={{ fontSize: 26 }}>{t.emoji}</div><div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{t.tutor.name}</div><div style={{ opacity: .65, fontSize: 12 }}>{t.label}</div></div>
                  <div style={{ padding: "12px 16px", background: "#fafafa" }}>
                    <div style={{ fontSize: 12, color: t.color, fontWeight: 700, marginBottom: 4 }}>{sums.length === 0 ? "No sessions yet" : sums.length + " session" + (sums.length > 1 ? "s" : "") + " in memory"}</div>
                    {ls && <div style={{ fontSize: 11, color: "#777", marginBottom: 4 }}>Last: {ls.date}</div>}
                    {mc > 0 && <div style={{ fontSize: 11, color: "#888" }}>{"\ud83d\udcce"} {mc} material{mc > 1 ? "s" : ""}</div>}
                    {ls?.confidenceScores && Object.keys(ls.confidenceScores).length > 0 && <div style={{ marginTop: 6 }}>{Object.entries(ls.confidenceScores).slice(0, 4).map(([topic, pct]) => <div key={topic} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}><div style={{ fontSize: 10, color: "#888", width: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic}</div><div style={{ flex: 1, height: 6, borderRadius: 3, background: "#eee" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444" }} /></div><div style={{ fontSize: 10, fontWeight: 700, color: "#666", width: 28 }}>{pct}%</div></div>)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#1a1a2e", marginBottom: 14, fontWeight: 700 }}>All Session Summaries</div>
          {allSums.length === 0 ? <div style={{ textAlign: "center", padding: 28, background: "#f8f8f8", borderRadius: 14, color: "#aaa", fontSize: 14 }}>No summaries yet.</div> :
            allSums.map((s, i) => <div key={i} style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid " + (s.tutor.color || "#999") + "33" }}><div style={{ background: s.tutor.gradient, padding: "9px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><span>{s.tutor.emoji}</span><span style={{ fontWeight: 700, fontSize: 13 }}>{s.tutor.label}</span><span style={{ marginLeft: "auto", opacity: .7, fontSize: 11 }}>{s.date}</span></div><div style={{ padding: "10px 14px", whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6, color: "#444", background: "#fafafa" }}>{s.rawSummaryText || "(No summary)"}</div></div>)
          }
        </div>
      </div>
    </div>
  );
}

