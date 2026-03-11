import { useState, useRef, useEffect, useCallback, Component } from "react";

/* Extracted utilities & config */
import { renderMd } from "./utils/markdown.jsx";
import { SUBJECTS, SUBJECT_TOPICS, BOARDS, YEARS, TIERS, ALL_SUBJECT_IDS, ALL_SUBJECT_LIST, mySubjects, emptyMats } from "./config/subjects.js";
import { KEYS, readJSON, writeJSON, setActiveStudent, sKey, migrateIfNeeded, loadProfile, saveProfile, loadMemory, saveMemory, getSessions, addSessionToMem, clearSubjectMem, clearAllMem, exportData, importData } from "./utils/storage.js";
import { XP_KEYS, todayStr, loadXP, saveXP, addXP, xpLevel, LEVEL_EMOJIS, loadStreaks, saveStreaks, recordActivity, calcStreak, weekHeatmap } from "./utils/xp.js";
import { getConfidence, avgConfidence, TOPIC_KEY, loadTopicProgress, saveTopicProgress, recordTopicStudy, getTopicProgress, topicPct } from "./utils/topics.js";
import { sbTest, sbSave, sbLoad, mergeMemory, sbSaveSetting, sbLoadSettings } from "./utils/cloudSync.js";
import { MODEL, SUMMARY_PROMPT, apiSend, apiSummary, buildSystemPrompt, buildApiMsgs } from "./utils/api.js";
import { MAX_MB, ACCEPT_TYPES, processFiles } from "./utils/files.js";
import { HAS_MEDIA_RECORDER, speakText, stopSpeaking } from "./utils/speech.js";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";

/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  GCSE TUTOR HUB v2.0                                           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const APP_VERSION = "3.4.2 (10 Mar 2026, 10:00)";

const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Source Sans 3', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
@keyframes mi { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
@keyframes db { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-7px) } }
@keyframes ci { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
textarea { outline: none; }
.btn { transition: all .2s; cursor: pointer; }
.btn:hover { opacity: .85; }
.card { transition: all .25s; cursor: pointer; }
.card:hover { transform: translateY(-4px); }
.hb:hover { transform: translateY(-2px); }
.so:hover { transform: scale(1.03); }
@keyframes mp { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4) } 50% { box-shadow: 0 0 0 10px rgba(220,38,38,0) } }
`;

/* Inline definitions removed — now imported from ./utils/ and ./config/ */
/* (See: markdown.jsx, subjects.js, storage.js, xp.js, topics.js, cloudSync.js, api.js, files.js, speech.js, useSpeechRecognition.js) */
/* ═══════════════════════════════════════════════════════════════════
   ERROR BOUNDARY — catches crashes, shows recovery button
   ═══════════════════════════════════════════════════════════════════ */

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", fontFamily: "'Source Sans 3', sans-serif" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u26a0\ufe0f"}</div>
          <h2 style={{ marginBottom: 12, fontFamily: "'Playfair Display', serif" }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: 20 }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


/* ═══════════════════════════════════════════════════════════════════
   SETUP — driven by subject registry. No API key screen needed
   (all keys are in Vercel environment variables).
   ═══════════════════════════════════════════════════════════════════ */

function Setup({ onDone }) {
  const [phase, setPhase] = useState("name"); // "name" | "checking" | "year" | "tier" | "subjects" | "boards"
  const [p, setP] = useState({ name: "", year: "", tier: "", examBoards: {}, subjects: [], tutorCharacters: {} });
  const [boardIdx, setBoardIdx] = useState(0);
  const upd = (f, v) => setP(x => ({ ...x, [f]: v }));
  const toggleSub = id => setP(x => ({ ...x, subjects: x.subjects.includes(id) ? x.subjects.filter(s => s !== id) : [...x.subjects, id] }));

  async function afterName() {
    const name = p.name.trim();
    if (!name) return;
    setPhase("checking");
    try {
      const settings = await sbLoadSettings(name);
      if (settings?.profile && settings.profile.year) {
        onDone({ ...settings.profile, name });
        return;
      }
    } catch {}
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

  if (phase === "name" || phase === "checking") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>WELCOME</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>What's your name?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Your tutors will use this throughout your sessions</p>
    <input autoFocus value={p.name} onChange={e => upd("name", e.target.value)} onKeyDown={e => e.key === "Enter" && afterName()} placeholder="Enter your first name..." disabled={phase === "checking"}
      style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 18, outline: "none", marginBottom: 20 }} />
    <button className="hb" onClick={afterName} disabled={!p.name.trim() || phase === "checking"}
      style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.name.trim() && phase !== "checking" ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.name.trim() ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
      {phase === "checking" ? "Checking..." : "Continue \u2192"}
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


/* ═══════════════════════════════════════════════════════════════════
   MODALS — Materials, Memory, Dashboard, Supabase, Summary
   ═══════════════════════════════════════════════════════════════════ */

function MaterialsPanel({ subject, mats, onAdd, onRemove, onClose }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [err, setErr] = useState(null);
  const [drag, setDrag] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ background: subject.gradient, borderRadius: "24px 24px 0 0", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: "0.1em" }}>{subject.emoji} {subject.label.toUpperCase()}</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>Teacher Materials</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>{"\u2715"} Close</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div onClick={() => cameraRef.current?.click()}
              style={{ flex: 1, border: "2px solid " + subject.color, borderRadius: 14, padding: "20px 12px", textAlign: "center", cursor: "pointer", background: subject.color + "08", transition: "all .2s" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{"\ud83d\udcf7"}</div>
              <div style={{ fontWeight: 700, color: subject.color, fontSize: 14 }}>Take Photo</div>
              <div style={{ color: "#999", fontSize: 11, marginTop: 2 }}>Snap a worksheet or notes</div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => processFiles(e.target.files, onAdd, setErr)} />
            </div>
            <div onClick={() => fileRef.current?.click()}
              style={{ flex: 1, border: "2px dashed #ddd", borderRadius: 14, padding: "20px 12px", textAlign: "center", cursor: "pointer", background: "#fafafa", transition: "all .2s" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{"\ud83d\udcce"}</div>
              <div style={{ fontWeight: 700, color: "#333", fontSize: 14 }}>Upload File</div>
              <div style={{ color: "#999", fontSize: 11, marginTop: 2 }}>PDFs, photos, text files</div>
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => processFiles(e.target.files, onAdd, setErr)} />
            </div>
          </div>
          {err && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{"\u26a0\ufe0f"} {err}</div>}
          {mats.length === 0 ? <div style={{ textAlign: "center", color: "#bbb", fontSize: 14, padding: 20 }}>No materials yet. Upload files and your tutor will use them automatically.</div> :
            <>{mats.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #f0f0f0", marginBottom: 6, background: "#fafafa" }}>
                {m.preview ? <img src={m.preview} alt={m.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: subject.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{m.isPdf ? "\ud83d\udcc4" : "\ud83d\udcdd"}</div>}
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div><div style={{ fontSize: 11, color: "#aaa" }}>{m.type.toUpperCase()} {"\u00b7"} {m.uploadedAt} {"\u00b7"} {(m.size / 1024).toFixed(0)}KB</div></div>
                <button onClick={() => onRemove(m.id)} style={{ background: "none", border: "1px solid #eee", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "#999", fontSize: 11 }}>Remove</button>
              </div>
            ))}</>
          }
        </div>
      </div>
    </div>
  );
}

function MemoryManager({ memory, profile, onClearSubject, onClearAll, onClose, onImport }) {
  const fileRef = useRef(null);
  const totalSessions = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  function download() {
    const data = exportData(memory, profile);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gcse-tutor-backup-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
  }
  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const text = await file.text(); const { profile: p, memory: m } = importData(text); if (window.confirm("Replace all current data with this backup?")) onImport(p, m); }
    catch (err) { alert("Import failed: " + err.message); }
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#302b63)", borderRadius: "24px 24px 0 0", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.1em" }}>MEMORY MANAGER</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{profile?.name}'s Memory</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>{"\u2715"} Close</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          <div style={{ padding: "14px 16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#0369a1", fontWeight: 700, marginBottom: 4 }}>{"\ud83d\udcbe"} {totalSessions} session{totalSessions !== 1 ? "s" : ""} stored</div>
            <div style={{ fontSize: 12, color: "#0284c7", lineHeight: 1.6 }}>Memory persists in your browser. Export a backup regularly to be safe.</div>
          </div>
          {ALL_SUBJECT_LIST.map(t => {
            const sums = getSessions(memory, t.id);
            return (
              <div key={t.id} style={{ marginBottom: 12, borderRadius: 14, border: "1px solid #f0f0f0", overflow: "hidden" }}>
                <div style={{ background: t.gradient, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{t.emoji} {t.label} {"\u2014"} {sums.length} session{sums.length !== 1 ? "s" : ""}</div>
                  {sums.length > 0 && <button onClick={() => { if (window.confirm("Clear all " + t.label + " memory?")) onClearSubject(t.id); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Clear</button>}
                </div>
                {sums.length > 0 ? <div style={{ padding: "10px 14px", background: "#fafafa" }}>{sums.slice(-3).map((s, i) => <div key={i} style={{ fontSize: 12, color: "#666", padding: "6px 0", borderBottom: i < Math.min(sums.length, 3) - 1 ? "1px solid #f0f0f0" : "none" }}><strong>{s.date}</strong> {"\u2014"} {(s.rawSummaryText || "").slice(0, 80)}</div>)}{sums.length > 3 && <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>+ {sums.length - 3} earlier</div>}</div> : <div style={{ padding: "12px 14px", color: "#bbb", fontSize: 13 }}>No sessions yet</div>}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={download} style={{ flex: 1, padding: 11, borderRadius: 10, border: "2px solid #1a3a7a", background: "transparent", color: "#1a3a7a", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\udce5"} Export Backup</button>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: 11, borderRadius: 10, border: "2px solid #059669", background: "transparent", color: "#059669", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\udce4"} Import Backup</button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
          </div>
          <button onClick={() => { if (window.confirm("Clear ALL memory for all subjects? This cannot be undone.")) onClearAll(); }} style={{ width: "100%", marginTop: 8, padding: 11, borderRadius: 10, border: "2px solid #dc2626", background: "transparent", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\uddd1\ufe0f"} Clear All Memory</button>
        </div>
      </div>
    </div>
  );
}

function SummaryModal({ subject, sessionData, onClose }) {
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

function Dashboard({ memory, mats, profile, onClose }) {
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


/* ═══════════════════════════════════════════════════════════════════
   SETTINGS MODAL — edit profile, per-subject exam boards & tutor character
   ═══════════════════════════════════════════════════════════════════ */

function SettingsModal({ profile, onSave, onClose }) {
  const [p, setP] = useState({ ...profile, examBoards: { ...profile.examBoards }, tutorCharacters: { ...profile.tutorCharacters }, subjects: [...(profile.subjects || [])] });
  const [tab, setTab] = useState("profile");
  const upd = (field, val) => setP(x => ({ ...x, [field]: val }));
  const updBoard = (sid, val) => setP(x => ({ ...x, examBoards: { ...x.examBoards, [sid]: val } }));
  const updChar = (sid, val) => setP(x => ({ ...x, tutorCharacters: { ...x.tutorCharacters, [sid]: val } }));
  const toggleSub = id => setP(x => ({ ...x, subjects: x.subjects.includes(id) ? x.subjects.filter(s => s !== id) : [...x.subjects, id] }));
  function save() { onSave(p); }
  const mySubs = p.subjects.map(id => SUBJECTS[id]).filter(Boolean);
  const tabs = [{ id: "profile", label: "Profile", emoji: "\ud83d\udc64" }, { id: "subjects", label: "Subjects", emoji: "\ud83d\udcda" }, ...mySubs.map(s => ({ id: s.id, label: s.label, emoji: s.emoji }))];
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
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Year</div><div style={{ display: "flex", gap: 8 }}>{YEARS.map(y => <button key={y} onClick={() => upd("year", y)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (p.year === y ? "#f0c040" : "#e0e0e0"), background: p.year === y ? "#fef9e7" : "#fff", color: "#333", fontWeight: p.year === y ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{y}</button>)}</div></div>
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Tier</div><div style={{ display: "flex", gap: 8 }}>{TIERS.map(t => <button key={t} onClick={() => upd("tier", t)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (p.tier === t ? "#f0c040" : "#e0e0e0"), background: p.tier === t ? "#fef9e7" : "#fff", color: "#333", fontWeight: p.tier === t ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{t}</button>)}</div></div>
            <div style={{ marginTop: 24, padding: "12px 14px", borderRadius: 10, background: "#f8f8f8", border: "1px solid #eee" }}><div style={{ fontSize: 11, color: "#bbb" }}>GCSE Tutor Hub v{APP_VERSION}</div></div>
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


/* ═══════════════════════════════════════════════════════════════════
   TOPICS PANEL — exam topic breakdown with progress tracking
   ═══════════════════════════════════════════════════════════════════ */

function TopicsPanel({ subject, profile, topicData, onStudy, onClose }) {
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




/* ═══════════════════════════════════════════════════════════════════
   QUICK QUIZ — Simple auto-start, 10 MC questions biased toward
   recently studied & weak topics from session memory
   ═══════════════════════════════════════════════════════════════════ */

function QuickQuiz({ subject, profile, memory, topicData, onClose, onXP, onQuizComplete }) {
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const board = profile.examBoards?.[subject.id] || "";
    // Gather weak/recent topics from memory to focus the quiz
    const conf = getConfidence(memory, subject.id);
    const prog = getTopicProgress(topicData, subject.id);
    const weakTopics = Object.entries(conf).filter(([, v]) => v < 60).map(([t]) => t);
    const recentTopics = Object.entries(prog).sort((a, b) => (b[1].lastDate || "").localeCompare(a[1].lastDate || "")).slice(0, 6).map(([t]) => t);
    const focusTopics = [...new Set([...weakTopics, ...recentTopics])].slice(0, 8);
    const topicHint = focusTopics.length > 0 ? `\nFocus especially on these topics the student has been studying: ${focusTopics.join(", ")}.` : "";

    const sys = `You are a GCSE ${subject.label} quiz generator. Student: ${profile.name}, ${profile.year}, ${profile.tier}. Board: ${board || "general"}.`;
    const prompt = `Generate exactly 10 multiple-choice questions for GCSE ${subject.label}${board ? " (" + board + ")" : ""}, ${profile.tier} tier. Mix easy and medium difficulty.${topicHint}\n\nReturn ONLY valid JSON array (no markdown, no backticks):\n[{"q":"question text","options":["A","B","C","D"],"correct":0,"explanation":"brief explanation"}]\nwhere correct is the 0-based index of the right answer.`;
    apiSend(sys, [{ role: "user", content: prompt }], 2000).then(raw => {
      try {
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length >= 3) { setQuestions(parsed.slice(0, 10)); setPhase("question"); }
        else throw new Error("bad");
      } catch { setErr("Couldn't generate quiz. Try again!"); setPhase("result"); }
    }).catch(e => { setErr(e.message); setPhase("result"); });
  }, [subject, profile, memory, topicData]);

  function answer(idx) {
    const correct = questions[qi].correct === idx;
    setAnswers(prev => [...prev, { chosen: idx, correct }]);
    if (correct) onXP(20, "Quiz correct");
  }
  function nextQ() {
    if (qi < questions.length - 1) setQi(qi + 1);
    else {
      onXP(30, "Quiz completed");
      const finalAnswers = [...answers];
      if (onQuizComplete) onQuizComplete({ questions, answers: finalAnswers, subjectId: subject.id, quizType: "quick" });
      setPhase("result");
    }
  }

  const score = answers.filter(a => a.correct).length;
  const total = questions.length;
  const q = questions[qi];
  const answered = answers.length > qi;
  const pct = total ? Math.round(score / total * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>QUICK QUIZ</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div></div>
          {phase === "question" && <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{qi + 1}/{total}</div>}
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: 22 }}>
          {phase === "loading" && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 32, marginBottom: 12 }}>{"\u26a1"}</div><div style={{ color: "#666", fontSize: 14 }}>Generating 10 questions...</div><div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 16 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: subject.color, animation: `db 1.2s ease ${i * .2}s infinite` }} />)}</div></div>}

          {phase === "question" && q && <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(q.options || []).map((opt, oi) => {
                const wasChosen = answered && answers[qi]?.chosen === oi;
                const isCorrect = q.correct === oi;
                const bg = !answered ? "#fafafa" : isCorrect ? "#dcfce7" : wasChosen ? "#fee2e2" : "#fafafa";
                const border = !answered ? "#e0e0e0" : isCorrect ? "#22c55e" : wasChosen ? "#ef4444" : "#e0e0e0";
                return <div key={oi} onClick={() => !answered && answer(oi)} style={{ padding: "12px 14px", borderRadius: 12, border: "2px solid " + border, background: bg, cursor: answered ? "default" : "pointer", fontSize: 13, color: "#333", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: !answered ? subject.color + "20" : isCorrect ? "#22c55e" : wasChosen ? "#ef4444" : "#eee", color: !answered ? subject.color : isCorrect || wasChosen ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</span>
                  {opt}
                </div>;
              })}
            </div>
            {answered && q.explanation && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>{answers[qi]?.correct ? "\u2705 " : "\u274c "}{q.explanation}</div>}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>{questions.map((_, i) => <div key={i} style={{ width: i === qi ? 18 : 7, height: 7, borderRadius: 4, background: i < answers.length ? (answers[i]?.correct ? "#22c55e" : "#ef4444") : i === qi ? subject.color : "#e0e0e0", transition: "all .3s" }} />)}</div>
            {answered && <button onClick={nextQ} style={{ marginTop: 14, width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{qi < questions.length - 1 ? "Next \u2192" : "See Results"}</button>}
          </div>}

          {phase === "result" && <div style={{ textAlign: "center", padding: "20px 0" }}>
            {err ? <><div style={{ fontSize: 32, marginBottom: 8 }}>{"\u26a0\ufe0f"}</div><div style={{ color: "#666", marginBottom: 16 }}>{err}</div></> : <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "\ud83c\udf89" : pct >= 60 ? "\ud83d\udc4d" : pct >= 40 ? "\ud83d\udcaa" : "\ud83d\udca1"}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{score}/{total}</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>{pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : pct >= 40 ? "Getting there!" : "Keep practising!"}</div>
              <div style={{ fontSize: 13, color: subject.color, fontWeight: 700, marginBottom: 16 }}>+{score * 20 + 30} XP earned</div>
              {questions.map((q, i) => <div key={i} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 10, background: answers[i]?.correct ? "#f0fdf4" : "#fef2f2", marginBottom: 5, fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>{answers[i]?.correct ? "\u2705" : "\u274c"}</span> {q.q.slice(0, 55)}{q.q.length > 55 ? "..." : ""}
                {!answers[i]?.correct && q.options && <span style={{ color: "#666" }}> {"\u2014"} {q.options[q.correct]}</span>}
              </div>)}
            </>}
            <button onClick={onClose} style={{ marginTop: 16, padding: "12px 28px", borderRadius: 12, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
          </div>}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   QUIZ BUILDER — full setup: 5 question types, materials upload,
   coverage tracking on results
   ═══════════════════════════════════════════════════════════════════ */

function QuizBuilder({ subject, profile, onClose, onXP, onQuizComplete }) {
  const [phase, setPhase] = useState("setup");
  const [questions, setQuestions] = useState([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [err, setErr] = useState(null);
  const [qCount, setQCount] = useState(5);
  const [qTypes, setQTypes] = useState({ mc: true, tf: false, short: false, fill: false, match: false });
  const [quizMats, setQuizMats] = useState([]);
  const [typedAns, setTypedAns] = useState("");
  const [coverage, setCoverage] = useState(null);
  const [desc, setDesc] = useState("");
  const [loadMsg, setLoadMsg] = useState("Building your quiz...");
  const fileRef = useRef(null);

  const QTYPES = [
    { id: "mc", label: "Multiple Choice", emoji: "\ud83d\udd18", desc: "Pick from 4 options" },
    { id: "tf", label: "True / False", emoji: "\u2705", desc: "Is the statement correct?" },
    { id: "short", label: "Short Answer", emoji: "\u270d\ufe0f", desc: "Type your answer" },
    { id: "fill", label: "Fill the Blank", emoji: "\u2702\ufe0f", desc: "Complete the sentence" },
    { id: "match", label: "Key Terms", emoji: "\ud83d\udd17", desc: "Match terms to definitions" },
  ];
  const anyType = Object.values(qTypes).some(v => v);
  const hasMats = quizMats.length > 0;

  async function handleFiles(files) {
    for (const f of Array.from(files)) {
      if (f.size > 8 * 1024 * 1024) continue;
      const isImg = f.type.startsWith("image/"), isPdf = f.type === "application/pdf", isText = f.type.startsWith("text/");
      if (!isImg && !isPdf && !isText) continue;
      try {
        let base64 = null, textContent = null;
        if (isText) textContent = await f.text();
        else base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = () => rej(); r.readAsDataURL(f); });
        setQuizMats(prev => [...prev, { id: Date.now() + Math.random(), name: f.name, isImg, isPdf, isText, base64, textContent, mediaType: f.type }]);
      } catch {}
    }
  }

  async function startQuiz() {
    if (!anyType) return;
    setPhase("loading");
    const selectedTypes = Object.entries(qTypes).filter(([, v]) => v).map(([k]) => k);
    const typeInstr = selectedTypes.map(t => {
      if (t === "mc") return '"mc": {"type":"mc","q":"question","options":["A","B","C","D"],"correct":0,"explanation":"brief"}';
      if (t === "tf") return '"tf": {"type":"tf","q":"true-or-false statement","correct":true,"explanation":"brief"}';
      if (t === "short") return '"short": {"type":"short","q":"question","answer":"correct answer","keywords":["key","words"],"explanation":"brief"}';
      if (t === "fill") return '"fill": {"type":"fill","q":"Sentence with _____ for blank","answer":"missing word","explanation":"brief"}';
      if (t === "match") return '"match": {"type":"match","pairs":[{"term":"t1","def":"d1"},{"term":"t2","def":"d2"},{"term":"t3","def":"d3"},{"term":"t4","def":"d4"}],"explanation":"brief"}';
      return "";
    }).join("\n");
    const board = profile.examBoards?.[subject.id] || "";
    const matNote = hasMats ? `\n\nIMPORTANT: Base ALL questions on the uploaded materials (${quizMats.map(m => m.name).join(", ")}). Cover as many different sections as possible.` : "";
    const sys = `You are a GCSE ${subject.label} quiz generator. Student: ${profile.name}, ${profile.year}, ${profile.tier}. Board: ${board || "general"}.`;
    const descNote = desc.trim() ? `\n\nSTUDENT'S TEST DESCRIPTION: ${desc.trim()}` : "";

    // Build material messages (reused across batches)
    const matMsgs = [];
    const media = quizMats.filter(m => m.isImg || m.isPdf).map(m => ({ type: m.isPdf ? "document" : "image", source: { type: "base64", media_type: m.mediaType, data: m.base64 } }));
    const textMat = quizMats.filter(m => m.isText).map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n");
    if (media.length || textMat) {
      const parts = [...media];
      parts.push({ type: "text", text: textMat ? "STUDY MATERIALS:\n" + textMat : "Study materials uploaded. Base all questions on them." });
      matMsgs.push({ role: "user", content: parts });
      matMsgs.push({ role: "assistant", content: "I've reviewed the materials. I'll generate quiz questions based on them." });
    }

    // Generate in batches of 10 for reliability
    const batchSize = 10;
    const allQ = [];
    let lastCoverage = null;
    try {
      const batches = Math.ceil(qCount / batchSize);
      for (let b = 0; b < batches; b++) {
        const thisCount = Math.min(batchSize, qCount - allQ.length);
        if (batches > 1) setLoadMsg(`Generating questions ${allQ.length + 1}\u2013${allQ.length + thisCount} of ${qCount}...`);
        const already = allQ.length > 0 ? `\n\nQuestions already generated (do NOT repeat):\n${allQ.map(q => q.q || "match").join("\n")}` : "";
        const covNote = (b === batches - 1 && hasMats) ? '\nAlso add "coveragePct" (0-100) estimating what % of the material is tested across ALL questions.' : "";
        const prompt = `Generate exactly ${thisCount} questions for GCSE ${subject.label}${board ? " (" + board + ")" : ""}, ${profile.tier} tier. Mix difficulty.${descNote}\n\nUse ONLY these types (distribute evenly):\n${typeInstr}\n\nReturn ONLY valid JSON (no markdown, no backticks):\n{"questions":[...array...]${covNote ? ',"coveragePct":50' : ""}}${matNote}${already}${covNote}`;
        const apiMsgs = [...matMsgs, { role: "user", content: prompt }];
        const raw = await apiSend(sys, apiMsgs, Math.min(8000, thisCount * 200 + 400));
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const qs = parsed.questions || parsed;
        if (Array.isArray(qs)) allQ.push(...qs.slice(0, thisCount));
        if (parsed.coveragePct) lastCoverage = parsed.coveragePct;
      }
      if (allQ.length >= 2) { setQuestions(allQ.slice(0, qCount)); if (lastCoverage) setCoverage(lastCoverage); setPhase("question"); }
      else throw new Error("bad");
    } catch (e) { setErr(e.message === "bad" ? "Couldn't generate quiz. Try again!" : e.message); setPhase("result"); }
  }

  function answerMC(idx) { const c = questions[qi].correct === idx; setAnswers(p => [...p, { chosen: idx, correct: c, type: "mc" }]); if (c) onXP(20, "Quiz correct"); }
  function answerTF(val) { const c = questions[qi].correct === val; setAnswers(p => [...p, { chosen: val, correct: c, type: "tf" }]); if (c) onXP(20, "Quiz correct"); }
  function answerTyped() {
    const q = questions[qi]; const ua = typedAns.trim().toLowerCase(); if (!ua) return;
    let c = false; const ans = (q.answer || "").toLowerCase(); const kw = q.keywords || [];
    if (q.type === "fill") c = ua === ans || kw.some(k => ua.includes(k.toLowerCase()));
    else c = ua === ans || (kw.length > 0 && kw.filter(k => ua.includes(k.toLowerCase())).length >= Math.ceil(kw.length * 0.5));
    setAnswers(p => [...p, { typed: typedAns.trim(), correct: c, type: q.type, expected: q.answer }]); if (c) onXP(25, "Quiz typed correct"); setTypedAns("");
  }
  function nextQ() {
    if (qi < questions.length - 1) setQi(qi + 1);
    else {
      onXP(30, "Quiz completed");
      const finalAnswers = [...answers];
      if (onQuizComplete) onQuizComplete({ questions, answers: finalAnswers, subjectId: subject.id, quizType: "builder" });
      setPhase("result");
    }
  }

  const score = answers.filter(a => a.correct).length;
  const total = questions.length;
  const q = questions[qi];
  const answered = answers.length > qi;
  const pct = total ? Math.round(score / total * 100) : 0;

  /* Match sub-component */
  function MatchQ({ q, onDone, done, ans, color }) {
    const [shuffled] = useState(() => q.pairs.map((_, i) => i).sort(() => Math.random() - 0.5));
    const [sel, setSel] = useState(null);
    const [matches, setMatches] = useState({});
    const full = Object.keys(matches).length === q.pairs.length;
    function check() {
      const sc = q.pairs.filter((_, i) => shuffled[matches[i]] === i).length;
      onDone(sc === q.pairs.length, sc);
    }
    return <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Match each term to its definition:</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>{q.pairs.map((p, i) => <div key={i} onClick={() => !done && matches[i] === undefined && setSel(i)} style={{ padding: "9px 11px", borderRadius: 10, marginBottom: 5, border: "2px solid " + (sel === i ? color : matches[i] !== undefined ? "#22c55e" : "#e0e0e0"), background: matches[i] !== undefined ? "#f0fdf4" : sel === i ? color + "12" : "#fafafa", cursor: done || matches[i] !== undefined ? "default" : "pointer", fontSize: 12, fontWeight: 600 }}>{p.term}</div>)}</div>
        <div style={{ flex: 1 }}>{shuffled.map((si, di) => { const used = Object.values(matches).includes(di); return <div key={di} onClick={() => { if (done || used || sel === null) return; setMatches(p => ({ ...p, [sel]: di })); setSel(null); }} style={{ padding: "9px 11px", borderRadius: 10, marginBottom: 5, border: "2px solid " + (used ? "#22c55e" : "#e0e0e0"), background: used ? "#f0fdf4" : "#fafafa", cursor: done || used || sel === null ? "default" : "pointer", fontSize: 11, color: "#555", opacity: used ? 0.6 : 1 }}>{q.pairs[si].def}</div>; })}</div>
      </div>
      {!done && full && <button onClick={check} style={{ marginTop: 8, width: "100%", padding: "10px", borderRadius: 10, border: "none", background: color, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Check</button>}
      {done && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: ans?.correct ? "#22c55e" : "#f59e0b" }}>{ans?.correct ? "\u2705 Perfect!" : `Got ${ans?.matchScore || 0}/${q.pairs.length}`}</div>}
    </div>;
  }

  /* ── SETUP ── */
  if (phase === "setup") return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>QUIZ BUILDER</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Describe Your Test (optional)</div>
          <div style={{ marginBottom: 18 }}>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="e.g. End of topic test on Chapter 5, focus on vocabulary and grammar tenses, mock exam style questions, Year 11 revision for Paper 2..." style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, lineHeight: 1.5, outline: "none", resize: "vertical" }} />
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>Describe what you're revising for, topics to focus on, or any special requirements</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Question Types</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {QTYPES.map(t => <div key={t.id} onClick={() => setQTypes(p => ({ ...p, [t.id]: !p[t.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "2px solid " + (qTypes[t.id] ? subject.color : "#e0e0e0"), background: qTypes[t.id] ? subject.color + "10" : "#fafafa", cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>{t.emoji}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: qTypes[t.id] ? subject.color : "#555" }}>{t.label}</div><div style={{ fontSize: 10, color: "#999" }}>{t.desc}</div></div>
              {qTypes[t.id] && <span style={{ color: subject.color, fontWeight: 700, fontSize: 16 }}>{"\u2713"}</span>}
            </div>)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Number of Questions</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {[5, 10, 20, 30, 50].map(n => <button key={n} onClick={() => setQCount(n)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "2px solid " + (qCount === n ? subject.color : "#e0e0e0"), background: qCount === n ? subject.color + "15" : "#fff", color: qCount === n ? subject.color : "#666", fontWeight: qCount === n ? 700 : 400, fontSize: 14, cursor: "pointer" }}>{n}</button>)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Study Materials (optional)</div>
          <div style={{ marginBottom: 18 }}>
            <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #ddd", borderRadius: 12, padding: "16px 14px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{"\ud83d\udcce"}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>Upload worksheets, notes, or photos</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Quiz will be based on these materials</div>
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            </div>
            {quizMats.length > 0 && <div style={{ marginTop: 8 }}>{quizMats.map(m => <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{m.isPdf ? "\ud83d\udcc4" : m.isImg ? "\ud83d\uddbc\ufe0f" : "\ud83d\udcdd"}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
              <button onClick={() => setQuizMats(prev => prev.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 11 }}>{"\u2715"}</button>
            </div>)}</div>}
          </div>
          <button onClick={startQuiz} disabled={!anyType} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: anyType ? subject.color : "#e0e0e0", color: anyType ? "#fff" : "#aaa", fontWeight: 700, fontSize: 15, cursor: anyType ? "pointer" : "default" }}>{"\ud83d\udee0\ufe0f"} Build My Quiz</button>
        </div>
      </div>
    </div>
  );

  /* ── QUIZ (loading / question / result) ── */
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{hasMats ? "MATERIALS QUIZ" : "QUIZ BUILDER"}</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div></div>
          {phase === "question" && <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{qi + 1}/{total}</div>}
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: 22 }}>
          {phase === "loading" && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 32, marginBottom: 12 }}>{"\ud83d\udee0\ufe0f"}</div><div style={{ color: "#666", fontSize: 14 }}>{loadMsg}</div><div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 16 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: subject.color, animation: `db 1.2s ease ${i * .2}s infinite` }} />)}</div></div>}

          {phase === "question" && q && <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: subject.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{q.type === "mc" ? "Multiple Choice" : q.type === "tf" ? "True / False" : q.type === "short" ? "Short Answer" : q.type === "fill" ? "Fill the Blank" : q.type === "match" ? "Key Terms" : "Question"}</div>

            {/* MC */}
            {(q.type === "mc" || (!q.type && q.options)) && <><div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{(q.options || []).map((opt, oi) => { const wc = answered && answers[qi]?.chosen === oi; const ic = q.correct === oi; return <div key={oi} onClick={() => !answered && answerMC(oi)} style={{ padding: "12px 14px", borderRadius: 12, border: "2px solid " + (!answered ? "#e0e0e0" : ic ? "#22c55e" : wc ? "#ef4444" : "#e0e0e0"), background: !answered ? "#fafafa" : ic ? "#dcfce7" : wc ? "#fee2e2" : "#fafafa", cursor: answered ? "default" : "pointer", fontSize: 13, color: "#333", display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 24, height: 24, borderRadius: "50%", background: !answered ? subject.color + "20" : ic ? "#22c55e" : wc ? "#ef4444" : "#eee", color: !answered ? subject.color : ic || wc ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</span>{opt}</div>; })}</div></>}

            {/* TF */}
            {q.type === "tf" && <><div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div><div style={{ display: "flex", gap: 10 }}>{[true, false].map(v => { const wc = answered && answers[qi]?.chosen === v; const ic = q.correct === v; return <div key={String(v)} onClick={() => !answered && answerTF(v)} style={{ flex: 1, padding: 16, borderRadius: 12, border: "2px solid " + (!answered ? "#e0e0e0" : ic ? "#22c55e" : wc ? "#ef4444" : "#e0e0e0"), background: !answered ? "#fafafa" : ic ? "#dcfce7" : wc ? "#fee2e2" : "#fafafa", cursor: answered ? "default" : "pointer", textAlign: "center", fontSize: 15, fontWeight: 700, color: "#333" }}>{v ? "\u2705 True" : "\u274c False"}</div>; })}</div></>}

            {/* SHORT / FILL */}
            {(q.type === "short" || q.type === "fill") && <><div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div>{!answered ? <div style={{ display: "flex", gap: 8 }}><input value={typedAns} onChange={e => setTypedAns(e.target.value)} onKeyDown={e => e.key === "Enter" && answerTyped()} placeholder={q.type === "fill" ? "Fill in the blank..." : "Type your answer..."} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 14, outline: "none" }} autoFocus /><button onClick={answerTyped} disabled={!typedAns.trim()} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: typedAns.trim() ? subject.color : "#e0e0e0", color: typedAns.trim() ? "#fff" : "#aaa", fontWeight: 700, cursor: typedAns.trim() ? "pointer" : "default" }}>{"\u2191"}</button></div> : <div style={{ padding: "10px 14px", borderRadius: 10, background: answers[qi]?.correct ? "#dcfce7" : "#fee2e2", border: "1px solid " + (answers[qi]?.correct ? "#86efac" : "#fca5a5") }}><div style={{ fontSize: 13 }}><strong>Your answer:</strong> {answers[qi]?.typed}</div>{!answers[qi]?.correct && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}><strong>Expected:</strong> {q.answer}</div>}</div>}</>}

            {/* MATCH */}
            {q.type === "match" && q.pairs && <MatchQ q={q} onDone={(c, sc) => { setAnswers(p => [...p, { correct: c, matchScore: sc, type: "match" }]); if (c) onXP(25, "Match perfect"); else if (sc >= 2) onXP(10, "Match partial"); }} done={answered} ans={answers[qi]} color={subject.color} />}

            {answered && q.explanation && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>{answers[qi]?.correct ? "\u2705 " : "\u274c "}{q.explanation}</div>}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>{questions.map((_, i) => <div key={i} style={{ width: i === qi ? 18 : 7, height: 7, borderRadius: 4, background: i < answers.length ? (answers[i]?.correct ? "#22c55e" : "#ef4444") : i === qi ? subject.color : "#e0e0e0", transition: "all .3s" }} />)}</div>
            {answered && <button onClick={nextQ} style={{ marginTop: 14, width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{qi < questions.length - 1 ? "Next \u2192" : "See Results"}</button>}
          </div>}

          {phase === "result" && <div style={{ textAlign: "center", padding: "20px 0" }}>
            {err ? <><div style={{ fontSize: 32, marginBottom: 8 }}>{"\u26a0\ufe0f"}</div><div style={{ color: "#666", marginBottom: 16 }}>{err}</div></> : <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "\ud83c\udf89" : pct >= 60 ? "\ud83d\udc4d" : pct >= 40 ? "\ud83d\udcaa" : "\ud83d\udca1"}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{score}/{total}</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>{pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : pct >= 40 ? "Getting there!" : "Keep practising!"}</div>
              <div style={{ fontSize: 13, color: subject.color, fontWeight: 700, marginBottom: 8 }}>+{answers.reduce((a, x) => a + (x.correct ? (x.type === "short" || x.type === "fill" || x.type === "match" ? 25 : 20) : (x.matchScore >= 2 ? 10 : 0)), 0) + 30} XP</div>
              {coverage !== null && hasMats && <div style={{ margin: "12px auto 16px", maxWidth: 300, padding: "14px 16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>{"\ud83d\udcca"} Materials Coverage</div>
                <div style={{ height: 8, borderRadius: 4, background: "#e0f2fe" }}><div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#0369a1,#38bdf8)", width: coverage + "%", transition: "width .5s" }} /></div>
                <div style={{ fontSize: 12, color: "#0369a1", marginTop: 4, fontWeight: 600 }}>~{coverage}% of your materials covered</div>
                {coverage < 60 && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Try another quiz to cover more!</div>}
              </div>}
              {questions.map((q, i) => <div key={i} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 10, background: answers[i]?.correct ? "#f0fdf4" : "#fef2f2", marginBottom: 5, fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>{answers[i]?.correct ? "\u2705" : "\u274c"}</span> {(q.q || "Match terms").slice(0, 55)}{(q.q || "").length > 55 ? "..." : ""}
                {!answers[i]?.correct && q.type === "mc" && q.options && <span style={{ color: "#666" }}> {"\u2014"} {q.options[q.correct]}</span>}
                {!answers[i]?.correct && (q.type === "short" || q.type === "fill") && <span style={{ color: "#666" }}> {"\u2014"} {q.answer}</span>}
                {!answers[i]?.correct && q.type === "tf" && <span style={{ color: "#666" }}> {"\u2014"} {q.correct ? "True" : "False"}</span>}
              </div>)}
            </>}
            <button onClick={onClose} style={{ marginTop: 16, padding: "12px 28px", borderRadius: 12, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
          </div>}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */

migrateIfNeeded();

/* Set active student from saved profile so per-student keys work on first load */
{ const p = readJSON("gcse_profile_v2"); if (p?.name) setActiveStudent(p.name); }

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [memory, setMemory] = useState(loadMemory);
  const [sessions, setSessions] = useState({});
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const [mats, setMats] = useState(emptyMats);
  const [active, setActiveRaw] = useState(null);
  const [modal, setModal] = useState(null); // "mats"|"memory"|"dash"|"settings"|null
  const [showSum, setShowSum] = useState(null);
  const [examMode, setExamMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [autoSumming, setAutoSumming] = useState(false);
  const [sbSynced, setSbSynced] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [xpData, setXpData] = useState(loadXP);
  const [streakData, setStreakData] = useState(loadStreaks);
  const [quizSubject, setQuizSubject] = useState(null);
  const [topicData, setTopicData] = useState(loadTopicProgress);
  const [topicsFor, setTopicsFor] = useState(null);
  const [buildQuizFor, setBuildQuizFor] = useState(null); // subject for quiz builder
  const [storageFull, setStorageFull] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const lv = xpLevel(xpData.total);
  const streak = calcStreak(streakData.dates);
  const week = weekHeatmap(streakData.dates);

  const subject = active ? SUBJECTS[active] : null;
  const sess = active ? (sessions[active] || {}) : {};
  const msgs = sess.messages || [];
  const curMats = active ? (mats[active] || []) : [];
  const curMem = active ? getSessions(memory, active) : [];
  const totalMem = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  const voiceCfg = subject?.voice?.enabled ? subject.voice : null;

  // Voice state
  const [voiceMode, setVoiceMode] = useState(false);
  const [convoMode, setConvoMode] = useState(false); // continuous conversation loop
  const [speaking, setSpeaking] = useState(false);
  const prevMsgCountRef = useRef(0);
  const sendRef = useRef(null); // avoids stale closure in speech callback
  const convoRef = useRef(false); // tracks convoMode without stale closure
  convoRef.current = convoMode;

  // Speech recognition hook — records audio, transcribes via Whisper
  const { listening, transcribing, start: startMic, stop: stopMic, supported: micSupported } = useSpeechRecognition(
    voiceCfg?.lang || "es-ES",
    useCallback((text, isFinal) => {
      if (text.trim()) {
        setInput(text.trim());
        // Auto-send after Whisper returns transcript
        const t = text.trim();
        setTimeout(() => { setInput(""); if (sendRef.current) sendRef.current(t); }, 400);
      }
    }, [])
  );

  const startMicRef = useRef(startMic);
  startMicRef.current = startMic;

  // Auto-speak new assistant messages when voice mode is on
  useEffect(() => {
    if (!voiceMode || !voiceCfg || !msgs.length) return;
    if (msgs.length > prevMsgCountRef.current) {
      const last = msgs[msgs.length - 1];
      if (last.role === "assistant" && !last.content.startsWith("\u274c")) {
        setSpeaking(true);
        speakText(last.content, voiceCfg, () => {
          setSpeaking(false);
          // In conversation mode, auto-start recording after tutor finishes speaking
          if (convoRef.current) setTimeout(() => startMicRef.current(), 300);
        });
      }
    }
    prevMsgCountRef.current = msgs.length;
  }, [msgs.length, voiceMode, voiceCfg]);

  // Stop speaking when leaving a subject
  useEffect(() => { if (!active) { stopSpeaking(); setSpeaking(false); } }, [active]);

  // Turn off voice/convo mode when switching to a non-voice subject
  useEffect(() => { if (!voiceCfg) { setVoiceMode(false); setConvoMode(false); } }, [voiceCfg]);

  // Warn user if localStorage is full
  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener("storage-full", handler);
    return () => window.removeEventListener("storage-full", handler);
  }, []);

  // Persist memory
  useEffect(() => { saveMemory(memory); }, [memory]);

  // Persist XP and streaks
  useEffect(() => { saveXP(xpData); }, [xpData]);
  useEffect(() => { saveStreaks(streakData); }, [streakData]);

  // Record daily activity whenever they use the app
  useEffect(() => {
    if (profile) setStreakData(prev => recordActivity(prev));
  }, [profile]);

  function gainXP(amount, reason) {
    setXpData(prev => addXP(prev, amount, reason));
    setStreakData(prev => recordActivity(prev));
  }

  // Persist topics
  useEffect(() => { saveTopicProgress(topicData); }, [topicData]);

  // Start a focused session on a specific topic
  function studyTopic(sub, topic) {
    setTopicsFor(null);
    setActive(sub.id);
    setTopicData(prev => recordTopicStudy(prev, sub.id, topic));
    setTimeout(() => {
      if (sendRef.current) sendRef.current("I'd like to study: " + topic);
    }, 800);
  }

  // Save custom quiz results to memory + Supabase
  // Save profile to both localStorage and Supabase
  function updateProfile(p) {
    saveProfile(p); // also calls setActiveStudent
    setProfile(p);
    if (p?.name) {
      // Reload per-student data for the new/updated student
      setMemory(loadMemory());
      setXpData(loadXP());
      setStreakData(loadStreaks());
      setTopicData(loadTopicProgress());
      sbSaveSetting(p.name, "profile", p);
    }
    setModal(null);
  }

  // Switch to a different user
  function switchUser() {
    if (active && msgs.length >= 6) autoSave(active, msgs, curMats);
    stopSpeaking();
    setActiveRaw(null);
    setSessions({});
    setMats(emptyMats());
    setSbSynced(false);
    setDbConnected(false);
    setActiveStudent("");
    setProfile(null);
    saveProfile(null);
    // Reset per-student data to empty (will reload on next login)
    setMemory({ version: 2, subjects: {} });
    setXpData({ total: 0, history: [] });
    setStreakData({ dates: [] });
    setTopicData({});
  }

  // Supabase sync — load memory + profile settings from cloud
  useEffect(() => {
    if (profile && !sbSynced) {
      setSbSynced(true);
      // Load memory
      sbLoad(profile.name).then(cloud => {
        if (cloud) { setMemory(prev => mergeMemory(prev, cloud)); setDbConnected(true); }
      }).catch(() => {});
      // Load profile settings (cloud overrides local if exists)
      sbLoadSettings(profile.name).then(settings => {
        if (settings?.profile) {
          const cloud = settings.profile;
          setProfile(prev => {
            const merged = { ...prev, ...cloud, examBoards: { ...prev.examBoards, ...cloud.examBoards }, tutorCharacters: { ...prev.tutorCharacters, ...cloud.tutorCharacters } };
            saveProfile(merged);
            return merged;
          });
          setDbConnected(true);
        }
        // Load topic progress from cloud
        if (settings?.topics) {
          setTopicData(prev => {
            const merged = { ...prev };
            for (const [sid, topics] of Object.entries(settings.topics)) {
              merged[sid] = { ...merged[sid] };
              for (const [topic, data] of Object.entries(topics)) {
                const local = merged[sid][topic];
                if (!local || (data.studied || 0) > (local.studied || 0)) merged[sid][topic] = data;
              }
            }
            saveTopicProgress(merged);
            return merged;
          });
        }
      }).catch(() => {});
    }
  }, [profile, sbSynced]);

  // Initialise session with welcome message
  function setActive(newId) {
    if (active && msgs.length >= 6 && !autoSumming) autoSave(active, msgs, curMats);
    setActiveRaw(newId);
    setExamMode(false);
    if (newId && !sessions[newId] && profile) {
      const sub = SUBJECTS[newId];
      const board = profile.examBoards?.[newId];
      const memCount = getSessions(memory, newId).length;
      setSessions(prev => ({ ...prev, [newId]: { messages: [{ role: "assistant", content: sub.welcomeMessage(profile, board, memCount) }] } }));
    }
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, loading]);
  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);

  // Send message — direct to Anthropic API
  async function send(override) {
    const text = override || input.trim();
    if (!text || loading || !active || !profile) return;
    const userMsg = { role: "user", content: text };
    // Read latest messages from ref to avoid stale closure (e.g. after quiz summary injection)
    const latest = sessionsRef.current[active]?.messages || [];
    const updated = [...latest, userMsg];
    setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: updated } }));
    if (!override) setInput("");
    setLoading(true);
    const sys = buildSystemPrompt(active, profile, curMem, curMats, examMode, profile.tutorCharacters?.[active]);
    const langName = subject?.label || "the target language";
    const voiceNote = convoMode ? `REAL-TIME CONVERSATION MODE: You and the student are in a live spoken conversation. Keep responses very short (1-2 sentences), natural and conversational. ALWAYS end with a question or prompt to keep the dialogue flowing. Use increasingly more ${langName} as the student improves. Be encouraging and energetic.\n\n` : voiceMode ? `VOICE MODE ACTIVE: Student is speaking aloud (speech-to-text). Keep responses conversational, shorter (2-3 sentences), and end with a question to keep the conversation flowing. Use more ${langName} than usual. If the student's speech has speech-recognition errors, interpret charitably.\n\n` : "";
    const textMats = curMats.filter(m => m.isText);
    const fullSys = voiceNote + (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys;
    const apiMsgs = buildApiMsgs(curMats, updated.map(m => ({ role: m.role, content: m.content })));
    try {
      const reply = await apiSend(fullSys, apiMsgs);
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: reply }] } }));
      gainXP(5, "Sent message");
    } catch (e) {
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: "\u274c " + e.message }] } }));
    } finally { setLoading(false); }
  }
  sendRef.current = send; // keep ref fresh for speech callback

  // Generate and save structured summary
  async function genSummary() {
    if (msgs.length < 3 || sumLoading) return;
    setSumLoading(true);
    try {
      const sys = buildSystemPrompt(active, profile, curMem, curMats, false, profile.tutorCharacters?.[active]);
      const data = await apiSummary(sys, msgs);
      setMemory(prev => addSessionToMem(prev, active, data));
      if (profile) sbSave(profile.name, active, data.date, JSON.stringify(data));
      setShowSum(data);
      gainXP(25, "Session summary");
      // Auto-update topic progress from confidence scores
      if (data.confidenceScores) {
        setTopicData(prev => {
          let updated = prev;
          for (const [topic, conf] of Object.entries(data.confidenceScores)) {
            updated = recordTopicStudy(updated, active, topic, conf);
          }
          if (profile) sbSaveSetting(profile.name, "topics", updated);
          return updated;
        });
      }
    } catch (e) { console.error("Summary failed:", e); } finally { setSumLoading(false); }
  }

  // Auto-save on subject switch
  async function autoSave(sid, chatMsgs, sidMats) {
    if (chatMsgs.length < 6 || autoSumming) return;
    setAutoSumming(true);
    try {
      const sys = buildSystemPrompt(sid, profile, getSessions(memory, sid), sidMats, false, profile.tutorCharacters?.[sid]);
      const data = await apiSummary(sys, chatMsgs);
      setMemory(prev => addSessionToMem(prev, sid, data));
      if (profile) sbSave(profile.name, sid, data.date, JSON.stringify(data));
    } catch {} finally { setAutoSumming(false); }
  }

  // Sync quiz results into tutor chat so the tutor can see student progress
  function handleQuizComplete({ questions, answers, subjectId, quizType }) {
    const score = answers.filter(a => a.correct).length;
    const total = questions.length;
    const pct = total ? Math.round(score / total * 100) : 0;
    const subLabel = SUBJECTS[subjectId]?.label || subjectId;
    const wrong = [];
    const right = [];
    questions.forEach((q, i) => {
      const a = answers[i];
      const qText = q.q || "Match terms to definitions";
      if (a?.correct) {
        right.push(qText);
      } else {
        let correctAns = "";
        if (q.type === "mc" || (!q.type && q.options)) {
          const myAns = q.options?.[a?.chosen] || "?";
          correctAns = `I put "${myAns}" but the answer was "${q.options?.[q.correct] || "?"}"`;
        } else if (q.type === "tf") {
          correctAns = `I said ${a?.chosen ? "True" : "False"} but it was ${q.correct ? "True" : "False"}`;
        } else if (q.type === "short" || q.type === "fill") {
          correctAns = `I wrote "${a?.typed || "?"}" but the answer was "${q.answer}"`;
        } else if (q.type === "match") {
          correctAns = `I only matched ${a?.matchScore || 0} out of ${q.pairs?.length || 0} correctly`;
        }
        wrong.push(`- ${qText} — ${correctAns}`);
      }
    });

    let summary = `Hey! I just did a ${subLabel} quiz and got ${score}/${total} (${pct}%).`;
    if (right.length > 0) {
      summary += `\n\nI got these right:\n${right.map(q => `- ${q}`).join("\n")}`;
    }
    if (wrong.length > 0) {
      summary += `\n\nI got these wrong:\n${wrong.join("\n")}`;
    }
    if (wrong.length === 0) {
      summary += "\n\nI got everything right!";
    }
    summary += "\n\nCan you quickly go over the questions I got wrong and then we can continue what we were doing before?";

    // Inject into the matching subject's chat session
    const targetId = subjectId;
    setSessions(prev => {
      const existing = prev[targetId]?.messages || [];
      // If session doesn't exist yet, initialise with a welcome message first
      const base = existing.length > 0 ? existing : (() => {
        const sub = SUBJECTS[targetId];
        const board = profile?.examBoards?.[targetId];
        const memCount = getSessions(memory, targetId).length;
        return sub ? [{ role: "assistant", content: sub.welcomeMessage(profile, board, memCount) }] : [];
      })();
      return { ...prev, [targetId]: { ...prev[targetId], messages: [...base, { role: "user", content: summary }] } };
    });

    // If this subject is currently active, auto-trigger a tutor response to the quiz summary
    if (active === targetId) {
      setTimeout(async () => {
        const cur = sessionsRef.current[targetId]?.messages || [];
        if (!cur.length) return;
        setLoading(true);
        const sys = buildSystemPrompt(targetId, profile, getSessions(memory, targetId), mats[targetId] || [], examMode, profile.tutorCharacters?.[targetId]);
        const textMats = (mats[targetId] || []).filter(m => m.isText);
        const fullSys = (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys;
        const apiMsgs = buildApiMsgs(mats[targetId] || [], cur.map(m => ({ role: m.role, content: m.content })));
        try {
          const reply = await apiSend(fullSys, apiMsgs);
          setSessions(prev => ({ ...prev, [targetId]: { ...prev[targetId], messages: [...(prev[targetId]?.messages || []), { role: "assistant", content: reply }] } }));
        } catch (e) {
          setSessions(prev => ({ ...prev, [targetId]: { ...prev[targetId], messages: [...(prev[targetId]?.messages || []), { role: "assistant", content: "\u274c " + e.message }] } }));
        } finally { setLoading(false); }
      }, 300);
    }
  }

  const basePrompts = active && SUBJECTS[active] ? SUBJECTS[active].quickPrompts(examMode, curMats.length > 0) : [];
  const langGreetings = { spanish: "Habl\u00e9mos en espa\u00f1ol", french: "Parlons en fran\u00e7ais", german: "Lass uns Deutsch sprechen" };
  const langPractice = { spanish: "\u00bfPodemos practicar conversaci\u00f3n?", french: "On peut pratiquer la conversation?", german: "K\u00f6nnen wir \u00fcben?" };
  const greet = langGreetings[active] || "Let's practise speaking";
  const prac = langPractice[active] || "Can we practise conversation?";
  const continuePrompt = curMem.length > 0 ? ["Pick up where we left off last session"] : [];
  const quickPrompts = convoMode ? [greet, prac, "Correct my pronunciation"] : voiceMode ? [greet, "Correct my pronunciation", ...basePrompts] : [...continuePrompt, ...basePrompts];

  if (!profile) return <Setup onDone={updateProfile} />;

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: active && subject ? subject.bg : "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif", transition: "background .4s" }}>
        <style>{GLOBAL_CSS}</style>
        {storageFull && <div style={{ background: "#d32f2f", color: "#fff", padding: "8px 16px", textAlign: "center", fontSize: 13, fontWeight: 600 }}>Your device storage is full — progress may not be saved. Try clearing old sessions in Memory Manager. <button onClick={() => setStorageFull(false)} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", borderRadius: 4, marginLeft: 8, cursor: "pointer", fontSize: 12, padding: "2px 8px" }}>Dismiss</button></div>}

        {/* Modals — only one at a time */}
        {modal === "mats" && active && <MaterialsPanel subject={subject} mats={curMats} onAdd={f => setMats(prev => ({ ...prev, [active]: [...prev[active], ...f] }))} onRemove={id => setMats(prev => ({ ...prev, [active]: prev[active].filter(m => m.id !== id) }))} onClose={() => setModal(null)} />}
        {modal === "memory" && <MemoryManager memory={memory} profile={profile} onClearSubject={sid => setMemory(prev => clearSubjectMem(prev, sid))} onClearAll={() => setMemory(clearAllMem())} onClose={() => setModal(null)} onImport={(p, m) => { saveProfile(p); setProfile(p); setMemory(m); setModal(null); }} />}
        {modal === "dash" && <Dashboard memory={memory} mats={mats} profile={profile} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsModal profile={profile} onSave={updateProfile} onClose={() => setModal(null)} />}
        {showSum && subject && <SummaryModal subject={subject} sessionData={showSum} onClose={() => setShowSum(null)} />}
        {quizSubject && <QuickQuiz subject={quizSubject} profile={profile} memory={memory} topicData={topicData} onClose={() => setQuizSubject(null)} onXP={gainXP} onQuizComplete={handleQuizComplete} />}
        {topicsFor && <TopicsPanel subject={topicsFor} profile={profile} topicData={topicData} onStudy={topic => studyTopic(topicsFor, topic)} onClose={() => setTopicsFor(null)} />}
        {buildQuizFor && <QuizBuilder subject={buildQuizFor} profile={profile} onClose={() => setBuildQuizFor(null)} onXP={gainXP} onQuizComplete={handleQuizComplete} />}

        {/* Header */}
        <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100 }}>
          {active && <button onClick={() => setActive(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#666", padding: "4px 8px", borderRadius: 8 }} aria-label="Back">{"\u2190"}</button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>{profile.name} {"\u00b7"} {profile.year} {"\u00b7"} {profile.tier}{autoSumming ? " \u00b7 saving memory..." : ""}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>{active ? subject.emoji + " " + subject.tutor.name : "Your Tutor Hub by Korona Lab \u00ae"}</div>
          </div>
          {active && (
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setModal("mats")} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: curMats.length ? subject.color : "rgba(0,0,0,0.07)", color: curMats.length ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcce"} {curMats.length ? curMats.length + " File" + (curMats.length > 1 ? "s" : "") : "Materials"}</button>
              <button className="btn" onClick={() => setExamMode(e => !e)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: examMode ? subject.color : "rgba(0,0,0,0.07)", color: examMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcdd"} {examMode ? "Exam ON" : "Exam"}</button>
              <button className="btn" onClick={() => setBuildQuizFor(subject)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.07)", color: "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udee0\ufe0f"} Quiz</button>
              {voiceCfg && <button className="btn" onClick={() => { setVoiceMode(v => { if (v) { stopSpeaking(); setConvoMode(false); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: voiceMode ? "#dc2626" : "rgba(0,0,0,0.07)", color: voiceMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{voiceMode ? "\ud83d\udd0a Voice ON" : "\ud83c\udf99\ufe0f Voice"}</button>}
              {voiceMode && voiceCfg && micSupported && <button className="btn" onClick={() => { setConvoMode(v => { if (!v) { stopSpeaking(); setTimeout(() => startMicRef.current(), 200); } else { stopMic(); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: convoMode ? "#059669" : "rgba(0,0,0,0.07)", color: convoMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700, animation: convoMode ? "mp 2s ease infinite" : "none" }}>{convoMode ? "\ud83d\udd04 Conversation" : "\ud83d\udde3\ufe0f Converse"}</button>}
              <button className="btn" onClick={genSummary} disabled={sumLoading || msgs.length < 3} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: msgs.length >= 3 ? subject.color : "rgba(0,0,0,0.07)", color: msgs.length >= 3 ? "#fff" : "#aaa", fontSize: 11, fontWeight: 700, opacity: sumLoading ? .6 : 1 }}>{sumLoading ? "Saving..." : "\ud83d\udccb Summary"}</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 5 }}>
            {dbConnected && <div style={{ padding: "6px 10px", borderRadius: 20, background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>{"\u2601\ufe0f"} Synced</div>}
            <button className="btn" onClick={() => setModal("settings")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\u2699\ufe0f"}</button>
            <button className="btn" onClick={() => setModal("memory")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83e\udde0"}{totalMem > 0 ? " " + totalMem : ""}</button>
            <button className="btn" onClick={() => setModal("dash")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc68\u200d\ud83d\udc67"}</button>
            <button className="btn" onClick={switchUser} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc64"}</button>
          </div>
        </div>

        {/* Home or Chat */}
        {!active ? (
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px" }}>
            {/* Streak & XP Bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{streak > 0 ? "\ud83d\udd25" : "\u2744\ufe0f"}</span>
                  <div><div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>day streak</div></div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>{week.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ width: "100%", height: 6, borderRadius: 3, background: d.active ? "#22c55e" : "#eee", marginBottom: 2 }} /><div style={{ fontSize: 8, color: "#bbb" }}>{d.day}</div></div>)}</div>
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{LEVEL_EMOJIS[lv.level] || "\ud83c\udfc6"}</span>
                  <div><div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Level {lv.level}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{lv.title}</div></div>
                  <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: "#f0c040" }}>{xpData.total}</div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#eee" }}><div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#f0c040,#f59e0b)", width: Math.min(100, lv.current / lv.next * 100) + "%", transition: "width .5s" }} /></div>
                <div style={{ fontSize: 9, color: "#bbb", marginTop: 3 }}>{lv.current}/{lv.next} XP to Level {lv.level + 1}</div>
              </div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 6 }}>Hello, {profile.name}.</h1>
            <p style={{ color: "#999", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>{totalMem > 0 ? "\ud83e\udde0 " + totalMem + " session" + (totalMem > 1 ? "s" : "") + " in memory." : "Your tutors adapt and remember your progress."}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {mySubjects(profile).map((t, i) => {
                const sc = getSessions(memory, t.id).length, mc = (mats[t.id] || []).length, bd = profile.examBoards?.[t.id];
                const conf = getConfidence(memory, t.id);
                const avg = avgConfidence(conf);
                const confTopics = Object.entries(conf).slice(0, 4);
                const tpct = topicPct(topicData, t.id);
                const tTotal = (SUBJECT_TOPICS[t.id] || []).length;
                const tDone = Object.values(getTopicProgress(topicData, t.id)).filter(v => v.studied > 0).length;
                return (
                  <div key={t.id} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", animation: `ci .4s ease ${i * .06}s both` }}>
                    <div className="card" onClick={() => setActive(t.id)} style={{ background: t.gradient, padding: "18px 16px 14px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>{t.emoji}</div>
                        {avg >= 0 && <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#fff" }}>{avg}%</div>}
                      </div>
                      <div style={{ fontFamily: "'Playfair Display',serif", color: "#fff", fontSize: 16, fontWeight: 700 }}>{t.tutor.name}</div>
                      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>{t.label}{bd ? " \u00b7 " + bd : ""}</div>
                    </div>
                    <div style={{ background: "#fff", padding: "10px 16px" }}>
                      {tTotal > 0 && <div style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginBottom: 2 }}><span>{tDone}/{tTotal} topics</span><span>{tpct}%</span></div><div style={{ height: 4, borderRadius: 2, background: "#eee" }}><div style={{ height: "100%", borderRadius: 2, background: t.color, width: tpct + "%", transition: "width .5s" }} /></div></div>}
                      {confTopics.length > 0 && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>{confTopics.map(([topic, pct]) => <div key={topic} style={{ height: 4, flex: 1, minWidth: 14, borderRadius: 2, background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444" }} title={topic + ": " + pct + "%"} />)}</div>}
                      <div style={{ fontSize: 11, color: t.color, fontWeight: 700, marginBottom: 4 }}>{sc === 0 ? "No sessions yet" : "\ud83e\udde0 " + sc + " session" + (sc > 1 ? "s" : "")}</div>
                      {mc > 0 && <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{"\ud83d\udcce"} {mc} material{mc > 1 ? "s" : ""}</div>}
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button onClick={e => { e.stopPropagation(); setTopicsFor(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: "transparent", color: t.color, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\ud83d\udcdd"} Topics</button>
                        <button onClick={e => { e.stopPropagation(); setQuizSubject(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: "transparent", color: t.color, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\u26a1"} Quick</button>
                        <button onClick={e => { e.stopPropagation(); setBuildQuizFor(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: t.color, color: "#fff", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\ud83d\udee0\ufe0f"} Build</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #eee" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", marginBottom: 10 }}>{"\ud83d\udca1"} Tips</div>
              {[["Quick Quiz", "Tap \u26a1 for 10 instant questions on your weak topics."], ["Quiz Builder", "Tap \ud83d\udee0\ufe0f to customise question types and upload materials."], ["Earn XP", "+5 per message, +25 per summary, +20 per correct answer."], ["Keep your streak", "Open the app daily to build your streak!"]].map(([t, d]) => <div key={t} style={{ display: "flex", gap: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 12, minWidth: 120 }}>{t}</div><div style={{ color: "#888", fontSize: 12 }}>{d}</div></div>)}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 61px)" }}>
            {examMode && <div style={{ background: subject.color, color: "#fff", textAlign: "center", padding: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{"\ud83d\udcdd"} EXAM PRACTICE {"\u2014"} Attempt the question first. Tutor will mark it properly.</div>}
            {convoMode && <div style={{ background: "#059669", color: "#fff", textAlign: "center", padding: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{"\ud83d\udde3\ufe0f"} CONVERSATION MODE {"\u2014"} Speak naturally. {subject.tutor.name} will listen, respond, and keep the conversation going.</div>}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                {msgs.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10, animation: "mi .25s ease" }}>
                    <div style={{ maxWidth: "78%", position: "relative" }}>
                      <div style={{ padding: "11px 15px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? subject.color : "#fff", color: m.role === "user" ? "#fff" : "#1a1a2e", fontSize: 14, lineHeight: 1.65, boxShadow: m.role === "user" ? `0 4px 14px ${subject.color}40` : "0 2px 10px rgba(0,0,0,0.07)", border: m.role === "user" ? "none" : "1px solid rgba(0,0,0,0.07)", whiteSpace: "pre-wrap" }}>{m.role === "assistant" ? renderMd(m.content) : m.content}</div>
                      {voiceCfg && m.role === "assistant" && !m.content.startsWith("\u274c") && (
                        <button onClick={() => { if (speaking) stopSpeaking(); else { setSpeaking(true); speakText(m.content, voiceCfg, () => setSpeaking(false)); } }}
                          style={{ position: "absolute", bottom: -4, right: -4, width: 26, height: 26, borderRadius: "50%", border: "1px solid #eee", background: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
                          title="Listen to this message">{"\ud83d\udd0a"}</button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && <div style={{ display: "flex" }}><div style={{ background: "#fff", borderRadius: 18, padding: "10px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}><div style={{ display: "flex", gap: 5 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: subject.color, animation: `db 1.2s ease ${i * .2}s infinite` }} />)}</div></div></div>}
                <div ref={bottomRef} />
              </div>
            </div>
            <div style={{ padding: "0 22px 5px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {quickPrompts.filter((v, i, a) => a.indexOf(v) === i).map(q => <button key={q} onClick={() => send(q)} style={{ padding: "5px 11px", borderRadius: 20, border: "1.5px solid " + subject.color, background: "transparent", color: subject.color, cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", transition: "all .15s" }}>{q}</button>)}
              </div>
            </div>
            <div style={{ padding: "5px 22px 16px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
              {(listening || transcribing) && <div style={{ maxWidth: 680, margin: "0 auto 6px", padding: "8px 14px", borderRadius: 10, background: transcribing ? "#eff6ff" : "#fef2f2", border: "1px solid " + (transcribing ? "#bfdbfe" : "#fecaca"), fontSize: 12, color: transcribing ? "#1d4ed8" : "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: transcribing ? "#1d4ed8" : "#dc2626", animation: "mp 1.2s ease infinite" }} />{transcribing ? "Transcribing your speech..." : "Recording... tap \ud83c\udf99\ufe0f again when done"}</div>}
              <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={listening ? "Recording..." : transcribing ? "Transcribing..." : examMode ? "Paste your question or attempt here..." : voiceCfg ? "Type or tap \ud83c\udf99\ufe0f to speak..." : "Message " + subject.tutor.name + "..."} rows={1}
                  style={{ flex: 1, padding: "12px 15px", borderRadius: 14, border: `2px solid ${listening ? "#dc2626" : transcribing ? "#1d4ed8" : input ? subject.color : "#e0e0e0"}`, resize: "none", fontSize: 14, lineHeight: 1.5, background: "#fff", maxHeight: 120, overflow: "auto", transition: "border-color .2s", outline: "none" }}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
                {voiceCfg && micSupported && (
                  <button onClick={() => { if (listening) stopMic(); else if (!transcribing) { stopSpeaking(); startMic(); } }} disabled={transcribing}
                    style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: listening ? "#dc2626" : transcribing ? "#93c5fd" : "#fef2f2", color: listening ? "#fff" : transcribing ? "#fff" : "#dc2626", fontSize: 18, cursor: transcribing ? "default" : "pointer", transition: "all .2s", animation: listening ? "mp 1.2s ease infinite" : "none", opacity: transcribing ? 0.6 : 1 }}
                    title={listening ? "Stop recording" : transcribing ? "Transcribing..." : "Speak"}>{listening ? "\u23f9" : "\ud83c\udf99\ufe0f"}</button>
                )}
                <button onClick={() => send()} disabled={!input.trim() || loading}
                  style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: input.trim() && !loading ? subject.color : "#e8e8e8", color: input.trim() && !loading ? "#fff" : "#bbb", fontSize: 17, cursor: input.trim() && !loading ? "pointer" : "default", transition: "all .2s" }}>{"\u2191"}</button>
              </div>
              <div style={{ maxWidth: 680, margin: "4px auto 0", fontSize: 10, color: "#bbb", paddingLeft: 2 }}>Enter to send {"\u00b7"} Shift+Enter new line{voiceCfg && micSupported ? " \u00b7 \ud83c\udf99\ufe0f Tap mic to speak" : ""}</div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
