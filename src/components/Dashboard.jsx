import { ALL_SUBJECT_LIST, mySubjects } from "../config/subjects.js";
import { getSessions } from "../utils/storage.js";
import s from "./Dashboard.module.css";

export function Dashboard({ memory, mats, profile, onClose }) {
  const subs = mySubjects(profile);
  const allSums = Object.entries(memory.subjects || {}).flatMap(([id, sums]) => (sums || []).map(sm => ({ ...sm, tutor: ALL_SUBJECT_LIST.find(t => t.id === id) || { emoji: "", label: id, gradient: "#999", color: "#999" } }))).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className={s.overlay}>
      <div className={s.panel}>
        <div className={s.header}>
          <div>
            <div className={s.headerTag}>PARENT DASHBOARD</div>
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
                              <div className={s.confBar} style={{ width: pct + "%", background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444" }} />
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
