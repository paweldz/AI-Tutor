/* ═══════════════════════════════════════════════════════════════════
   SUPABASE — direct client with RLS (user_id auto-set via auth.uid())
   Falls back gracefully when supabase client is not configured.
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";

/** Get current authenticated user, or null. */
async function getAuthUser() {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

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
    if (error) { console.warn("[cloudSync] sbSave failed:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[cloudSync] sbSave failed:", e); return false; }
}

export async function sbLoad() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("tutor_memory")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.warn("[cloudSync] sbLoad failed:", error.message); return null; }
    if (!data?.length) return null;
    const subjects = {};
    for (const row of data) {
      if (!subjects[row.subject]) subjects[row.subject] = [];
      let parsed; try { parsed = JSON.parse(row.summary); } catch { parsed = null; }
      subjects[row.subject].push(parsed?.rawSummaryText ? parsed : { date: row.session_date, rawSummaryText: row.summary, topics: [], strengths: [], weaknesses: [], confidenceScores: {}, messageCount: 0, examQuestionsAttempted: 0 });
    }
    return { version: 2, subjects };
  } catch (e) { console.warn("[cloudSync] sbLoad failed:", e); return null; }
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
  const user = await getAuthUser();
  if (!user) return false;
  try {
    const { error } = await supabase.from("tutor_settings").upsert(
      { user_id: user.id, key, value: typeof value === "string" ? value : JSON.stringify(value) },
      { onConflict: "user_id,key" }
    );
    if (error) { console.warn("[cloudSync] sbSaveSetting failed:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[cloudSync] sbSaveSetting failed:", e); return false; }
}

export async function sbLoadSettings() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("tutor_settings").select("*");
    if (error) { console.warn("[cloudSync] sbLoadSettings failed:", error.message); return null; }
    if (!data) return null;
    const settings = {};
    for (const row of data) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    return settings;
  } catch (e) { console.warn("[cloudSync] sbLoadSettings failed:", e); return null; }
}

/* ── XP sync ─────────────────────────────────────────────────────── */

export async function sbLoadXP() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("tutor_xp").select("*").maybeSingle();
    if (error) { console.warn("[cloudSync] sbLoadXP failed:", error.message); return null; }
    if (!data) return null;
    return { total: data.total, history: data.history || [] };
  } catch (e) { console.warn("[cloudSync] sbLoadXP failed:", e); return null; }
}

export async function sbSaveXP(xpData) {
  const user = await getAuthUser();
  if (!user) return;
  try {
    const { error } = await supabase.from("tutor_xp").upsert(
      { user_id: user.id, total: xpData.total, history: xpData.history },
      { onConflict: "user_id" }
    );
    if (error) console.warn("[cloudSync] sbSaveXP failed:", error.message);
  } catch (e) { console.warn("[cloudSync] sbSaveXP failed:", e); }
}

/* ── Streaks sync ────────────────────────────────────────────────── */

export async function sbLoadStreaks() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("tutor_streaks").select("*").maybeSingle();
    if (error) { console.warn("[cloudSync] sbLoadStreaks failed:", error.message); return null; }
    if (!data) return null;
    return { dates: data.dates || [] };
  } catch (e) { console.warn("[cloudSync] sbLoadStreaks failed:", e); return null; }
}

export async function sbSaveStreaks(streakData) {
  const user = await getAuthUser();
  if (!user) return;
  try {
    const { error } = await supabase.from("tutor_streaks").upsert(
      { user_id: user.id, dates: streakData.dates },
      { onConflict: "user_id" }
    );
    if (error) console.warn("[cloudSync] sbSaveStreaks failed:", error.message);
  } catch (e) { console.warn("[cloudSync] sbSaveStreaks failed:", e); }
}
