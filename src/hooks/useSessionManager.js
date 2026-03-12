import { SUBJECTS, emptyMats } from "../config/subjects.js";
import { setActiveStudent, saveProfile, loadMemory, getSessions } from "../utils/storage.js";
import { loadXP } from "../utils/xp.js";
import { loadStreaks } from "../utils/xp.js";
import { loadTopicProgress, recordTopicStudy } from "../utils/topics.js";
import { sbSaveSetting } from "../utils/cloudSync.js";
import { stopSpeaking } from "../utils/speech.js";

/**
 * Manages session lifecycle: switching subjects, switching users,
 * updating profiles, and starting topic-focused sessions.
 */
export function useSessionManager({
  active, sessions, msgs, curMats, profile, memory, autoSumming,
  setActiveRaw, setSessions, setMats, setExamMode, setProfile, setMemory,
  setXpData, setStreakData, setTopicData, setModal, resetSync, autoSave, sendRef, signOut,
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
    saveProfile(p);
    setProfile(p);
    if (p?.name) {
      setMemory(loadMemory());
      setXpData(loadXP());
      setStreakData(loadStreaks());
      setTopicData(loadTopicProgress());
      sbSaveSetting("profile", p);
    }
    setModal(null);
  }

  function switchUser() {
    if (active && msgs.length >= 6) autoSave(active, msgs, curMats);
    stopSpeaking();
    setActiveRaw(null);
    setSessions({});
    setMats(emptyMats());
    resetSync();
    setActiveStudent("");
    setProfile(null);
    saveProfile(null);
    setMemory({ version: 2, subjects: {} });
    setXpData({ total: 0, history: [] });
    setStreakData({ dates: [] });
    setTopicData({});
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
