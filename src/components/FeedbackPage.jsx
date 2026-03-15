import { useState, useEffect } from "react";
import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { getAllLatestSnapshots, getRecentSessionFeedback, getSessionsSinceLastFeedback } from "../utils/feedbackQueries.js";
import { generateAndSaveFeedback } from "../utils/feedbackSync.js";

/* ── Shared sub-components (mirroring StatsPage style) ────────── */

const Card = ({ children, style }) => (
  <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", ...style }}>{children}</div>
);
const SectionTitle = ({ emoji, text, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase" }}>{emoji} {text}</div>
    {right}
  </div>
);

const TONE_STYLES = {
  positive: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", label: "Positive" },
  mixed: { bg: "#fffbeb", border: "#fed7aa", color: "#c2410c", label: "Mixed" },
  "needs-attention": { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", label: "Needs Attention" },
};
const PRIORITY_STYLES = {
  high: { bg: "#fef2f2", color: "#dc2626" },
  medium: { bg: "#fffbeb", color: "#d97706" },
  low: { bg: "#f0fdf4", color: "#15803d" },
};
const READINESS_STYLES = {
  strong: { bg: "#f0fdf4", color: "#15803d", emoji: "\u2705", label: "Strong" },
  "on-track": { bg: "#eff6ff", color: "#2563eb", emoji: "\ud83d\udfe2", label: "On Track" },
  "at-risk": { bg: "#fffbeb", color: "#d97706", emoji: "\u26a0\ufe0f", label: "At Risk" },
  behind: { bg: "#fef2f2", color: "#dc2626", emoji: "\ud83d\udea8", label: "Behind" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

/* ── Generating button ───────────────────────────────────────────── */

function GenerateButton({ label, loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: "8px 16px", borderRadius: 10, border: "1.5px solid #6366f1",
      background: loading ? "#e0e7ff" : "#f5f3ff", cursor: loading ? "default" : "pointer",
      fontSize: 11, fontWeight: 700, color: "#6366f1", display: "flex", alignItems: "center", gap: 6,
      opacity: loading ? 0.7 : 1,
    }}>
      {loading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>{"\u21bb"}</span> : "\u2728"}
      {loading ? "Generating..." : label}
    </button>
  );
}

/* ── Main FeedbackPage ───────────────────────────────────────────── */

export function FeedbackPage({ profile, memory, onBack }) {
  const subs = mySubjects(profile);
  const [subjectId, setSubjectId] = useState(subs[0]?.id || null);
  const [snapshots, setSnapshots] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState({});
  const [expandedSession, setExpandedSession] = useState(null);

  const sub = subjectId ? SUBJECTS[subjectId] : null;

  // Load data on subject change
  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    setExpandedSession(null);
    Promise.all([
      getAllLatestSnapshots(subjectId),
      getRecentSessionFeedback(subjectId, 5),
      getSessionsSinceLastFeedback(subjectId),
    ]).then(([snaps, recent, info]) => {
      setSnapshots(snaps);
      setRecentSessions(recent);
      setSessionInfo(info);
      setLoading(false);
    });
  }, [subjectId]);

  async function handleGenerate(type) {
    setGenerating(prev => ({ ...prev, [type]: true }));
    try {
      const content = await generateAndSaveFeedback(type, memory, subjectId, profile);
      setSnapshots(prev => ({
        ...prev,
        [type]: { content, generated_at: new Date().toISOString(), session_count: recentSessions.length },
      }));
    } catch (e) {
      console.error("Feedback generation failed:", e);
    } finally {
      setGenerating(prev => ({ ...prev, [type]: false }));
    }
  }

  async function handleGenerateAll() {
    const types = ["progress_narrative", "strengths_growth", "learning_patterns"];
    for (const type of types) {
      setGenerating(prev => ({ ...prev, [type]: true }));
    }
    try {
      await Promise.all(types.map(async type => {
        try {
          const content = await generateAndSaveFeedback(type, memory, subjectId, profile);
          setSnapshots(prev => ({
            ...prev,
            [type]: { content, generated_at: new Date().toISOString(), session_count: recentSessions.length },
          }));
        } finally {
          setGenerating(prev => ({ ...prev, [type]: false }));
        }
      }));
    } catch (e) {
      console.error("Batch generation failed:", e);
    }
  }

  async function handleOnDemand(type) {
    setGenerating(prev => ({ ...prev, [type]: true }));
    try {
      const content = await generateAndSaveFeedback(type, memory, subjectId, profile);
      setSnapshots(prev => ({
        ...prev,
        [type]: { content, generated_at: new Date().toISOString() },
      }));
    } catch (e) {
      console.error("On-demand generation failed:", e);
    } finally {
      setGenerating(prev => ({ ...prev, [type]: false }));
    }
  }

  const narrative = snapshots.progress_narrative?.content;
  const strengthsGrowth = snapshots.strengths_growth?.content;
  const patterns = snapshots.learning_patterns?.content;
  const examReady = snapshots.exam_readiness?.content;
  const parentLetter = snapshots.parent_letter?.content;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0, color: "#666" }}>{"\u2190"}</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", margin: 0 }}>Tutor Feedback</h1>
      </div>
      <p style={{ color: "#999", fontSize: 12, marginBottom: 16 }}>Qualitative insights from your tutor sessions — strengths, growth areas, and personalised advice.</p>

      {/* Subject filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {subs.map(s => (
          <button key={s.id} onClick={() => setSubjectId(s.id)} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid " + (subjectId === s.id ? s.color : "#e0e0e0"), background: subjectId === s.id ? s.color : "#fff", color: subjectId === s.id ? "#fff" : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{s.emoji} {s.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"\ud83d\udcdd"}</div>
          <div style={{ fontSize: 13 }}>Loading feedback...</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Staleness banner */}
          {sessionInfo && sessionInfo.sinceLastFeedback > 0 && snapshots.progress_narrative && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: 16 }}>{"\ud83d\udd04"}</span>
              <div style={{ flex: 1, fontSize: 11, color: "#1e40af" }}>
                <strong>{sessionInfo.sinceLastFeedback}</strong> new session{sessionInfo.sinceLastFeedback > 1 ? "s" : ""} since last analysis
              </div>
              <button onClick={handleGenerateAll} disabled={Object.values(generating).some(v => v)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #3b82f6", background: "#fff", color: "#3b82f6", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Update</button>
            </div>
          )}

          {/* 1. Recent Session Feedback (Tier 1) */}
          <Card>
            <SectionTitle emoji={"\ud83d\udccb"} text="Latest Session Feedback" />
            {recentSessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#ccc", fontSize: 12 }}>No sessions yet for this subject.</div>
            ) : (
              recentSessions.map((s, i) => {
                const isExpanded = expandedSession === i;
                return (
                  <div key={i} onClick={() => setExpandedSession(isExpanded ? null : i)} style={{ padding: "10px 0", borderBottom: i < recentSessions.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{s.date || s.isoDate}</div>
                        {s.topics.length > 0 && <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{s.topics.slice(0, 4).join(", ")}{s.topics.length > 4 ? ` +${s.topics.length - 4}` : ""}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {s.metrics?.accuracyPct != null && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: s.metrics.accuracyPct >= 70 ? "#22c55e" : s.metrics.accuracyPct >= 50 ? "#f59e0b" : "#ef4444" }}>{s.metrics.accuracyPct}%</span>
                        )}
                        <span style={{ fontSize: 12, color: "#ccc", transition: "transform .2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>{"\u203a"}</span>
                      </div>
                    </div>
                    {/* Strengths / Weaknesses pills */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {s.strengths.slice(0, 2).map((st, j) => (
                        <span key={"s" + j} style={{ padding: "2px 8px", borderRadius: 6, background: "#f0fdf4", color: "#15803d", fontSize: 9, fontWeight: 600 }}>{"\u2713"} {st.length > 40 ? st.slice(0, 38) + "\u2026" : st}</span>
                      ))}
                      {s.weaknesses.slice(0, 2).map((w, j) => (
                        <span key={"w" + j} style={{ padding: "2px 8px", borderRadius: 6, background: "#fef2f2", color: "#dc2626", fontSize: 9, fontWeight: 600 }}>{"\u25b2"} {w.length > 40 ? w.slice(0, 38) + "\u2026" : w}</span>
                      ))}
                    </div>
                    {/* Expanded: full summary */}
                    {isExpanded && s.rawSummaryText && (
                      <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "#fafafa", fontSize: 11, color: "#555", lineHeight: 1.6 }}>
                        {s.rawSummaryText}
                        {s.confidenceScores && Object.keys(s.confidenceScores).length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 4 }}>CONFIDENCE</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {Object.entries(s.confidenceScores).map(([topic, conf]) => {
                                const c = conf >= 80 ? "#22c55e" : conf >= 60 ? "#f59e0b" : "#ef4444";
                                return <span key={topic} style={{ padding: "2px 8px", borderRadius: 6, background: c + "15", color: c, fontSize: 10, fontWeight: 600 }}>{topic}: {conf}%</span>;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </Card>

          {/* 2. Progress Narrative (Tier 2) */}
          <Card>
            <SectionTitle
              emoji={"\ud83d\udcc8"}
              text="Progress Narrative"
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {snapshots.progress_narrative?.generated_at && (
                    <span style={{ fontSize: 9, color: "#bbb" }}>
                      {timeAgo(snapshots.progress_narrative.generated_at)} {"\u00b7"} {snapshots.progress_narrative.session_count || "?"} sessions
                    </span>
                  )}
                  <GenerateButton label={narrative ? "Refresh" : "Generate"} loading={!!generating.progress_narrative} onClick={() => handleGenerate("progress_narrative")} />
                </div>
              }
            />
            {narrative ? (
              <div>
                {narrative.tone && TONE_STYLES[narrative.tone] && (
                  <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: 8, background: TONE_STYLES[narrative.tone].bg, border: "1px solid " + TONE_STYLES[narrative.tone].border, color: TONE_STYLES[narrative.tone].color, fontSize: 10, fontWeight: 600, marginBottom: 10 }}>
                    {TONE_STYLES[narrative.tone].label}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7, marginBottom: 12 }}>{narrative.summary}</div>
                {narrative.bullets?.length > 0 && (
                  <div style={{ paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 6 }}>KEY TAKEAWAYS</div>
                    {narrative.bullets.map((b, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 11, color: "#555" }}>
                        <span style={{ color: sub?.color || "#6366f1", fontWeight: 700 }}>{"\u2022"}</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#ccc", fontSize: 12 }}>
                No narrative generated yet. Click "Generate" to create one from your session data.
              </div>
            )}
          </Card>

          {/* 3. Strengths & Growth Areas (Tier 2) */}
          <Card>
            <SectionTitle
              emoji={"\ud83d\udcaa"}
              text="Strengths & Growth Areas"
              right={<GenerateButton label={strengthsGrowth ? "Refresh" : "Generate"} loading={!!generating.strengths_growth} onClick={() => handleGenerate("strengths_growth")} />}
            />
            {strengthsGrowth ? (
              <div>
                {/* Strengths */}
                {strengthsGrowth.strengths?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#15803d", marginBottom: 6 }}>{"\u2705"} STRENGTHS</div>
                    {strengthsGrowth.strengths.map((s, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", marginBottom: 6, border: "1px solid #dcfce7" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>{s.area}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{s.evidence}</div>
                        {s.tip && <div style={{ fontSize: 10, color: "#15803d", marginTop: 4, fontStyle: "italic" }}>{"\ud83d\udca1"} {s.tip}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {/* Growth Areas */}
                {strengthsGrowth.growthAreas?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#dc2626", marginBottom: 6 }}>{"\ud83c\udfaf"} GROWTH AREAS</div>
                    {strengthsGrowth.growthAreas.map((g, i) => {
                      const ps = PRIORITY_STYLES[g.priority] || PRIORITY_STYLES.medium;
                      return (
                        <div key={i} style={{ padding: "8px 12px", borderRadius: 10, background: "#fafafa", marginBottom: 6, border: "1px solid #eee" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{g.area}</div>
                            <span style={{ padding: "1px 8px", borderRadius: 6, background: ps.bg, color: ps.color, fontSize: 9, fontWeight: 700 }}>{g.priority}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{g.evidence}</div>
                          {g.actionItem && <div style={{ fontSize: 10, color: "#6366f1", marginTop: 4, fontWeight: 600 }}>{"\u2192"} {g.actionItem}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#ccc", fontSize: 12 }}>
                Click "Generate" to identify your strengths and areas for improvement.
              </div>
            )}
          </Card>

          {/* 4. Learning Patterns (Tier 2) */}
          <Card>
            <SectionTitle
              emoji={"\ud83e\udde0"}
              text="Learning Patterns"
              right={<GenerateButton label={patterns ? "Refresh" : "Generate"} loading={!!generating.learning_patterns} onClick={() => handleGenerate("learning_patterns")} />}
            />
            {patterns ? (
              <div>
                {patterns.learningStyle && (
                  <div style={{ padding: "8px 12px", borderRadius: 10, background: "#f5f3ff", border: "1px solid #e9e5ff", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#6366f1", marginBottom: 2 }}>LEARNING STYLE</div>
                    <div style={{ fontSize: 12, color: "#444" }}>{patterns.learningStyle}</div>
                  </div>
                )}
                {patterns.patterns?.map((p, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i < patterns.patterns.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 2 }}>{p.observation}</div>
                    <div style={{ fontSize: 11, color: "#777", marginBottom: 2 }}>{p.evidence}</div>
                    <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600 }}>{"\ud83d\udca1"} {p.suggestion}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#ccc", fontSize: 12 }}>
                Click "Generate" to discover your learning behaviour patterns.
              </div>
            )}
          </Card>

          {/* 5. Deep Dive Reports (Tier 3 — on-demand) */}
          <Card>
            <SectionTitle emoji={"\ud83d\udd2e"} text="Deep Dive Reports" />
            <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>These reports are generated on demand using AI analysis of all your session data.</div>

            {/* Exam Readiness */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{"\ud83c\udfaf"} Exam Readiness Assessment</div>
                <GenerateButton label={examReady ? "Regenerate" : "Generate"} loading={!!generating.exam_readiness} onClick={() => handleOnDemand("exam_readiness")} />
              </div>
              {examReady && (
                <div style={{ padding: "12px 14px", borderRadius: 12, background: READINESS_STYLES[examReady.overallReadiness]?.bg || "#f8f8f8", border: "1px solid #eee" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{READINESS_STYLES[examReady.overallReadiness]?.emoji || "\u2753"}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: READINESS_STYLES[examReady.overallReadiness]?.color || "#666" }}>
                      {READINESS_STYLES[examReady.overallReadiness]?.label || examReady.overallReadiness}
                    </span>
                    {examReady.projectedGrade && <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>Projected: {examReady.projectedGrade}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6, marginBottom: 10 }}>{examReady.summary}</div>
                  {examReady.topicReadiness?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 4 }}>TOPIC READINESS</div>
                      {examReady.topicReadiness.map((t, i) => {
                        const statusMap = { ready: "#22c55e", nearly: "#f59e0b", "needs-work": "#ef4444", "not-covered": "#94a3b8" };
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusMap[t.status] || "#999" }} />
                            <div style={{ flex: 1, fontSize: 11, color: "#444" }}>{t.topic}</div>
                            <div style={{ fontSize: 10, color: "#888" }}>{t.note}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {examReady.recommendations?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 4 }}>RECOMMENDATIONS</div>
                      {examReady.recommendations.map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3, fontSize: 11, color: "#555" }}>
                          <span style={{ color: "#6366f1", fontWeight: 700 }}>{i + 1}.</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Parent Letter */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{"\ud83d\udce8"} Parent Progress Letter</div>
                <GenerateButton label={parentLetter ? "Regenerate" : "Generate"} loading={!!generating.parent_letter} onClick={() => handleOnDemand("parent_letter")} />
              </div>
              {parentLetter && (
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
                  <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", marginBottom: 8 }}>{parentLetter.greeting}</div>
                  <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7, whiteSpace: "pre-line" }}>{parentLetter.body}</div>
                  {parentLetter.keyStats && (
                    <div style={{ display: "flex", gap: 12, marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee" }}>
                      {Object.entries(parentLetter.keyStats).map(([k, v]) => (
                        <div key={k} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>{v}</div>
                          <div style={{ fontSize: 9, color: "#999", textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1").trim()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Empty state */}
          {recentSessions.length === 0 && !narrative && (
            <Card>
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{"\ud83d\udcdd"}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>No feedback data yet</div>
                <div style={{ fontSize: 12, color: "#999" }}>Complete a few tutoring sessions to start seeing personalised feedback.</div>
              </div>
            </Card>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
