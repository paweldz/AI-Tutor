/* ═══════════════════════════════════════════════════════════════════
   CLAUDE TOOL USE — tool definitions and execution
   ═══════════════════════════════════════════════════════════════════ */

import { getSessions } from "./storage.js";

/** Tool schemas sent to the Claude API */
export const TUTOR_TOOLS = [
  {
    name: "save_progress",
    description: "Save the student's current session progress including topics studied and confidence levels. Use this after a meaningful learning exchange or when the student asks to save their progress.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Subject ID being studied (e.g. 'maths', 'english', 'biology')" },
        topics: { type: "array", items: { type: "string" }, description: "Topics covered in this exchange" },
        confidenceScores: { type: "object", description: "Map of topic name to confidence percentage (0-100)" },
        summary: { type: "string", description: "Brief 2-3 sentence summary of what was covered and how the student did" },
      },
      required: ["subject", "topics", "summary"],
    },
  },
  {
    name: "generate_quiz",
    description: "Retrieve the student's history on specific topics to generate a targeted quiz. Returns past performance data so you can create questions that focus on weak areas.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Subject ID to quiz on" },
        topics: { type: "array", items: { type: "string" }, description: "Topics to focus the quiz on" },
        difficulty: { type: "string", enum: ["foundation", "higher"], description: "Difficulty level" },
      },
      required: ["subject"],
    },
  },
  {
    name: "retrieve_student_memory",
    description: "Retrieve the student's past session summaries for a subject. Use this to review their learning journey, identify patterns in strengths/weaknesses, or prepare a personalised session.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Subject ID to retrieve memory for. Leave empty for all subjects." },
      },
      required: [],
    },
  },
];

/**
 * Execute a tool call and return the result string.
 * @param {string} toolName
 * @param {object} toolInput
 * @param {object} ctx - { memory, profile, active, setMemory, setTopicData, gainXP }
 * @returns {string} result content for tool_result
 */
export function executeTool(toolName, toolInput, ctx) {
  const { memory, profile } = ctx;

  if (toolName === "save_progress") {
    const { subject, topics, confidenceScores, summary } = toolInput;
    const sid = subject || ctx.active;
    return JSON.stringify({
      saved: true,
      subject: sid,
      topics,
      confidenceScores: confidenceScores || {},
      summary,
      studentName: profile?.name || "Student",
    });
  }

  if (toolName === "generate_quiz") {
    const { subject, topics, difficulty } = toolInput;
    const sid = subject || ctx.active;
    const sessions = getSessions(memory, sid);
    const lastSession = sessions[sessions.length - 1];
    const weakAreas = lastSession?.weaknesses || [];
    const pastConfidence = lastSession?.confidenceScores || {};
    return JSON.stringify({
      subject: sid,
      requestedTopics: topics || [],
      difficulty: difficulty || profile?.tier?.toLowerCase() || "foundation",
      studentName: profile?.name,
      pastWeakAreas: weakAreas,
      pastConfidence,
      sessionCount: sessions.length,
      instruction: "Generate a quiz with 5 questions based on this data. Focus on weak areas and low-confidence topics.",
    });
  }

  if (toolName === "retrieve_student_memory") {
    const { subject } = toolInput;
    if (subject) {
      const sessions = getSessions(memory, subject);
      return JSON.stringify({
        subject,
        sessionCount: sessions.length,
        sessions: sessions.slice(-6).map(s => ({
          date: s.date,
          topics: s.topics,
          strengths: s.strengths,
          weaknesses: s.weaknesses,
          confidenceScores: s.confidenceScores,
          summary: (s.rawSummaryText || "").slice(0, 300),
        })),
      });
    }
    // All subjects
    const result = {};
    for (const [sid, sessions] of Object.entries(memory.subjects || {})) {
      if (sessions?.length) {
        const last = sessions[sessions.length - 1];
        result[sid] = {
          sessionCount: sessions.length,
          lastDate: last.date,
          lastTopics: last.topics,
          lastConfidence: last.confidenceScores,
          weaknesses: last.weaknesses,
        };
      }
    }
    return JSON.stringify({ allSubjects: result });
  }

  return JSON.stringify({ error: "Unknown tool: " + toolName });
}
