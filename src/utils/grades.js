/* ═══════════════════════════════════════════════════════════════════
   GCSE GRADES — Grade definitions, boundaries, score-to-grade mapping,
   and estimated current grade logic.
   ═══════════════════════════════════════════════════════════════════ */

/** GCSE grade scale 9 (highest) to 1 (lowest), plus U (ungraded) */
export const GCSE_GRADES = [9, 8, 7, 6, 5, 4, 3, 2, 1];

export const GRADE_INFO = {
  9: { label: "Grade 9", descriptor: "Exceptional", color: "#7c3aed", tier: "Higher" },
  8: { label: "Grade 8", descriptor: "Outstanding", color: "#6366f1", tier: "Higher" },
  7: { label: "Grade 7", descriptor: "Excellent", color: "#2563eb", tier: "Higher" },
  6: { label: "Grade 6", descriptor: "Strong", color: "#0891b2", tier: "Higher" },
  5: { label: "Grade 5", descriptor: "Strong Pass", color: "#059669", tier: "Either" },
  4: { label: "Grade 4", descriptor: "Standard Pass", color: "#65a30d", tier: "Either" },
  3: { label: "Grade 3", descriptor: "Below Pass", color: "#ca8a04", tier: "Foundation" },
  2: { label: "Grade 2", descriptor: "Limited", color: "#ea580c", tier: "Foundation" },
  1: { label: "Grade 1", descriptor: "Very Limited", color: "#dc2626", tier: "Foundation" },
};

/** Grades available per tier */
export function gradesForTier(tier) {
  if (tier === "Foundation") return [5, 4, 3, 2, 1];
  if (tier === "Higher") return [9, 8, 7, 6, 5, 4];
  return GCSE_GRADES; // show all if tier not set
}

/**
 * Approximate grade boundaries by exam board and tier.
 * These are representative boundaries based on typical GCSE exams.
 * Percentages represent the minimum % needed for each grade.
 */
const BOUNDARIES = {
  // Higher tier boundaries (grades 4-9)
  Higher: {
    AQA:     { 9: 80, 8: 70, 7: 60, 6: 50, 5: 40, 4: 30 },
    Edexcel: { 9: 78, 8: 68, 7: 58, 6: 48, 5: 38, 4: 28 },
    OCR:     { 9: 79, 8: 69, 7: 59, 6: 49, 5: 39, 4: 29 },
    WJEC:    { 9: 77, 8: 67, 7: 57, 6: 47, 5: 37, 4: 27 },
    Eduqas:  { 9: 77, 8: 67, 7: 57, 6: 47, 5: 37, 4: 27 },
    default: { 9: 79, 8: 69, 7: 59, 6: 49, 5: 39, 4: 29 },
  },
  // Foundation tier boundaries (grades 1-5)
  Foundation: {
    AQA:     { 5: 82, 4: 66, 3: 50, 2: 34, 1: 18 },
    Edexcel: { 5: 80, 4: 64, 3: 48, 2: 32, 1: 16 },
    OCR:     { 5: 81, 4: 65, 3: 49, 2: 33, 1: 17 },
    WJEC:    { 5: 80, 4: 64, 3: 48, 2: 32, 1: 16 },
    Eduqas:  { 5: 80, 4: 64, 3: 48, 2: 32, 1: 16 },
    default: { 5: 81, 4: 65, 3: 49, 2: 33, 1: 17 },
  },
};

/** Get grade boundaries for a given board and tier */
export function getBoundaries(board, tier) {
  const tierKey = tier === "Foundation" ? "Foundation" : "Higher";
  const tierBounds = BOUNDARIES[tierKey];
  return tierBounds[board] || tierBounds.default;
}

/**
 * Convert a percentage score to a GCSE grade using board/tier boundaries.
 * Returns { grade: number|"U", info: object, percentage: number }
 */
export function scoreToGrade(score, maxScore, board, tier) {
  if (!maxScore || maxScore <= 0) return null;
  const pct = Math.round((score / maxScore) * 100);
  const bounds = getBoundaries(board, tier);
  const grades = Object.entries(bounds)
    .map(([g, minPct]) => [Number(g), minPct])
    .sort((a, b) => b[0] - a[0]); // highest grade first

  for (const [grade, minPct] of grades) {
    if (pct >= minPct) {
      return { grade, info: GRADE_INFO[grade], percentage: pct };
    }
  }
  return { grade: "U", info: { label: "Ungraded", descriptor: "Below Grade 1", color: "#9ca3af" }, percentage: pct };
}

/**
 * Estimate current GCSE grade based on available evidence.
 * Returns null if insufficient data, otherwise { low, high, confidence, factors }
 * where low/high form a grade range.
 *
 * Requires at least one of:
 * - 3+ sessions with confidence scores
 * - 1+ scored test/mock events
 * - 30%+ topic coverage
 */
export function estimateGrade(memory, events, topicData, profile, subjectId, allTopicsList) {
  const sessions = memory?.subjects?.[subjectId] || [];
  const board = profile?.examBoards?.[subjectId] || "";
  const tier = profile?.tier || "Higher";

  // Collect evidence
  const factors = [];
  let totalWeight = 0;
  let weightedScore = 0;

  // 1. Confidence scores from sessions (weight: 3)
  const allConf = {};
  for (const s of sessions) {
    if (s.confidenceScores) Object.assign(allConf, s.confidenceScores);
  }
  const confVals = Object.values(allConf).filter(v => typeof v === "number");
  if (confVals.length >= 3) {
    const avg = confVals.reduce((a, b) => a + b, 0) / confVals.length;
    weightedScore += avg * 3;
    totalWeight += 3;
    factors.push({ type: "confidence", value: Math.round(avg), topics: confVals.length });
  }

  // 2. Test/mock scores from events (weight: 5 per scored event)
  const scoredEvents = (events || [])
    .filter(e => e.subjectId === subjectId && e.status === "completed" && e.score != null && e.maxScore > 0);
  if (scoredEvents.length > 0) {
    for (const ev of scoredEvents.slice(-5)) { // last 5 scored events
      const pct = (ev.score / ev.maxScore) * 100;
      const w = ev.type === "mock" || ev.type === "exam" ? 5 : 3;
      weightedScore += pct * w;
      totalWeight += w;
    }
    const avgScore = scoredEvents.reduce((a, e) => a + (e.score / e.maxScore) * 100, 0) / scoredEvents.length;
    factors.push({ type: "tests", value: Math.round(avgScore), count: scoredEvents.length });
  }

  // 3. Session metrics — accuracy from question logs (weight: 2)
  const recentWithMetrics = sessions.filter(s => s.metrics?.totalQuestions > 0).slice(-6);
  if (recentWithMetrics.length >= 2) {
    const totalQ = recentWithMetrics.reduce((a, s) => a + s.metrics.totalQuestions, 0);
    const totalCorrect = recentWithMetrics.reduce((a, s) => a + (s.metrics.correct || 0), 0);
    const totalPartial = recentWithMetrics.reduce((a, s) => a + (s.metrics.partial || 0), 0);
    if (totalQ >= 5) {
      const accuracyPct = ((totalCorrect + totalPartial * 0.5) / totalQ) * 100;
      weightedScore += accuracyPct * 2;
      totalWeight += 2;
      factors.push({ type: "accuracy", value: Math.round(accuracyPct), questions: totalQ });
    }
  }

  // 4. Topic coverage penalty/bonus (weight: 1)
  const topicProgress = topicData?.[subjectId] || {};
  let allTopics = allTopicsList || [];
  if (allTopics.length > 0) {
    const studied = Object.values(topicProgress).filter(v => v.studied > 0).length;
    const coveragePct = (studied / allTopics.length) * 100;
    if (coveragePct > 10) {
      // Coverage affects estimate — low coverage means less reliable, pulls estimate down slightly
      const coverageModifier = Math.min(coveragePct, 100);
      weightedScore += coverageModifier * 1;
      totalWeight += 1;
      factors.push({ type: "coverage", value: Math.round(coveragePct), studied, total: allTopics.length });
    }
  }

  // Need minimum evidence
  if (totalWeight < 3) return null;

  const avgPct = weightedScore / totalWeight;
  const bounds = getBoundaries(board, tier);
  const grades = Object.entries(bounds)
    .map(([g, minPct]) => [Number(g), minPct])
    .sort((a, b) => b[0] - a[0]);

  // Find point estimate
  let pointGrade = 1;
  for (const [grade, minPct] of grades) {
    if (avgPct >= minPct) { pointGrade = grade; break; }
  }

  // Calculate range (uncertainty based on evidence quality)
  const evidenceCount = factors.length;
  const spread = evidenceCount >= 3 ? 0 : 1; // tight range with 3+ evidence sources
  const low = Math.max(1, pointGrade - spread);
  const high = Math.min(9, pointGrade + spread);

  // Confidence in estimate (0-100)
  const conf = Math.min(100, Math.round(
    (Math.min(totalWeight, 15) / 15) * 50 + // weight of evidence
    (Math.min(sessions.length, 10) / 10) * 30 + // session count
    (Math.min(confVals.length, 10) / 10) * 20 // topic breadth
  ));

  return {
    low: Math.min(low, high),
    high: Math.max(low, high),
    point: pointGrade,
    percentage: Math.round(avgPct),
    confidence: conf,
    factors,
  };
}

/** Format a grade range for display */
export function formatGradeRange(estimate) {
  if (!estimate) return null;
  if (estimate.low === estimate.high) return String(estimate.low);
  return `${estimate.low}-${estimate.high}`;
}

/** Get color for a grade */
export function gradeColor(grade) {
  const info = GRADE_INFO[grade];
  return info?.color || "#9ca3af";
}

/** Get descriptor text for a grade */
export function gradeDescriptor(grade) {
  const info = GRADE_INFO[grade];
  return info?.descriptor || "Ungraded";
}

/** Build a text summary of grade estimate for use in system prompts */
export function gradeEstimateSummary(estimate) {
  if (!estimate) return "";
  const range = formatGradeRange(estimate);
  const parts = [`Estimated grade: ${range}`];
  for (const f of estimate.factors) {
    if (f.type === "confidence") parts.push(`avg confidence across ${f.topics} topics: ${f.value}%`);
    if (f.type === "tests") parts.push(`avg test score (${f.count} tests): ${f.value}%`);
    if (f.type === "accuracy") parts.push(`question accuracy (${f.questions} Qs): ${f.value}%`);
    if (f.type === "coverage") parts.push(`topic coverage: ${f.studied}/${f.total} (${f.value}%)`);
  }
  return parts.join(", ");
}
