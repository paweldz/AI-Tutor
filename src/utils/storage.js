/* ═══════════════════════════════════════════════════════════════════
   STORAGE — localStorage with v1 → v2 migration
   ═══════════════════════════════════════════════════════════════════ */

export const KEYS = { profile: "gcse_profile_v2" };

export function readJSON(key, fallback = null) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
export function writeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch (e) {
    console.warn("[storage] Failed to save", key, e?.name || e);
    if (e?.name === "QuotaExceededError") {
      if (!writeJSON._warned) { writeJSON._warned = true; window.dispatchEvent(new CustomEvent("storage-full")); }
    }
    return false;
  }
}

/* Per-student key: appends normalised student name so each child has their own data */
let _activeStudent = "";
export function setActiveStudent(name) { _activeStudent = (name || "").trim().toLowerCase().replace(/\s+/g, "_"); }
export function studentKey(base) { return _activeStudent ? base + "_" + _activeStudent : base; }

export function migrateIfNeeded() {
  const oldMem = readJSON("gcse_memory_v1");
  if (oldMem && !readJSON("gcse_memory_v2")) {
    const migrated = { version: 2, subjects: {} };
    for (const [sid, sums] of Object.entries(oldMem)) {
      migrated.subjects[sid] = (sums || []).map(s => ({
        date: s.date || "Unknown", topics: [], strengths: [], weaknesses: [],
        confidenceScores: {}, messageCount: 0, examQuestionsAttempted: 0,
        rawSummaryText: s.text || "",
      }));
    }
    writeJSON("gcse_memory_v2", migrated);
  }
  const oldProf = readJSON("gcse_profile_v1");
  if (oldProf && !readJSON(KEYS.profile)) writeJSON(KEYS.profile, oldProf);
}

export function loadProfile()  { return readJSON(KEYS.profile, null); }
export function saveProfile(p) { writeJSON(KEYS.profile, p); if (p?.name) setActiveStudent(p.name); }
export function loadMemory() {
  let d = readJSON(studentKey("gcse_memory_v2"));
  if (!d) { d = readJSON("gcse_memory_v2"); if (d && _activeStudent) { writeJSON(studentKey("gcse_memory_v2"), d); } }
  return d?.version ? d : { version: 2, subjects: {} };
}
export function saveMemory(m)  { writeJSON(studentKey("gcse_memory_v2"), m); }
export function getSessions(mem, sid) { return mem?.subjects?.[sid] || []; }
export function addSessionToMem(mem, sid, data) {
  const u = { ...mem, subjects: { ...mem.subjects, [sid]: [...(mem.subjects[sid] || []), data] } };
  saveMemory(u); return u;
}
export function clearSubjectMem(mem, sid) {
  const u = { ...mem, subjects: { ...mem.subjects, [sid]: [] } };
  saveMemory(u); return u;
}
export function clearAllMem() { const e = { version: 2, subjects: {} }; saveMemory(e); return e; }

export function exportData(memory, profile, customTopics) {
  return { _format: "gcse-tutor-hub", version: 2, exportedAt: new Date().toISOString(), profile, memory, customTopics };
}
export function importData(jsonStr) {
  const d = JSON.parse(jsonStr);
  if (d._format !== "gcse-tutor-hub") throw new Error("Not a GCSE Tutor Hub backup file.");
  if (!d.version || d.version < 2) throw new Error("Backup is from an older version.");
  return { profile: d.profile, memory: d.memory, customTopics: d.customTopics || {} };
}
