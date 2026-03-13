/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS — single source of truth for colours, sizes, & helpers
   ═══════════════════════════════════════════════════════════════════ */

export const colors = {
  success: "#22c55e",
  warning: "#f59e0b",
  error:   "#ef4444",
  brand:   "#f0c040",
  text:    "#1a1a2e",
  muted:   "#888",
  border:  "#eee",
  bg:      "#fafafa",
  info:    "#0369a1",
  infoBg:  "#f0f9ff",
  infoBorder: "#bae6fd",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 24 };

/**
 * Returns a colour for a confidence percentage (0–100).
 * Used in Dashboard, HomeScreen, TopicsPanel, QuizComponents.
 */
export function confidenceColor(pct) {
  if (pct >= 70) return colors.success;
  if (pct >= 40) return colors.warning;
  if (pct > 0)   return colors.error;
  return "#e0e0e0";
}

/**
 * Returns a background tint for quiz answer states.
 */
export function answerBg(pct) {
  if (pct >= 70) return "#dcfce7";
  if (pct >= 40) return "#fee2e2";
  return colors.bg;
}

/**
 * Returns a score emoji + message.
 */
export function scoreMessage(pct) {
  if (pct >= 80) return { emoji: "\ud83c\udf89", text: "Excellent!" };
  if (pct >= 60) return { emoji: "\ud83d\udc4d", text: "Good job!" };
  if (pct >= 40) return { emoji: "\ud83d\udcaa", text: "Getting there!" };
  return { emoji: "\ud83d\udca1", text: "Keep practising!" };
}
