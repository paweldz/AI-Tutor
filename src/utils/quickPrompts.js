import { SUBJECTS } from "../config/subjects.js";

const LANG_GREETINGS = {
  spanish: "Hablémos en español",
  french: "Parlons en français",
  german: "Lass uns Deutsch sprechen",
};

const LANG_PRACTICE = {
  spanish: "¿Podemos practicar conversación?",
  french: "On peut pratiquer la conversation?",
  german: "Können wir üben?",
};

/**
 * Build the quick-prompt pill list for the current subject/mode.
 */
export function getQuickPrompts({ active, examMode, curMats, curMem, voiceMode, convoMode }) {
  if (!active || !SUBJECTS[active]) return [];

  const basePrompts = SUBJECTS[active].quickPrompts(examMode, curMats.length > 0);
  const greet = LANG_GREETINGS[active] || "Let's practise speaking";
  const prac = LANG_PRACTICE[active] || "Can we practise conversation?";
  const continuePrompt = curMem.length > 0 ? ["Pick up where we left off last session"] : [];

  if (convoMode) return [greet, prac, "Correct my pronunciation"];
  if (voiceMode) return [greet, "Correct my pronunciation", ...basePrompts];
  return [...continuePrompt, ...basePrompts];
}
