import { useMemo } from "react";
import { SUBJECTS } from "../config/subjects.js";
import { eventTypeInfo } from "../utils/events.js";

/**
 * Aggregates all data sources into unified calendar entries.
 * Ready for a future calendar view — currently used for timeline features.
 *
 * Entry shape: { date, type, subjectId, title, subtitle, color, emoji, source }
 */
export function useCalendarEntries(memory, teacherNotes, events, streakData) {
  return useMemo(() => {
    const entries = [];

    // Sessions → calendar entries
    if (memory?.subjects) {
      Object.entries(memory.subjects).forEach(([subId, sessions]) => {
        const sub = SUBJECTS[subId];
        (sessions || []).forEach(s => {
          entries.push({
            date: s.date,
            type: s.isExam ? "exam_session" : "session",
            subjectId: subId,
            title: s.isExam ? "Exam: " + (s.examDescription || "Practice") : "Study session",
            subtitle: (s.topics || []).slice(0, 3).join(", "),
            color: sub?.color || "#999",
            emoji: sub?.emoji || "\ud83d\udcda",
            source: s,
          });
        });
      });
    }

    // Teacher notes with expiry → calendar entries
    if (teacherNotes) {
      Object.entries(teacherNotes).forEach(([subId, notes]) => {
        const sub = SUBJECTS[subId];
        Object.values(notes || {}).forEach(n => {
          if (n.expires) {
            entries.push({
              date: n.expires,
              type: "note_expires",
              subjectId: subId,
              title: "Note expires",
              subtitle: (n.text || "").slice(0, 40),
              color: sub?.color || "#999",
              emoji: "\ud83c\udfeb",
              source: n,
            });
          }
        });
      });
    }

    // Planned events → calendar entries
    if (events) {
      events.forEach(e => {
        const sub = SUBJECTS[e.subjectId];
        const ti = eventTypeInfo(e.type);
        entries.push({
          date: e.date,
          type: e.status === "completed" ? "event_completed" : "event",
          subjectId: e.subjectId,
          title: e.title,
          subtitle: e.status === "completed" && e.score != null && e.maxScore
            ? `${e.score}/${e.maxScore} (${Math.round(e.score / e.maxScore * 100)}%)`
            : (e.topics || []).slice(0, 2).join(", "),
          color: sub?.color || "#6366f1",
          emoji: ti.emoji,
          source: e,
        });
      });
    }

    // Activity days from streaks
    if (streakData?.dates) {
      streakData.dates.forEach(d => {
        entries.push({
          date: d,
          type: "activity",
          subjectId: null,
          title: "Active day",
          subtitle: "",
          color: "#22c55e",
          emoji: "\ud83d\udd25",
          source: null,
        });
      });
    }

    return entries.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [memory, teacherNotes, events, streakData]);
}
