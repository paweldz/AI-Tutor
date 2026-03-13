import { useEffect, useRef, useCallback } from "react";
import { saveMemory } from "../utils/storage.js";
import { saveXP, saveStreaks, recordActivity } from "../utils/xp.js";
import { saveTopicProgress, saveCustomTopics, saveTeacherNotes } from "../utils/topics.js";
import { sbSaveXP, sbSaveStreaks, sbSaveSetting } from "../utils/cloudSync.js";

/**
 * Handles all auto-save side effects: memory, XP, streaks, topics,
 * storage-full detection, and initial streak recording.
 * Writes to localStorage immediately + debounced Supabase sync.
 *
 * Returns { cancelPendingSaves } so switchUser can cancel debounced
 * cloud writes before clearing state (prevents empty-data overwrites).
 */
export function usePersistence({ memory, xpData, streakData, topicData, customTopics, teacherNotes, profile, setStreakData, setStorageFull }) {
  const xpTimerRef = useRef(null);
  const streakTimerRef = useRef(null);
  const topicTimerRef = useRef(null);
  const customTopicsTimerRef = useRef(null);
  const teacherNotesTimerRef = useRef(null);

  useEffect(() => { saveMemory(memory); }, [memory]);

  useEffect(() => {
    saveXP(xpData);
    clearTimeout(xpTimerRef.current);
    // Guard: don't sync empty/default XP to cloud (prevents overwriting during switchUser)
    if (xpData.total > 0 || xpData.history?.length > 0) {
      xpTimerRef.current = setTimeout(() => sbSaveXP(xpData), 2000);
    }
  }, [xpData]);

  useEffect(() => {
    saveStreaks(streakData);
    clearTimeout(streakTimerRef.current);
    // Guard: don't sync empty streaks to cloud
    if (streakData.dates?.length > 0) {
      streakTimerRef.current = setTimeout(() => sbSaveStreaks(streakData), 2000);
    }
  }, [streakData]);

  useEffect(() => {
    saveTopicProgress(topicData);
    clearTimeout(topicTimerRef.current);
    // Guard: don't sync empty topics to cloud
    if (topicData && Object.keys(topicData).length > 0) {
      topicTimerRef.current = setTimeout(() => sbSaveSetting("topics", topicData), 2000);
    }
  }, [topicData]);

  useEffect(() => {
    saveCustomTopics(customTopics);
    clearTimeout(customTopicsTimerRef.current);
    if (customTopics && Object.keys(customTopics).length > 0) {
      customTopicsTimerRef.current = setTimeout(() => sbSaveSetting("customTopics", customTopics), 2000);
    }
  }, [customTopics]);

  useEffect(() => {
    saveTeacherNotes(teacherNotes);
    clearTimeout(teacherNotesTimerRef.current);
    if (teacherNotes && Object.keys(teacherNotes).length > 0) {
      teacherNotesTimerRef.current = setTimeout(() => sbSaveSetting("teacherNotes", teacherNotes), 2000);
    }
  }, [teacherNotes]);

  /** Cancel all pending debounced cloud saves (call before switchUser clears state). */
  const cancelPendingSaves = useCallback(() => {
    clearTimeout(xpTimerRef.current);
    clearTimeout(streakTimerRef.current);
    clearTimeout(topicTimerRef.current);
    clearTimeout(customTopicsTimerRef.current);
    clearTimeout(teacherNotesTimerRef.current);
  }, []);

  useEffect(() => {
    if (profile) setStreakData(prev => recordActivity(prev));
  }, [profile, setStreakData]);

  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener("storage-full", handler);
    return () => window.removeEventListener("storage-full", handler);
  }, [setStorageFull]);

  return { cancelPendingSaves };
}
