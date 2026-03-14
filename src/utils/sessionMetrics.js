/* ═══════════════════════════════════════════════════════════════════
   SESSION METRICS — hard tracking of Q&A accuracy, time, and depth
   ═══════════════════════════════════════════════════════════════════ */

/** Create a fresh metrics object for a new session */
export function createSessionMetrics() {
  return {
    assessments: [],         // array of log_assessment entries
    sessionStartedAt: Date.now(),
    lastMessageAt: Date.now(),
    activeTimeMs: 0,         // cumulative active time (gaps capped at 3min)
    messageTimestamps: [],   // timestamps of each user message
  };
}

/** Record a user message for active-time tracking. Call on each user send. */
export function recordMessage(metrics) {
  const now = Date.now();
  const gap = now - metrics.lastMessageAt;
  // Cap gap at 3 minutes to exclude idle/AFK time
  const activeGap = Math.min(gap, 3 * 60 * 1000);
  return {
    ...metrics,
    lastMessageAt: now,
    activeTimeMs: metrics.activeTimeMs + activeGap,
    messageTimestamps: [...metrics.messageTimestamps, now],
  };
}

/** Record an assessment from the log_assessment tool */
export function recordAssessment(metrics, entry) {
  return { ...metrics, assessments: [...metrics.assessments, entry] };
}

/** Compute summary stats from accumulated metrics */
export function computeMetricsSummary(metrics) {
  const a = metrics.assessments;
  const total = a.length;
  if (total === 0) {
    return {
      totalQuestions: 0,
      correct: 0, partial: 0, wrong: 0, skipped: 0,
      accuracyPct: null,
      avgHints: null,
      reasoningPct: null,
      activeMinutes: Math.round(metrics.activeTimeMs / 60000),
      topicBreakdown: {},
      depthByTopic: {},
      evidenceConfidence: {},
    };
  }

  const correct = a.filter(e => e.result === "correct").length;
  const partial = a.filter(e => e.result === "partial").length;
  const wrong = a.filter(e => e.result === "wrong").length;
  const skipped = a.filter(e => e.result === "skipped").length;
  const attempted = total - skipped;
  const accuracyPct = attempted > 0 ? Math.round(((correct + partial * 0.5) / attempted) * 100) : null;
  const avgHints = attempted > 0 ? +(a.reduce((s, e) => s + (e.hintsGiven || 0), 0) / attempted).toFixed(1) : null;
  const reasoned = a.filter(e => e.studentExplainedReasoning).length;
  const reasoningPct = total > 0 ? Math.round((reasoned / total) * 100) : null;

  // Per-topic breakdown
  const topicBreakdown = {};
  for (const e of a) {
    if (!topicBreakdown[e.topic]) topicBreakdown[e.topic] = { correct: 0, partial: 0, wrong: 0, skipped: 0, hints: 0, total: 0 };
    const t = topicBreakdown[e.topic];
    t[e.result]++;
    t.hints += e.hintsGiven || 0;
    t.total++;
  }

  // Depth by topic: introduced / practiced / tested based on question count and types
  const depthByTopic = {};
  for (const [topic, stats] of Object.entries(topicBreakdown)) {
    const hasExam = a.some(e => e.topic === topic && e.questionType === "exam");
    const hasAnalyse = a.some(e => e.topic === topic && e.questionType === "analyse");
    if (stats.total >= 3 && (hasExam || hasAnalyse)) depthByTopic[topic] = "tested";
    else if (stats.total >= 2) depthByTopic[topic] = "practiced";
    else depthByTopic[topic] = "introduced";
  }

  // Evidence-based confidence per topic
  const evidenceConfidence = {};
  for (const [topic, stats] of Object.entries(topicBreakdown)) {
    const attempted = stats.total - stats.skipped;
    if (attempted === 0) { evidenceConfidence[topic] = 0; continue; }
    const rawAccuracy = (stats.correct + stats.partial * 0.5) / attempted;
    // Penalise heavy hint usage
    const avgTopicHints = stats.hints / attempted;
    const hintPenalty = Math.min(avgTopicHints * 0.15, 0.4);
    // Require minimum questions for high confidence
    const sampleBonus = attempted >= 3 ? 0 : -0.15;
    const confidence = Math.max(0, Math.min(100, Math.round((rawAccuracy - hintPenalty + sampleBonus) * 100)));
    evidenceConfidence[topic] = confidence;
  }

  return {
    totalQuestions: total,
    correct, partial, wrong, skipped,
    accuracyPct,
    avgHints,
    reasoningPct,
    activeMinutes: Math.round(metrics.activeTimeMs / 60000),
    topicBreakdown,
    depthByTopic,
    evidenceConfidence,
  };
}

/** Format metrics into a text block for the summary prompt */
export function formatMetricsForPrompt(metrics) {
  const s = computeMetricsSummary(metrics);
  if (s.totalQuestions === 0) {
    return `SESSION METRICS: No questions were asked/answered this session. Active time: ~${s.activeMinutes} min. This was a discussion-only session — do NOT report progress on any topic.`;
  }

  let out = `SESSION METRICS (use these as ground truth — do NOT inflate):\n`;
  out += `- Questions attempted: ${s.totalQuestions} (${s.correct} correct, ${s.partial} partial, ${s.wrong} wrong, ${s.skipped} skipped)\n`;
  out += `- Overall accuracy: ${s.accuracyPct}%\n`;
  out += `- Average hints per question: ${s.avgHints}\n`;
  out += `- Student explained reasoning: ${s.reasoningPct}% of the time\n`;
  out += `- Active session time: ~${s.activeMinutes} min\n\n`;
  out += `TOPIC BREAKDOWN:\n`;
  for (const [topic, stats] of Object.entries(s.topicBreakdown)) {
    const attempted = stats.total - stats.skipped;
    const topicAcc = attempted > 0 ? Math.round(((stats.correct + stats.partial * 0.5) / attempted) * 100) : 0;
    out += `- ${topic}: ${stats.total} Qs (${stats.correct}✓ ${stats.partial}~ ${stats.wrong}✗ ${stats.skipped}⊘) accuracy=${topicAcc}% hints=${stats.hints} depth=${s.depthByTopic[topic]}\n`;
  }
  out += `\nEVIDENCE-BASED CONFIDENCE (use these, not your own estimates):\n`;
  for (const [topic, conf] of Object.entries(s.evidenceConfidence)) {
    out += `- ${topic}: ${conf}%\n`;
  }
  return out;
}
