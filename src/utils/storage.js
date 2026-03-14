/* ═══════════════════════════════════════════════════════════════════
   STORAGE — pure in-memory helpers (all persistence via Supabase)
   ═══════════════════════════════════════════════════════════════════ */

export function getSessions(mem, sid) { return mem?.subjects?.[sid] || []; }
export function addSessionToMem(mem, sid, data) {
  return { ...mem, subjects: { ...mem.subjects, [sid]: [...(mem.subjects[sid] || []), data] } };
}
export function deleteSessionFromMem(mem, sid, idx) {
  const sessions = [...(mem.subjects[sid] || [])];
  sessions.splice(idx, 1);
  return { ...mem, subjects: { ...mem.subjects, [sid]: sessions } };
}
export function clearSubjectMem(mem, sid) {
  return { ...mem, subjects: { ...mem.subjects, [sid]: [] } };
}
export function clearAllMem() { return { version: 2, subjects: {} }; }

export function exportData(memory, profile, customTopics) {
  return { _format: "gcse-tutor-hub", version: 2, exportedAt: new Date().toISOString(), profile, memory, customTopics };
}
export function importData(jsonStr) {
  const d = JSON.parse(jsonStr);
  if (d._format !== "gcse-tutor-hub") throw new Error("Not a GCSE Tutor Hub backup file.");
  if (!d.version || d.version < 2) throw new Error("Backup is from an older version.");
  return { profile: d.profile, memory: d.memory, customTopics: d.customTopics || {} };
}
