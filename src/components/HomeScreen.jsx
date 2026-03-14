import { useState } from "react";
import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { getSessions } from "../utils/storage.js";
import { xpLevel, LEVEL_EMOJIS, calcStreak, weekHeatmap } from "../utils/xp.js";
import { getConfidence, avgConfidence, getTopicProgress, topicPct, getTopicsForSubject } from "../utils/topics.js";
import { confidenceColor } from "../styles/tokens.js";
import { getUpcoming, formatEventDate, daysUntil, eventTypeInfo } from "../utils/events.js";
import { estimateGrade, formatGradeRange, gradeColor, GRADE_INFO } from "../utils/grades.js";
import { EventsPanel } from "./EventsPanel.jsx";

export function HomeScreen({ profile, memory, mats, xpData, streakData, topicData, customTopics, totalMem, events, onSelectSubject, onQuickQuiz, onTopics, onBuildQuiz, onEditEvent, onAddEvent, onCompleteEvent, onDeleteEvent }) {
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const lv = xpLevel(xpData.total);
  const streak = calcStreak(streakData.dates);
  const week = weekHeatmap(streakData.dates);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px" }}>
      {/* Streak & XP Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* a. Streaks */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{streak > 0 ? "\ud83d\udd25" : "\u2744\ufe0f"}</span>
            <div><div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>day streak</div></div>
          </div>
          <div style={{ display: "flex", gap: 3 }}>{week.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ width: "100%", height: 6, borderRadius: 3, background: d.active ? "#22c55e" : "#eee", marginBottom: 2 }} /><div style={{ fontSize: 8, color: "#bbb" }}>{d.day}</div></div>)}</div>
        </div>
        {/* b. Level */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{LEVEL_EMOJIS[lv.level] || "\ud83c\udfc6"}</span>
            <div><div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Level {lv.level}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{lv.title}</div></div>
            <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: "#f0c040" }}>{xpData.total}</div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#eee" }}><div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#f0c040,#f59e0b)", width: Math.min(100, lv.current / lv.next * 100) + "%", transition: "width .5s" }} /></div>
          <div style={{ fontSize: 9, color: "#bbb", marginTop: 3 }}>{lv.current}/{lv.next} XP to Level {lv.level + 1}</div>
        </div>
      </div>

      {/* c. Study Time — full width */}
      {(() => {
        const activeDays = streakData.dates?.length || 0;
        const thisWeekDays = week.filter(d => d.active).length;
        const now = new Date();
        const monthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
        const weekDates = new Set(week.map(w => w.date));
        const fmtTime = (m) => m >= 60 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : m + "m";

        // Aggregate real study time from saved sessions
        const subs = mySubjects(profile);
        let totalMinutes = 0;
        let weekMinutes = 0;
        let monthMinutes = 0;
        let totalSessionCount = 0;

        // Robust date parser: handles "14 March 2026", "14th March 2026",
        // "today 14 March 2026", and other AI output quirks.
        // Returns "YYYY-MM-DD" or "" on failure.
        const parseSessionDate = (dateStr) => {
          if (!dateStr) return "";
          try {
            // Strip ordinal suffixes (1st, 2nd, 3rd, 4th, etc.) and leading "today"
            let clean = dateStr.replace(/^today\s+/i, "").replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
            const d = new Date(clean);
            if (isNaN(d.getTime())) return "";
            // Use local date parts to avoid timezone shift issues
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          } catch { return ""; }
        };

        const subjectMonthly = subs.map(s => {
          const sessions = getSessions(memory, s.id);
          let subMonthMins = 0;
          let subMonthCount = 0;
          for (const ses of sessions) {
            const mins = ses.studyTimeMinutes || 0;
            totalMinutes += mins;
            totalSessionCount++;
            const isoDate = parseSessionDate(ses.date);
            if (isoDate && weekDates.has(isoDate)) weekMinutes += mins;
            if (isoDate?.startsWith(monthStr)) { monthMinutes += mins; subMonthMins += mins; subMonthCount++; }
          }
          return { id: s.id, label: s.label, emoji: s.emoji, color: s.color, count: subMonthCount, mins: subMonthMins };
        }).filter(s => s.count > 0).sort((a, b) => b.mins - a.mins).slice(0, 3);

        return (
          <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{"\u23f1\ufe0f"}</span>
              <div><div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Study Time</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{totalSessionCount} sessions across {activeDays} active days</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, textAlign: "center", background: "#f0fdf4", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{fmtTime(weekMinutes)}</div>
                <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>this week</div>
                <div style={{ fontSize: 8, color: "#bbb" }}>{thisWeekDays} day{thisWeekDays !== 1 ? "s" : ""} active</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: "#fefce8", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{fmtTime(monthMinutes)}</div>
                <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>this month</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: "#eff6ff", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{fmtTime(totalMinutes)}</div>
                <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>all time</div>
              </div>
            </div>
            {subjectMonthly.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>This month by subject</div>
                {subjectMonthly.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{s.emoji}</span>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e", width: 80 }}>{s.label}</div>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#eee" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: s.color, width: Math.min(100, (s.mins / Math.max(...subjectMonthly.map(x => x.mins), 1)) * 100) + "%", transition: "width .5s" }} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#666", width: 50, textAlign: "right" }}>{fmtTime(s.mins)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 6 }}>Hello, {profile.name}.</h1>
      <p style={{ color: "#999", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>{totalMem > 0 ? "\ud83e\udde0 " + totalMem + " session" + (totalMem > 1 ? "s" : "") + " in memory." : "Your tutors adapt and remember your progress."}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {mySubjects(profile).map((t, i) => {
          const sc = getSessions(memory, t.id).length, mc = (mats[t.id] || []).length, bd = profile.examBoards?.[t.id];
          const conf = getConfidence(memory, t.id);
          const avg = avgConfidence(conf);
          const confTopics = Object.entries(conf).slice(0, 4);
          const tpct = topicPct(topicData, t.id, profile, customTopics);
          const allTopics = getTopicsForSubject(t.id, profile, customTopics);
          const tTotal = allTopics.length;
          const tDone = Object.values(getTopicProgress(topicData, t.id)).filter(v => v.studied > 0).length;
          const targetG = profile.targetGrades?.[t.id];
          const estG = estimateGrade(memory, events, topicData, profile, t.id, allTopics);
          return (
            <div key={t.id} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", animation: `ci .4s ease ${i * .06}s both` }}>
              <div className="card" onClick={() => onSelectSubject(t.id)} style={{ background: t.gradient, padding: "18px 16px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{t.emoji}</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {targetG && <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#fff" }} title={"Target: Grade " + targetG}>{"\ud83c\udfaf"}{targetG}</div>}
                    {estG && <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#fff" }} title={"Estimated: Grade " + formatGradeRange(estG)}>{formatGradeRange(estG)}</div>}
                    {!targetG && !estG && avg >= 0 && <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#fff" }}>{avg}%</div>}
                  </div>
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", color: "#fff", fontSize: 16, fontWeight: 700 }}>{t.tutor.name}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>{t.label}{bd ? " \u00b7 " + bd : ""}</div>
              </div>
              <div style={{ background: "#fff", padding: "10px 16px" }}>
                {tTotal > 0 && <div style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginBottom: 2 }}><span>{tDone}/{tTotal} topics</span><span>{tpct}%</span></div><div style={{ height: 4, borderRadius: 2, background: "#eee" }}><div style={{ height: "100%", borderRadius: 2, background: t.color, width: tpct + "%", transition: "width .5s" }} /></div></div>}
                {confTopics.length > 0 && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>{confTopics.map(([topic, pct]) => <div key={topic} style={{ height: 4, flex: 1, minWidth: 14, borderRadius: 2, background: confidenceColor(pct) }} title={topic + ": " + pct + "%"} />)}</div>}
                <div style={{ fontSize: 11, color: t.color, fontWeight: 700, marginBottom: 4 }}>{sc === 0 ? "No sessions yet" : "\ud83e\udde0 " + sc + " session" + (sc > 1 ? "s" : "")}</div>
                {mc > 0 && <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{"\ud83d\udcce"} {mc} material{mc > 1 ? "s" : ""}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={e => { e.stopPropagation(); onTopics(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: "transparent", color: t.color, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\ud83d\udcdd"} Topics</button>
                  <button onClick={e => { e.stopPropagation(); onQuickQuiz(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: "transparent", color: t.color, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\u26a1"} Quick</button>
                  <button onClick={e => { e.stopPropagation(); onBuildQuiz(t); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid " + t.color, background: t.color, color: "#fff", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\ud83d\udee0\ufe0f"} Build</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming Events — below tutor cards */}
      {(() => {
        const upcoming = getUpcoming(events || []);
        return (
          <div style={{ background: "#fff", borderRadius: 16, padding: "14px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase" }}>{"\ud83d\udcc5"} Upcoming Events</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onAddEvent && onAddEvent()} style={{ padding: "4px 10px", borderRadius: 8, border: "1.5px solid #6366f1", background: "transparent", color: "#6366f1", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                <button onClick={() => setShowEventsPanel(true)} style={{ padding: "4px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "transparent", color: "#888", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Manage All</button>
              </div>
            </div>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#bbb", fontSize: 12 }}>No upcoming events. Tap '+ Add' to create one.</div>
            ) : (
              upcoming.slice(0, 5).map(ev => {
                const sub = SUBJECTS[ev.subjectId];
                const ti = eventTypeInfo(ev.type);
                const days = daysUntil(ev.date);
                const urgent = days <= 1;
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: 18 }}>{ti.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {sub?.emoji} {sub?.label}
                        {ev.topics?.length > 0 ? " \u00b7 " + ev.topics.slice(0, 2).join(", ") : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? "#ef4444" : sub?.color || "#6366f1" }}>{formatEventDate(ev.date)}</div>
                      {days > 1 && <div style={{ fontSize: 10, color: "#bbb" }}>{days} days</div>}
                    </div>
                    {onEditEvent && <button onClick={() => onEditEvent(ev)} style={{ background: "#eee", border: "none", borderRadius: 6, width: 26, height: 26, color: "#666", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Edit">{"\u270e"}</button>}
                  </div>
                );
              })
            )}
            {upcoming.length > 5 && (
              <button onClick={() => setShowEventsPanel(true)} style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", color: "#6366f1", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>View all {upcoming.length} events</button>
            )}
          </div>
        );
      })()}

      {showEventsPanel && (
        <EventsPanel
          events={events}
          profile={profile}
          onAdd={() => { setShowEventsPanel(false); onAddEvent && onAddEvent(); }}
          onEdit={ev => { setShowEventsPanel(false); onEditEvent && onEditEvent(ev); }}
          onComplete={ev => { setShowEventsPanel(false); onCompleteEvent && onCompleteEvent(ev); }}
          onDelete={onDeleteEvent}
          onClose={() => setShowEventsPanel(false)}
        />
      )}

      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #eee" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", marginBottom: 10 }}>{"\ud83d\udca1"} Tips</div>
        {[["Quick Quiz", "Tap \u26a1 for 10 instant questions on your weak topics."], ["Quiz Builder", "Tap \ud83d\udee0\ufe0f to customise question types and upload materials."], ["Earn XP", "+5 per message, +25 per summary, +20 per correct answer."], ["Keep your streak", "Open the app daily to build your streak!"]].map(([t, d]) => <div key={t} style={{ display: "flex", gap: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 12, minWidth: 120 }}>{t}</div><div style={{ color: "#888", fontSize: 12 }}>{d}</div></div>)}
      </div>
    </div>
  );
}
