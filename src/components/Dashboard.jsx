import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { getSessions } from "../utils/storage.js";
import { buildAllSummaries } from "../utils/summaries.js";
import { confidenceColor } from "../styles/tokens.js";
import { getUpcoming, formatEventDate, daysUntil, eventTypeInfo } from "../utils/events.js";
import s from "./Dashboard.module.css";

export function Dashboard({ memory, mats, profile, events, onClose }) {
  const subs = mySubjects(profile);
  const allSums = buildAllSummaries(memory);
  const upcoming = getUpcoming(events || []);

  return (
    <div className={s.overlay}>
      <div className={s.panel}>
        <div className={s.header}>
          <div>
            <div className={s.headerTag}>STATS</div>
            <div className={s.headerTitle}>{profile.name}'s Progress</div>
            <div className={s.headerMeta}>{profile.year} {"\u00b7"} {profile.tier} {"\u00b7"} {allSums.length} sessions</div>
          </div>
          <button onClick={onClose} className={s.closeBtn}>{"\u2715"} Close</button>
        </div>
        <div className={s.body}>
          <div className={s.subjectGrid}>
            {subs.map(t => {
              const sums = getSessions(memory, t.id), ls = sums[sums.length - 1], mc = (mats[t.id] || []).length;
              return (
                <div key={t.id} className={s.subjectCard}>
                  <div className={s.subjectCardHeader} style={{ background: t.gradient }}>
                    <div className={s.subjectEmoji}>{t.emoji}</div>
                    <div className={s.subjectTutor}>{t.tutor.name}</div>
                    <div className={s.subjectLabel}>{t.label}</div>
                  </div>
                  <div className={s.subjectCardBody}>
                    <div className={s.sessionCount} style={{ color: t.color }}>{sums.length === 0 ? "No sessions yet" : sums.length + " session" + (sums.length > 1 ? "s" : "") + " in memory"}</div>
                    {ls && <div className={s.lastDate}>Last: {ls.date}</div>}
                    {mc > 0 && <div className={s.matCount}>{"\ud83d\udcce"} {mc} material{mc > 1 ? "s" : ""}</div>}
                    {ls?.confidenceScores && Object.keys(ls.confidenceScores).length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {Object.entries(ls.confidenceScores).slice(0, 4).map(([topic, pct]) => (
                          <div key={topic} className={s.confRow}>
                            <div className={s.confTopic}>{topic}</div>
                            <div className={s.confTrack}>
                              <div className={s.confBar} style={{ width: pct + "%", background: confidenceColor(pct) }} />
                            </div>
                            <div className={s.confPct}>{pct}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {upcoming.length > 0 && (
            <>
              <div className={s.sectionTitle}>{"\ud83d\udcc5"} Upcoming Events</div>
              {upcoming.slice(0, 8).map(ev => {
                const sub = SUBJECTS[ev.subjectId];
                const ti = eventTypeInfo(ev.type);
                const days = daysUntil(ev.date);
                const urgent = days <= 1;
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 10, border: urgent ? "2px solid #ef4444" : "1px solid #eee", marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{ti.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {sub?.emoji} {sub?.label}
                        {ev.topics?.length > 0 ? " \u00b7 " + ev.topics.slice(0, 3).join(", ") : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? "#ef4444" : sub?.color || "#6366f1" }}>{formatEventDate(ev.date)}</div>
                      {days > 0 && <div style={{ fontSize: 10, color: "#bbb" }}>{days} day{days !== 1 ? "s" : ""}</div>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div className={s.sectionTitle}>All Session Summaries</div>
          {allSums.length === 0 ? <div className={s.emptyState}>No summaries yet.</div> :
            allSums.map((sm, i) => (
              <div key={i} className={s.summaryCard} style={{ border: "1px solid " + (sm.tutor.color || "#999") + "33" }}>
                <div className={s.summaryHeader} style={{ background: sm.tutor.gradient }}>
                  <span>{sm.tutor.emoji}</span>
                  <span className={s.summarySubject}>{sm.tutor.label}</span>
                  <span className={s.summaryDate}>{sm.date}</span>
                </div>
                <div className={s.summaryBody}>{sm.rawSummaryText || "(No summary)"}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
