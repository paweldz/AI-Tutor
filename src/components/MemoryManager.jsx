import { useRef } from "react";
import { ALL_SUBJECT_LIST } from "../config/subjects.js";
import { getSessions, exportData, importData } from "../utils/storage.js";

export function MemoryManager({ memory, profile, onClearSubject, onClearAll, onClose, onImport }) {
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

