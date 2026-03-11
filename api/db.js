/**
 * /api/db.js — Supabase proxy for tutor memory
 *
 * POST { action, ...params }
 *   action: "save"  — { studentName, subject, date, summary }
 *   action: "load"  — { studentName }
 *   action: "test"  — no params, just tests the connection
 *
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_ANON_KEY;

  if (!sbUrl || !sbKey) {
    // Supabase not configured — return gracefully so the app still works without it
    return res.status(200).json({ ok: false, reason: "not_configured" });
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: sbKey,
    Authorization: "Bearer " + sbKey,
  };

  const { action, studentName, subject, date, summary } = req.body || {};

  try {
    // ── TEST CONNECTION ──
    if (action === "test") {
      const r = await fetch(sbUrl + "/rest/v1/tutor_memory?limit=1", { headers });
      if (r.ok || r.status === 406) {
        return res.status(200).json({ ok: true });
      }
      const d = await r.json().catch(() => ({}));
      return res.status(200).json({ ok: false, reason: "HTTP " + r.status + " - " + (d.message || d.hint || "check credentials") });
    }

    // ── SAVE SESSION ──
    if (action === "save") {
      if (!studentName || !subject || !date) {
        return res.status(400).json({ error: "Missing studentName, subject, or date" });
      }
      const r = await fetch(sbUrl + "/rest/v1/tutor_memory", {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          student_name: studentName,
          subject,
          session_date: date,
          summary: typeof summary === "string" ? summary : JSON.stringify(summary),
        }),
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── LOAD ALL SESSIONS ──
    if (action === "load") {
      if (!studentName) {
        return res.status(400).json({ error: "Missing studentName" });
      }
      const r = await fetch(
        sbUrl + "/rest/v1/tutor_memory?student_name=eq." + encodeURIComponent(studentName) + "&order=created_at.asc",
        { headers }
      );
      if (!r.ok) {
        return res.status(200).json({ ok: false, rows: [] });
      }
      const rows = await r.json();
      return res.status(200).json({ ok: true, rows });
    }

    // ── SAVE SETTINGS (profile, subject config) ──
    if (action === "save_settings") {
      if (!studentName) return res.status(400).json({ error: "Missing studentName" });
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: "Missing key" });
      // Upsert: delete existing then insert
      await fetch(
        sbUrl + "/rest/v1/tutor_settings?student_name=eq." + encodeURIComponent(studentName) + "&key=eq." + encodeURIComponent(key),
        { method: "DELETE", headers }
      );
      const r = await fetch(sbUrl + "/rest/v1/tutor_settings", {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          student_name: studentName,
          key,
          value: typeof value === "string" ? value : JSON.stringify(value),
        }),
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── LOAD SETTINGS ──
    if (action === "load_settings") {
      if (!studentName) return res.status(400).json({ error: "Missing studentName" });
      const r = await fetch(
        sbUrl + "/rest/v1/tutor_settings?student_name=eq." + encodeURIComponent(studentName),
        { headers }
      );
      if (!r.ok) return res.status(200).json({ ok: false, settings: {} });
      const rows = await r.json();
      const settings = {};
      for (const row of rows) {
        try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
      }
      return res.status(200).json({ ok: true, settings });
    }

    return res.status(400).json({ error: "Unknown action: " + action });
  } catch (e) {
    console.error("Supabase proxy error:", e);
    return res.status(500).json({ error: "Database error — please try again" });
  }
}
