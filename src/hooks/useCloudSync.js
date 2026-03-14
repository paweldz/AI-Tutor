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
export function useCloudSync({ user, profile, setProfile, setMemory, setTopicData, setCustomTopics, setXpData, setStreakData, setTeacherNotes, setStudentNotes }) {
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

        // ── Phase 2: Load memory, XP, streaks in parallel ──
        // Prefer memory from tutor_settings (includes deletes/clears),
        // fall back to row-by-row reconstruction from tutor_memory.
        const [cloud, cloudXP, cloudStreaks] = await Promise.all([
          settings?.memory ? Promise.resolve(null) : sbLoad().catch(e => { console.warn("[cloudSync] sbLoad threw:", e); return null; }),
          sbLoadXP().catch(e => { console.warn("[cloudSync] sbLoadXP threw:", e); return null; }),
          sbLoadStreaks().catch(e => { console.warn("[cloudSync] sbLoadStreaks threw:", e); return null; }),
        ]);

        if (settings?.memory) {
          setMemory(settings.memory);
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
  }, [user, profile, setProfile, setMemory, setTopicData, setCustomTopics, setXpData, setStreakData, setTeacherNotes, setStudentNotes]);

  function resetSync() {
    sbSyncedRef.current = false;
    lastUserIdRef.current = null;
    setDbConnected(false);
    setSyncing(false);
  }

  return { dbConnected, syncing, resetSync };
}
