import { useState, useEffect, useRef } from "react";
import { saveProfile, setActiveStudent, saveMemory } from "../utils/storage.js";
import { sbLoad, mergeMemory, sbLoadSettings, sbLoadXP, sbLoadStreaks } from "../utils/cloudSync.js";
import { saveTopicProgress } from "../utils/topics.js";
import { saveXP, saveStreaks } from "../utils/xp.js";

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
export function useCloudSync({ user, profile, setProfile, setMemory, setTopicData, setXpData, setStreakData }) {
  const sbSyncedRef = useRef(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const trigger = user || profile;
    if (!trigger || sbSyncedRef.current) return;
    sbSyncedRef.current = true;

    if (user) setSyncing(true);

    async function runSync() {
      try {
        // ── Phase 1: Load profile FIRST so setActiveStudent is called ──
        // This ensures all subsequent localStorage writes use the correct key.
        const settings = await sbLoadSettings().catch(() => null);
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

        // ── Phase 2: Load memory, XP, streaks in parallel ──
        // Now that setActiveStudent has been called, storage keys are correct.
        const [cloud, cloudXP, cloudStreaks] = await Promise.all([
          sbLoad().catch(() => null),
          sbLoadXP().catch(() => null),
          sbLoadStreaks().catch(() => null),
        ]);

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
        console.warn("[cloudSync] sync failed:", e);
      } finally {
        setSyncing(false);
      }
    }

    runSync();
  }, [user, profile, setProfile, setMemory, setTopicData, setXpData, setStreakData]);

  function resetSync() {
    sbSyncedRef.current = false;
    setDbConnected(false);
    setSyncing(false);
  }

  return { dbConnected, syncing, resetSync };
}
