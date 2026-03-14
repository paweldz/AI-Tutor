/* ═══════════════════════════════════════════════════════════════════
   ACADEMIC EVENTS — pure helpers for calendar/event tracking
   ═══════════════════════════════════════════════════════════════════ */

export const EVENT_TYPES = [
  { value: "test", label: "Class Test", emoji: "\u270d\ufe0f" },
  { value: "mock", label: "Mock Exam", emoji: "\ud83d\udcdd" },
  { value: "exam", label: "Final Exam", emoji: "\ud83c\udfaf" },
  { value: "coursework", label: "Coursework", emoji: "\ud83d\udcc4" },
  { value: "homework", label: "Homework", emoji: "\ud83c\udfe0" },
  { value: "presentation", label: "Presentation", emoji: "\ud83c\udf99\ufe0f" },
  { value: "custom", label: "Other", emoji: "\ud83d\udcc5" },
];

export function eventTypeInfo(type) {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

export function createEvent({ subjectId, type, title, topics, date, description, reminderDays, createdBy }) {
  return {
    id: crypto.randomUUID(),
    subjectId,
    type: type || "test",
    title: title || "",
    topics: topics || [],
    date: date || "",
    status: "upcoming",
    description: description || "",
    reminderDays: reminderDays || [7, 1],
    completedAt: null,
    score: null,
    maxScore: null,
    selfAssessment: null,
    reflection: { wentWell: "", toImprove: "" },
    createdBy: createdBy || "student",
    createdAt: new Date().toISOString(),
  };
}

export function updateEvent(events, id, updates) {
  return events.map(e => e.id === id ? { ...e, ...updates } : e);
}

export function deleteEvent(events, id) {
  return events.filter(e => e.id !== id);
}

export function completeEvent(events, id, { score, maxScore, selfAssessment, reflection }) {
  return updateEvent(events, id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    score: score ?? null,
    maxScore: maxScore ?? null,
    selfAssessment: selfAssessment ?? null,
    reflection: reflection || { wentWell: "", toImprove: "" },
  });
}

/** Days until event (negative = past) */
export function daysUntil(dateStr) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00"); d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

/** Get upcoming events sorted by date */
export function getUpcoming(events, subjectId) {
  return events
    .filter(e => e.status === "upcoming" && (!subjectId || e.subjectId === subjectId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Get events within reminder window */
export function getReminders(events) {
  return events
    .filter(e => {
      if (e.status !== "upcoming") return false;
      const days = daysUntil(e.date);
      if (days < 0) return false;
      return (e.reminderDays || [7, 1]).some(r => days <= r);
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Get events for a specific subject */
export function getSubjectEvents(events, subjectId) {
  return events
    .filter(e => e.subjectId === subjectId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Format date nicely */
export function formatEventDate(dateStr) {
  const d = daysUntil(dateStr);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d > 0 && d <= 7) return `In ${d} days`;
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Build event result as a memory-compatible entry */
export function eventToMemoryEntry(event) {
  return {
    sessionId: event.id,
    date: new Date(event.completedAt || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    type: "event_result",
    eventType: event.type,
    title: event.title,
    topics: event.topics || [],
    score: event.score,
    maxScore: event.maxScore,
    selfAssessment: event.selfAssessment,
    reflection: event.reflection,
    confidenceScores: {},
    strengths: [],
    weaknesses: event.reflection?.toImprove ? [event.reflection.toImprove] : [],
    rawSummaryText: buildEventSummary(event),
    messageCount: 0,
    examQuestionsAttempted: 0,
  };
}

function buildEventSummary(event) {
  const typeInfo = eventTypeInfo(event.type);
  let text = `${typeInfo.label}: ${event.title}`;
  if (event.score != null && event.maxScore) text += ` — Score: ${event.score}/${event.maxScore} (${Math.round(event.score / event.maxScore * 100)}%)`;
  else if (event.score != null) text += ` — Score: ${event.score}`;
  if (event.selfAssessment) text += ` — Self-assessment: ${event.selfAssessment}/5`;
  if (event.reflection?.wentWell) text += `\n\nWhat went well: ${event.reflection.wentWell}`;
  if (event.reflection?.toImprove) text += `\nTo improve: ${event.reflection.toImprove}`;
  return text;
}
