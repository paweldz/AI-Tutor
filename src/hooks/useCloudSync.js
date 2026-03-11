import { useState, useEffect, useRef } from "react";
import { saveProfile } from "../utils/storage.js";
import { sbLoad, mergeMemory, sbLoadSettings } from "../utils/cloudSync.js";
import { saveTopicProgress } from "../utils/topics.js";

/**
 * Handles one-time Supabase sync on login: loads memory, profile settings,
 * and topic progress from the cloud and merges with local data.
 */
export function useCloudSync({ profile, setProfile, setMemory, setTopicData }) {
  const sbSyncedRef = useRef(false);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    if (!profile || sbSyncedRef.current) return;
    sbSyncedRef.current = true;

    // Load memory
    sbLoad(profile.name).then(cloud => {
      if (cloud) { setMemory(prev => mergeMemory(prev, cloud)); setDbConnected(true); }
    }).catch(() => {});

    // Load profile settings (cloud overrides local if exists)
    sbLoadSettings(profile.name).then(settings => {
      if (settings?.profile) {
        const cloud = settings.profile;
        setProfile(prev => {
          const merged = { ...prev, ...cloud, examBoards: { ...prev.examBoards, ...cloud.examBoards }, tutorCharacters: { ...prev.tutorCharacters, ...cloud.tutorCharacters } };
          saveProfile(merged);
          return merged;
        });
        setDbConnected(true);
      }
      // Load topic progress from cloud
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
  }, [profile, setProfile, setMemory, setTopicData]);

  function resetSync() {
    sbSyncedRef.current = false;
    setDbConnected(false);
  }

  return { dbConnected, resetSync };
}
