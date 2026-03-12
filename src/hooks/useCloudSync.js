import { useState, useEffect, useRef } from "react";
import { saveProfile, setActiveStudent } from "../utils/storage.js";
import { sbLoad, mergeMemory, sbLoadSettings, sbLoadXP, sbLoadStreaks } from "../utils/cloudSync.js";
import { saveTopicProgress } from "../utils/topics.js";
import { saveXP, saveStreaks } from "../utils/xp.js";

/**
 * Handles one-time Supabase sync on login: loads memory, profile, topics,
 * XP, and streaks from the cloud (primary) and merges with local cache.
 *
 * Triggers on `user` (auth state) so that even when localStorage is empty
 * (new device, cleared cache, redeploy), the cloud profile is restored
 * automatically — no need to re-create from scratch.
 */
export function useCloudSync({ user, profile, setProfile, setMemory, setTopicData, setXpData, setStreakData }) {
  const sbSyncedRef = useRef(false);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    // Sync once per authenticated session (user present), OR once when
    // profile is loaded locally but no auth is configured.
    const trigger = user || profile;
    if (!trigger || sbSyncedRef.current) return;
    sbSyncedRef.current = true;

    // Load memory (Supabase-first, merge with local)
    sbLoad().then(cloud => {
      if (cloud) { setMemory(prev => mergeMemory(prev, cloud)); setDbConnected(true); }
    }).catch(() => {});

    // Load profile settings + topics (cloud overrides local)
    sbLoadSettings().then(settings => {
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
    }).catch(() => {});

    // Load XP from cloud (cloud wins if higher)
    sbLoadXP().then(cloudXP => {
      if (cloudXP) {
        setXpData(prev => {
          const best = cloudXP.total >= prev.total ? cloudXP : prev;
          saveXP(best);
          return best;
        });
        setDbConnected(true);
      }
    }).catch(() => {});

    // Load streaks from cloud (merge dates)
    sbLoadStreaks().then(cloudStreaks => {
      if (cloudStreaks) {
        setStreakData(prev => {
          const merged = { dates: [...new Set([...prev.dates, ...cloudStreaks.dates])].sort() };
          saveStreaks(merged);
          return merged;
        });
        setDbConnected(true);
      }
    }).catch(() => {});
  }, [user, profile, setProfile, setMemory, setTopicData, setXpData, setStreakData]);

  function resetSync() {
    sbSyncedRef.current = false;
    setDbConnected(false);
  }

  return { dbConnected, resetSync };
}
