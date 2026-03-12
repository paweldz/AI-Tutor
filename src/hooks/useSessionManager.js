import { SUBJECTS, emptyMats } from "../config/subjects.js";
import { setActiveStudent, saveProfile, loadMemory, getSessions } from "../utils/storage.js";
import { loadXP, loadStreaks } from "../utils/xp.js";
import { loadTopicProgress, recordTopicStudy } from "../utils/topics.js";
import { sbSaveSetting, sbSaveXP, sbSaveStreaks } from "../utils/cloudSync.js";
import { stopSpeaking } from "../utils/speech.js";

/**
 * Manages session lifecycle: switching subjects, switching users,
 * updating profiles, and starting topic-focused sessions.
 */
export function useSessionManager({
  active, sessions, msgs, curMats, profile, memory, autoSumming,
  xpData, streakData, topicData,
  setActiveRaw, setSessions, setMats, setExamMode, setProfile, setMemory,
  setXpData, setStreakData, setTopicData, setModal, resetSync, cancelPendingSaves, autoSave, sendRef, signOut,
}) {
  function setActive(newId) {
    if (active && msgs.length >= 6 && !autoSumming) autoSave(active, msgs, curMats);
    setActiveRaw(newId);
    setExamMode(false);
    if (newId && !sessions[newId] && profile) {
      const sub = SUBJECTS[newId];
      const board = profile.examBoards?.[newId];
      const memCount = getSessions(memory, newId).length;
      setSessions(prev => ({ ...prev, [newId]: { messages: [{ role: "assistant", content: sub.welcomeMessage(profile, board, memCount) }] } }));
    }
  }

  function updateProfile(p) {
    const nameChanged = p?.name && p.name !== profile?.name;
    saveProfile(p);
    setProfile(p);
    if (p?.name) {
      setActiveStudent(p.name);
      // Only reload from localStorage when the student name actually changed
      // (e.g. switching users in settings). When coming from Setup after a
      // cloud restore, the React state already has the correct data — reloading
      // from localStorage would overwrite it with empty values.
      if (nameChanged) {
        setMemory(loadMemory());
        setXpData(loadXP());
        setStreakData(loadStreaks());
        setTopicData(loadTopicProgress());
      }
      sbSaveSetting("profile", p);
    }
    setModal(null);
  }

  function switchUser() {
    // Save current session if substantial
    if (active && msgs.length >= 6) autoSave(active, msgs, curMats);
    stopSpeaking();

    // ── Flush pending data to cloud BEFORE signing out ──
    // Debounced saves (2s delay) may not have fired yet — force them now
    // so no recent changes are lost when the auth session is destroyed.
    if (profile) sbSaveSetting("profile", profile);
    if (xpData && (xpData.total > 0 || xpData.history?.length > 0)) sbSaveXP(xpData);
    if (streakData?.dates?.length > 0) sbSaveStreaks(streakData);
    if (topicData && Object.keys(topicData).length > 0) sbSaveSetting("topics", topicData);

    // Cancel debounced cloud saves so the state-clearing below doesn't
    // schedule empty-data overwrites via usePersistence effects.
    if (cancelPendingSaves) cancelPendingSaves();

    // Clear UI state
    setActiveRaw(null);
    setSessions({});
    setMats(emptyMats());

    // Clear local profile state (but keep localStorage data keyed by student)
    setActiveStudent("");
    setProfile(null);
    saveProfile(null);
    setMemory({ version: 2, subjects: {} });
    setXpData({ total: 0, history: [] });
    setStreakData({ dates: [] });
    setTopicData({});

    // Reset cloud sync so it re-triggers on next login
    resetSync();

    // Sign out of Supabase — user must re-authenticate
    if (signOut) signOut();
  }

  function studyTopic(sub, topic) {
    setActive(sub.id);
    setTopicData(prev => recordTopicStudy(prev, sub.id, topic));
    setTimeout(() => {
      if (sendRef.current) sendRef.current("I'd like to study: " + topic);
    }, 800);
  }

  return { setActive, updateProfile, switchUser, studyTopic };
}
