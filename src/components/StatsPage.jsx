import { useState, useEffect } from "react";
import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { formatGradeRange, GRADE_INFO } from "../utils/grades.js";
import {
  getOverviewStats, getAccuracyTrend, getStudyTimeSeries,
  getGradeHistory, getTopicConfidenceLatest, getTopicConfidenceHistory,
  getQuizScoreHistory, getQuestionTypeBreakdown, getWeakTopics,
} from "../utils/analyticsQueries.js";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, ReferenceLine,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#ec4899", "#14b8a6"];
const RESULT_COLORS = { correct: "#22c55e", partial: "#f59e0b", wrong: "#ef4444", skipped: "#94a3b8" };
const TYPE_LABELS = { recall: "Recall", apply: "Apply", analyse: "Analyse", exam: "Exam-style", unknown: "Other" };

const Card = ({ children, style }) => (
  <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", ...style }}>{children}</div>
);
const SectionTitle = ({ emoji, text }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", marginBottom: 12 }}>{emoji} {text}</div>
);
const StatBox = ({ value, label, color }) => (
  <div style={{ flex: 1, textAlign: "center" }}>
    <div style={{ fontSize: 22, fontWeight: 900, color: color || "#1a1a2e", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 9, color: "#999", fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);
const fmtDate = d => {
  if (!d) return "";
  const parts = d.split("-");
  return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
};

const EmptyState = ({ text }) => (
  <div style={{ textAlign: "center", padding: "24px 0", color: "#ccc", fontSize: 12 }}>{text}</div>
);

export function StatsPage({ profile, onBack }) {
  const subs = mySubjects(profile);
  const [subjectId, setSubjectId] = useState(null); // null = all subjects
  const [overview, setOverview] = useState(null);
  const [accuracy, setAccuracy] = useState([]);
  const [studyTime, setStudyTime] = useState([]);
  const [grades, setGrades] = useState([]);
  const [topicConf, setTopicConf] = useState([]);
  const [topicHistory, setTopicHistory] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [qBreakdown, setQBreakdown] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const sub = subjectId ? SUBJECTS[subjectId] : null;

  useEffect(() => {
    setLoading(true);
    setSelectedTopic(null);
    setTopicHistory([]);
    Promise.all([
      getOverviewStats(period),
      getAccuracyTrend(subjectId, 50),
      getStudyTimeSeries(period, subjectId),
      subjectId ? getGradeHistory(subjectId, 30) : Promise.resolve([]),
      subjectId ? getTopicConfidenceLatest(subjectId) : Promise.resolve([]),
      getQuizScoreHistory(subjectId, 30),
      getQuestionTypeBreakdown(subjectId, period),
      getWeakTopics(subjectId, period),
    ]).then(([ov, acc, st, gr, tc, qz, qb, wt]) => {
      setOverview(ov);
      setAccuracy(acc);
      setStudyTime(st);
      setGrades(gr);
      setTopicConf(tc);
      setQuizzes(qz);
      setQBreakdown(qb);
      setWeakTopics(wt);
      setLoading(false);
    });
  }, [subjectId, period]);

  function handleTopicClick(topic) {
    if (!subjectId) return;
    setSelectedTopic(topic);
    getTopicConfidenceHistory(subjectId, topic, 20).then(setTopicHistory);
  }

  const targetGrade = subjectId && profile.targetGrades?.[subjectId];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0, color: "#666" }}>{"\u2190"}</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", margin: 0 }}>Analytics</h1>
      </div>
      <p style={{ color: "#999", fontSize: 12, marginBottom: 16 }}>Track your progress, identify weak areas, and see how you're improving.</p>

      {/* Subject filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
        <button onClick={() => setSubjectId(null)} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid " + (!subjectId ? "#6366f1" : "#e0e0e0"), background: !subjectId ? "#6366f1" : "#fff", color: !subjectId ? "#fff" : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>All Subjects</button>
        {subs.map(s => (
          <button key={s.id} onClick={() => setSubjectId(s.id)} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid " + (subjectId === s.id ? s.color : "#e0e0e0"), background: subjectId === s.id ? s.color : "#fff", color: subjectId === s.id ? "#fff" : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{s.emoji} {s.label}</button>
        ))}
      </div>

      {/* Period filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setPeriod(d)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid " + (period === d ? "#6366f1" : "#e0e0e0"), background: period === d ? "#f0f0ff" : "#fff", color: period === d ? "#6366f1" : "#999", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{d === 7 ? "7 days" : d === 30 ? "30 days" : "3 months"}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"\ud83d\udcca"}</div>
          <div style={{ fontSize: 13 }}>Loading analytics...</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 1. Overview Cards */}
          {overview && (
            <Card>
              <SectionTitle emoji={"\ud83d\udcca"} text={`Overview \u00b7 ${period === 7 ? "7 days" : period === 30 ? "30 days" : "3 months"}`} />
              <div style={{ display: "flex", gap: 8 }}>
                <StatBox value={overview.sessions} label="Sessions" />
                <StatBox value={overview.totalMinutes > 0 ? (overview.totalMinutes >= 60 ? Math.floor(overview.totalMinutes / 60) + "h " + (overview.totalMinutes % 60) + "m" : overview.totalMinutes + "m") : "0m"} label="Study Time" color="#6366f1" />
                <StatBox value={overview.totalQuestions} label="Questions" />
                <StatBox value={overview.accuracy != null ? overview.accuracy + "%" : "-"} label="Accuracy" color={overview.accuracy >= 70 ? "#22c55e" : overview.accuracy >= 50 ? "#f59e0b" : "#ef4444"} />
              </div>
            </Card>
          )}

          {/* 2. Grade Trajectory (subject-specific only) */}
          {subjectId && grades.length > 0 && (
            <Card>
              <SectionTitle emoji={"\ud83c\udfaf"} text="Grade Trajectory" />
              {targetGrade && <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 8 }}>Target: Grade {targetGrade}</div>}
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={grades} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#999" }} />
                  <YAxis domain={[1, 9]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9]} tick={{ fontSize: 10, fill: "#999" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                    labelFormatter={v => "Date: " + v}
                    formatter={(v, name) => {
                      if (name === "grade") return ["Grade " + v, "Estimated"];
                      if (name === "high") return ["Grade " + v, "High"];
                      if (name === "low") return ["Grade " + v, "Low"];
                      return [v, name];
                    }}
                  />
                  {targetGrade && <ReferenceLine y={Number(targetGrade)} stroke="#6366f1" strokeDasharray="5 5" label={{ value: "Target", fill: "#6366f1", fontSize: 10 }} />}
                  <Area type="monotone" dataKey="high" stackId="range" stroke="none" fill="#6366f120" />
                  <Area type="monotone" dataKey="low" stackId="range" stroke="none" fill="#fff" />
                  <Line type="monotone" dataKey="grade" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* 3. Accuracy Trend */}
          {accuracy.length > 0 && (
            <Card>
              <SectionTitle emoji={"\ud83c\udfaf"} text="Accuracy Over Time" />
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={accuracy} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#999" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#999" }} tickFormatter={v => v + "%"} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                    labelFormatter={v => "Date: " + v}
                    formatter={(v, name) => {
                      if (name === "accuracy") return [v + "%", "Accuracy"];
                      if (name === "questions") return [v, "Questions"];
                      return [v, name];
                    }}
                  />
                  <Area type="monotone" dataKey="accuracy" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* 4. Study Time */}
          {studyTime.length > 0 && (
            <Card>
              <SectionTitle emoji={"\u23f1\ufe0f"} text="Study Time" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={studyTime} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#999" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#999" }} tickFormatter={v => v + "m"} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                    labelFormatter={v => "Date: " + v}
                    formatter={(v, name) => {
                      if (name === "minutes") return [v + " min", "Study Time"];
                      if (name === "sessions") return [v, "Sessions"];
                      return [v, name];
                    }}
                  />
                  <Bar dataKey="minutes" fill={sub?.color || "#6366f1"} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* 5. Question Breakdown (pie + type bars) */}
          {qBreakdown && qBreakdown.total > 0 && (
            <Card>
              <SectionTitle emoji={"\u2753"} text={`Questions Breakdown \u00b7 ${qBreakdown.total} total`} />
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <ResponsiveContainer width="45%" height={150}>
                  <PieChart>
                    <Pie data={qBreakdown.byResult} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3}>
                      {qBreakdown.byResult.map((entry, i) => (
                        <Cell key={i} fill={RESULT_COLORS[entry.name] || COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {qBreakdown.byResult.map(r => (
                    <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: RESULT_COLORS[r.name] }} />
                      <div style={{ fontSize: 11, color: "#666", flex: 1, textTransform: "capitalize" }}>{r.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{r.value}</div>
                    </div>
                  ))}
                  {qBreakdown.total > 0 && (
                    <div style={{ marginTop: 8, fontSize: 10, color: "#999", borderTop: "1px solid #f0f0f0", paddingTop: 6 }}>
                      Avg hints: {(qBreakdown.totalHints / qBreakdown.total).toFixed(1)} &middot; Reasoning: {Math.round((qBreakdown.totalReasoning / qBreakdown.total) * 100)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Question type accuracy bars */}
              {qBreakdown.byType.length > 0 && (
                <div style={{ marginTop: 14, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 8 }}>BY QUESTION TYPE</div>
                  {qBreakdown.byType.map(t => {
                    const acc = t.total > 0 ? Math.round(((t.correct + t.partial * 0.5) / t.total) * 100) : 0;
                    return (
                      <div key={t.type} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                          <span style={{ color: "#666" }}>{TYPE_LABELS[t.type] || t.type}</span>
                          <span style={{ fontWeight: 700, color: acc >= 70 ? "#22c55e" : acc >= 50 ? "#f59e0b" : "#ef4444" }}>{acc}% ({t.total})</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "#f0f0f0" }}>
                          <div style={{ height: "100%", borderRadius: 3, background: acc >= 70 ? "#22c55e" : acc >= 50 ? "#f59e0b" : "#ef4444", width: acc + "%", transition: "width 0.5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* 6. Topic Confidence (radar + list) */}
          {subjectId && topicConf.length > 0 && (
            <Card>
              <SectionTitle emoji={"\ud83e\udde0"} text="Topic Confidence" />
              {topicConf.length >= 3 && (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={topicConf.slice(0, 12).map(t => ({ ...t, topic: t.topic.length > 14 ? t.topic.slice(0, 12) + "\u2026" : t.topic, fullTopic: t.topic }))}>
                    <PolarGrid stroke="#f0f0f0" />
                    <PolarAngleAxis dataKey="topic" tick={{ fontSize: 9, fill: "#666" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "#bbb" }} />
                    <Radar dataKey="confidence" stroke={sub?.color || "#6366f1"} fill={sub?.color || "#6366f1"} fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
              <div style={{ marginTop: 8 }}>
                {topicConf.map((t, i) => {
                  const confColor = t.confidence >= 80 ? "#22c55e" : t.confidence >= 60 ? "#f59e0b" : t.confidence >= 30 ? "#f97316" : "#ef4444";
                  return (
                    <div key={i} onClick={() => handleTopicClick(t.topic)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f8f8f8", cursor: "pointer" }}>
                      <div style={{ flex: 1, fontSize: 11, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic}</div>
                      <div style={{ fontSize: 9, color: "#bbb", minWidth: 40 }}>{t.questions}Q &middot; {t.depth || "?"}</div>
                      <div style={{ width: 60, height: 5, borderRadius: 3, background: "#f0f0f0" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: confColor, width: t.confidence + "%", transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: confColor, minWidth: 28, textAlign: "right" }}>{t.confidence}%</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 7. Topic Drill-Down (appears when topic clicked) */}
          {selectedTopic && topicHistory.length > 0 && (
            <Card style={{ border: "2px solid " + (sub?.color || "#6366f1") + "30" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <SectionTitle emoji={"\ud83d\udd0d"} text={selectedTopic} />
                <button onClick={() => { setSelectedTopic(null); setTopicHistory([]); }} style={{ background: "none", border: "none", color: "#999", fontSize: 16, cursor: "pointer" }}>{"\u2715"}</button>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={topicHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#999" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#999" }} tickFormatter={v => v + "%"} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                    labelFormatter={v => "Date: " + v}
                    formatter={(v, name) => {
                      if (name === "confidence") return [v + "%", "Confidence"];
                      if (name === "accuracy") return [v != null ? v + "%" : "-", "Accuracy"];
                      return [v, name];
                    }}
                  />
                  <Line type="monotone" dataKey="confidence" stroke={sub?.color || "#6366f1"} strokeWidth={2.5} dot={{ r: 4, fill: sub?.color || "#6366f1" }} />
                  {topicHistory.some(d => d.accuracy != null) && (
                    <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3, fill: "#22c55e" }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: "#999" }}>
                <span>{"\u25cf"} <span style={{ color: sub?.color || "#6366f1" }}>Confidence</span></span>
                <span>{"\u25cf"} <span style={{ color: "#22c55e" }}>Accuracy</span></span>
              </div>
            </Card>
          )}

          {/* 8. Quiz Scores */}
          {quizzes.length > 0 && (
            <Card>
              <SectionTitle emoji={"\u26a1"} text="Quiz Scores" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={quizzes} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#999" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#999" }} tickFormatter={v => v + "%"} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                    labelFormatter={v => "Date: " + v}
                    formatter={(v, name) => {
                      if (name === "score") return [v + "%", "Score"];
                      return [v, name];
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {quizzes.map((entry, i) => {
                      const s = SUBJECTS[entry.subject];
                      return <Cell key={i} fill={s?.color || COLORS[i % COLORS.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* 9. Weak Areas / Recommended Focus */}
          {weakTopics.length > 0 && (
            <Card>
              <SectionTitle emoji={"\ud83d\udca1"} text="Recommended Focus" />
              <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>Topics with the lowest accuracy — focus here for maximum improvement.</div>
              {weakTopics.slice(0, 8).map((t, i) => {
                const accColor = t.accuracy >= 70 ? "#22c55e" : t.accuracy >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f8f8f8" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: accColor + "18", color: accColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic}</div>
                      <div style={{ fontSize: 10, color: "#999" }}>{t.total} questions &middot; {t.wrong} wrong &middot; avg {t.avgHints} hints</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: accColor }}>{t.accuracy}%</div>
                  </div>
                );
              })}
            </Card>
          )}

          {/* Empty state */}
          {!overview?.sessions && accuracy.length === 0 && studyTime.length === 0 && (
            <Card>
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{"\ud83d\udcca"}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>No analytics data yet</div>
                <div style={{ fontSize: 12, color: "#999" }}>Complete a tutoring session or quiz to start seeing your progress charts.</div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
