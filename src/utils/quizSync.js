import { SUBJECTS } from "../config/subjects.js";
import { getSessions } from "./storage.js";
import { apiSend, buildSystemPrompt, buildApiMsgs } from "./api.js";

/**
 * Build a natural-language summary of quiz results that gets injected
 * into the tutor chat so the AI can review wrong answers with the student.
 */
export function buildQuizSummary({ questions, answers, subjectId }) {
  const score = answers.filter(a => a.correct).length;
  const total = questions.length;
  const pct = total ? Math.round(score / total * 100) : 0;
  const subLabel = SUBJECTS[subjectId]?.label || subjectId;
  const wrong = [];
  const right = [];

  questions.forEach((q, i) => {
    const a = answers[i];
    const qText = q.q || "Match terms to definitions";
    if (a?.correct) {
      right.push(qText);
    } else {
      let correctAns = "";
      if (q.type === "mc" || (!q.type && q.options)) {
        const myAns = q.options?.[a?.chosen] || "?";
        correctAns = `I put "${myAns}" but the answer was "${q.options?.[q.correct] || "?"}"`;
      } else if (q.type === "tf") {
        correctAns = `I said ${a?.chosen ? "True" : "False"} but it was ${q.correct ? "True" : "False"}`;
      } else if (q.type === "short" || q.type === "fill") {
        correctAns = `I wrote "${a?.typed || "?"}" but the answer was "${q.answer}"`;
      } else if (q.type === "match") {
        correctAns = `I only matched ${a?.matchScore || 0} out of ${q.pairs?.length || 0} correctly`;
      }
      wrong.push(`- ${qText} — ${correctAns}`);
    }
  });

  let summary = `Hey! I just did a ${subLabel} quiz and got ${score}/${total} (${pct}%).`;
  if (right.length > 0) {
    summary += `\n\nI got these right:\n${right.map(q => `- ${q}`).join("\n")}`;
  }
  if (wrong.length > 0) {
    summary += `\n\nI got these wrong:\n${wrong.join("\n")}`;
  }
  if (wrong.length === 0) {
    summary += "\n\nI got everything right!";
  }
  summary += "\n\nCan you quickly go over the questions I got wrong and then we can continue what we were doing before?";
  return summary;
}

/**
 * Inject quiz results into a subject's chat session and optionally
 * auto-trigger a tutor response if that subject is currently active.
 */
export function injectQuizIntoChat({
  subjectId, summary, profile, memory,
  active, sessionsRef, mats, examMode,
  setSessions, setLoading
}) {
  const targetId = subjectId;

  // Inject summary as a user message
  setSessions(prev => {
    const existing = prev[targetId]?.messages || [];
    const base = existing.length > 0 ? existing : (() => {
      const sub = SUBJECTS[targetId];
      const board = profile?.examBoards?.[targetId];
      const memCount = getSessions(memory, targetId).length;
      return sub ? [{ role: "assistant", content: sub.welcomeMessage(profile, board, memCount) }] : [];
    })();
    return { ...prev, [targetId]: { ...prev[targetId], messages: [...base, { role: "user", content: summary }] } };
  });

  // Auto-trigger tutor response if this subject is currently open
  if (active === targetId) {
    setTimeout(async () => {
      const cur = sessionsRef.current[targetId]?.messages || [];
      if (!cur.length) return;
      setLoading(true);
      const sys = buildSystemPrompt(targetId, profile, getSessions(memory, targetId), mats[targetId] || [], examMode, profile.tutorCharacters?.[targetId]);
      const textMats = (mats[targetId] || []).filter(m => m.isText);
      const fullSys = (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys;
      const apiMsgs = buildApiMsgs(mats[targetId] || [], cur.map(m => ({ role: m.role, content: m.content })));
      try {
        const reply = await apiSend(fullSys, apiMsgs);
        setSessions(prev => ({ ...prev, [targetId]: { ...prev[targetId], messages: [...(prev[targetId]?.messages || []), { role: "assistant", content: reply }] } }));
      } catch (e) {
        setSessions(prev => ({ ...prev, [targetId]: { ...prev[targetId], messages: [...(prev[targetId]?.messages || []), { role: "assistant", content: "\u274c " + e.message }] } }));
      } finally { setLoading(false); }
    }, 300);
  }
}
