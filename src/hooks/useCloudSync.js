import { useState, useEffect, useRef } from "react";
import { saveProfile, setActiveStudent, saveMemory } from "../utils/storage.js";
import { sbLoad, mergeMemory, sbLoadSettings, sbLoadXP, sbLoadStreaks } from "../utils/cloudSync.js";
import { saveTopicProgress, saveCustomTopics, saveTeacherNotes, saveStudentNotes } from "../utils/topics.js";
import { saveXP, saveStreaks } from "../utils/xp.js";
import { supabase } from "../lib/supabase.js";

/**
 * Handles one-time Supabase sync on login: loads memory, profile, topics,
 * XP, and streaks from the cloud (primary) and merges with local cache.
 *
 * IMPORTANT: Profile/settings must load FIRST so setActiveStudent() is
 * called before memory is saved to localStorage. Otherwise memory gets
 * written under the wrong storage key and is lost on next load.
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
        // ── Diagnostic: log sync state ──
        console.log("[cloudSync] ▶ Starting sync", {
          supabaseConfigured: !!supabase,
          userId: user?.id || "none",
          hasLocalProfile: !!profile,
        });

        // ── Phase 1: Load profile FIRST so setActiveStudent is called ──
        // This ensures all subsequent localStorage writes use the correct key.
        const settings = await sbLoadSettings().catch(e => { console.warn("[cloudSync] sbLoadSettings threw:", e); return null; });
        console.log("[cloudSync] Settings loaded:", {
          hasSettings: !!settings,
          keys: settings ? Object.keys(settings) : [],
          hasProfile: !!settings?.profile,
          hasTopics: !!settings?.topics,
        });
        if (settings?.profile) {
          const cloud = settings.profile;
          setProfile(prev => {
            const base = prev || {};
            const merged = { ...base, ...cloud, examBoards: { ...base.examBoards, ...cloud.examBoards }, tutorCharacters: { ...base.tutorCharacters, ...cloud.tutorCharacters } };
            saveProfile(merged);
            if (merged.name) setActiveStudent(merged.name);
            return merged;
          });
          setDbConnected(true);
        }
        if (settings?.topics) {
          setTopicData(prev => {
            const merged = { ...prev };
            for (const [sid, topics] of Object.entries(settings.topics)) {
              merged[sid] = { ...merged[sid] };
              for (const [topic, data] of Object.entries(topics)) {
                const local = merged[sid][topic];
                if (!local || (data.studied || 0) > (local.studied || 0)) merged[sid][topic] = data;
              }
            }
            saveTopicProgress(merged);
            return merged;
          });
        }
        if (settings?.customTopics && setCustomTopics) {
          setCustomTopics(prev => {
            const merged = { ...prev, ...settings.customTopics };
            saveCustomTopics(merged);
            return merged;
          });
        }
        if (settings?.teacherNotes && setTeacherNotes) {
          setTeacherNotes(prev => {
            const merged = { ...prev };
            for (const [sid, notes] of Object.entries(settings.teacherNotes)) {
              const existing = merged[sid] || [];
              const ids = new Set(existing.map(n => n.id));
              merged[sid] = [...existing, ...notes.filter(n => !ids.has(n.id))];
            }
            saveTeacherNotes(merged);
            return merged;
          });
        }

        if (settings?.studentNotes && setStudentNotes) {
          setStudentNotes(prev => {
            const merged = { ...prev };
            for (const [sid, notes] of Object.entries(settings.studentNotes)) {
              const existing = merged[sid] || [];
              const ids = new Set(existing.map(n => n.id));
              merged[sid] = [...existing, ...notes.filter(n => !ids.has(n.id))];
            }
            saveStudentNotes(merged);
            return merged;
          });
        }

        // ── Phase 2: Load memory, XP, streaks in parallel ──
        // Now that setActiveStudent has been called, storage keys are correct.
        const [cloud, cloudXP, cloudStreaks] = await Promise.all([
          sbLoad().catch(e => { console.warn("[cloudSync] sbLoad threw:", e); return null; }),
          sbLoadXP().catch(e => { console.warn("[cloudSync] sbLoadXP threw:", e); return null; }),
          sbLoadStreaks().catch(e => { console.warn("[cloudSync] sbLoadStreaks threw:", e); return null; }),
        ]);
        console.log("[cloudSync] Phase 2 loaded:", {
          hasMemory: !!cloud,
          memorySubjects: cloud ? Object.keys(cloud.subjects || {}) : [],
          hasXP: !!cloudXP,
          xpTotal: cloudXP?.total ?? "n/a",
          hasStreaks: !!cloudStreaks,
          streakCount: cloudStreaks?.dates?.length ?? 0,
        });

        if (cloud) {
          setMemory(prev => {
            const merged = mergeMemory(prev, cloud);
            saveMemory(merged);
            return merged;
          });
          setDbConnected(true);
        }

        if (cloudXP) {
          setXpData(prev => {
            const best = cloudXP.total >= prev.total ? cloudXP : prev;
            saveXP(best);
            return best;
          });
          setDbConnected(true);
        }

        if (cloudStreaks) {
          setStreakData(prev => {
            const merged = { dates: [...new Set([...prev.dates, ...cloudStreaks.dates])].sort() };
            saveStreaks(merged);
            return merged;
          });
          setDbConnected(true);
        }
      } catch (e) {
        console.error("[cloudSync] ✖ sync failed:", e);
      } finally {
        console.log("[cloudSync] ■ Sync complete — dbConnected:", dbConnected);
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
