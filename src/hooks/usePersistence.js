import { useEffect, useRef, useCallback } from "react";
import { recordActivity } from "../utils/xp.js";
import { sbSaveXP, sbSaveStreaks, sbSaveSetting } from "../utils/cloudSync.js";

/**
 * Handles debounced Supabase sync for all data.
 * No localStorage — cloud is the single source of truth.
 *
 * Returns { cancelPendingSaves } so switchUser can cancel debounced
 * cloud writes before clearing state (prevents empty-data overwrites).
 */
export function usePersistence({ memory, xpData, streakData, topicData, customTopics, teacherNotes, studentNotes, profile, setStreakData }) {
  const xpTimerRef = useRef(null);
  const streakTimerRef = useRef(null);
  const topicTimerRef = useRef(null);
  const customTopicsTimerRef = useRef(null);
  const teacherNotesTimerRef = useRef(null);
  const studentNotesTimerRef = useRef(null);

  useEffect(() => {
    clearTimeout(xpTimerRef.current);
    if (xpData.total > 0 || xpData.history?.length > 0) {
      xpTimerRef.current = setTimeout(() => sbSaveXP(xpData), 2000);
    }
  }, [xpData]);

  useEffect(() => {
    clearTimeout(streakTimerRef.current);
    if (streakData.dates?.length > 0) {
      streakTimerRef.current = setTimeout(() => sbSaveStreaks(streakData), 2000);
    }
  }, [streakData]);

  useEffect(() => {
    clearTimeout(topicTimerRef.current);
    if (topicData && Object.keys(topicData).length > 0) {
      topicTimerRef.current = setTimeout(() => sbSaveSetting("topics", topicData), 2000);
    }
  }, [topicData]);

  useEffect(() => {
    clearTimeout(customTopicsTimerRef.current);
    if (customTopics && Object.keys(customTopics).length > 0) {
      customTopicsTimerRef.current = setTimeout(() => sbSaveSetting("customTopics", customTopics), 2000);
    }
  }, [customTopics]);

  useEffect(() => {
    clearTimeout(teacherNotesTimerRef.current);
    if (teacherNotes && Object.keys(teacherNotes).length > 0) {
      teacherNotesTimerRef.current = setTimeout(() => sbSaveSetting("teacherNotes", teacherNotes), 2000);
    }
  }, [teacherNotes]);

  useEffect(() => {
    clearTimeout(studentNotesTimerRef.current);
    if (studentNotes && Object.keys(studentNotes).length > 0) {
      studentNotesTimerRef.current = setTimeout(() => sbSaveSetting("studentNotes", studentNotes), 2000);
    }
  }, [studentNotes]);

  /** Cancel all pending debounced cloud saves (call before switchUser clears state). */
  const cancelPendingSaves = useCallback(() => {
    clearTimeout(xpTimerRef.current);
    clearTimeout(streakTimerRef.current);
    clearTimeout(topicTimerRef.current);
    clearTimeout(customTopicsTimerRef.current);
    clearTimeout(teacherNotesTimerRef.current);
    clearTimeout(studentNotesTimerRef.current);
  }, []);

  // Record today's activity on first load
  useEffect(() => {
    if (profile) setStreakData(prev => recordActivity(prev));
  }, [profile, setStreakData]);

  return { cancelPendingSaves };
}
