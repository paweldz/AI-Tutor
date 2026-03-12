/* ═══════════════════════════════════════════════════════════════════
   STREAKS & XP — gamification layer
   ═══════════════════════════════════════════════════════════════════ */

import { readJSON, writeJSON, studentKey } from "./storage.js";

export const XP_KEYS = { xp: "gcse_xp_v1", streaks: "gcse_streaks_v1" };

export function todayStr() { return new Date().toISOString().slice(0, 10); }

export function loadXP() { return readJSON(studentKey(XP_KEYS.xp), { total: 0, history: [] }); }
export function saveXP(data) { writeJSON(studentKey(XP_KEYS.xp), data); }
export function addXP(prev, amount, reason) {
  const entry = { amount, reason, date: todayStr(), ts: Date.now() };
  return { total: prev.total + amount, history: [...prev.history.slice(-200), entry] };
}

export function xpLevel(total) {
  if (total < 100) return { level: 1, title: "Beginner", current: total, next: 100 };
  if (total < 250) return { level: 2, title: "Learner", current: total - 100, next: 150 };
  if (total < 500) return { level: 3, title: "Explorer", current: total - 250, next: 250 };
  if (total < 850) return { level: 4, title: "Scholar", current: total - 500, next: 350 };
  if (total < 1350) return { level: 5, title: "Achiever", current: total - 850, next: 500 };
  if (total < 2000) return { level: 6, title: "Expert", current: total - 1350, next: 650 };
  if (total < 3000) return { level: 7, title: "Master", current: total - 2000, next: 1000 };
  if (total < 4500) return { level: 8, title: "Champion", current: total - 3000, next: 1500 };
  if (total < 7000) return { level: 9, title: "Legend", current: total - 4500, next: 2500 };
  return { level: 10, title: "GCSE Hero", current: total - 7000, next: 999999 };
}

export const LEVEL_EMOJIS = ["", "\ud83c\udf31", "\ud83c\udf3f", "\ud83c\udf3b", "\u2b50", "\ud83c\udf1f", "\ud83d\udd25", "\ud83d\udc8e", "\ud83d\udc51", "\ud83c\udf1f", "\ud83c\udfc6"];

export function loadStreaks() { return readJSON(studentKey(XP_KEYS.streaks), { dates: [] }); }
export function saveStreaks(data) { writeJSON(studentKey(XP_KEYS.streaks), data); }
export function recordActivity(streaks) {
  const today = todayStr();
  if (streaks.dates.includes(today)) return streaks;
  return { dates: [...streaks.dates.slice(-60), today] };
}
export function calcStreak(dates) {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]); prev.setDate(prev.getDate() - 1);
    if (sorted[i] === prev.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
}
export function weekHeatmap(dates) {
  const map = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    const day = d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2);
    map.push({ date: ds, day, active: dates.includes(ds) });
  }
  return map;
}
