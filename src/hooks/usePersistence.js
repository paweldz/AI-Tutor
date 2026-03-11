import { useEffect } from "react";
import { saveMemory } from "../utils/storage.js";
import { saveXP, saveStreaks, recordActivity } from "../utils/xp.js";
import { saveTopicProgress } from "../utils/topics.js";

/**
 * Handles all auto-save side effects: memory, XP, streaks, topics,
 * storage-full detection, and initial streak recording.
 */
export function usePersistence({ memory, xpData, streakData, topicData, profile, setStreakData, setStorageFull }) {
  useEffect(() => { saveMemory(memory); }, [memory]);
  useEffect(() => { saveXP(xpData); }, [xpData]);
  useEffect(() => { saveStreaks(streakData); }, [streakData]);
  useEffect(() => { saveTopicProgress(topicData); }, [topicData]);

  // Record daily activity whenever they use the app
  useEffect(() => {
    if (profile) setStreakData(prev => recordActivity(prev));
  }, [profile, setStreakData]);

  // Warn user if localStorage is full
  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener("storage-full", handler);
    return () => window.removeEventListener("storage-full", handler);
  }, [setStorageFull]);
}
