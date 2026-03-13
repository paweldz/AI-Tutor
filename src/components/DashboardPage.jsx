import { useNavigate } from "react-router-dom";
import { mySubjects } from "../config/subjects.js";
import { getSessions } from "../utils/storage.js";
import { buildAllSummaries } from "../utils/summaries.js";
import { confidenceColor } from "../styles/tokens.js";
import s from "./Dashboard.module.css";

/**
 * Standalone dashboard page at /dashboard.
 * Reuses the same CSS module as the modal Dashboard.
 * Receives data via props from the App-level state.
 */
export function DashboardPage({ memory, mats, profile, xpData, streakData }) {
  const navigate = useNavigate();
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
