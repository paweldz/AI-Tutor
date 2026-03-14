import { useState, useEffect, useRef } from "react";
import { sbLoad, mergeMemory, sbLoadSettings, sbLoadXP, sbLoadStreaks } from "../utils/cloudSync.js";
import { supabase } from "../lib/supabase.js";

/**
 * Handles one-time Supabase sync on login: loads profile, memory, topics,
 * XP, and streaks from the cloud into React state.
 *
 * Cloud is the single source of truth — no localStorage involved.
 *
 * Exposes `syncing` so App can show a loading screen instead of Setup
 * while the initial cloud load is in progress.
 */
export function useCloudSync({ user, profile, setProfile, setMemory, setTopicData, setCustomTopics, setXpData, setStreakData, setTeacherNotes, setStudentNotes, setEvents }) {
  const sbSyncedRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const currentUserId = user?.id ?? null;

    // When the user identity changes (login, logout, or switch), reset
    // the sync flag so the next login triggers a fresh cloud load.
    if (currentUserId !== lastUserIdRef.current) {
      sbSyncedRef.current = false;
      lastUserIdRef.current = currentUserId;
    }

    const trigger = user || profile;
    if (!trigger || sbSyncedRef.current) return;
    sbSyncedRef.current = true;

    if (user) setSyncing(true);

    async function runSync() {
      try {
        console.log("[cloudSync] Starting sync", {
          supabaseConfigured: !!supabase,
          userId: user?.id || "none",
        });

        // ── Phase 1: Load profile & settings ──
        const settings = await sbLoadSettings().catch(e => { console.warn("[cloudSync] sbLoadSettings threw:", e); return null; });

        if (settings?.profile) {
          setProfile(settings.profile);
          setDbConnected(true);
        }
        if (settings?.topics) {
          setTopicData(settings.topics);
        }
        if (settings?.customTopics) {
          setCustomTopics(settings.customTopics);
        }
        if (settings?.teacherNotes) {
          setTeacherNotes(settings.teacherNotes);
        }
        if (settings?.studentNotes) {
          setStudentNotes(settings.studentNotes);
        }
        if (settings?.events) {
          setEvents(settings.events);
        }

        // ── Phase 2: Load memory, XP, streaks in parallel ──
        // Prefer memory from tutor_settings (includes deletes/clears),
        // fall back to row-by-row reconstruction from tutor_memory.
        const [cloud, cloudXP, cloudStreaks] = await Promise.all([
          settings?.memory ? Promise.resolve(null) : sbLoad().catch(e => { console.warn("[cloudSync] sbLoad threw:", e); return null; }),
          sbLoadXP().catch(e => { console.warn("[cloudSync] sbLoadXP threw:", e); return null; }),
          sbLoadStreaks().catch(e => { console.warn("[cloudSync] sbLoadStreaks threw:", e); return null; }),
        ]);

        if (settings?.memory) {
          // Backfill isoDate on sessions that lack it (needed for week/month filtering)
          const mem = settings.memory;
          if (mem?.subjects) {
            const MONTH_MAP = { january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",july:"07",august:"08",september:"09",october:"10",november:"11",december:"12" };
            for (const sessions of Object.values(mem.subjects)) {
              for (const ses of sessions) {
                if (ses.isoDate) continue;
                const d = ses.date;
                if (!d) continue;
                const clean = d.replace(/^today[\s,]+/i, "").replace(/(\d+)(st|nd|rd|th)\b/gi, "$1").trim();
                // Day-first: "14 March 2026"
                let m = clean.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
                if (m) { const mo = MONTH_MAP[m[2].toLowerCase()]; if (mo) { ses.isoDate = `${m[3]}-${mo}-${m[1].padStart(2, "0")}`; continue; } }
                // Month-first: "March 14, 2026"
                m = clean.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
                if (m) { const mo = MONTH_MAP[m[1].toLowerCase()]; if (mo) { ses.isoDate = `${m[3]}-${mo}-${m[2].padStart(2, "0")}`; continue; } }
                // ISO: "2026-03-14"
                if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) ses.isoDate = clean;
              }
            }
          }
          setMemory(mem);
          setDbConnected(true);
        } else if (cloud) {
          setMemory(cloud);
          setDbConnected(true);
        }

        if (cloudXP) {
          setXpData(cloudXP);
          setDbConnected(true);
        }

        if (cloudStreaks) {
          setStreakData(cloudStreaks);
          setDbConnected(true);
        }
      } catch (e) {
        console.error("[cloudSync] sync failed:", e);
      } finally {
        console.log("[cloudSync] Sync complete");
        setSyncing(false);
      }
    }

    runSync();
  }, [user, profile, setProfile, setMemory, setTopicData, setCustomTopics, setXpData, setStreakData, setTeacherNotes, setStudentNotes, setEvents]);

  function resetSync() {
    sbSyncedRef.current = false;
    lastUserIdRef.current = null;
    setDbConnected(false);
    setSyncing(false);
  }

  return { dbConnected, syncing, resetSync };
}
