/* ═══════════════════════════════════════════════════════════════════
   ANTHROPIC API — via /api/chat proxy (key in Vercel env vars)
   ═══════════════════════════════════════════════════════════════════ */

import { SUBJECTS } from "../config/subjects.js";

export const MODEL = "claude-sonnet-4-5-20250929";

export const SUMMARY_PROMPT = `You are writing a session summary. Return ONLY valid JSON (no markdown, no backticks, no extra text). Exact shape:
{"date":"today DD Month YYYY","subject":"subject id","topics":["t1","t2"],"strengths":["s1"],"weaknesses":["w1"],"confidenceScores":{"topic1":70,"topic2":50},"messageCount":12,"examQuestionsAttempted":0,"rawSummaryText":"3-4 paragraph summary covering: topics, strengths, areas needing work, confidence levels, 3 priorities for next session."}`;

export async function apiSend(systemPrompt, messages, maxTokens = 1200) {
  const MAX_RETRIES = 4;
  const body = JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages });
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

    let data; try { data = JSON.parse(raw); } catch { throw new Error("HTTP " + status + " \u2014 invalid response from API."); }
    if (data.error) {
      const msg = data.error.message || data.error.type || "Unknown";
      if (status === 401) throw new Error("API key issue \u2014 check ANTHROPIC_API_KEY in Vercel settings.");
      if (status === 429) throw new Error("Busy \u2014 please try again in a moment.");
      if (status === 529) throw new Error("Busy \u2014 please try again in a moment.");
      throw new Error("API error (" + status + "): " + msg);
    }
    if (!data.content) throw new Error("Unexpected response (" + status + ").");
    return data.content.map(b => b.text || "").join("");
  }
}

export async function apiSummary(systemPrompt, chatMessages) {
  const msgs = [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: SUMMARY_PROMPT }];
  const raw = await apiSend(systemPrompt, msgs, 1000);
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const p = JSON.parse(cleaned);
    return {
      date: p.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      topics: p.topics || [], strengths: p.strengths || [], weaknesses: p.weaknesses || [],
      confidenceScores: p.confidenceScores || {}, messageCount: p.messageCount || chatMessages.length,
      examQuestionsAttempted: p.examQuestionsAttempted || 0, rawSummaryText: p.rawSummaryText || raw,
    };
  } catch {
    return { date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), topics: [], strengths: [], weaknesses: [], confidenceScores: {}, messageCount: chatMessages.length, examQuestionsAttempted: 0, rawSummaryText: raw };
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
    `You are ${sub.tutor.name}, GCSE ${sub.label} tutor.\nSTUDENT: ${profile.name} | ${profile.year} | ${profile.tier} | Board: ${board || "not confirmed"} ${boardNote}${charBlock}${histBlock}${matBlock}\n\nEMOTIONAL AWARENESS: If frustrated, slow down, validate, use analogies. If confident, push harder. Never make student feel stupid.\nEXAM PRACTICE: student attempts first \u2192 mark (X/Y marks because...) \u2192 explain mark scheme \u2192 model answer.\nTRACKING: Track topics/confidence/errors. On "how am I doing?" give honest assessment with confidence % per topic.` + sub.systemPromptSpecific(board, profile.tier);
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
