import { useState, useEffect, useRef } from "react";
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


export function QuizBuilder({ subject, profile, onClose, onXP, onQuizComplete }) {
  const [phase, setPhase] = useState("setup");
  const [questions, setQuestions] = useState([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [err, setErr] = useState(null);
  const [qCount, setQCount] = useState(5);
  const [qTypes, setQTypes] = useState({ mc: true, tf: false, short: false, fill: false, match: false });
  const [quizMats, setQuizMats] = useState([]);
  const [typedAns, setTypedAns] = useState("");
  const [coverage, setCoverage] = useState(null);
  const [desc, setDesc] = useState("");
  const [loadMsg, setLoadMsg] = useState("Building your quiz...");
  const fileRef = useRef(null);

  const QTYPES = [
    { id: "mc", label: "Multiple Choice", emoji: "\ud83d\udd18", desc: "Pick from 4 options" },
    { id: "tf", label: "True / False", emoji: "\u2705", desc: "Is the statement correct?" },
    { id: "short", label: "Short Answer", emoji: "\u270d\ufe0f", desc: "Type your answer" },
    { id: "fill", label: "Fill the Blank", emoji: "\u2702\ufe0f", desc: "Complete the sentence" },
    { id: "match", label: "Key Terms", emoji: "\ud83d\udd17", desc: "Match terms to definitions" },
  ];
  const anyType = Object.values(qTypes).some(v => v);
  const hasMats = quizMats.length > 0;

  async function handleFiles(files) {
    for (const f of Array.from(files)) {
      if (f.size > 8 * 1024 * 1024) continue;
      const isImg = f.type.startsWith("image/"), isPdf = f.type === "application/pdf", isText = f.type.startsWith("text/");
      if (!isImg && !isPdf && !isText) continue;
      try {
        let base64 = null, textContent = null;
        if (isText) textContent = await f.text();
        else base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = () => rej(); r.readAsDataURL(f); });
        setQuizMats(prev => [...prev, { id: Date.now() + Math.random(), name: f.name, isImg, isPdf, isText, base64, textContent, mediaType: f.type }]);
      } catch {}
    }
  }

  async function startQuiz() {
    if (!anyType) return;
    setPhase("loading");
    const selectedTypes = Object.entries(qTypes).filter(([, v]) => v).map(([k]) => k);
    const typeInstr = selectedTypes.map(t => {
      if (t === "mc") return '"mc": {"type":"mc","q":"question","options":["A","B","C","D"],"correct":0,"explanation":"brief"}';
      if (t === "tf") return '"tf": {"type":"tf","q":"true-or-false statement","correct":true,"explanation":"brief"}';
      if (t === "short") return '"short": {"type":"short","q":"question","answer":"correct answer","keywords":["key","words"],"explanation":"brief"}';
      if (t === "fill") return '"fill": {"type":"fill","q":"Sentence with _____ for blank","answer":"missing word","explanation":"brief"}';
      if (t === "match") return '"match": {"type":"match","pairs":[{"term":"t1","def":"d1"},{"term":"t2","def":"d2"},{"term":"t3","def":"d3"},{"term":"t4","def":"d4"}],"explanation":"brief"}';
      return "";
    }).join("\n");
    const board = profile.examBoards?.[subject.id] || "";
    const matNote = hasMats ? `\n\nIMPORTANT: Base ALL questions on the uploaded materials (${quizMats.map(m => m.name).join(", ")}). Cover as many different sections as possible.` : "";
    const sys = `You are a GCSE ${subject.label} quiz generator. Student: ${profile.name}, ${profile.year}, ${profile.tier}. Board: ${board || "general"}.`;
    const descNote = desc.trim() ? `\n\nSTUDENT'S TEST DESCRIPTION: ${desc.trim()}` : "";

    // Build material messages (reused across batches)
    const matMsgs = [];
    const media = quizMats.filter(m => m.isImg || m.isPdf).map(m => ({ type: m.isPdf ? "document" : "image", source: { type: "base64", media_type: m.mediaType, data: m.base64 } }));
    const textMat = quizMats.filter(m => m.isText).map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n");
    if (media.length || textMat) {
      const parts = [...media];
      parts.push({ type: "text", text: textMat ? "STUDY MATERIALS:\n" + textMat : "Study materials uploaded. Base all questions on them." });
      matMsgs.push({ role: "user", content: parts });
      matMsgs.push({ role: "assistant", content: "I've reviewed the materials. I'll generate quiz questions based on them." });
    }

    // Generate in batches of 10 for reliability
    const batchSize = 10;
    const allQ = [];
    let lastCoverage = null;
    try {
      const batches = Math.ceil(qCount / batchSize);
      for (let b = 0; b < batches; b++) {
        const thisCount = Math.min(batchSize, qCount - allQ.length);
        if (batches > 1) setLoadMsg(`Generating questions ${allQ.length + 1}\u2013${allQ.length + thisCount} of ${qCount}...`);
        const already = allQ.length > 0 ? `\n\nQuestions already generated (do NOT repeat):\n${allQ.map(q => q.q || "match").join("\n")}` : "";
        const covNote = (b === batches - 1 && hasMats) ? '\nAlso add "coveragePct" (0-100) estimating what % of the material is tested across ALL questions.' : "";
        const prompt = `Generate exactly ${thisCount} questions for GCSE ${subject.label}${board ? " (" + board + ")" : ""}, ${profile.tier} tier. Mix difficulty.${descNote}\n\nUse ONLY these types (distribute evenly):\n${typeInstr}\n\nReturn ONLY valid JSON (no markdown, no backticks):\n{"questions":[...array...]${covNote ? ',"coveragePct":50' : ""}}${matNote}${already}${covNote}`;
        const apiMsgs = [...matMsgs, { role: "user", content: prompt }];
        const raw = await apiSend(sys, apiMsgs, Math.min(8000, thisCount * 200 + 400));
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const qs = parsed.questions || parsed;
        if (Array.isArray(qs)) allQ.push(...qs.slice(0, thisCount));
        if (parsed.coveragePct) lastCoverage = parsed.coveragePct;
      }
      if (allQ.length >= 2) { setQuestions(allQ.slice(0, qCount)); if (lastCoverage) setCoverage(lastCoverage); setPhase("question"); }
      else throw new Error("bad");
    } catch (e) { setErr(e.message === "bad" ? "Couldn't generate quiz. Try again!" : e.message); setPhase("result"); }
  }

  function answerMC(idx) { const c = questions[qi].correct === idx; setAnswers(p => [...p, { chosen: idx, correct: c, type: "mc" }]); if (c) onXP(20, "Quiz correct"); }
  function answerTF(val) { const c = questions[qi].correct === val; setAnswers(p => [...p, { chosen: val, correct: c, type: "tf" }]); if (c) onXP(20, "Quiz correct"); }
  function answerTyped() {
    const q = questions[qi]; const ua = typedAns.trim().toLowerCase(); if (!ua) return;
    let c = false; const ans = (q.answer || "").toLowerCase(); const kw = q.keywords || [];
    if (q.type === "fill") c = ua === ans || kw.some(k => ua.includes(k.toLowerCase()));
    else c = ua === ans || (kw.length > 0 && kw.filter(k => ua.includes(k.toLowerCase())).length >= Math.ceil(kw.length * 0.5));
    setAnswers(p => [...p, { typed: typedAns.trim(), correct: c, type: q.type, expected: q.answer }]); if (c) onXP(25, "Quiz typed correct"); setTypedAns("");
  }
  function nextQ() {
    if (qi < questions.length - 1) setQi(qi + 1);
    else {
      onXP(30, "Quiz completed");
      const finalAnswers = [...answers];
      if (onQuizComplete) onQuizComplete({ questions, answers: finalAnswers, subjectId: subject.id, quizType: "builder" });
      setPhase("result");
    }
  }

  const score = answers.filter(a => a.correct).length;
  const total = questions.length;
  const q = questions[qi];
  const answered = answers.length > qi;
  const pct = total ? Math.round(score / total * 100) : 0;

  /* Match sub-component */
  function MatchQ({ q, onDone, done, ans, color }) {
    const [shuffled] = useState(() => q.pairs.map((_, i) => i).sort(() => Math.random() - 0.5));
    const [sel, setSel] = useState(null);
    const [matches, setMatches] = useState({});
    const full = Object.keys(matches).length === q.pairs.length;
    function check() {
      const sc = q.pairs.filter((_, i) => shuffled[matches[i]] === i).length;
      onDone(sc === q.pairs.length, sc);
    }
    return <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Match each term to its definition:</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>{q.pairs.map((p, i) => <div key={i} onClick={() => !done && matches[i] === undefined && setSel(i)} style={{ padding: "9px 11px", borderRadius: 10, marginBottom: 5, border: "2px solid " + (sel === i ? color : matches[i] !== undefined ? "#22c55e" : "#e0e0e0"), background: matches[i] !== undefined ? "#f0fdf4" : sel === i ? color + "12" : "#fafafa", cursor: done || matches[i] !== undefined ? "default" : "pointer", fontSize: 12, fontWeight: 600 }}>{p.term}</div>)}</div>
        <div style={{ flex: 1 }}>{shuffled.map((si, di) => { const used = Object.values(matches).includes(di); return <div key={di} onClick={() => { if (done || used || sel === null) return; setMatches(p => ({ ...p, [sel]: di })); setSel(null); }} style={{ padding: "9px 11px", borderRadius: 10, marginBottom: 5, border: "2px solid " + (used ? "#22c55e" : "#e0e0e0"), background: used ? "#f0fdf4" : "#fafafa", cursor: done || used || sel === null ? "default" : "pointer", fontSize: 11, color: "#555", opacity: used ? 0.6 : 1 }}>{q.pairs[si].def}</div>; })}</div>
      </div>
      {!done && full && <button onClick={check} style={{ marginTop: 8, width: "100%", padding: "10px", borderRadius: 10, border: "none", background: color, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Check</button>}
      {done && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: ans?.correct ? "#22c55e" : "#f59e0b" }}>{ans?.correct ? "\u2705 Perfect!" : `Got ${ans?.matchScore || 0}/${q.pairs.length}`}</div>}
    </div>;
  }

  /* ── SETUP ── */
  if (phase === "setup") return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>QUIZ BUILDER</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Describe Your Test (optional)</div>
          <div style={{ marginBottom: 18 }}>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="e.g. End of topic test on Chapter 5, focus on vocabulary and grammar tenses, mock exam style questions, Year 11 revision for Paper 2..." style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, lineHeight: 1.5, outline: "none", resize: "vertical" }} />
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>Describe what you're revising for, topics to focus on, or any special requirements</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Question Types</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {QTYPES.map(t => <div key={t.id} onClick={() => setQTypes(p => ({ ...p, [t.id]: !p[t.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "2px solid " + (qTypes[t.id] ? subject.color : "#e0e0e0"), background: qTypes[t.id] ? subject.color + "10" : "#fafafa", cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>{t.emoji}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: qTypes[t.id] ? subject.color : "#555" }}>{t.label}</div><div style={{ fontSize: 10, color: "#999" }}>{t.desc}</div></div>
              {qTypes[t.id] && <span style={{ color: subject.color, fontWeight: 700, fontSize: 16 }}>{"\u2713"}</span>}
            </div>)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Number of Questions</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {[5, 10, 20, 30, 50].map(n => <button key={n} onClick={() => setQCount(n)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "2px solid " + (qCount === n ? subject.color : "#e0e0e0"), background: qCount === n ? subject.color + "15" : "#fff", color: qCount === n ? subject.color : "#666", fontWeight: qCount === n ? 700 : 400, fontSize: 14, cursor: "pointer" }}>{n}</button>)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Study Materials (optional)</div>
          <div style={{ marginBottom: 18 }}>
            <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #ddd", borderRadius: 12, padding: "16px 14px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{"\ud83d\udcce"}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>Upload worksheets, notes, or photos</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Quiz will be based on these materials</div>
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            </div>
            {quizMats.length > 0 && <div style={{ marginTop: 8 }}>{quizMats.map(m => <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{m.isPdf ? "\ud83d\udcc4" : m.isImg ? "\ud83d\uddbc\ufe0f" : "\ud83d\udcdd"}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
              <button onClick={() => setQuizMats(prev => prev.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 11 }}>{"\u2715"}</button>
            </div>)}</div>}
          </div>
          <button onClick={startQuiz} disabled={!anyType} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: anyType ? subject.color : "#e0e0e0", color: anyType ? "#fff" : "#aaa", fontWeight: 700, fontSize: 15, cursor: anyType ? "pointer" : "default" }}>{"\ud83d\udee0\ufe0f"} Build My Quiz</button>
        </div>
      </div>
    </div>
  );

  /* ── QUIZ (loading / question / result) ── */
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{hasMats ? "MATERIALS QUIZ" : "QUIZ BUILDER"}</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div></div>
          {phase === "question" && <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{qi + 1}/{total}</div>}
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: 22 }}>
          {phase === "loading" && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 32, marginBottom: 12 }}>{"\ud83d\udee0\ufe0f"}</div><div style={{ color: "#666", fontSize: 14 }}>{loadMsg}</div><div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 16 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: subject.color, animation: `db 1.2s ease ${i * .2}s infinite` }} />)}</div></div>}

          {phase === "question" && q && <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: subject.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{q.type === "mc" ? "Multiple Choice" : q.type === "tf" ? "True / False" : q.type === "short" ? "Short Answer" : q.type === "fill" ? "Fill the Blank" : q.type === "match" ? "Key Terms" : "Question"}</div>

            {/* MC */}
            {(q.type === "mc" || (!q.type && q.options)) && <><div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{(q.options || []).map((opt, oi) => { const wc = answered && answers[qi]?.chosen === oi; const ic = q.correct === oi; return <div key={oi} onClick={() => !answered && answerMC(oi)} style={{ padding: "12px 14px", borderRadius: 12, border: "2px solid " + (!answered ? "#e0e0e0" : ic ? "#22c55e" : wc ? "#ef4444" : "#e0e0e0"), background: !answered ? "#fafafa" : ic ? "#dcfce7" : wc ? "#fee2e2" : "#fafafa", cursor: answered ? "default" : "pointer", fontSize: 13, color: "#333", display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 24, height: 24, borderRadius: "50%", background: !answered ? subject.color + "20" : ic ? "#22c55e" : wc ? "#ef4444" : "#eee", color: !answered ? subject.color : ic || wc ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</span>{opt}</div>; })}</div></>}

            {/* TF */}
            {q.type === "tf" && <><div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div><div style={{ display: "flex", gap: 10 }}>{[true, false].map(v => { const wc = answered && answers[qi]?.chosen === v; const ic = q.correct === v; return <div key={String(v)} onClick={() => !answered && answerTF(v)} style={{ flex: 1, padding: 16, borderRadius: 12, border: "2px solid " + (!answered ? "#e0e0e0" : ic ? "#22c55e" : wc ? "#ef4444" : "#e0e0e0"), background: !answered ? "#fafafa" : ic ? "#dcfce7" : wc ? "#fee2e2" : "#fafafa", cursor: answered ? "default" : "pointer", textAlign: "center", fontSize: 15, fontWeight: 700, color: "#333" }}>{v ? "\u2705 True" : "\u274c False"}</div>; })}</div></>}

            {/* SHORT / FILL */}
            {(q.type === "short" || q.type === "fill") && <><div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 14, lineHeight: 1.6 }}>{q.q}</div>{!answered ? <div style={{ display: "flex", gap: 8 }}><input value={typedAns} onChange={e => setTypedAns(e.target.value)} onKeyDown={e => e.key === "Enter" && answerTyped()} placeholder={q.type === "fill" ? "Fill in the blank..." : "Type your answer..."} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 14, outline: "none" }} autoFocus /><button onClick={answerTyped} disabled={!typedAns.trim()} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: typedAns.trim() ? subject.color : "#e0e0e0", color: typedAns.trim() ? "#fff" : "#aaa", fontWeight: 700, cursor: typedAns.trim() ? "pointer" : "default" }}>{"\u2191"}</button></div> : <div style={{ padding: "10px 14px", borderRadius: 10, background: answers[qi]?.correct ? "#dcfce7" : "#fee2e2", border: "1px solid " + (answers[qi]?.correct ? "#86efac" : "#fca5a5") }}><div style={{ fontSize: 13 }}><strong>Your answer:</strong> {answers[qi]?.typed}</div>{!answers[qi]?.correct && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}><strong>Expected:</strong> {q.answer}</div>}</div>}</>}

            {/* MATCH */}
            {q.type === "match" && q.pairs && <MatchQ q={q} onDone={(c, sc) => { setAnswers(p => [...p, { correct: c, matchScore: sc, type: "match" }]); if (c) onXP(25, "Match perfect"); else if (sc >= 2) onXP(10, "Match partial"); }} done={answered} ans={answers[qi]} color={subject.color} />}

            {answered && q.explanation && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>{answers[qi]?.correct ? "\u2705 " : "\u274c "}{q.explanation}</div>}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>{questions.map((_, i) => <div key={i} style={{ width: i === qi ? 18 : 7, height: 7, borderRadius: 4, background: i < answers.length ? (answers[i]?.correct ? "#22c55e" : "#ef4444") : i === qi ? subject.color : "#e0e0e0", transition: "all .3s" }} />)}</div>
            {answered && <button onClick={nextQ} style={{ marginTop: 14, width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{qi < questions.length - 1 ? "Next \u2192" : "See Results"}</button>}
          </div>}

          {phase === "result" && <div style={{ textAlign: "center", padding: "20px 0" }}>
            {err ? <><div style={{ fontSize: 32, marginBottom: 8 }}>{"\u26a0\ufe0f"}</div><div style={{ color: "#666", marginBottom: 16 }}>{err}</div></> : <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "\ud83c\udf89" : pct >= 60 ? "\ud83d\udc4d" : pct >= 40 ? "\ud83d\udcaa" : "\ud83d\udca1"}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{score}/{total}</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>{pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : pct >= 40 ? "Getting there!" : "Keep practising!"}</div>
              <div style={{ fontSize: 13, color: subject.color, fontWeight: 700, marginBottom: 8 }}>+{answers.reduce((a, x) => a + (x.correct ? (x.type === "short" || x.type === "fill" || x.type === "match" ? 25 : 20) : (x.matchScore >= 2 ? 10 : 0)), 0) + 30} XP</div>
              {coverage !== null && hasMats && <div style={{ margin: "12px auto 16px", maxWidth: 300, padding: "14px 16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>{"\ud83d\udcca"} Materials Coverage</div>
                <div style={{ height: 8, borderRadius: 4, background: "#e0f2fe" }}><div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#0369a1,#38bdf8)", width: coverage + "%", transition: "width .5s" }} /></div>
                <div style={{ fontSize: 12, color: "#0369a1", marginTop: 4, fontWeight: 600 }}>~{coverage}% of your materials covered</div>
                {coverage < 60 && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Try another quiz to cover more!</div>}
              </div>}
              {questions.map((q, i) => <div key={i} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 10, background: answers[i]?.correct ? "#f0fdf4" : "#fef2f2", marginBottom: 5, fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>{answers[i]?.correct ? "\u2705" : "\u274c"}</span> {(q.q || "Match terms").slice(0, 55)}{(q.q || "").length > 55 ? "..." : ""}
                {!answers[i]?.correct && q.type === "mc" && q.options && <span style={{ color: "#666" }}> {"\u2014"} {q.options[q.correct]}</span>}
                {!answers[i]?.correct && (q.type === "short" || q.type === "fill") && <span style={{ color: "#666" }}> {"\u2014"} {q.answer}</span>}
                {!answers[i]?.correct && q.type === "tf" && <span style={{ color: "#666" }}> {"\u2014"} {q.correct ? "True" : "False"}</span>}
              </div>)}
            </>}
            <button onClick={onClose} style={{ marginTop: 16, padding: "12px 28px", borderRadius: 12, border: "none", background: subject.color, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
          </div>}
        </div>
      </div>
    </div>
  );
}

