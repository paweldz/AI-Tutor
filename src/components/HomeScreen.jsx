import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { getSessions } from "../utils/storage.js";
import { xpLevel, LEVEL_EMOJIS, calcStreak, weekHeatmap } from "../utils/xp.js";
import { getConfidence, avgConfidence, getTopicProgress, topicPct, getTopicsForSubject } from "../utils/topics.js";
import { confidenceColor } from "../styles/tokens.js";
import { getUpcoming, formatEventDate, daysUntil, eventTypeInfo } from "../utils/events.js";

export function HomeScreen({ profile, memory, mats, xpData, streakData, topicData, customTopics, totalMem, events, onSelectSubject, onQuickQuiz, onTopics, onBuildQuiz }) {
  const lv = xpLevel(xpData.total);
  const streak = calcStreak(streakData.dates);
  const week = weekHeatmap(streakData.dates);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px" }}>
      {/* Streak & XP Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{streak > 0 ? "\ud83d\udd25" : "\u2744\ufe0f"}</span>
            <div><div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{streak}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>day streak</div></div>
          </div>
          <div style={{ display: "flex", gap: 3 }}>{week.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ width: "100%", height: 6, borderRadius: 3, background: d.active ? "#22c55e" : "#eee", marginBottom: 2 }} /><div style={{ fontSize: 8, color: "#bbb" }}>{d.day}</div></div>)}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{LEVEL_EMOJIS[lv.level] || "\ud83c\udfc6"}</span>
            <div><div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Level {lv.level}</div><div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{lv.title}</div></div>
            <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: "#f0c040" }}>{xpData.total}</div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#eee" }}><div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#f0c040,#f59e0b)", width: Math.min(100, lv.current / lv.next * 100) + "%", transition: "width .5s" }} /></div>
          <div style={{ fontSize: 9, color: "#bbb", marginTop: 3 }}>{lv.current}/{lv.next} XP to Level {lv.level + 1}</div>
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 6 }}>Hello, {profile.name}.</h1>
      <p style={{ color: "#999", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>{totalMem > 0 ? "\ud83e\udde0 " + totalMem + " session" + (totalMem > 1 ? "s" : "") + " in memory." : "Your tutors adapt and remember your progress."}</p>

      {/* Upcoming Events */}
      {(() => {
        const upcoming = getUpcoming(events || []);
        if (!upcoming.length) return null;
        return (
          <div style={{ background: "#fff", borderRadius: 16, padding: "14px 18px", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", marginBottom: 10 }}>{"\ud83d\udcc5"} Upcoming Events</div>
            {upcoming.slice(0, 5).map(ev => {
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
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? "#ef4444" : sub?.color || "#6366f1" }}>{formatEventDate(ev.date)}</div>
                    {days > 1 && <div style={{ fontSize: 10, color: "#bbb" }}>{days} days</div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {mySubjects(profile).map((t, i) => {
          const sc = getSessions(memory, t.id).length, mc = (mats[t.id] || []).length, bd = profile.examBoards?.[t.id];
          const conf = getConfidence(memory, t.id);
          const avg = avgConfidence(conf);
          const confTopics = Object.entries(conf).slice(0, 4);
          const tpct = topicPct(topicData, t.id, profile, customTopics);
          const tTotal = getTopicsForSubject(t.id, profile, customTopics).length;
          const tDone = Object.values(getTopicProgress(topicData, t.id)).filter(v => v.studied > 0).length;
          return (
            <div key={t.id} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", animation: `ci .4s ease ${i * .06}s both` }}>
              <div className="card" onClick={() => onSelectSubject(t.id)} style={{ background: t.gradient, padding: "18px 16px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{t.emoji}</div>
                  {avg >= 0 && <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#fff" }}>{avg}%</div>}
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

      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #eee" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", marginBottom: 10 }}>{"\ud83d\udca1"} Tips</div>
        {[["Quick Quiz", "Tap \u26a1 for 10 instant questions on your weak topics."], ["Quiz Builder", "Tap \ud83d\udee0\ufe0f to customise question types and upload materials."], ["Earn XP", "+5 per message, +25 per summary, +20 per correct answer."], ["Keep your streak", "Open the app daily to build your streak!"]].map(([t, d]) => <div key={t} style={{ display: "flex", gap: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 12, minWidth: 120 }}>{t}</div><div style={{ color: "#888", fontSize: 12 }}>{d}</div></div>)}
      </div>
    </div>
  );
}
