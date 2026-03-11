/* ═══════════════════════════════════════════════════════════════════
   SUPABASE — cloud backup via /api/db proxy (keys in Vercel env vars)
   ═══════════════════════════════════════════════════════════════════ */

export async function sbTest() {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    const d = await r.json();
    return d.ok === true;
  } catch { return false; }
}

export async function sbSave(studentName, subject, date, summary) {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", studentName, subject, date, summary: typeof summary === "string" ? summary : JSON.stringify(summary) }) });
    const d = await r.json();
    return d.ok === true;
  } catch { return false; }
}

export async function sbLoad(studentName) {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load", studentName }) });
    const d = await r.json();
    if (!d.ok || !d.rows?.length) return null;
    const subjects = {};
    for (const row of d.rows) {
      if (!subjects[row.subject]) subjects[row.subject] = [];
      let parsed; try { parsed = JSON.parse(row.summary); } catch { parsed = null; }
      subjects[row.subject].push(parsed?.rawSummaryText ? parsed : { date: row.session_date, rawSummaryText: row.summary, topics: [], strengths: [], weaknesses: [], confidenceScores: {}, messageCount: 0, examQuestionsAttempted: 0 });
    }
    return { version: 2, subjects };
  } catch { return null; }
}

export function mergeMemory(local, cloud) {
  if (!cloud) return local;
  const merged = { version: 2, subjects: { ...local.subjects } };
  for (const [sid, sessions] of Object.entries(cloud.subjects || {})) {
    const existing = merged.subjects[sid] || [];
    const keys = new Set(existing.map(s => s.date + "|" + (s.rawSummaryText || "").slice(0, 80)));
    merged.subjects[sid] = [...existing, ...sessions.filter(s => !keys.has(s.date + "|" + (s.rawSummaryText || "").slice(0, 80)))];
  }
  return merged;
}

export async function sbSaveSetting(studentName, key, value) {
  try { await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_settings", studentName, key, value }) }); } catch {}
}

export async function sbLoadSettings(studentName) {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load_settings", studentName }) });
    const d = await r.json();
    return d.ok ? d.settings : null;
  } catch { return null; }
}
