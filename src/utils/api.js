/* ═══════════════════════════════════════════════════════════════════
   ANTHROPIC API — via /api/chat proxy (key in Vercel env vars)
   ═══════════════════════════════════════════════════════════════════ */

import { SUBJECTS } from "../config/subjects.js";

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
      date: p.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
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

export function buildSystemPrompt(sid, profile, summaries, mats, examMode, character) {
  const sub = SUBJECTS[sid]; if (!sub) return "";
  const board = profile.examBoards?.[sid] || "";
  const boardNote = !board ? "Exam board unknown \u2014 cover broadly. Encourage student to find out." : "";
  const matBlock = mats?.length ? `\n\nTEACHER MATERIALS (${mats.length} file${mats.length > 1 ? "s" : ""}): ${mats.map(m => m.name).join(", ")}. Use as primary reference.` : "";
  const charBlock = character ? `\n\nTUTOR CHARACTER: ${character}` : "";
  let histBlock = "";
  if (summaries?.length) {
    const recent = summaries.slice(-4);
    histBlock = "\n\nPAST SESSIONS (" + recent.length + "):\n" + recent.map(s => "[" + s.date + "]: " + (s.rawSummaryText || "").slice(0, 400)).join("\n---\n") + "\n\nAvoid re-teaching mastered topics, prioritise weak areas.";
  }
  return (examMode ? "EXAM PRACTICE MODE: student attempts first, then mark properly, show model answer.\n\n" : "") +
    `You are ${sub.tutor.name}, GCSE ${sub.label} tutor.\nSTUDENT: ${profile.name} | ${profile.year} | ${profile.tier} | Board: ${board || "not confirmed"} ${boardNote}${charBlock}${histBlock}${matBlock}\n\nASSESSMENT LOGGING (CRITICAL): You MUST call the log_assessment tool EVERY TIME the student answers a question or attempts a problem. Do this IMMEDIATELY after evaluating their answer, before your response text. Never skip this — it feeds the honest progress tracker. Include the specific sub-topic (e.g. "expanding double brackets" not "algebra"), accurate result, exact hint count, and whether they explained their reasoning.\n\nEMOTIONAL AWARENESS: If frustrated, slow down, validate, use analogies. If confident, push harder. Never make student feel stupid.\nEXAM PRACTICE: student attempts first \u2192 mark (X/Y marks because...) \u2192 explain mark scheme \u2192 model answer.\nTRACKING: Track topics/confidence/errors. On "how am I doing?" give honest assessment with confidence % per topic.` + sub.systemPromptSpecific(board, profile.tier);
}

export function buildApiMsgs(mats, convMsgs) {
  const media = mats.filter(m => m.isImg || m.isPdf);
  if (!media.length) return convMsgs;
  return [
    { role: "user", content: [...media.map(m => ({ type: m.isPdf ? "document" : "image", source: { type: "base64", media_type: m.mediaType, data: m.base64 } })), { type: "text", text: "These are my teacher's materials. Acknowledge receipt." }] },
    { role: "assistant", content: "Got your teacher's materials \u2014 ready to help. Shall I quiz you, summarise them, or help prepare for a test?" },
    ...convMsgs,
  ];
}
