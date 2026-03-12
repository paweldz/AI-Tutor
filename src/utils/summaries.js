import { ALL_SUBJECT_LIST } from "../config/subjects.js";

const FALLBACK_TUTOR = { emoji: "", label: "Unknown", gradient: "#999", color: "#999" };

/**
 * Build a sorted list of all session summaries across subjects,
 * annotated with tutor metadata. Used by Dashboard and DashboardPage.
 */
export function buildAllSummaries(memory) {
  return Object.entries(memory?.subjects || {})
    .flatMap(([id, sums]) =>
      (sums || []).map(s => ({
        ...s,
        tutor: ALL_SUBJECT_LIST.find(t => t.id === id) || FALLBACK_TUTOR,
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
