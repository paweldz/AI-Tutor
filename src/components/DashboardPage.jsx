import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { getSessions } from "../utils/storage.js";
import { buildAllSummaries } from "../utils/summaries.js";
import { confidenceColor } from "../styles/tokens.js";
import { getUpcoming, formatEventDate, daysUntil, eventTypeInfo } from "../utils/events.js";
import { EventsPanel } from "./EventsPanel.jsx";
import s from "./Dashboard.module.css";

/**
 * Standalone dashboard page at /dashboard.
 * Reuses the same CSS module as the modal Dashboard.
 * Receives data via props from the App-level state.
 */
export function DashboardPage({ memory, mats, profile, xpData, streakData, events, onAddEvent, onEditEvent, onCompleteEvent, onDeleteEvent }) {
  const navigate = useNavigate();
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const subs = profile ? mySubjects(profile) : [];
  const allSums = buildAllSummaries(memory);

  if (!profile) {
    navigate("/");
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        <div className={s.header} style={{ borderRadius: 16, marginBottom: 24 }}>
          <div>
            <div className={s.headerTag}>PARENT DASHBOARD</div>
            <div className={s.headerTitle}>{profile.name}'s Progress</div>
            <div className={s.headerMeta}>{profile.year} {"\u00b7"} {profile.tier} {"\u00b7"} {allSums.length} sessions</div>
          </div>
          <button onClick={() => navigate("/")} className={s.closeBtn}>{"\u2190"} Back</button>
        </div>

        {xpData && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #eee" }}>
              <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.05em", marginBottom: 4 }}>TOTAL XP</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e" }}>{xpData.total}</div>
            </div>
            <div style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #eee" }}>
              <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.05em", marginBottom: 4 }}>SESSIONS</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e" }}>{allSums.length}</div>
            </div>
            <div style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #eee" }}>
              <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.05em", marginBottom: 4 }}>SUBJECTS</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e" }}>{subs.length}</div>
            </div>
          </div>
        )}

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

        {(() => {
          const upcoming = getUpcoming(events || []);
          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 14 }}>
                <div className={s.sectionTitle} style={{ margin: 0 }}>{"\ud83d\udcc5"} Upcoming Events</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {onAddEvent && <button onClick={onAddEvent} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid #6366f1", background: "transparent", color: "#6366f1", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>}
                  <button onClick={() => setShowEventsPanel(true)} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "transparent", color: "#888", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Manage All</button>
                </div>
              </div>
              {upcoming.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 10, padding: 20, textAlign: "center", color: "#aaa", fontSize: 13, border: "1px solid #eee", marginBottom: 8 }}>No upcoming events.</div>
              ) : (
                upcoming.slice(0, 8).map(ev => {
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
                      <div style={{ textAlign: "right", marginRight: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? "#ef4444" : sub?.color || "#6366f1" }}>{formatEventDate(ev.date)}</div>
                        {days > 0 && <div style={{ fontSize: 10, color: "#bbb" }}>{days} day{days !== 1 ? "s" : ""}</div>}
                      </div>
                      {onEditEvent && <button onClick={() => onEditEvent(ev)} style={{ background: "#eee", border: "none", borderRadius: 6, width: 26, height: 26, color: "#666", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Edit">{"\u270e"}</button>}
                    </div>
                  );
                })
              )}
            </>
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

        <div className={s.sectionTitle} style={{ marginTop: 24 }}>All Session Summaries</div>
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
  );
}
