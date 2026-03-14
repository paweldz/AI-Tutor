/* ═══════════════════════════════════════════════════════════════════
   PARENT SYNC — Supabase helpers for parent-child linking & data access
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from "../lib/supabase.js";

/** Load all children linked to the current parent. */
export async function loadChildren() {
  if (!supabase) return [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("parent_children")
      .select("*")
      .eq("parent_id", user.id)
      .order("linked_at", { ascending: true });
    if (error) { console.warn("[parentSync] loadChildren failed:", error.message); return []; }
    return data || [];
  } catch (e) { console.warn("[parentSync] loadChildren failed:", e); return []; }
}

/** Send a link request to a child by their email. */
export async function linkChildByEmail(childEmail) {
  if (!supabase) throw new Error("Cloud sync not configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Look up the child's user_id from their profile in tutor_settings
  // We need to find users by email — use a Supabase RPC or search tutor_settings
  // Since we can't query auth.users directly, we use a workaround:
  // Store the link with the child email and resolve on the child's side
  const { data: existing } = await supabase
    .from("parent_children")
    .select("id")
    .eq("parent_id", user.id)
    .eq("child_email", childEmail)
    .maybeSingle();

  if (existing) throw new Error("You've already sent a link request to this email");

  const { error } = await supabase
    .from("parent_children")
    .insert({
      parent_id: user.id,
      child_email: childEmail,
      child_name: childEmail.split("@")[0],
      status: "pending",
    });
  if (error) throw new Error(error.message);
  return true;
}

/** Load pending link requests for the current child user. */
export async function loadPendingLinks() {
  if (!supabase) return [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("parent_children")
      .select("*")
      .eq("child_email", user.email)
      .eq("status", "pending");
    if (error) { console.warn("[parentSync] loadPendingLinks failed:", error.message); return []; }
    return data || [];
  } catch (e) { console.warn("[parentSync] loadPendingLinks failed:", e); return []; }
}

/** Child confirms a link request — sets child_id and status. */
export async function confirmLink(linkId) {
  if (!supabase) return false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("parent_children")
      .update({ child_id: user.id, status: "confirmed", child_name: null })
      .eq("id", linkId);
    if (error) { console.warn("[parentSync] confirmLink failed:", error.message); return false; }
    // Now update child_name from the child's profile
    const { data: settings } = await supabase.from("tutor_settings").select("value").eq("key", "profile").eq("user_id", user.id).maybeSingle();
    if (settings?.value) {
      try {
        const prof = typeof settings.value === "string" ? JSON.parse(settings.value) : settings.value;
        if (prof.name) {
          await supabase.from("parent_children").update({ child_name: prof.name }).eq("id", linkId);
        }
      } catch { /* ignore parse errors */ }
    }
    return true;
  } catch (e) { console.warn("[parentSync] confirmLink failed:", e); return false; }
}

/** Child rejects a link request. */
export async function rejectLink(linkId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("parent_children")
      .update({ status: "rejected" })
      .eq("id", linkId);
    if (error) { console.warn("[parentSync] rejectLink failed:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[parentSync] rejectLink failed:", e); return false; }
}

/** Parent removes a child link. */
export async function removeChildLink(linkId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("parent_children")
      .delete()
      .eq("id", linkId);
    if (error) { console.warn("[parentSync] removeChildLink failed:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[parentSync] removeChildLink failed:", e); return false; }
}

/** Parent adds an event to a child's calendar. Reads existing events, appends, writes back. */
export async function parentAddEvent(childId, event) {
  if (!supabase) throw new Error("Cloud sync not configured");
  try {
    // Read current events
    const { data: row } = await supabase
      .from("tutor_settings")
      .select("value")
      .eq("user_id", childId)
      .eq("key", "events")
      .maybeSingle();
    let existing = [];
    if (row?.value) {
      try { existing = typeof row.value === "string" ? JSON.parse(row.value) : row.value; } catch { existing = []; }
    }
    const updated = [...existing, event];
    // Upsert
    const { error } = await supabase
      .from("tutor_settings")
      .upsert({ user_id: childId, key: "events", value: JSON.stringify(updated) }, { onConflict: "user_id,key" });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    console.warn("[parentSync] parentAddEvent failed:", e);
    throw e;
  }
}

/** Parent updates an event in a child's calendar. */
export async function parentUpdateChildEvent(childId, eventId, updates) {
  if (!supabase) throw new Error("Cloud sync not configured");
  try {
    const { data: row } = await supabase
      .from("tutor_settings")
      .select("value")
      .eq("user_id", childId)
      .eq("key", "events")
      .maybeSingle();
    let existing = [];
    if (row?.value) {
      try { existing = typeof row.value === "string" ? JSON.parse(row.value) : row.value; } catch { existing = []; }
    }
    const updated = existing.map(e => e.id === eventId ? { ...e, ...updates } : e);
    const { error } = await supabase
      .from("tutor_settings")
      .upsert({ user_id: childId, key: "events", value: JSON.stringify(updated) }, { onConflict: "user_id,key" });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    console.warn("[parentSync] parentUpdateChildEvent failed:", e);
    throw e;
  }
}

/** Parent deletes an event from a child's calendar. */
export async function parentDeleteChildEvent(childId, eventId) {
  if (!supabase) throw new Error("Cloud sync not configured");
  try {
    const { data: row } = await supabase
      .from("tutor_settings")
      .select("value")
      .eq("user_id", childId)
      .eq("key", "events")
      .maybeSingle();
    let existing = [];
    if (row?.value) {
      try { existing = typeof row.value === "string" ? JSON.parse(row.value) : row.value; } catch { existing = []; }
    }
    const updated = existing.filter(e => e.id !== eventId);
    const { error } = await supabase
      .from("tutor_settings")
      .upsert({ user_id: childId, key: "events", value: JSON.stringify(updated) }, { onConflict: "user_id,key" });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    console.warn("[parentSync] parentDeleteChildEvent failed:", e);
    throw e;
  }
}

/** Load a specific child's data (memory, XP, streaks, profile, topics). */
export async function loadChildData(childId) {
  if (!supabase) return null;
  try {
    const [memRes, xpRes, streakRes, settingsRes] = await Promise.all([
      supabase.from("tutor_memory").select("*").eq("user_id", childId).order("created_at", { ascending: true }),
      supabase.from("tutor_xp").select("*").eq("user_id", childId).maybeSingle(),
      supabase.from("tutor_streaks").select("*").eq("user_id", childId).maybeSingle(),
      supabase.from("tutor_settings").select("*").eq("user_id", childId),
    ]);

    // Parse memory
    const memory = { version: 2, subjects: {} };
    if (memRes.data) {
      for (const row of memRes.data) {
        if (!memory.subjects[row.subject]) memory.subjects[row.subject] = [];
        let parsed;
        try { parsed = JSON.parse(row.summary); } catch { parsed = null; }
        memory.subjects[row.subject].push(parsed?.rawSummaryText ? parsed : {
          date: row.session_date, rawSummaryText: row.summary,
          topics: [], strengths: [], weaknesses: [],
          confidenceScores: {}, messageCount: 0, examQuestionsAttempted: 0,
        });
      }
    }

    // Parse XP
    const xp = xpRes.data ? { total: xpRes.data.total, history: xpRes.data.history || [] } : { total: 0, history: [] };

    // Parse streaks
    const streaks = streakRes.data ? { dates: streakRes.data.dates || [] } : { dates: [] };

    // Parse settings (profile, topics)
    const settings = {};
    if (settingsRes.data) {
      for (const row of settingsRes.data) {
        try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
      }
    }

    return {
      memory,
      xp,
      streaks,
      profile: settings.profile || null,
      topics: settings.topics || {},
      events: settings.events || [],
    };
  } catch (e) {
    console.warn("[parentSync] loadChildData failed:", e);
    return null;
  }
}
