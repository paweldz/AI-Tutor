import { useEffect, useRef } from "react";
import { saveMemory } from "../utils/storage.js";
import { saveXP, saveStreaks, recordActivity } from "../utils/xp.js";
import { saveTopicProgress } from "../utils/topics.js";
import { sbSaveXP, sbSaveStreaks, sbSaveSetting } from "../utils/cloudSync.js";

/**
 * Handles all auto-save side effects: memory, XP, streaks, topics,
 * storage-full detection, and initial streak recording.
 * Writes to localStorage immediately + debounced Supabase sync.
 */
export function usePersistence({ memory, xpData, streakData, topicData, profile, setStreakData, setStorageFull }) {
  const xpTimerRef = useRef(null);
  const streakTimerRef = useRef(null);
  const topicTimerRef = useRef(null);

  useEffect(() => { saveMemory(memory); }, [memory]);
  useEffect(() => {
    saveXP(xpData);
    clearTimeout(xpTimerRef.current);
    xpTimerRef.current = setTimeout(() => sbSaveXP(xpData), 2000);
  }, [xpData]);
  useEffect(() => {
    saveStreaks(streakData);
    clearTimeout(streakTimerRef.current);
    streakTimerRef.current = setTimeout(() => sbSaveStreaks(streakData), 2000);
  }, [streakData]);
  useEffect(() => {
    saveTopicProgress(topicData);
    clearTimeout(topicTimerRef.current);
    topicTimerRef.current = setTimeout(() => sbSaveSetting("topics", topicData), 2000);
  }, [topicData]);

  useEffect(() => {
    if (profile) setStreakData(prev => recordActivity(prev));
  }, [profile, setStreakData]);

  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener("storage-full", handler);
    return () => window.removeEventListener("storage-full", handler);
  }, [setStorageFull]);
}
