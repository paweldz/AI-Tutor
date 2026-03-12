/* ═══════════════════════════════════════════════════════════════════
   SUPABASE — direct client with RLS (user_id auto-set via auth.uid())
   Falls back to /api/db proxy when supabase client is not configured.
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";

export async function sbTest() {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("tutor_memory").select("id").limit(1);
    return !error;
  } catch { return false; }
}

export async function sbSave(subject, date, summary) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("tutor_memory").insert({
      subject,
      session_date: date,
      summary: typeof summary === "string" ? summary : JSON.stringify(summary),
    });
    return !error;
  } catch { return false; }
}

export async function sbLoad() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("tutor_memory")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !data?.length) return null;
    const subjects = {};
    for (const row of data) {
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

export async function sbSaveSetting(key, value) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tutor_settings").upsert(
      { user_id: user.id, key, value: typeof value === "string" ? value : JSON.stringify(value) },
      { onConflict: "user_id,key" }
    );
  } catch (e) { console.warn("[cloudSync] sbSaveSetting failed:", e); }
}

export async function sbLoadSettings() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("tutor_settings").select("*");
    if (error || !data) return null;
    const settings = {};
    for (const row of data) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    return settings;
  } catch { return null; }
}

/* ── XP sync ─────────────────────────────────────────────────────── */

export async function sbLoadXP() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("tutor_xp").select("*").maybeSingle();
    if (error || !data) return null;
    return { total: data.total, history: data.history || [] };
  } catch { return null; }
}

export async function sbSaveXP(xpData) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tutor_xp").upsert(
      { user_id: user.id, total: xpData.total, history: xpData.history },
      { onConflict: "user_id" }
    );
  } catch (e) { console.warn("[cloudSync] sbSaveXP failed:", e); }
}

/* ── Streaks sync ────────────────────────────────────────────────── */

export async function sbLoadStreaks() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("tutor_streaks").select("*").maybeSingle();
    if (error || !data) return null;
    return { dates: data.dates || [] };
  } catch { return null; }
}

export async function sbSaveStreaks(streakData) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tutor_streaks").upsert(
      { user_id: user.id, dates: streakData.dates },
      { onConflict: "user_id" }
    );
  } catch (e) { console.warn("[cloudSync] sbSaveStreaks failed:", e); }
}
