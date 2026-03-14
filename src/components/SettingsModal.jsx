import { useState } from "react";
import { SUBJECTS, BOARDS, YEARS, TIERS, ALL_SUBJECT_LIST } from "../config/subjects.js";
const APP_VERSION = `3.6.0 (${__BUILD_TIME__})`;

export function SettingsModal({ profile, onSave, onClose, onOpenMemory }) {
  const [p, setP] = useState({ ...profile, examBoards: { ...profile.examBoards }, tutorCharacters: { ...profile.tutorCharacters }, subjects: [...(profile.subjects || [])] });
  const [tab, setTab] = useState("profile");
  const upd = (field, val) => setP(x => ({ ...x, [field]: val }));
  const updBoard = (sid, val) => setP(x => ({ ...x, examBoards: { ...x.examBoards, [sid]: val } }));
  const updChar = (sid, val) => setP(x => ({ ...x, tutorCharacters: { ...x.tutorCharacters, [sid]: val } }));
  const toggleSub = id => setP(x => ({ ...x, subjects: x.subjects.includes(id) ? x.subjects.filter(s => s !== id) : [...x.subjects, id] }));
  function save() { onSave(p); }
  const mySubs = p.subjects.map(id => SUBJECTS[id]).filter(Boolean);
  const isParent = p.role === "parent";
  const tabs = isParent
    ? [{ id: "profile", label: "Profile", emoji: "\ud83d\udc64" }]
    : [{ id: "profile", label: "Profile", emoji: "\ud83d\udc64" }, { id: "subjects", label: "Subjects", emoji: "\ud83d\udcda" }, ...mySubs.map(s => ({ id: s.id, label: s.label, emoji: s.emoji }))];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 600, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "18px 22px", background: "linear-gradient(135deg,#1a1a2e,#302b63)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>SETTINGS</div><div style={{ color: "#fff", fontSize: 20, fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{"\u2699\ufe0f"} Configure Your Tutors</div></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ background: "#f0c040", border: "none", color: "#1a1a2e", borderRadius: 10, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{"\u2713"} Save</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>{"\u2715"}</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "10px 22px 0", overflowX: "auto", borderBottom: "1px solid #eee" }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 12px", borderRadius: "10px 10px 0 0", border: "none", background: tab === t.id ? "#f5f4f0" : "transparent", color: tab === t.id ? "#1a1a2e" : "#999", fontWeight: tab === t.id ? 700 : 400, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>{t.emoji} {t.label}</button>)}
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          {tab === "profile" && (<div>
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Name</div><input value={p.name || ""} onChange={e => upd("name", e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 14, outline: "none" }} /></div>
            {isParent && <div style={{ marginBottom: 18, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd" }}><div style={{ fontSize: 12, fontWeight: 600, color: "#0369a1" }}>{"\ud83d\udc68\u200d\ud83d\udc67"} Parent Account</div><div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>You can view your children's progress from the dashboard.</div></div>}
            {!isParent && <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Year</div><div style={{ display: "flex", gap: 8 }}>{YEARS.map(y => <button key={y} onClick={() => upd("year", y)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (p.year === y ? "#f0c040" : "#e0e0e0"), background: p.year === y ? "#fef9e7" : "#fff", color: "#333", fontWeight: p.year === y ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{y}</button>)}</div></div>}
            {!isParent && <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Tier</div><div style={{ display: "flex", gap: 8 }}>{TIERS.map(t => <button key={t} onClick={() => upd("tier", t)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (p.tier === t ? "#f0c040" : "#e0e0e0"), background: p.tier === t ? "#fef9e7" : "#fff", color: "#333", fontWeight: p.tier === t ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{t}</button>)}</div></div>}
            {!isParent && onOpenMemory && <div style={{ marginTop: 24 }}>
              <button onClick={onOpenMemory} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "2px solid #e0e0e0", background: "#fafafa", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                <span style={{ fontSize: 20 }}>{"\ud83e\udde0"}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Memory Manager</div><div style={{ fontSize: 11, color: "#999" }}>Export, import, or clear saved sessions</div></div>
                <span style={{ color: "#ccc", fontSize: 14 }}>{"\u203a"}</span>
              </button>
            </div>}
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: "#f8f8f8", border: "1px solid #eee" }}><div style={{ fontSize: 11, color: "#bbb" }}>GCSE Tutor Hub v{APP_VERSION}</div></div>
          </div>)}
          {tab === "subjects" && (<div>
            <div style={{ fontSize: 12, color: "#777", marginBottom: 14 }}>Tap to add or remove subjects. Changes take effect when you save.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ALL_SUBJECT_LIST.map(s => {
                const on = p.subjects.includes(s.id);
                return <div key={s.id} onClick={() => toggleSub(s.id)} style={{ padding: "10px 12px", borderRadius: 10, border: "2px solid " + (on ? s.color : "#e0e0e0"), background: on ? s.color + "12" : "#fafafa", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .15s" }}>
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                  <div><div style={{ color: on ? s.color : "#666", fontWeight: on ? 700 : 400, fontSize: 12 }}>{s.label}</div><div style={{ color: "#aaa", fontSize: 10 }}>{s.tutor.name}</div></div>
                  {on && <span style={{ marginLeft: "auto", color: s.color, fontWeight: 700 }}>{"\u2713"}</span>}
                </div>;
              })}
            </div>
          </div>)}
          {tab !== "profile" && tab !== "subjects" && (() => {
            const sub = SUBJECTS[tab]; if (!sub) return null;
            const board = p.examBoards?.[tab] || "";
            const char = p.tutorCharacters?.[tab] || "";
            return (<div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>{sub.emoji} {sub.label} Exam Board</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>{BOARDS.map(b => <button key={b} onClick={() => updBoard(tab, board === b ? "" : b)} style={{ padding: 10, borderRadius: 10, border: "2px solid " + (board === b ? sub.color : "#e0e0e0"), background: board === b ? sub.color + "15" : "#fff", color: board === b ? sub.color : "#666", fontWeight: board === b ? 700 : 400, cursor: "pointer", fontSize: 12 }}>{b}</button>)}</div>
                {board && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Tap again to deselect</div>}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>{sub.tutor.name}&rsquo;s Character</div>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>Describe how this tutor should sound and behave. This shapes their personality in every conversation.</div>
                <textarea value={char} onChange={e => updChar(tab, e.target.value)} rows={4} placeholder={"e.g. Warm and encouraging, uses humour, gives real-world examples, speaks slowly for tricky topics, always asks follow-up questions..."} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical" }} />
              </div>
            </div>);
          })()}
        </div>
      </div>
    </div>
  );
}

