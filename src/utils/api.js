/* ═══════════════════════════════════════════════════════════════════
   ANTHROPIC API — via /api/chat proxy (key in Vercel env vars)
   ═══════════════════════════════════════════════════════════════════ */

import { SUBJECTS } from "../config/subjects.js";
import { daysUntil, eventTypeInfo } from "./events.js";
import { scoreToGrade, gradeEstimateSummary } from "./grades.js";

export const MODEL = "claude-sonnet-4-5-20250929";

export const SUMMARY_PROMPT = `You are writing a session summary. You MUST use the SESSION METRICS provided — they are objective ground truth. Do NOT inflate confidence or overstate progress.

RULES:
- If accuracy <50%, say the student is struggling. Do not soften this.
- If <3 questions were attempted on a topic, say it was only "introduced", not "covered" or "practised".
- If hints were needed for most answers, note the student is not yet independent.
- If the student only gave bare answers without reasoning, note this as a weakness.
- Confidence scores MUST match the EVIDENCE-BASED CONFIDENCE numbers. Do not invent your own.
- If no questions were attempted, this was a discussion session — do not claim progress.

Return ONLY valid JSON (no markdown, no backticks, no extra text). Exact shape:
{"date":"today DD Month YYYY","subject":"subject id","topics":["t1","t2"],"strengths":["s1"],"weaknesses":["w1"],"confidenceScores":{"topic1":70,"topic2":50},"messageCount":12,"examQuestionsAttempted":0,"metrics":{"totalQuestions":5,"correct":2,"partial":1,"wrong":1,"skipped":1,"accuracyPct":50,"avgHints":1.2,"activeMinutes":8},"topicDepth":{"topic1":"practiced","topic2":"introduced"},"rawSummaryText":"3-4 paragraph HONEST summary: what was covered, actual accuracy with numbers, what went well, what needs work, whether the student can do it independently. End with 3 priorities for next session."}`;

export async function apiSend(systemPrompt, messages, maxTokens = 1200, { tools, onToolUse } = {}) {
  const MAX_RETRIES = 4;
  const MAX_TOOL_ROUNDS = 5;
  let currentMessages = [...messages];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const payload = { model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages: currentMessages };
    if (tools?.length) payload.tools = tools;
    const body = JSON.stringify(payload);

    let data;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let raw = "", status = 0;
      try {
        const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body });
        status = r.status; raw = await r.text();
      } catch (e) {
        if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, (attempt + 1) * 2000)); continue; }
        throw new Error("Network error: " + e.message + ". Check your internet connection.");
      }

      if ((status === 429 || status === 529) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2500));
        continue;
      }

      try { data = JSON.parse(raw); } catch { throw new Error("HTTP " + status + " \u2014 invalid response from API."); }
      if (data.error) {
        const msg = data.error.message || data.error.type || "Unknown";
        if (status === 401) throw new Error("API key issue \u2014 check ANTHROPIC_API_KEY in Vercel settings.");
        if (status === 429) throw new Error("Busy \u2014 please try again in a moment.");
        if (status === 529) throw new Error("Busy \u2014 please try again in a moment.");
        throw new Error("API error (" + status + "): " + msg);
      }
      if (!data.content) throw new Error("Unexpected response (" + status + ").");
      break;
    }

    // Check if response contains tool_use blocks
    const toolUses = (data.content || []).filter(b => b.type === "tool_use");
    if (!toolUses.length || !onToolUse || data.stop_reason !== "tool_use") {
      return (data.content || []).map(b => b.text || "").join("");
    }

    // Execute tools and continue the conversation
    const toolResults = toolUses.map(tu => ({
      type: "tool_result",
      tool_use_id: tu.id,
      content: onToolUse(tu.name, tu.input),
    }));

    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: data.content },
      { role: "user", content: toolResults },
    ];
  }

  // Shouldn't reach here, but return last text if we do
  return "";
}

export async function apiSummary(systemPrompt, chatMessages, metricsBlock = "") {
  const promptWithMetrics = metricsBlock ? metricsBlock + "\n\n" + SUMMARY_PROMPT : SUMMARY_PROMPT;
  const msgs = [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: promptWithMetrics }];
  const raw = await apiSend(systemPrompt, msgs, 1200);
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const p = JSON.parse(cleaned);
    return {
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      topics: p.topics || [], strengths: p.strengths || [], weaknesses: p.weaknesses || [],
      confidenceScores: p.confidenceScores || {}, messageCount: p.messageCount || chatMessages.length,
      examQuestionsAttempted: p.examQuestionsAttempted || 0,
      metrics: p.metrics || null,
      topicDepth: p.topicDepth || null,
      rawSummaryText: p.rawSummaryText || raw,
    };
  } catch {
    return { date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), topics: [], strengths: [], weaknesses: [], confidenceScores: {}, messageCount: chatMessages.length, examQuestionsAttempted: 0, metrics: null, topicDepth: null, rawSummaryText: raw };
  }
}

export function buildSystemPrompt(sid, profile, summaries, mats, examSession, character, events, gradeEstimate) {
  const sub = SUBJECTS[sid]; if (!sub) return "";
  const board = profile.examBoards?.[sid] || "";
  const targetGrade = profile.targetGrades?.[sid];
  const boardNote = !board ? "Exam board unknown \u2014 cover broadly. Encourage student to find out." : "";
  const matBlock = mats?.length ? `\n\nTEACHER MATERIALS (${mats.length} file${mats.length > 1 ? "s" : ""}): ${mats.map(m => m.name).join(", ")}. Use as primary reference.` : "";
  const charBlock = character ? `\n\nTUTOR CHARACTER: ${character}` : "";
  let histBlock = "";
  if (summaries?.length) {
    const recent = summaries.slice(-4);
    histBlock = "\n\nPAST SESSIONS (" + recent.length + "):\n" + recent.map(s => "[" + s.date + "]: " + (s.rawSummaryText || "").slice(0, 400)).join("\n---\n") + "\n\nAvoid re-teaching mastered topics, prioritise weak areas.";
  }

  // Build exam mode prefix
  let examPrefix = "";
  // Support both object (new) and boolean (legacy/summary) forms
  const examMode = examSession && typeof examSession === "object" ? examSession : examSession ? { mode: "free" } : null;
  if (examMode) {
    if (examMode.mode === "paper") {
      const descNote = examMode.description ? ` Paper: ${examMode.description}.` : "";
      const timeNote = examMode.timeLimit ? ` Time limit: ${examMode.timeLimit} minutes.` : "";
      examPrefix = `PAST PAPER PRACTICE MODE:${descNote}${timeNote}
The student has uploaded a past paper. You MUST:
1. Extract ALL questions from the uploaded paper — read every page carefully
2. Present questions ONE AT A TIME, clearly numbered (e.g. "Question 1a", "Question 2b")
3. Wait for the student's answer before moving on
4. After each answer: mark it (X/Y marks), explain the mark scheme, show the model answer
5. Then move to the next question automatically
6. Keep a running score (e.g. "Running total: 12/20 marks")
7. At the end, give a full breakdown: total marks, percentage, grade boundary estimate, and topic-by-topic analysis

`;
    } else {
      examPrefix = "EXAM PRACTICE MODE: student attempts first, then mark properly, show model answer.\n\n";
    }
  }

  // Upcoming events awareness
  let eventsBlock = "";
  if (events?.length) {
    const upcoming = events
      .filter(e => e.subjectId === sid && e.status === "upcoming")
      .filter(e => { const d = daysUntil(e.date); return d >= 0 && d <= 14; })
      .sort((a, b) => a.date.localeCompare(b.date));
    const completed = events
      .filter(e => e.subjectId === sid && e.status === "completed")
      .slice(-3);
    if (upcoming.length) {
      eventsBlock += "\n\nUPCOMING EVENTS:\n" + upcoming.map(e => {
        const d = daysUntil(e.date);
        const ti = eventTypeInfo(e.type);
        return `- ${ti.label}: "${e.title}" on ${e.date} (${d === 0 ? "TODAY" : d === 1 ? "TOMORROW" : d + " days away"})${e.topics?.length ? ", topics: " + e.topics.join(", ") : ""}`;
      }).join("\n") + "\nGently suggest preparation when natural. Don't force it or nag.";
    }
    if (completed.length) {
      eventsBlock += "\n\nRECENT TEST RESULTS:\n" + completed.map(e => {
        const ti = eventTypeInfo(e.type);
        let line = `- ${ti.label}: "${e.title}"`;
        if (e.score != null && e.maxScore) {
          line += ` — ${e.score}/${e.maxScore} (${Math.round(e.score / e.maxScore * 100)}%)`;
          const gr = scoreToGrade(e.score, e.maxScore, board, profile.tier);
          if (gr) line += ` [Grade ${gr.grade}]`;
        }
        if (e.reflection?.toImprove) line += ` — needs work on: ${e.reflection.toImprove}`;
        return line;
      }).join("\n") + "\nUse these results to inform your teaching focus.";
    }
  }

  // Grade context
  let gradeBlock = "";
  if (targetGrade || gradeEstimate) {
    gradeBlock = "\n\nGRADE CONTEXT:";
    if (targetGrade) gradeBlock += ` Target grade: ${targetGrade}.`;
    if (gradeEstimate) gradeBlock += ` ${gradeEstimateSummary(gradeEstimate)}.`;
    if (targetGrade && gradeEstimate) {
      const gap = targetGrade - gradeEstimate.point;
      if (gap > 0) gradeBlock += ` The student is ${gap} grade${gap > 1 ? "s" : ""} below their target — push them with Grade ${targetGrade}-level questions and mark-scheme precision.`;
      else if (gap === 0) gradeBlock += " The student is at their target — maintain this level and build consistency.";
      else gradeBlock += " The student is exceeding their target — consider stretching them with higher-grade content.";
    } else if (targetGrade) {
      gradeBlock += ` Tailor content difficulty, vocabulary, and question complexity to Grade ${targetGrade} standard. For grades 7-9, expect deeper analysis, precise terminology, and extended responses. For grades 4-5, focus on clear foundations and structured approaches.`;
    }
  }

  return examPrefix +
    `You are ${sub.tutor.name}, GCSE ${sub.label} tutor.\nSTUDENT: ${profile.name} | ${profile.year} | ${profile.tier} | Board: ${board || "not confirmed"} ${boardNote}${charBlock}${gradeBlock}${histBlock}${matBlock}\n\nASSESSMENT LOGGING (CRITICAL): You MUST call the log_assessment tool EVERY TIME the student answers a question or attempts a problem. Do this IMMEDIATELY after evaluating their answer, before your response text. Never skip this — it feeds the honest progress tracker. Include the specific sub-topic (e.g. "expanding double brackets" not "algebra"), accurate result, exact hint count, and whether they explained their reasoning.\n\nEMOTIONAL AWARENESS: If frustrated, slow down, validate, use analogies. If confident, push harder. Never make student feel stupid.\nEXAM PRACTICE: student attempts first \u2192 mark (X/Y marks because...) \u2192 explain mark scheme \u2192 model answer.\nTRACKING: Track topics/confidence/errors. On "how am I doing?" give honest assessment with confidence % per topic.` + sub.systemPromptSpecific(board, profile.tier) + eventsBlock;
}

export function buildApiMsgs(mats, convMsgs, examSession) {
  // Combine regular materials with exam paper materials
  const allMats = [...mats];
  if (examSession?.paperMats?.length) {
    allMats.push(...examSession.paperMats);
  }
  const media = allMats.filter(m => m.isImg || m.isPdf);
  if (!media.length) return convMsgs;
  const isPaper = examSession?.mode === "paper";
  return [
    { role: "user", content: [...media.map(m => ({ type: m.isPdf ? "document" : "image", source: { type: "base64", media_type: m.mediaType, data: m.base64 } })), { type: "text", text: isPaper ? "Here is my past paper. Please read all questions carefully." : "These are my teacher's materials. Acknowledge receipt." }] },
    { role: "assistant", content: isPaper ? "I've received your past paper and read through all the questions. Let's begin \u2014 I'll take you through each question one at a time." : "Got your teacher's materials \u2014 ready to help. Shall I quiz you, summarise them, or help prepare for a test?" },
    ...convMsgs,
  ];
}
