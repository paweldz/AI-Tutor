import { useState, useEffect } from "react";
import { getConfidence, getTopicProgress } from "../utils/topics.js";
import { apiSend } from "../utils/api.js";

export function QuickQuiz({ subject, profile, memory, topicData, onClose, onXP, onQuizComplete }) {
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const board = profile.examBoards?.[subject.id] || "";
    // Gather weak/recent topics from memory to focus the quiz
    const conf = getConfidence(memory, subject.id);
    const prog = getTopicProgress(topicData, subject.id);
    const weakTopics = Object.entries(conf).filter(([, v]) => v < 60).map(([t]) => t);
    const recentTopics = Object.entries(prog).sort((a, b) => (b[1].lastDate || "").localeCompare(a[1].lastDate || "")).slice(0, 6).map(([t]) => t);
    const focusTopics = [...new Set([...weakTopics, ...recentTopics])].slice(0, 8);
    const topicHint = focusTopics.length > 0 ? `\nFocus especially on these topics the student has been studying: ${focusTopics.join(", ")}.` : "";

    const sys = `You are a GCSE ${subject.label} quiz generator. Student: ${profile.name}, ${profile.year}, ${profile.tier}. Board: ${board || "general"}.`;
    const prompt = `Generate exactly 10 multiple-choice questions for GCSE ${subject.label}${board ? " (" + board + ")" : ""}, ${profile.tier} tier. Mix easy and medium difficulty.${topicHint}\n\nReturn ONLY valid JSON array (no markdown, no backticks):\n[{"q":"question text","options":["A","B","C","D"],"correct":0,"explanation":"brief explanation"}]\nwhere correct is the 0-based index of the right answer.`;
    apiSend(sys, [{ role: "user", content: prompt }], 2000).then(raw => {
      try {
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length >= 3) { setQuestions(parsed.slice(0, 10)); setPhase("question"); }
        else throw new Error("bad");
      } catch { setErr("Couldn't generate quiz. Try again!"); setPhase("result"); }
    }).catch(e => { setErr(e.message); setPhase("result"); });
  }, [subject, profile, memory, topicData]);

  function answer(idx) {
    const correct = questions[qi].correct === idx;
    setAnswers(prev => [...prev, { chosen: idx, correct }]);
    if (correct) onXP(20, "Quiz correct");
  }
  function nextQ() {
    if (qi < questions.length - 1) setQi(qi + 1);
    else {
      onXP(30, "Quiz completed");
      const finalAnswers = [...answers];
      if (onQuizComplete) onQuizComplete({ questions, answers: finalAnswers, subjectId: subject.id, quizType: "quick" });
      setPhase("result");
    }
  }

  const score = answers.filter(a => a.correct).length;
  const total = questions.length;
  const q = questions[qi];
  const answered = answers.length > qi;
  const pct = total ? Math.round(score / total * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>QUICK QUIZ</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div></div>
          {phase === "question" && <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{qi + 1}/{total}</div>}
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: 22 }}>
          {phase === "loading" && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 32, marginBottom: 12 }}>{"\u26a1"}</div><div style={{ color: "#666", fontSize: 14 }}>Generating 10 questions...</div><div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 16 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: subject.color, animation: `db 1.2s ease ${i * .2}s infinite` }} />)}</div></div>}

          {phase === "question" && q && <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(q.options || []).map((opt, oi) => {
                const wasChosen = answered && answers[qi]?.chosen === oi;
                const isCorrect = q.correct === oi;
                const bg = !answered ? "#fafafa" : isCorrect ? "#dcfce7" : wasChosen ? "#fee2e2" : "#fafafa";
                const border = !answered ? "#e0e0e0" : isCorrect ? "#22c55e" : wasChosen ? "#ef4444" : "#e0e0e0";
                return <div key={oi} onClick={() => !answered && answer(oi)} style={{ padding: "12px 14px", borderRadius: 12, border: "2px solid " + border, background: bg, cursor: answered ? "default" : "pointer", fontSize: 13, color: "#333", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: !answered ? subject.color + "20" : isCorrect ? "#22c55e" : wasChosen ? "#ef4444" : "#eee", color: !answered ? subject.color : isCorrect || wasChosen ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</span>
                  {opt}
                </div>;
              })}
            </div>
            {answered && q.explanation && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>{answers[qi]?.correct ? "\u2705 " : "\u274c "}{q.explanation}</div>}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>{questions.map((_, i) => <div key={i} style={{ width: i === qi ? 18 : 7, height: 7, borderRadius: 4, background: i < answers.length ? (answers[i]?.correct ? "#22c55e" : "#ef4444") : i === qi ? subject.color : "#e0e0e0", transition: "all .3s" }} />)}</div>
            {answered && <button onClick={nextQ} style={{ marginTop: 14, width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{qi < questions.length - 1 ? "Next \u2192" : "See Results"}</button>}
          </div>}

          {phase === "result" && <div style={{ textAlign: "center", padding: "20px 0" }}>
            {err ? <><div style={{ fontSize: 32, marginBottom: 8 }}>{"\u26a0\ufe0f"}</div><div style={{ color: "#666", marginBottom: 16 }}>{err}</div></> : <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "\ud83c\udf89" : pct >= 60 ? "\ud83d\udc4d" : pct >= 40 ? "\ud83d\udcaa" : "\ud83d\udca1"}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{score}/{total}</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>{pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : pct >= 40 ? "Getting there!" : "Keep practising!"}</div>
              <div style={{ fontSize: 13, color: subject.color, fontWeight: 700, marginBottom: 16 }}>+{score * 20 + 30} XP earned</div>
              {questions.map((q, i) => <div key={i} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 10, background: answers[i]?.correct ? "#f0fdf4" : "#fef2f2", marginBottom: 5, fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>{answers[i]?.correct ? "\u2705" : "\u274c"}</span> {q.q.slice(0, 55)}{q.q.length > 55 ? "..." : ""}
                {!answers[i]?.correct && q.options && <span style={{ color: "#666" }}> {"\u2014"} {q.options[q.correct]}</span>}
              </div>)}
            </>}
            <button onClick={onClose} style={{ marginTop: 16, padding: "12px 28px", borderRadius: 12, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
          </div>}
        </div>
      </div>
    </div>
  );
}
