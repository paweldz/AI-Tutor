import { useState } from "react";
import { SUBJECTS, BOARDS, YEARS, TIERS, ALL_SUBJECT_LIST } from "../config/subjects.js";

export function Setup({ onDone }) {
  const [phase, setPhase] = useState("name");
  const [p, setP] = useState({ name: "", year: "", tier: "", examBoards: {}, subjects: [], tutorCharacters: {} });
  const [boardIdx, setBoardIdx] = useState(0);
  const upd = (f, v) => setP(x => ({ ...x, [f]: v }));
  const toggleSub = id => setP(x => ({ ...x, subjects: x.subjects.includes(id) ? x.subjects.filter(s => s !== id) : [...x.subjects, id] }));

  function afterName() {
    const name = p.name.trim();
    if (!name) return;
    setPhase("year");
  }

  const selectedSubs = p.subjects.map(id => SUBJECTS[id]).filter(Boolean);
  const boardSub = selectedSubs[boardIdx];

  function nextBoard() {
    if (boardIdx < selectedSubs.length - 1) setBoardIdx(i => i + 1);
    else onDone(p);
  }

  const wrap = children => (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", padding: "40px 36px" }}>
          {children}
        </div>
      </div>
    </div>
  );

  if (phase === "name") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>WELCOME</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>What's your name?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Your tutors will use this throughout your sessions</p>
    <input autoFocus value={p.name} onChange={e => upd("name", e.target.value)} onKeyDown={e => e.key === "Enter" && afterName()} placeholder="Enter your first name..."
      style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 18, outline: "none", marginBottom: 20 }} />
    <button className="hb" onClick={afterName} disabled={!p.name.trim()}
      style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.name.trim() ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.name.trim() ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
      Continue {"\u2192"}
    </button>
  </>);

  if (phase === "year") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>SETUP</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Which year are you in?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Helps tutors prioritise the right content</p>
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{YEARS.map(y => <div key={y} className="so" onClick={() => upd("year", y)} style={{ flex: 1, padding: "14px", borderRadius: 10, border: `2px solid ${p.year === y ? "#f0c040" : "rgba(255,255,255,0.15)"}`, background: p.year === y ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: p.year === y ? "#f0c040" : "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: p.year === y ? 700 : 400, cursor: "pointer", textAlign: "center" }}>{y}</div>)}</div>
    <button className="hb" onClick={() => setPhase("tier")} disabled={!p.year} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.year ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.year ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Continue {"\u2192"}</button>
  </>);

  if (phase === "tier") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>SETUP</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Foundation or Higher?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Applies to Maths & Science</p>
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{TIERS.map(t => <div key={t} className="so" onClick={() => upd("tier", t)} style={{ flex: 1, padding: "14px", borderRadius: 10, border: `2px solid ${p.tier === t ? "#f0c040" : "rgba(255,255,255,0.15)"}`, background: p.tier === t ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: p.tier === t ? "#f0c040" : "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: p.tier === t ? 700 : 400, cursor: "pointer", textAlign: "center" }}>{t}</div>)}</div>
    <button className="hb" onClick={() => setPhase("subjects")} disabled={!p.tier} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.tier ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.tier ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Continue {"\u2192"}</button>
  </>);

  if (phase === "subjects") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>CHOOSE YOUR SUBJECTS</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Which GCSEs are you taking?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>Pick as many as you like. You can change these later in Settings.</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20, maxHeight: 360, overflowY: "auto" }}>
      {ALL_SUBJECT_LIST.map(s => {
        const on = p.subjects.includes(s.id);
        return <div key={s.id} className="so" onClick={() => toggleSub(s.id)} style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${on ? "#f0c040" : "rgba(255,255,255,0.12)"}`, background: on ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all .15s" }}>
          <span style={{ fontSize: 22 }}>{s.emoji}</span>
          <div><div style={{ color: on ? "#f0c040" : "rgba(255,255,255,0.8)", fontWeight: on ? 700 : 400, fontSize: 13 }}>{s.label}</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{s.tutor.name}</div></div>
          {on && <span style={{ marginLeft: "auto", color: "#f0c040", fontWeight: 700, fontSize: 16 }}>{"\u2713"}</span>}
        </div>;
      })}
    </div>
    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{p.subjects.length} subject{p.subjects.length !== 1 ? "s" : ""} selected</div>
    <button className="hb" onClick={() => { if (p.subjects.length) { setBoardIdx(0); setPhase("boards"); } }} disabled={!p.subjects.length}
      style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.subjects.length ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.subjects.length ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
      Continue {"\u2192"}
    </button>
  </>);

  if (phase === "boards" && boardSub) return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>EXAM BOARDS {"\u00b7"} {boardIdx + 1}/{selectedSubs.length} {"\u00b7"} optional</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>{boardSub.emoji} {boardSub.label} exam board?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>Skip if unsure {"\u2014"} your tutor will cover all boards.</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
      {BOARDS.map(b => {
        const on = p.examBoards[boardSub.id] === b;
        return <div key={b} className="so" onClick={() => setP(x => ({ ...x, examBoards: { ...x.examBoards, [boardSub.id]: on ? "" : b } }))} style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${on ? "#f0c040" : "rgba(255,255,255,0.15)"}`, background: on ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: on ? "#f0c040" : "rgba(255,255,255,0.8)", fontWeight: on ? 700 : 400, cursor: "pointer", textAlign: "center", fontSize: 14 }}>{b}</div>;
      })}
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <button className="hb" onClick={nextBoard} style={{ flex: 1, padding: 14, borderRadius: 10, border: "2px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontWeight: 700, cursor: "pointer" }}>Skip</button>
      <button className="hb" onClick={nextBoard} style={{ flex: 2, padding: 14, borderRadius: 10, border: "none", background: "#f0c040", color: "#1a1a2e", fontWeight: 700, cursor: "pointer" }}>
        {boardIdx === selectedSubs.length - 1 ? "Meet Your Tutors \u2192" : "Next \u2192"}
      </button>
    </div>
  </>);

  return null;
}
