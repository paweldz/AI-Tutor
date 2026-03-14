import { useState } from "react";
import { SUBJECTS, BOARDS, YEARS, TIERS, ALL_SUBJECT_LIST } from "../config/subjects.js";
import { gradesForTier, GRADE_INFO } from "../utils/grades.js";
import s from "./Setup.module.css";

export function Setup({ onDone }) {
  const [phase, setPhase] = useState("role");
  const [p, setP] = useState({ name: "", role: "student", year: "", tier: "", examBoards: {}, targetGrades: {}, subjects: [], tutorCharacters: {} });
  const [boardIdx, setBoardIdx] = useState(0);
  const [gradeIdx, setGradeIdx] = useState(0);
  const upd = (f, v) => setP(x => ({ ...x, [f]: v }));
  const toggleSub = id => setP(x => ({ ...x, subjects: x.subjects.includes(id) ? x.subjects.filter(si => si !== id) : [...x.subjects, id] }));

  function afterName() {
    const name = p.name.trim();
    if (!name) return;
    if (p.role === "parent") {
      onDone({ name, role: "parent", children: [] });
      return;
    }
    setPhase("year");
  }

  const selectedSubs = p.subjects.map(id => SUBJECTS[id]).filter(Boolean);
  const boardSub = selectedSubs[boardIdx];

  function nextBoard() {
    if (boardIdx < selectedSubs.length - 1) setBoardIdx(i => i + 1);
    else { setGradeIdx(0); setPhase("grades"); }
  }

  const gradeSub = selectedSubs[gradeIdx];
  const availableGrades = gradesForTier(p.tier);

  function nextGrade() {
    if (gradeIdx < selectedSubs.length - 1) setGradeIdx(i => i + 1);
    else onDone(p);
  }

  const wrap = children => (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.glass}>{children}</div>
      </div>
    </div>
  );

  if (phase === "role") return wrap(<>
    <div className={s.tag}>WELCOME</div>
    <h2 className={s.heading}>Who are you?</h2>
    <p className={s.subtitle}>This determines your experience in the app</p>
    <div className={s.optionRow}>
      <div className={`so ${p.role === "student" ? s.optionOn : s.optionOff}`} onClick={() => upd("role", "student")}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{"\ud83c\udf93"}</div>
        <div>Student</div>
      </div>
      <div className={`so ${p.role === "parent" ? s.optionOn : s.optionOff}`} onClick={() => upd("role", "parent")}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{"\ud83d\udc68\u200d\ud83d\udc67"}</div>
        <div>Parent</div>
      </div>
    </div>
    <button className={`hb ${s.btnActive}`} onClick={() => setPhase("name")}>
      Continue {"\u2192"}
    </button>
  </>);

  if (phase === "name") return wrap(<>
    <div className={s.tag}>{p.role === "parent" ? "PARENT SETUP" : "WELCOME"}</div>
    <h2 className={s.heading}>What's your name?</h2>
    <p className={s.subtitle}>{p.role === "parent" ? "We'll use this on your parent dashboard" : "Your tutors will use this throughout your sessions"}</p>
    <input autoFocus value={p.name} onChange={e => upd("name", e.target.value)} onKeyDown={e => e.key === "Enter" && afterName()} placeholder={p.role === "parent" ? "Enter your name..." : "Enter your first name..."} className={s.nameInput} />
    <button className={`hb ${p.name.trim() ? s.btnActive : s.btnDisabled}`} onClick={afterName} disabled={!p.name.trim()}>
      {p.role === "parent" ? "Set Up Dashboard \u2192" : "Continue \u2192"}
    </button>
    <div style={{ textAlign: "center", marginTop: 12 }}>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }} onClick={() => setPhase("role")}>{"\u2190"} Back</span>
    </div>
  </>);

  if (phase === "year") return wrap(<>
    <div className={s.tag}>SETUP</div>
    <h2 className={s.heading}>Which year are you in?</h2>
    <p className={s.subtitle}>Helps tutors prioritise the right content</p>
    <div className={s.optionRow}>{YEARS.map(y => <div key={y} className={`so ${p.year === y ? s.optionOn : s.optionOff}`} onClick={() => upd("year", y)}>{y}</div>)}</div>
    <button className={`hb ${p.year ? s.btnActive : s.btnDisabled}`} onClick={() => setPhase("tier")} disabled={!p.year}>Continue {"\u2192"}</button>
  </>);

  if (phase === "tier") return wrap(<>
    <div className={s.tag}>SETUP</div>
    <h2 className={s.heading}>Foundation or Higher?</h2>
    <p className={s.subtitle}>Applies to Maths & Science</p>
    <div className={s.optionRow}>{TIERS.map(t => <div key={t} className={`so ${p.tier === t ? s.optionOn : s.optionOff}`} onClick={() => upd("tier", t)}>{t}</div>)}</div>
    <button className={`hb ${p.tier ? s.btnActive : s.btnDisabled}`} onClick={() => setPhase("subjects")} disabled={!p.tier}>Continue {"\u2192"}</button>
  </>);

  if (phase === "subjects") return wrap(<>
    <div className={s.tag}>CHOOSE YOUR SUBJECTS</div>
    <h2 className={s.heading}>Which GCSEs are you taking?</h2>
    <p className={s.subtitleShort}>Pick as many as you like. You can change these later in Settings.</p>
    <div className={s.subjectGrid}>
      {ALL_SUBJECT_LIST.map(sub => {
        const on = p.subjects.includes(sub.id);
        return <div key={sub.id} className={`so ${on ? s.subjectOn : s.subjectOff}`} onClick={() => toggleSub(sub.id)}>
          <span className={s.subjectEmoji}>{sub.emoji}</span>
          <div><div className={on ? s.subjectLabelOn : s.subjectLabel}>{sub.label}</div><div className={s.subjectTutor}>{sub.tutor.name}</div></div>
          {on && <span className={s.checkmark}>{"\u2713"}</span>}
        </div>;
      })}
    </div>
    <div className={s.countText}>{p.subjects.length} subject{p.subjects.length !== 1 ? "s" : ""} selected</div>
    <button className={`hb ${p.subjects.length ? s.btnActive : s.btnDisabled}`} onClick={() => { if (p.subjects.length) { setBoardIdx(0); setPhase("boards"); } }} disabled={!p.subjects.length}>
      Continue {"\u2192"}
    </button>
  </>);

  if (phase === "boards" && boardSub) return wrap(<>
    <div className={s.tag}>EXAM BOARDS {"\u00b7"} {boardIdx + 1}/{selectedSubs.length} {"\u00b7"} optional</div>
    <h2 className={s.heading}>{boardSub.emoji} {boardSub.label} exam board?</h2>
    <p className={s.subtitleShort}>Skip if unsure {"\u2014"} your tutor will cover all boards.</p>
    <div className={s.boardGrid}>
      {BOARDS.map(b => {
        const on = p.examBoards[boardSub.id] === b;
        return <div key={b} className={`so ${on ? s.boardOn : s.boardOff}`} onClick={() => setP(x => ({ ...x, examBoards: { ...x.examBoards, [boardSub.id]: on ? "" : b } }))}>{b}</div>;
      })}
    </div>
    <div className={s.boardBtnRow}>
      <button className={`hb ${s.skipBtn}`} onClick={nextBoard}>Skip</button>
      <button className={`hb ${s.nextBtn}`} onClick={nextBoard}>Next {"\u2192"}</button>
    </div>
  </>);

  if (phase === "grades" && gradeSub) return wrap(<>
    <div className={s.tag}>TARGET GRADES {"\u00b7"} {gradeIdx + 1}/{selectedSubs.length} {"\u00b7"} optional</div>
    <h2 className={s.heading}>{gradeSub.emoji} {gradeSub.label} target grade?</h2>
    <p className={s.subtitleShort}>Your tutor will tailor difficulty to help you reach this grade.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
      {availableGrades.map(g => {
        const info = GRADE_INFO[g];
        const on = p.targetGrades[gradeSub.id] === g;
        return <div key={g} className={`so ${on ? s.boardOn : s.boardOff}`} onClick={() => setP(x => ({ ...x, targetGrades: { ...x.targetGrades, [gradeSub.id]: on ? null : g } }))} style={{ borderColor: on ? info.color : undefined, background: on ? info.color + "18" : undefined, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: on ? info.color : "#666" }}>{g}</div>
          <div style={{ fontSize: 10, color: on ? info.color : "#999", fontWeight: 600 }}>{info.descriptor}</div>
        </div>;
      })}
    </div>
    <div className={s.boardBtnRow}>
      <button className={`hb ${s.skipBtn}`} onClick={nextGrade}>Skip</button>
      <button className={`hb ${s.nextBtn}`} onClick={nextGrade}>
        {gradeIdx === selectedSubs.length - 1 ? "Meet Your Tutors \u2192" : "Next \u2192"}
      </button>
    </div>
  </>);

  return null;
}
