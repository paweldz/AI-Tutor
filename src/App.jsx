import { useState, useRef, useEffect, useCallback, Component } from "react";

/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  GCSE TUTOR HUB v2.0                                           ║
 * ║                                                                  ║
 * ║  This is the ONLY file you need to edit.                        ║
 * ║  To add a subject: scroll to SUBJECT REGISTRY and copy a block. ║
 * ║  To change tutor behaviour: edit systemPromptSpecific().        ║
 * ║  To change the look: edit the component styles.                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Source Sans 3', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
@keyframes mi { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
@keyframes db { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-7px) } }
@keyframes ci { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
textarea { outline: none; }
.btn { transition: all .2s; cursor: pointer; }
.btn:hover { opacity: .85; }
.card { transition: all .25s; cursor: pointer; }
.card:hover { transform: translateY(-4px); }
.hb:hover { transform: translateY(-2px); }
.so:hover { transform: scale(1.03); }
@keyframes mp { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4) } 50% { box-shadow: 0 0 0 10px rgba(220,38,38,0) } }
`;


/* ═══════════════════════════════════════════════════════════════════
   SUBJECT CATALOG — Full list of available GCSE subjects.
   Each child picks their own subjects during setup.
   ═══════════════════════════════════════════════════════════════════ */

const BOARDS = ["AQA","Edexcel","OCR","WJEC","Eduqas"];
const YEARS  = ["Year 10","Year 11"];
const TIERS  = ["Foundation","Higher"];

/* Template helpers to reduce repetition */
function stdWelcome(tutorName, p, board, memCount, extra) {
  const b = board ? ` ${board} ${p.tier}.` : "";
  const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""}.` : "";
  return `Hello ${p.name}! I'm ${tutorName}.${b}${m}\n\n${extra || "What shall we work on?"}`;
}
function stdQuickPrompts(exam, hasMats) {
  return [exam ? "Here's my answer:" : hasMats ? "Quiz me on my materials" : "Can you quiz me?", hasMats ? "Prepare me for my test" : "How am I doing?", "How am I doing?", hasMats ? "Summarise my notes" : "What should I focus on?"];
}

const SUBJECTS = {
  spanish: {
    id: "spanish", label: "Spanish", emoji: "\ud83c\uddea\ud83c\uddf8",
    tutor: { name: "Se\u00f1ora L\u00f3pez" },
    color: "#b5451b", gradient: "linear-gradient(135deg,#b5451b,#e8603a)", bg: "#fdf6f3",
    description: "Conversation, grammar & vocabulary",
    voice: { enabled: true, lang: "es-ES", ttsVoice: "nova" },
    welcomeMessage(p, board, memCount) {
      const b = board ? ` ${board} Spanish \u2014 perfect.` : "";
      const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""} \u2014 I remember your history.` : "";
      return `\u00a1Hola ${p.name}! I'm Se\u00f1ora L\u00f3pez.${b}${m}\n\nWhat shall we work on? \u00bfQu\u00e9 prefieres?\n\n\ud83c\udf99\ufe0f Tip: Tap "Voice" to practise speaking!`;
    },
    systemPromptSpecific(board, tier) {
      let s = "\nSPANISH: Mix English/Spanish, increase Spanish as confidence grows. Correct gently. End each exchange with a question.";
      if (board === "AQA") s += " AQA: 3 themes, 4 skills.";
      else if (board === "Edexcel") s += " Edexcel: translation + photo card.";
      else if (board === "OCR") s += " OCR: spontaneous speaking focus.";
      s += tier === "Higher" ? " Higher: subjunctive, complex tenses." : " Foundation: present/past/future, core vocab.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  french: {
    id: "french", label: "French", emoji: "\ud83c\uddeb\ud83c\uddf7",
    tutor: { name: "Madame Dubois" },
    color: "#1a3a8a", gradient: "linear-gradient(135deg,#1a3a8a,#3b5cc8)", bg: "#f3f5fd",
    description: "Conversation, grammar & vocabulary",
    voice: { enabled: true, lang: "fr-FR", ttsVoice: "nova" },
    welcomeMessage(p, board, memCount) {
      const b = board ? ` ${board} French.` : "";
      const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""}.` : "";
      return `Bonjour ${p.name}! I'm Madame Dubois.${b}${m}\n\nQu'est-ce qu'on fait aujourd'hui?\n\n\ud83c\udf99\ufe0f Tap "Voice" to practise speaking!`;
    },
    systemPromptSpecific(board, tier) {
      let s = "\nFRENCH: Mix English/French, increase French as confidence grows. Correct gently with explanations. End each exchange with a question.";
      if (board === "AQA") s += " AQA: 3 themes, 4 skills.";
      else if (board === "Edexcel") s += " Edexcel: translation + photo card.";
      s += tier === "Higher" ? " Higher: subjunctive, conditional, complex structures." : " Foundation: present/past/future, everyday vocab.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  german: {
    id: "german", label: "German", emoji: "\ud83c\udde9\ud83c\uddea",
    tutor: { name: "Herr Schmidt" },
    color: "#8a6b1a", gradient: "linear-gradient(135deg,#8a6b1a,#c89e2a)", bg: "#fdfaf3",
    description: "Conversation, grammar & vocabulary",
    voice: { enabled: true, lang: "de-DE", ttsVoice: "nova" },
    welcomeMessage(p, board, memCount) {
      const b = board ? ` ${board} German.` : "";
      const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""}.` : "";
      return `Hallo ${p.name}! I'm Herr Schmidt.${b}${m}\n\nWas machen wir heute?\n\n\ud83c\udf99\ufe0f Tap "Voice" to practise speaking!`;
    },
    systemPromptSpecific(board, tier) {
      let s = "\nGERMAN: Mix English/German, increase German as confidence grows. Pay special attention to cases (nom/acc/dat/gen) and word order. Correct gently.";
      if (board === "AQA") s += " AQA: 3 themes, 4 skills.";
      else if (board === "Edexcel") s += " Edexcel: translation + photo card.";
      s += tier === "Higher" ? " Higher: subordinate clauses, passive, subjunctive." : " Foundation: present/past/future, core vocab.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  math: {
    id: "math", label: "Maths", emoji: "\ud83d\udcd0",
    tutor: { name: "Mr. Chen" },
    color: "#1a3a7a", gradient: "linear-gradient(135deg,#1a3a7a,#2980b9)", bg: "#f3f6fd",
    description: "Number, algebra, geometry & stats",
    welcomeMessage(p, board, memCount) { return stdWelcome("Mr. Chen", p, board, memCount, "What are we working on?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nMATHS: Show every step. When wrong ask \"where did it go wrong?\" first. Offer multiple methods. Flag: units, sig figs. Scaffold: trivial>easy>medium>hard.";
      if (board === "Edexcel") s += " Edexcel: 3 papers (1 non-calc).";
      else if (board === "AQA") s += " AQA: multi-step context problems.";
      s += tier === "Higher" ? " Higher: quadratics, circle theorems, vectors, surds, functions, iteration." : " Foundation: arithmetic, algebra, geometry, probability.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  english: {
    id: "english", label: "English", emoji: "\ud83d\udcda",
    tutor: { name: "Ms. Williams" },
    color: "#5b1a6b", gradient: "linear-gradient(135deg,#5b1a6b,#8e44ad)", bg: "#faf3fd",
    description: "Language & Literature",
    welcomeMessage(p, board, memCount) { return stdWelcome("Ms. Williams", p, board, memCount, "Language or Literature today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nENGLISH: Push for the 'so what' on every technique. Mark writing: score + reasons + one improvement. Build vocab.";
      if (board === "AQA") s += " AQA: P1 fiction+creative, P2 non-fiction+viewpoint, AO1-AO6.";
      else if (board === "Edexcel") s += " Edexcel: personal response emphasis.";
      else if (board === "OCR") s += " OCR: audience/purpose central.";
      s += " Literature: link to context for top marks.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  science: {
    id: "science", label: "Science", emoji: "\ud83d\udd2c",
    tutor: { name: "Dr. Patel" },
    color: "#1a6b3c", gradient: "linear-gradient(135deg,#1a6b3c,#27ae60)", bg: "#f3fdf6",
    description: "Biology, Chemistry & Physics",
    welcomeMessage(p, board, memCount) { return stdWelcome("Dr. Patel", p, board, memCount, "Biology, Chemistry or Physics today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nSCIENCE: Use analogies. Flag exam technique (\"6-mark answer needs 6 points\"). Show every calc step.";
      if (board === "AQA") s += " AQA: required practicals, ~30% maths, Trilogy or Triple.";
      else if (board === "Edexcel") s += " Edexcel: Core Practicals examined.";
      else if (board === "OCR") s += " OCR: Gateway or 21C spec.";
      s += tier === "Higher" ? " Higher: complex maths, mechanisms, organic chem." : " Foundation: concepts over derivation.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  history: {
    id: "history", label: "History", emoji: "\ud83c\udfdb\ufe0f",
    tutor: { name: "Mr. Hartley" },
    color: "#7a4a1a", gradient: "linear-gradient(135deg,#7a4a1a,#a66b2f)", bg: "#fdf8f3",
    description: "British, world & thematic history",
    welcomeMessage(p, board, memCount) { return stdWelcome("Mr. Hartley", p, board, memCount, "Which period or topic shall we explore?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nHISTORY: Always link evidence to argument. Practice source analysis: provenance, reliability, utility. Push for 'so what' conclusions. Teach PEE/PEEL paragraphs.";
      if (board === "AQA") s += " AQA: 2 period studies + thematic + British depth.";
      else if (board === "Edexcel") s += " Edexcel: 3 papers, historic environment.";
      else if (board === "OCR") s += " OCR: depth + period studies.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  geography: {
    id: "geography", label: "Geography", emoji: "\ud83c\udf0d",
    tutor: { name: "Ms. Rivera" },
    color: "#1a6b5a", gradient: "linear-gradient(135deg,#1a6b5a,#1abc9c)", bg: "#f3fdfa",
    description: "Physical & human geography",
    welcomeMessage(p, board, memCount) { return stdWelcome("Ms. Rivera", p, board, memCount, "Physical or human geography today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nGEOGRAPHY: Use real case studies. Practice map skills and data interpretation. Push for named examples in every answer. Teach command word awareness.";
      if (board === "AQA") s += " AQA: Living world, Urban issues, Physical landscapes, Fieldwork.";
      else if (board === "Edexcel") s += " Edexcel: Global + UK, decision-making exercise.";
      else if (board === "OCR") s += " OCR: Our Natural World, People and Society, Geographical Exploration.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  computer_science: {
    id: "computer_science", label: "Computer Science", emoji: "\ud83d\udcbb",
    tutor: { name: "Dr. Okonkwo" },
    color: "#2d3a8c", gradient: "linear-gradient(135deg,#2d3a8c,#5b6abf)", bg: "#f4f4fd",
    description: "Programming, theory & algorithms",
    welcomeMessage(p, board, memCount) { return stdWelcome("Dr. Okonkwo", p, board, memCount, "Theory, programming, or algorithms today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nCOMPUTER SCIENCE: For code, show step-by-step logic. Use trace tables. Explain theory with real analogies. Cover both Python and pseudocode.";
      if (board === "AQA") s += " AQA: 2 papers, Python-focused, computational thinking.";
      else if (board === "Edexcel") s += " Edexcel: Python, 2 exams + NEA.";
      else if (board === "OCR") s += " OCR: J277, Python/pseudocode, computational thinking.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  religious_studies: {
    id: "religious_studies", label: "Religious Studies", emoji: "\ud83d\udd4a\ufe0f",
    tutor: { name: "Ms. Begum" },
    color: "#6b3a8a", gradient: "linear-gradient(135deg,#6b3a8a,#9b59b6)", bg: "#f9f3fd",
    description: "Beliefs, practices & ethics",
    welcomeMessage(p, board, memCount) { return stdWelcome("Ms. Begum", p, board, memCount, "Which religion or ethical topic shall we discuss?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nRELIGIOUS STUDIES: Always present multiple viewpoints. Use specific teachings and sacred texts as evidence. Practice 12-mark evaluation questions.";
      if (board === "AQA") s += " AQA: 2 religions + 4 thematic studies.";
      else if (board === "Edexcel") s += " Edexcel: Beliefs, Marriage & Family, Living the Faith, Peace & Conflict.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  business: {
    id: "business", label: "Business Studies", emoji: "\ud83d\udcbc",
    tutor: { name: "Mr. Osei" },
    color: "#1a5a3a", gradient: "linear-gradient(135deg,#1a5a3a,#2e8b57)", bg: "#f3fdf7",
    description: "Enterprise, marketing, finance & operations",
    welcomeMessage(p, board, memCount) { return stdWelcome("Mr. Osei", p, board, memCount, "Marketing, finance, operations, or HR today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nBUSINESS: Use real company examples. Practice applying theory to case studies. Teach calculation methods (GP%, NP%, ARR). Push for evaluation in every answer.";
      if (board === "AQA") s += " AQA: 2 papers, business in the real world + influences.";
      else if (board === "Edexcel") s += " Edexcel: Theme 1 small business, Theme 2 building a business.";
      else if (board === "OCR") s += " OCR: Business Activity, Marketing, People, Finance, Operations.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  art: {
    id: "art", label: "Art & Design", emoji: "\ud83c\udfa8",
    tutor: { name: "Ms. Fontaine" },
    color: "#c44569", gradient: "linear-gradient(135deg,#c44569,#e8608a)", bg: "#fdf3f6",
    description: "Fine art, graphics & photography",
    welcomeMessage(p, board, memCount) { return stdWelcome("Ms. Fontaine", p, board, memCount, "Shall we work on your portfolio, explore artists, or practise techniques?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nART & DESIGN: Focus on annotation and critical analysis. Guide formal elements vocabulary. Help with artist research and comparisons. Coach exam preparation and time management for the externally set assignment.";
      if (board === "AQA") s += " AQA: Portfolio (60%) + Externally Set Assignment (40%).";
      else if (board === "Edexcel") s += " Edexcel: Personal Portfolio + Externally Set Assignment.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  music: {
    id: "music", label: "Music", emoji: "\ud83c\udfb5",
    tutor: { name: "Mr. Abara" },
    color: "#8a1a5a", gradient: "linear-gradient(135deg,#8a1a5a,#c2185b)", bg: "#fdf3f8",
    description: "Performance, composition & listening",
    welcomeMessage(p, board, memCount) { return stdWelcome("Mr. Abara", p, board, memCount, "Performance, composition, or listening practice?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nMUSIC: Use correct musical terminology (texture, timbre, dynamics, tempo). Help with set work analysis. Guide composition techniques. Practice listening question technique.";
      if (board === "AQA") s += " AQA: Understanding Music, Performing, Composing. Set works across 4 areas.";
      else if (board === "Edexcel") s += " Edexcel: 8 set works across 4 areas of study.";
      else if (board === "OCR") s += " OCR: Integrated portfolio approach.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  drama: {
    id: "drama", label: "Drama", emoji: "\ud83c\udfad",
    tutor: { name: "Ms. Park" },
    color: "#c44500", gradient: "linear-gradient(135deg,#c44500,#e06520)", bg: "#fdf5f0",
    description: "Performance, devising & written exam",
    welcomeMessage(p, board, memCount) { return stdWelcome("Ms. Park", p, board, memCount, "Performance skills, set text, or devising today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nDRAMA: Use correct drama terminology (proxemics, semiotics, Brechtian, naturalism). Help with set text analysis. Coach performance evaluation writing. Guide devising logs.";
      if (board === "AQA") s += " AQA: Understanding Drama, Devising Drama, Texts in Practice.";
      else if (board === "Edexcel") s += " Edexcel: Devising, Performance from text, Theatre Makers in Practice.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  dt: {
    id: "dt", label: "Design & Technology", emoji: "\u2699\ufe0f",
    tutor: { name: "Mr. Novak" },
    color: "#5a5a1a", gradient: "linear-gradient(135deg,#5a5a1a,#8a8a2a)", bg: "#fdfdf3",
    description: "Materials, systems & design principles",
    welcomeMessage(p, board, memCount) { return stdWelcome("Mr. Novak", p, board, memCount, "Design theory, materials, or your NEA today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nDESIGN & TECHNOLOGY: Cover materials (timber, metals, polymers, textiles), manufacturing processes, design principles, and environmental impact. Help with iterative design and NEA structure.";
      if (board === "AQA") s += " AQA: Core technical + specialist + designing & making principles.";
      else if (board === "Edexcel") s += " Edexcel: Core + specialist knowledge, maths in DT.";
      else if (board === "OCR") s += " OCR: Principles of DT, iterative design.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  pe: {
    id: "pe", label: "PE", emoji: "\u26bd",
    tutor: { name: "Coach Thompson" },
    color: "#1a7a3a", gradient: "linear-gradient(135deg,#1a7a3a,#2ecc71)", bg: "#f3fdf5",
    description: "Anatomy, training & sport psychology",
    welcomeMessage(p, board, memCount) { return stdWelcome("Coach Thompson", p, board, memCount, "Anatomy, training principles, or sport psychology?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nPE: Cover anatomy & physiology, movement analysis, physical training, sport psychology, socio-cultural influences, and health. Use sport-specific examples. Help with data analysis questions.";
      if (board === "AQA") s += " AQA: 2 papers + practical performance + analysis.";
      else if (board === "Edexcel") s += " Edexcel: Fitness and Body Systems, Health and Performance.";
      else if (board === "OCR") s += " OCR: Physical Factors, Socio-cultural Issues, NEA.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  psychology: {
    id: "psychology", label: "Psychology", emoji: "\ud83e\udde0",
    tutor: { name: "Dr. Lewin" },
    color: "#4a1a7a", gradient: "linear-gradient(135deg,#4a1a7a,#7e57c2)", bg: "#f7f3fd",
    description: "Research methods, memory & development",
    welcomeMessage(p, board, memCount) { return stdWelcome("Dr. Lewin", p, board, memCount, "Which topic area shall we explore?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nPSYCHOLOGY: Reference key studies by name. Practice research methods terminology. Evaluate using strengths/weaknesses format. Teach AO1 (knowledge) vs AO2 (application) vs AO3 (evaluation).";
      if (board === "AQA") s += " AQA: Cognition & Behaviour, Social Context, Research Methods.";
      else if (board === "Edexcel") s += " Edexcel: 2 papers, clinical + developmental + social + cognitive.";
      else if (board === "OCR") s += " OCR: Criminal, Developmental, Psychological Problems, Social Influence.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  economics: {
    id: "economics", label: "Economics", emoji: "\ud83d\udcb0",
    tutor: { name: "Ms. Chang" },
    color: "#2a6a4a", gradient: "linear-gradient(135deg,#2a6a4a,#3da06a)", bg: "#f3fdf8",
    description: "Micro, macro & international trade",
    welcomeMessage(p, board, memCount) { return stdWelcome("Ms. Chang", p, board, memCount, "Microeconomics, macroeconomics, or something specific?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nECONOMICS: Use supply/demand diagrams mentally. Teach chains of reasoning. Push for real-world examples. Practice data response and extended writing.";
      if (board === "Edexcel") s += " Edexcel: Theme 1 micro, Theme 2 macro.";
      else if (board === "OCR") s += " OCR: Introduction to Economics, National & International.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  sociology: {
    id: "sociology", label: "Sociology", emoji: "\ud83c\udfe0",
    tutor: { name: "Dr. Morris" },
    color: "#6b1a3a", gradient: "linear-gradient(135deg,#6b1a3a,#a02255)", bg: "#fdf3f6",
    description: "Families, education, crime & theory",
    welcomeMessage(p, board, memCount) { return stdWelcome("Dr. Morris", p, board, memCount, "Which topic \u2014 families, education, crime, or theory?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nSOCIOLOGY: Reference key sociologists by name. Use correct terminology (functionalism, Marxism, feminism, interactionism). Practice for evidence + evaluation. Link theory to contemporary examples.";
      if (board === "AQA") s += " AQA: Education, Families, Crime & Deviance, Stratification.";
      else if (board === "OCR") s += " OCR: Socialisation, Culture & Identity + 2 options.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  latin: {
    id: "latin", label: "Latin", emoji: "\ud83c\udfdb",
    tutor: { name: "Dr. Varro" },
    color: "#5a3a1a", gradient: "linear-gradient(135deg,#5a3a1a,#8b6914)", bg: "#fdf9f3",
    description: "Translation, grammar & civilisation",
    welcomeMessage(p, board, memCount) { return stdWelcome("Dr. Varro", p, board, memCount, "Grammar, translation, or civilisation today? Salve!"); },
    systemPromptSpecific(board, tier) {
      let s = "\nLATIN: Practice translation both ways. Drill declensions and conjugations systematically. Use etymology to make vocab memorable. Cover set texts and civilisation content.";
      if (board === "OCR") s += " OCR: 3 components \u2014 Language, Prose Literature, Civilisation/Verse.";
      else if (board === "WJEC") s += " WJEC/Eduqas: Latin Language + Literature.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },
};

/* Derived helpers */
const ALL_SUBJECT_IDS   = Object.keys(SUBJECTS);
const ALL_SUBJECT_LIST  = Object.values(SUBJECTS);
function mySubjects(profile) {
  const ids = profile?.subjects || [];
  return ids.length ? ids.map(id => SUBJECTS[id]).filter(Boolean) : ALL_SUBJECT_LIST.slice(0, 4); // fallback for old profiles
}
function emptyMats() { return Object.fromEntries(ALL_SUBJECT_IDS.map(id => [id, []])); }


/* ═══════════════════════════════════════════════════════════════════
   STORAGE — localStorage with v1 → v2 migration
   ═══════════════════════════════════════════════════════════════════ */

const KEYS = { profile: "gcse_profile_v2", memory: "gcse_memory_v2" };

function readJSON(key, fallback = null) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function migrateIfNeeded() {
  // v1 memory → v2 structured format
  const oldMem = readJSON("gcse_memory_v1");
  if (oldMem && !readJSON(KEYS.memory)) {
    const migrated = { version: 2, subjects: {} };
    for (const [sid, sums] of Object.entries(oldMem)) {
      migrated.subjects[sid] = (sums || []).map(s => ({
        date: s.date || "Unknown", topics: [], strengths: [], weaknesses: [],
        confidenceScores: {}, messageCount: 0, examQuestionsAttempted: 0,
        rawSummaryText: s.text || "",
      }));
    }
    writeJSON(KEYS.memory, migrated);
  }
  // v1 profile → v2
  const oldProf = readJSON("gcse_profile_v1");
  if (oldProf && !readJSON(KEYS.profile)) writeJSON(KEYS.profile, oldProf);
}

function loadProfile()  { return readJSON(KEYS.profile, null); }
function saveProfile(p) { writeJSON(KEYS.profile, p); }
function loadMemory()   { const d = readJSON(KEYS.memory); return d?.version ? d : { version: 2, subjects: {} }; }
function saveMemory(m)  { writeJSON(KEYS.memory, m); }
function getSessions(mem, sid) { return mem?.subjects?.[sid] || []; }
function addSessionToMem(mem, sid, data) {
  const u = { ...mem, subjects: { ...mem.subjects, [sid]: [...(mem.subjects[sid] || []), data] } };
  saveMemory(u); return u;
}
function clearSubjectMem(mem, sid) {
  const u = { ...mem, subjects: { ...mem.subjects, [sid]: [] } };
  saveMemory(u); return u;
}
function clearAllMem() { const e = { version: 2, subjects: {} }; saveMemory(e); return e; }

function exportData(memory, profile) {
  return { _format: "gcse-tutor-hub", version: 2, exportedAt: new Date().toISOString(), profile, memory };
}
function importData(jsonStr) {
  const d = JSON.parse(jsonStr);
  if (d._format !== "gcse-tutor-hub") throw new Error("Not a GCSE Tutor Hub backup file.");
  if (!d.version || d.version < 2) throw new Error("Backup is from an older version.");
  return { profile: d.profile, memory: d.memory };
}


/* ═══════════════════════════════════════════════════════════════════
   SUPABASE — cloud backup via /api/db proxy (keys in Vercel env vars)
   ═══════════════════════════════════════════════════════════════════ */

async function sbTest() {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    const d = await r.json();
    return d.ok === true;
  } catch { return false; }
}

async function sbSave(studentName, subject, date, summary) {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", studentName, subject, date, summary: typeof summary === "string" ? summary : JSON.stringify(summary) }) });
    const d = await r.json();
    return d.ok === true;
  } catch { return false; }
}

async function sbLoad(studentName) {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load", studentName }) });
    const d = await r.json();
    if (!d.ok || !d.rows?.length) return null;
    const subjects = {};
    for (const row of d.rows) {
      if (!subjects[row.subject]) subjects[row.subject] = [];
      let parsed; try { parsed = JSON.parse(row.summary); } catch { parsed = null; }
      subjects[row.subject].push(parsed?.rawSummaryText ? parsed : { date: row.session_date, rawSummaryText: row.summary, topics: [], strengths: [], weaknesses: [], confidenceScores: {}, messageCount: 0, examQuestionsAttempted: 0 });
    }
    return { version: 2, subjects };
  } catch { return null; }
}

function mergeMemory(local, cloud) {
  if (!cloud) return local;
  const merged = { version: 2, subjects: { ...local.subjects } };
  for (const [sid, sessions] of Object.entries(cloud.subjects || {})) {
    const existing = merged.subjects[sid] || [];
    const keys = new Set(existing.map(s => s.date + "|" + (s.rawSummaryText || "").slice(0, 80)));
    merged.subjects[sid] = [...existing, ...sessions.filter(s => !keys.has(s.date + "|" + (s.rawSummaryText || "").slice(0, 80)))];
  }
  return merged;
}

/* Save a named setting to Supabase (fire-and-forget) */
async function sbSaveSetting(studentName, key, value) {
  try { await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_settings", studentName, key, value }) }); } catch {}
}

/* Load all settings from Supabase — returns { profile: {...}, ... } or null */
async function sbLoadSettings(studentName) {
  try {
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load_settings", studentName }) });
    const d = await r.json();
    return d.ok ? d.settings : null;
  } catch { return null; }
}


/* ═══════════════════════════════════════════════════════════════════
   ANTHROPIC API — via /api/chat proxy (key in Vercel env vars)
   ═══════════════════════════════════════════════════════════════════ */

const MODEL = "claude-sonnet-4-5-20250929";

const SUMMARY_PROMPT = `You are writing a session summary. Return ONLY valid JSON (no markdown, no backticks, no extra text). Exact shape:
{"date":"today DD Month YYYY","subject":"subject id","topics":["t1","t2"],"strengths":["s1"],"weaknesses":["w1"],"confidenceScores":{"topic1":70,"topic2":50},"messageCount":12,"examQuestionsAttempted":0,"rawSummaryText":"3-4 paragraph summary covering: topics, strengths, areas needing work, confidence levels, 3 priorities for next session."}`;

async function apiSend(systemPrompt, messages, maxTokens = 1200) {
  let raw = "", status = 0;
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages }),
    });
    status = r.status; raw = await r.text();
  } catch (e) { throw new Error("Network error: " + e.message + ". Check your internet connection."); }

  let data; try { data = JSON.parse(raw); } catch { throw new Error("HTTP " + status + " \u2014 invalid response from API."); }
  if (data.error) {
    const msg = data.error.message || data.error.type || "Unknown";
    if (status === 401) throw new Error("API key issue \u2014 check ANTHROPIC_API_KEY in Vercel settings.");
    if (status === 429) throw new Error("Rate limited \u2014 wait a moment and try again.");
    if (status === 529) throw new Error("Anthropic servers are busy \u2014 try again shortly.");
    throw new Error("API error (" + status + "): " + msg);
  }
  if (!data.content) throw new Error("Unexpected response (" + status + ").");
  return data.content.map(b => b.text || "").join("");
}

async function apiSummary(systemPrompt, chatMessages) {
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

function buildSystemPrompt(sid, profile, summaries, mats, examMode, character) {
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

function buildApiMsgs(mats, convMsgs) {
  const media = mats.filter(m => m.isImg || m.isPdf);
  if (!media.length) return convMsgs;
  return [
    { role: "user", content: [...media.map(m => ({ type: m.isPdf ? "document" : "image", source: { type: "base64", media_type: m.mediaType, data: m.base64 } })), { type: "text", text: "These are my teacher's materials. Acknowledge receipt." }] },
    { role: "assistant", content: "Got your teacher's materials \u2014 ready to help. Shall I quiz you, summarise them, or help prepare for a test?" },
    ...convMsgs,
  ];
}


/* ═══════════════════════════════════════════════════════════════════
   FILE PROCESSOR
   ═══════════════════════════════════════════════════════════════════ */

const MAX_MB = 8;
const ACCEPT_TYPES = { "image/jpeg":1, "image/png":1, "image/gif":1, "image/webp":1, "application/pdf":1, "text/plain":1 };

async function processFiles(files, onAdd, onError) {
  const results = [];
  for (const f of Array.from(files)) {
    if (!ACCEPT_TYPES[f.type]) { onError(f.name + ": unsupported type"); continue; }
    if (f.size > MAX_MB * 1024 * 1024) { onError(f.name + ": too large (max " + MAX_MB + "MB)"); continue; }
    const isImg = f.type.startsWith("image/"), isPdf = f.type === "application/pdf", isText = f.type.startsWith("text/");
    let base64 = null, textContent = null;
    try {
      if (isText) textContent = await f.text();
      else base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = () => rej(); r.readAsDataURL(f); });
      results.push({ id: Date.now() + Math.random(), name: f.name, type: isImg ? "image" : isPdf ? "pdf" : "text", mediaType: f.type, isImg, isPdf, isText, base64, textContent, size: f.size, uploadedAt: new Date().toLocaleDateString("en-GB"), preview: isImg ? "data:" + f.type + ";base64," + base64 : null });
    } catch { onError("Failed to process " + f.name); }
  }
  if (results.length) onAdd(results);
}


/* ═══════════════════════════════════════════════════════════════════
   SPEECH SERVICE — OpenAI TTS + Whisper for voice subjects
   Only activates for subjects with voice.enabled = true (Spanish).
   TTS:    /api/tts.js       → OpenAI tts-1 (natural "nova" voice)
   STT:    /api/transcribe.js → OpenAI whisper-1 (accurate Spanish)
   Requires OPENAI_API_KEY in Vercel environment variables.
   ═══════════════════════════════════════════════════════════════════ */

const HAS_MEDIA_RECORDER = typeof window !== "undefined" && !!window.MediaRecorder;
let _currentAudio = null; // tracks the playing Audio element for stop/cancel

/* Speak text aloud via OpenAI TTS — returns natural human-like speech */
async function speakText(text, voiceCfg, onEnd) {
  if (!text) return;
  stopSpeaking(); // cancel any current playback
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 4096), voice: voiceCfg?.ttsVoice || "nova" }),
    });
    if (!r.ok) { console.error("TTS error:", r.status); if (onEnd) onEnd(); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    _currentAudio = audio;
    audio.onended = () => { _currentAudio = null; URL.revokeObjectURL(url); if (onEnd) onEnd(); };
    audio.onerror = () => { _currentAudio = null; URL.revokeObjectURL(url); if (onEnd) onEnd(); };
    audio.play().catch(() => { if (onEnd) onEnd(); });
  } catch (e) { console.error("TTS failed:", e); if (onEnd) onEnd(); }
}

/* Stop any current speech playback */
function stopSpeaking() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.currentTime = 0;
    if (_currentAudio.src) try { URL.revokeObjectURL(_currentAudio.src); } catch {}
    const cb = _currentAudio.onended; // don't fire onEnd callback on manual stop
    _currentAudio.onended = null;
    _currentAudio.onerror = null;
    _currentAudio = null;
  }
}

/* Custom hook: record audio via MediaRecorder, transcribe via Whisper */
function useSpeechRecognition(lang, onResult) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const start = useCallback(() => {
    if (!HAS_MEDIA_RECORDER || listening || transcribing) return;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;
      chunksRef.current = [];

      // Prefer webm (Chrome/Edge/Firefox), fall back to mp4 (Safari)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
                     : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
                     : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
                     : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        // Release mic immediately
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];

        if (blob.size < 1000) {
          // Too short to transcribe — probably just a click
          setTranscribing(false);
          return;
        }

        setTranscribing(true);
        try {
          // Convert blob to base64
          const base64 = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result.split(",")[1]);
            reader.onerror = () => rej(new Error("Failed to read audio"));
            reader.readAsDataURL(blob);
          });

          const r = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, mimeType: recorder.mimeType || "audio/webm" }),
          });

          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error("Whisper error:", err);
            setTranscribing(false);
            return;
          }

          const { text } = await r.json();
          if (text && text.trim() && cbRef.current) {
            cbRef.current(text.trim(), true);
          }
        } catch (e) {
          console.error("Transcription failed:", e);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setListening(true);
    }).catch(e => {
      console.error("Mic access denied:", e);
      setListening(false);
    });
  }, [listening, transcribing]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    setListening(false);
    // Release mic if still held
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state === "recording") try { recorderRef.current.stop(); } catch {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  return { listening, transcribing, start, stop, supported: HAS_MEDIA_RECORDER };
}


/* ═══════════════════════════════════════════════════════════════════
   ERROR BOUNDARY — catches crashes, shows recovery button
   ═══════════════════════════════════════════════════════════════════ */

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", fontFamily: "'Source Sans 3', sans-serif" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u26a0\ufe0f"}</div>
          <h2 style={{ marginBottom: 12, fontFamily: "'Playfair Display', serif" }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: 20 }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


/* ═══════════════════════════════════════════════════════════════════
   SETUP — driven by subject registry. No API key screen needed
   (all keys are in Vercel environment variables).
   ═══════════════════════════════════════════════════════════════════ */

function Setup({ onDone }) {
  const [phase, setPhase] = useState("name"); // "name" | "checking" | "year" | "tier" | "subjects" | "boards"
  const [p, setP] = useState({ name: "", year: "", tier: "", examBoards: {}, subjects: [], tutorCharacters: {} });
  const [boardIdx, setBoardIdx] = useState(0);
  const upd = (f, v) => setP(x => ({ ...x, [f]: v }));
  const toggleSub = id => setP(x => ({ ...x, subjects: x.subjects.includes(id) ? x.subjects.filter(s => s !== id) : [...x.subjects, id] }));

  async function afterName() {
    const name = p.name.trim();
    if (!name) return;
    setPhase("checking");
    try {
      const settings = await sbLoadSettings(name);
      if (settings?.profile && settings.profile.year) {
        onDone({ ...settings.profile, name });
        return;
      }
    } catch {}
    setPhase("year");
  }

  const selectedSubs = p.subjects.map(id => SUBJECTS[id]).filter(Boolean);
  const boardSub = selectedSubs[boardIdx];

  function nextBoard() {
    if (boardIdx < selectedSubs.length - 1) setBoardIdx(i => i + 1);
    else onDone(p);
  }

  const wrap = children => (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", padding: "40px 36px" }}>
          {children}
        </div>
      </div>
    </div>
  );

  if (phase === "name" || phase === "checking") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>WELCOME</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>What's your name?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Your tutors will use this throughout your sessions</p>
    <input autoFocus value={p.name} onChange={e => upd("name", e.target.value)} onKeyDown={e => e.key === "Enter" && afterName()} placeholder="Enter your first name..." disabled={phase === "checking"}
      style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 18, outline: "none", marginBottom: 20 }} />
    <button className="hb" onClick={afterName} disabled={!p.name.trim() || phase === "checking"}
      style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.name.trim() && phase !== "checking" ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.name.trim() ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
      {phase === "checking" ? "Checking..." : "Continue \u2192"}
    </button>
  </>);

  if (phase === "year") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>SETUP</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Which year are you in?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Helps tutors prioritise the right content</p>
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{YEARS.map(y => <div key={y} className="so" onClick={() => upd("year", y)} style={{ flex: 1, padding: "14px", borderRadius: 10, border: `2px solid ${p.year === y ? "#f0c040" : "rgba(255,255,255,0.15)"}`, background: p.year === y ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: p.year === y ? "#f0c040" : "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: p.year === y ? 700 : 400, cursor: "pointer", textAlign: "center" }}>{y}</div>)}</div>
    <button className="hb" onClick={() => setPhase("tier")} disabled={!p.year} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.year ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.year ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Continue {"\u2192"}</button>
  </>);

  if (phase === "tier") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>SETUP</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Foundation or Higher?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Applies to Maths & Science</p>
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{TIERS.map(t => <div key={t} className="so" onClick={() => upd("tier", t)} style={{ flex: 1, padding: "14px", borderRadius: 10, border: `2px solid ${p.tier === t ? "#f0c040" : "rgba(255,255,255,0.15)"}`, background: p.tier === t ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: p.tier === t ? "#f0c040" : "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: p.tier === t ? 700 : 400, cursor: "pointer", textAlign: "center" }}>{t}</div>)}</div>
    <button className="hb" onClick={() => setPhase("subjects")} disabled={!p.tier} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.tier ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.tier ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Continue {"\u2192"}</button>
  </>);

  if (phase === "subjects") return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>CHOOSE YOUR SUBJECTS</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Which GCSEs are you taking?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>Pick as many as you like. You can change these later in Settings.</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20, maxHeight: 360, overflowY: "auto" }}>
      {ALL_SUBJECT_LIST.map(s => {
        const on = p.subjects.includes(s.id);
        return <div key={s.id} className="so" onClick={() => toggleSub(s.id)} style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${on ? "#f0c040" : "rgba(255,255,255,0.12)"}`, background: on ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all .15s" }}>
          <span style={{ fontSize: 22 }}>{s.emoji}</span>
          <div><div style={{ color: on ? "#f0c040" : "rgba(255,255,255,0.8)", fontWeight: on ? 700 : 400, fontSize: 13 }}>{s.label}</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{s.tutor.name}</div></div>
          {on && <span style={{ marginLeft: "auto", color: "#f0c040", fontWeight: 700, fontSize: 16 }}>{"\u2713"}</span>}
        </div>;
      })}
    </div>
    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{p.subjects.length} subject{p.subjects.length !== 1 ? "s" : ""} selected</div>
    <button className="hb" onClick={() => { if (p.subjects.length) { setBoardIdx(0); setPhase("boards"); } }} disabled={!p.subjects.length}
      style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: p.subjects.length ? "#f0c040" : "rgba(255,255,255,0.1)", color: p.subjects.length ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
      Continue {"\u2192"}
    </button>
  </>);

  if (phase === "boards" && boardSub) return wrap(<>
    <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>EXAM BOARDS {"\u00b7"} {boardIdx + 1}/{selectedSubs.length} {"\u00b7"} optional</div>
    <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>{boardSub.emoji} {boardSub.label} exam board?</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>Skip if unsure {"\u2014"} your tutor will cover all boards.</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
      {BOARDS.map(b => {
        const on = p.examBoards[boardSub.id] === b;
        return <div key={b} className="so" onClick={() => setP(x => ({ ...x, examBoards: { ...x.examBoards, [boardSub.id]: on ? "" : b } }))} style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${on ? "#f0c040" : "rgba(255,255,255,0.15)"}`, background: on ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: on ? "#f0c040" : "rgba(255,255,255,0.8)", fontWeight: on ? 700 : 400, cursor: "pointer", textAlign: "center", fontSize: 14 }}>{b}</div>;
      })}
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <button className="hb" onClick={nextBoard} style={{ flex: 1, padding: 14, borderRadius: 10, border: "2px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontWeight: 700, cursor: "pointer" }}>Skip</button>
      <button className="hb" onClick={nextBoard} style={{ flex: 2, padding: 14, borderRadius: 10, border: "none", background: "#f0c040", color: "#1a1a2e", fontWeight: 700, cursor: "pointer" }}>
        {boardIdx === selectedSubs.length - 1 ? "Meet Your Tutors \u2192" : "Next \u2192"}
      </button>
    </div>
  </>);

  return null;
}


/* ═══════════════════════════════════════════════════════════════════
   MODALS — Materials, Memory, Dashboard, Supabase, Summary
   ═══════════════════════════════════════════════════════════════════ */

function MaterialsPanel({ subject, mats, onAdd, onRemove, onClose }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [err, setErr] = useState(null);
  const [drag, setDrag] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ background: subject.gradient, borderRadius: "24px 24px 0 0", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: "0.1em" }}>{subject.emoji} {subject.label.toUpperCase()}</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>Teacher Materials</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>{"\u2715"} Close</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div onClick={() => cameraRef.current?.click()}
              style={{ flex: 1, border: "2px solid " + subject.color, borderRadius: 14, padding: "20px 12px", textAlign: "center", cursor: "pointer", background: subject.color + "08", transition: "all .2s" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{"\ud83d\udcf7"}</div>
              <div style={{ fontWeight: 700, color: subject.color, fontSize: 14 }}>Take Photo</div>
              <div style={{ color: "#999", fontSize: 11, marginTop: 2 }}>Snap a worksheet or notes</div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => processFiles(e.target.files, onAdd, setErr)} />
            </div>
            <div onClick={() => fileRef.current?.click()}
              style={{ flex: 1, border: "2px dashed #ddd", borderRadius: 14, padding: "20px 12px", textAlign: "center", cursor: "pointer", background: "#fafafa", transition: "all .2s" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{"\ud83d\udcce"}</div>
              <div style={{ fontWeight: 700, color: "#333", fontSize: 14 }}>Upload File</div>
              <div style={{ color: "#999", fontSize: 11, marginTop: 2 }}>PDFs, photos, text files</div>
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => processFiles(e.target.files, onAdd, setErr)} />
            </div>
          </div>
          {err && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{"\u26a0\ufe0f"} {err}</div>}
          {mats.length === 0 ? <div style={{ textAlign: "center", color: "#bbb", fontSize: 14, padding: 20 }}>No materials yet. Upload files and your tutor will use them automatically.</div> :
            <>{mats.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #f0f0f0", marginBottom: 6, background: "#fafafa" }}>
                {m.preview ? <img src={m.preview} alt={m.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: subject.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{m.isPdf ? "\ud83d\udcc4" : "\ud83d\udcdd"}</div>}
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div><div style={{ fontSize: 11, color: "#aaa" }}>{m.type.toUpperCase()} {"\u00b7"} {m.uploadedAt} {"\u00b7"} {(m.size / 1024).toFixed(0)}KB</div></div>
                <button onClick={() => onRemove(m.id)} style={{ background: "none", border: "1px solid #eee", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "#999", fontSize: 11 }}>Remove</button>
              </div>
            ))}</>
          }
        </div>
      </div>
    </div>
  );
}

function MemoryManager({ memory, profile, onClearSubject, onClearAll, onClose, onImport }) {
  const fileRef = useRef(null);
  const totalSessions = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  function download() {
    const data = exportData(memory, profile);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gcse-tutor-backup-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
  }
  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const text = await file.text(); const { profile: p, memory: m } = importData(text); if (window.confirm("Replace all current data with this backup?")) onImport(p, m); }
    catch (err) { alert("Import failed: " + err.message); }
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#302b63)", borderRadius: "24px 24px 0 0", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.1em" }}>MEMORY MANAGER</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{profile?.name}'s Memory</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>{"\u2715"} Close</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          <div style={{ padding: "14px 16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#0369a1", fontWeight: 700, marginBottom: 4 }}>{"\ud83d\udcbe"} {totalSessions} session{totalSessions !== 1 ? "s" : ""} stored</div>
            <div style={{ fontSize: 12, color: "#0284c7", lineHeight: 1.6 }}>Memory persists in your browser. Export a backup regularly to be safe.</div>
          </div>
          {ALL_SUBJECT_LIST.map(t => {
            const sums = getSessions(memory, t.id);
            return (
              <div key={t.id} style={{ marginBottom: 12, borderRadius: 14, border: "1px solid #f0f0f0", overflow: "hidden" }}>
                <div style={{ background: t.gradient, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{t.emoji} {t.label} {"\u2014"} {sums.length} session{sums.length !== 1 ? "s" : ""}</div>
                  {sums.length > 0 && <button onClick={() => { if (window.confirm("Clear all " + t.label + " memory?")) onClearSubject(t.id); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Clear</button>}
                </div>
                {sums.length > 0 ? <div style={{ padding: "10px 14px", background: "#fafafa" }}>{sums.slice(-3).map((s, i) => <div key={i} style={{ fontSize: 12, color: "#666", padding: "6px 0", borderBottom: i < Math.min(sums.length, 3) - 1 ? "1px solid #f0f0f0" : "none" }}><strong>{s.date}</strong> {"\u2014"} {(s.rawSummaryText || "").slice(0, 80)}</div>)}{sums.length > 3 && <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>+ {sums.length - 3} earlier</div>}</div> : <div style={{ padding: "12px 14px", color: "#bbb", fontSize: 13 }}>No sessions yet</div>}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={download} style={{ flex: 1, padding: 11, borderRadius: 10, border: "2px solid #1a3a7a", background: "transparent", color: "#1a3a7a", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\udce5"} Export Backup</button>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: 11, borderRadius: 10, border: "2px solid #059669", background: "transparent", color: "#059669", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\udce4"} Import Backup</button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
          </div>
          <button onClick={() => { if (window.confirm("Clear ALL memory for all subjects? This cannot be undone.")) onClearAll(); }} style={{ width: "100%", marginTop: 8, padding: 11, borderRadius: 10, border: "2px solid #dc2626", background: "transparent", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\uddd1\ufe0f"} Clear All Memory</button>
        </div>
      </div>
    </div>
  );
}

function SummaryModal({ subject, sessionData, onClose }) {
  const text = sessionData?.rawSummaryText || "(No summary)";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 580, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ background: subject.gradient, borderRadius: "20px 20px 0 0", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>SAVED TO MEMORY</div><div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{"\ud83d\udccb"} Session Summary {"\u2014"} {subject.label}</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
          {sessionData?.confidenceScores && Object.keys(sessionData.confidenceScores).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Confidence by topic:</div>
              {Object.entries(sessionData.confidenceScores).map(([topic, pct]) => (
                <div key={topic} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: "#666", width: 100 }}>{topic}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#eee" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 4, background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444", transition: "width .5s" }} /></div>
                  <div style={{ fontSize: 12, fontWeight: 700, width: 32 }}>{pct}%</div>
                </div>
              ))}
            </div>
          )}
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, lineHeight: 1.7, color: "#333" }}>{text}</pre>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
          <button onClick={() => navigator.clipboard.writeText(text)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + subject.color, background: "transparent", color: subject.color, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\ud83d\udccb"} Copy</button>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: subject.color, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{"\u2713"} Done</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ memory, mats, profile, onClose }) {
  const subs = mySubjects(profile);
  const allSums = Object.entries(memory.subjects || {}).flatMap(([id, sums]) => (sums || []).map(s => ({ ...s, tutor: ALL_SUBJECT_LIST.find(t => t.id === id) || { emoji: "", label: id, gradient: "#999", color: "#999" } }))).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 760, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "22px 26px", background: "linear-gradient(135deg,#1a1a2e,#302b63)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 2 }}>PARENT DASHBOARD</div>
            <div style={{ color: "#fff", fontSize: 20, fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{profile.name}'s Progress</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>{profile.year} {"\u00b7"} {profile.tier} {"\u00b7"} {allSums.length} sessions</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>{"\u2715"} Close</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
            {subs.map(t => {
              const sums = getSessions(memory, t.id), ls = sums[sums.length - 1], mc = (mats[t.id] || []).length;
              return (
                <div key={t.id} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #eee" }}>
                  <div style={{ background: t.gradient, padding: "14px 16px", color: "#fff" }}><div style={{ fontSize: 26 }}>{t.emoji}</div><div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{t.tutor.name}</div><div style={{ opacity: .65, fontSize: 12 }}>{t.label}</div></div>
                  <div style={{ padding: "12px 16px", background: "#fafafa" }}>
                    <div style={{ fontSize: 12, color: t.color, fontWeight: 700, marginBottom: 4 }}>{sums.length === 0 ? "No sessions yet" : sums.length + " session" + (sums.length > 1 ? "s" : "") + " in memory"}</div>
                    {ls && <div style={{ fontSize: 11, color: "#777", marginBottom: 4 }}>Last: {ls.date}</div>}
                    {mc > 0 && <div style={{ fontSize: 11, color: "#888" }}>{"\ud83d\udcce"} {mc} material{mc > 1 ? "s" : ""}</div>}
                    {ls?.confidenceScores && Object.keys(ls.confidenceScores).length > 0 && <div style={{ marginTop: 6 }}>{Object.entries(ls.confidenceScores).slice(0, 4).map(([topic, pct]) => <div key={topic} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}><div style={{ fontSize: 10, color: "#888", width: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic}</div><div style={{ flex: 1, height: 6, borderRadius: 3, background: "#eee" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444" }} /></div><div style={{ fontSize: 10, fontWeight: 700, color: "#666", width: 28 }}>{pct}%</div></div>)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#1a1a2e", marginBottom: 14, fontWeight: 700 }}>All Session Summaries</div>
          {allSums.length === 0 ? <div style={{ textAlign: "center", padding: 28, background: "#f8f8f8", borderRadius: 14, color: "#aaa", fontSize: 14 }}>No summaries yet.</div> :
            allSums.map((s, i) => <div key={i} style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid " + (s.tutor.color || "#999") + "33" }}><div style={{ background: s.tutor.gradient, padding: "9px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><span>{s.tutor.emoji}</span><span style={{ fontWeight: 700, fontSize: 13 }}>{s.tutor.label}</span><span style={{ marginLeft: "auto", opacity: .7, fontSize: 11 }}>{s.date}</span></div><div style={{ padding: "10px 14px", whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6, color: "#444", background: "#fafafa" }}>{s.rawSummaryText || "(No summary)"}</div></div>)
          }
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   SETTINGS MODAL — edit profile, per-subject exam boards & tutor character
   ═══════════════════════════════════════════════════════════════════ */

function SettingsModal({ profile, onSave, onClose }) {
  const [p, setP] = useState({ ...profile, examBoards: { ...profile.examBoards }, tutorCharacters: { ...profile.tutorCharacters }, subjects: [...(profile.subjects || [])] });
  const [tab, setTab] = useState("profile");
  const upd = (field, val) => setP(x => ({ ...x, [field]: val }));
  const updBoard = (sid, val) => setP(x => ({ ...x, examBoards: { ...x.examBoards, [sid]: val } }));
  const updChar = (sid, val) => setP(x => ({ ...x, tutorCharacters: { ...x.tutorCharacters, [sid]: val } }));
  const toggleSub = id => setP(x => ({ ...x, subjects: x.subjects.includes(id) ? x.subjects.filter(s => s !== id) : [...x.subjects, id] }));
  function save() { onSave(p); }
  const mySubs = p.subjects.map(id => SUBJECTS[id]).filter(Boolean);
  const tabs = [{ id: "profile", label: "Profile", emoji: "\ud83d\udc64" }, { id: "subjects", label: "Subjects", emoji: "\ud83d\udcda" }, ...mySubs.map(s => ({ id: s.id, label: s.label, emoji: s.emoji }))];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 600, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "18px 22px", background: "linear-gradient(135deg,#1a1a2e,#302b63)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>SETTINGS</div><div style={{ color: "#fff", fontSize: 20, fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{"\u2699\ufe0f"} Configure Your Tutors</div></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ background: "#f0c040", border: "none", color: "#1a1a2e", borderRadius: 10, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{"\u2713"} Save</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>{"\u2715"}</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "10px 22px 0", overflowX: "auto", borderBottom: "1px solid #eee" }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 12px", borderRadius: "10px 10px 0 0", border: "none", background: tab === t.id ? "#f5f4f0" : "transparent", color: tab === t.id ? "#1a1a2e" : "#999", fontWeight: tab === t.id ? 700 : 400, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>{t.emoji} {t.label}</button>)}
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 22 }}>
          {tab === "profile" && (<div>
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Name</div><input value={p.name || ""} onChange={e => upd("name", e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 14, outline: "none" }} /></div>
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Year</div><div style={{ display: "flex", gap: 8 }}>{YEARS.map(y => <button key={y} onClick={() => upd("year", y)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (p.year === y ? "#f0c040" : "#e0e0e0"), background: p.year === y ? "#fef9e7" : "#fff", color: "#333", fontWeight: p.year === y ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{y}</button>)}</div></div>
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Tier</div><div style={{ display: "flex", gap: 8 }}>{TIERS.map(t => <button key={t} onClick={() => upd("tier", t)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (p.tier === t ? "#f0c040" : "#e0e0e0"), background: p.tier === t ? "#fef9e7" : "#fff", color: "#333", fontWeight: p.tier === t ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{t}</button>)}</div></div>
          </div>)}
          {tab === "subjects" && (<div>
            <div style={{ fontSize: 12, color: "#777", marginBottom: 14 }}>Tap to add or remove subjects. Changes take effect when you save.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ALL_SUBJECT_LIST.map(s => {
                const on = p.subjects.includes(s.id);
                return <div key={s.id} onClick={() => toggleSub(s.id)} style={{ padding: "10px 12px", borderRadius: 10, border: "2px solid " + (on ? s.color : "#e0e0e0"), background: on ? s.color + "12" : "#fafafa", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .15s" }}>
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                  <div><div style={{ color: on ? s.color : "#666", fontWeight: on ? 700 : 400, fontSize: 12 }}>{s.label}</div><div style={{ color: "#aaa", fontSize: 10 }}>{s.tutor.name}</div></div>
                  {on && <span style={{ marginLeft: "auto", color: s.color, fontWeight: 700 }}>{"\u2713"}</span>}
                </div>;
              })}
            </div>
          </div>)}
          {tab !== "profile" && tab !== "subjects" && (() => {
            const sub = SUBJECTS[tab]; if (!sub) return null;
            const board = p.examBoards?.[tab] || "";
            const char = p.tutorCharacters?.[tab] || "";
            return (<div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>{sub.emoji} {sub.label} Exam Board</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>{BOARDS.map(b => <button key={b} onClick={() => updBoard(tab, board === b ? "" : b)} style={{ padding: 10, borderRadius: 10, border: "2px solid " + (board === b ? sub.color : "#e0e0e0"), background: board === b ? sub.color + "15" : "#fff", color: board === b ? sub.color : "#666", fontWeight: board === b ? 700 : 400, cursor: "pointer", fontSize: 12 }}>{b}</button>)}</div>
                {board && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Tap again to deselect</div>}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>{sub.tutor.name}&rsquo;s Character</div>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>Describe how this tutor should sound and behave. This shapes their personality in every conversation.</div>
                <textarea value={char} onChange={e => updChar(tab, e.target.value)} rows={4} placeholder={"e.g. Warm and encouraging, uses humour, gives real-world examples, speaks slowly for tricky topics, always asks follow-up questions..."} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical" }} />
              </div>
            </div>);
          })()}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */

migrateIfNeeded();

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [memory, setMemory] = useState(loadMemory);
  const [sessions, setSessions] = useState({});
  const [mats, setMats] = useState(emptyMats);
  const [active, setActiveRaw] = useState(null);
  const [modal, setModal] = useState(null); // "mats"|"memory"|"dash"|"settings"|null
  const [showSum, setShowSum] = useState(null);
  const [examMode, setExamMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [autoSumming, setAutoSumming] = useState(false);
  const [sbSynced, setSbSynced] = useState(false);
  const [dbConnected, setDbConnected] = useState(false); // tracks if Supabase is configured
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const subject = active ? SUBJECTS[active] : null;
  const sess = active ? (sessions[active] || {}) : {};
  const msgs = sess.messages || [];
  const curMats = active ? (mats[active] || []) : [];
  const curMem = active ? getSessions(memory, active) : [];
  const totalMem = Object.values(memory.subjects || {}).reduce((a, s) => a + (s?.length || 0), 0);
  const voiceCfg = subject?.voice?.enabled ? subject.voice : null;

  // Voice state
  const [voiceMode, setVoiceMode] = useState(false);
  const [convoMode, setConvoMode] = useState(false); // continuous conversation loop
  const [speaking, setSpeaking] = useState(false);
  const prevMsgCountRef = useRef(0);
  const sendRef = useRef(null); // avoids stale closure in speech callback
  const convoRef = useRef(false); // tracks convoMode without stale closure
  convoRef.current = convoMode;

  // Speech recognition hook — records audio, transcribes via Whisper
  const { listening, transcribing, start: startMic, stop: stopMic, supported: micSupported } = useSpeechRecognition(
    voiceCfg?.lang || "es-ES",
    useCallback((text, isFinal) => {
      if (text.trim()) {
        setInput(text.trim());
        // Auto-send after Whisper returns transcript
        const t = text.trim();
        setTimeout(() => { setInput(""); if (sendRef.current) sendRef.current(t); }, 400);
      }
    }, [])
  );

  const startMicRef = useRef(startMic);
  startMicRef.current = startMic;

  // Auto-speak new assistant messages when voice mode is on
  useEffect(() => {
    if (!voiceMode || !voiceCfg || !msgs.length) return;
    if (msgs.length > prevMsgCountRef.current) {
      const last = msgs[msgs.length - 1];
      if (last.role === "assistant" && !last.content.startsWith("\u274c")) {
        setSpeaking(true);
        speakText(last.content, voiceCfg, () => {
          setSpeaking(false);
          // In conversation mode, auto-start recording after tutor finishes speaking
          if (convoRef.current) setTimeout(() => startMicRef.current(), 300);
        });
      }
    }
    prevMsgCountRef.current = msgs.length;
  }, [msgs.length, voiceMode, voiceCfg]);

  // Stop speaking when leaving a subject
  useEffect(() => { if (!active) { stopSpeaking(); setSpeaking(false); } }, [active]);

  // Turn off voice/convo mode when switching to a non-voice subject
  useEffect(() => { if (!voiceCfg) { setVoiceMode(false); setConvoMode(false); } }, [voiceCfg]);

  // Persist memory
  useEffect(() => { saveMemory(memory); }, [memory]);

  // Save profile to both localStorage and Supabase
  function updateProfile(p) {
    saveProfile(p);
    setProfile(p);
    if (p.name) sbSaveSetting(p.name, "profile", p);
    setModal(null);
  }

  // Switch to a different user
  function switchUser() {
    if (active && msgs.length >= 6) autoSave(active, msgs, curMats);
    stopSpeaking();
    setActiveRaw(null);
    setSessions({});
    setSbSynced(false);
    setDbConnected(false);
    setProfile(null);
    saveProfile(null);
  }

  // Supabase sync — load memory + profile settings from cloud
  useEffect(() => {
    if (profile && !sbSynced) {
      setSbSynced(true);
      // Load memory
      sbLoad(profile.name).then(cloud => {
        if (cloud) { setMemory(prev => mergeMemory(prev, cloud)); setDbConnected(true); }
      }).catch(() => {});
      // Load profile settings (cloud overrides local if exists)
      sbLoadSettings(profile.name).then(settings => {
        if (settings?.profile) {
          const cloud = settings.profile;
          setProfile(prev => {
            const merged = { ...prev, ...cloud, examBoards: { ...prev.examBoards, ...cloud.examBoards }, tutorCharacters: { ...prev.tutorCharacters, ...cloud.tutorCharacters } };
            saveProfile(merged);
            return merged;
          });
          setDbConnected(true);
        }
      }).catch(() => {});
    }
  }, [profile, sbSynced]);

  // Initialise session with welcome message
  function setActive(newId) {
    if (active && msgs.length >= 6 && !autoSumming) autoSave(active, msgs, curMats);
    setActiveRaw(newId);
    setExamMode(false);
    if (newId && !sessions[newId] && profile) {
      const sub = SUBJECTS[newId];
      const board = profile.examBoards?.[newId];
      const memCount = getSessions(memory, newId).length;
      setSessions(prev => ({ ...prev, [newId]: { messages: [{ role: "assistant", content: sub.welcomeMessage(profile, board, memCount) }] } }));
    }
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, loading]);
  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);

  // Send message — direct to Anthropic API
  async function send(override) {
    const text = override || input.trim();
    if (!text || loading || !active || !profile) return;
    const userMsg = { role: "user", content: text };
    const updated = [...msgs, userMsg];
    setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: updated } }));
    if (!override) setInput("");
    setLoading(true);
    const sys = buildSystemPrompt(active, profile, curMem, curMats, examMode, profile.tutorCharacters?.[active]);
    const voiceNote = convoMode ? "REAL-TIME CONVERSATION MODE: You and the student are in a live spoken conversation. Keep responses very short (1-2 sentences), natural and conversational. ALWAYS end with a question or prompt to keep the dialogue flowing. Use increasingly more Spanish as the student improves. Be encouraging and energetic.\n\n" : voiceMode ? "VOICE MODE ACTIVE: Student is speaking aloud (speech-to-text). Keep responses conversational, shorter (2-3 sentences), and end with a question to keep the conversation flowing. Use more Spanish than usual. If the student's Spanish has speech-recognition errors, interpret charitably.\n\n" : "";
    const textMats = curMats.filter(m => m.isText);
    const fullSys = voiceNote + (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys;
    const apiMsgs = buildApiMsgs(curMats, updated.map(m => ({ role: m.role, content: m.content })));
    try {
      const reply = await apiSend(fullSys, apiMsgs);
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: reply }] } }));
    } catch (e) {
      setSessions(prev => ({ ...prev, [active]: { ...prev[active], messages: [...updated, { role: "assistant", content: "\u274c " + e.message }] } }));
    } finally { setLoading(false); }
  }
  sendRef.current = send; // keep ref fresh for speech callback

  // Generate and save structured summary
  async function genSummary() {
    if (msgs.length < 3 || sumLoading) return;
    setSumLoading(true);
    try {
      const sys = buildSystemPrompt(active, profile, curMem, curMats, false, profile.tutorCharacters?.[active]);
      const data = await apiSummary(sys, msgs);
      setMemory(prev => addSessionToMem(prev, active, data));
      if (profile) sbSave(profile.name, active, data.date, JSON.stringify(data));
      setShowSum(data);
    } catch (e) { console.error("Summary failed:", e); } finally { setSumLoading(false); }
  }

  // Auto-save on subject switch
  async function autoSave(sid, chatMsgs, sidMats) {
    if (chatMsgs.length < 6 || autoSumming) return;
    setAutoSumming(true);
    try {
      const sys = buildSystemPrompt(sid, profile, getSessions(memory, sid), sidMats, false, profile.tutorCharacters?.[sid]);
      const data = await apiSummary(sys, chatMsgs);
      setMemory(prev => addSessionToMem(prev, sid, data));
      if (profile) sbSave(profile.name, sid, data.date, JSON.stringify(data));
    } catch {} finally { setAutoSumming(false); }
  }

  const basePrompts = active && SUBJECTS[active] ? SUBJECTS[active].quickPrompts(examMode, curMats.length > 0) : [];
  const quickPrompts = convoMode ? ["Habl\u00e9mos en espa\u00f1ol", "\u00bfPodemos practicar conversaci\u00f3n?", "Correct my pronunciation"] : voiceMode ? ["Habl\u00e9mos en espa\u00f1ol", "Correct my pronunciation", ...basePrompts] : basePrompts;

  if (!profile) return <Setup onDone={updateProfile} />;

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: active && subject ? subject.bg : "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif", transition: "background .4s" }}>
        <style>{GLOBAL_CSS}</style>

        {/* Modals — only one at a time */}
        {modal === "mats" && active && <MaterialsPanel subject={subject} mats={curMats} onAdd={f => setMats(prev => ({ ...prev, [active]: [...prev[active], ...f] }))} onRemove={id => setMats(prev => ({ ...prev, [active]: prev[active].filter(m => m.id !== id) }))} onClose={() => setModal(null)} />}
        {modal === "memory" && <MemoryManager memory={memory} profile={profile} onClearSubject={sid => setMemory(prev => clearSubjectMem(prev, sid))} onClearAll={() => setMemory(clearAllMem())} onClose={() => setModal(null)} onImport={(p, m) => { saveProfile(p); setProfile(p); setMemory(m); setModal(null); }} />}
        {modal === "dash" && <Dashboard memory={memory} mats={mats} profile={profile} onClose={() => setModal(null)} />}
        {modal === "settings" && <SettingsModal profile={profile} onSave={updateProfile} onClose={() => setModal(null)} />}
        {showSum && subject && <SummaryModal subject={subject} sessionData={showSum} onClose={() => setShowSum(null)} />}

        {/* Header */}
        <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100 }}>
          {active && <button onClick={() => setActive(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#666", padding: "4px 8px", borderRadius: 8 }} aria-label="Back">{"\u2190"}</button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>{profile.name} {"\u00b7"} {profile.year} {"\u00b7"} {profile.tier}{autoSumming ? " \u00b7 saving memory..." : ""}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>{active ? subject.emoji + " " + subject.tutor.name : "Your Tutor Hub"}</div>
          </div>
          {active && (
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setModal("mats")} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: curMats.length ? subject.color : "rgba(0,0,0,0.07)", color: curMats.length ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcce"} {curMats.length ? curMats.length + " File" + (curMats.length > 1 ? "s" : "") : "Materials"}</button>
              <button className="btn" onClick={() => setExamMode(e => !e)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: examMode ? subject.color : "rgba(0,0,0,0.07)", color: examMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcdd"} {examMode ? "Exam ON" : "Exam"}</button>
              {voiceCfg && <button className="btn" onClick={() => { setVoiceMode(v => { if (v) { stopSpeaking(); setConvoMode(false); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: voiceMode ? "#dc2626" : "rgba(0,0,0,0.07)", color: voiceMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{voiceMode ? "\ud83d\udd0a Voice ON" : "\ud83c\udf99\ufe0f Voice"}</button>}
              {voiceMode && voiceCfg && micSupported && <button className="btn" onClick={() => { setConvoMode(v => { if (!v) { stopSpeaking(); setTimeout(() => startMicRef.current(), 200); } else { stopMic(); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: convoMode ? "#059669" : "rgba(0,0,0,0.07)", color: convoMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700, animation: convoMode ? "mp 2s ease infinite" : "none" }}>{convoMode ? "\ud83d\udd04 Conversation" : "\ud83d\udde3\ufe0f Converse"}</button>}
              <button className="btn" onClick={genSummary} disabled={sumLoading || msgs.length < 3} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: msgs.length >= 3 ? subject.color : "rgba(0,0,0,0.07)", color: msgs.length >= 3 ? "#fff" : "#aaa", fontSize: 11, fontWeight: 700, opacity: sumLoading ? .6 : 1 }}>{sumLoading ? "Saving..." : "\ud83d\udccb Summary"}</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 5 }}>
            {dbConnected && <div style={{ padding: "6px 10px", borderRadius: 20, background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>{"\u2601\ufe0f"} Synced</div>}
            <button className="btn" onClick={() => setModal("settings")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\u2699\ufe0f"}</button>
            <button className="btn" onClick={() => setModal("memory")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83e\udde0"}{totalMem > 0 ? " " + totalMem : ""}</button>
            <button className="btn" onClick={() => setModal("dash")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc68\u200d\ud83d\udc67"}</button>
            <button className="btn" onClick={switchUser} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc64"}</button>
          </div>
        </div>

        {/* Home or Chat */}
        {!active ? (
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "44px 22px" }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 8 }}>Hello, {profile.name}.<br /><span style={{ color: "#888", fontWeight: 400 }}>Who's tutoring you today?</span></h1>
            <p style={{ color: "#999", fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>{totalMem > 0 ? "\ud83e\udde0 " + totalMem + " session" + (totalMem > 1 ? "s" : "") + " in memory \u2014 your tutors remember your progress." : "Your tutors adapt to you and remember your progress after each session."}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
              {mySubjects(profile).map((t, i) => {
                const sc = getSessions(memory, t.id).length, mc = (mats[t.id] || []).length, bd = profile.examBoards?.[t.id];
                return (
                  <div key={t.id} className="card" onClick={() => setActive(t.id)} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", animation: `ci .4s ease ${i * .08}s both` }}>
                    <div style={{ background: t.gradient, padding: "20px 18px 16px" }}><div style={{ fontSize: 32, marginBottom: 6 }}>{t.emoji}</div><div style={{ fontFamily: "'Playfair Display',serif", color: "#fff", fontSize: 17, fontWeight: 700 }}>{t.tutor.name}</div><div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{t.label}</div></div>
                    <div style={{ background: "#fff", padding: "10px 18px" }}>
                      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{t.description}{bd ? " \u00b7 " + bd : ""}</div>
                      <div style={{ fontSize: 12, color: t.color, fontWeight: 700 }}>{sc === 0 ? "No sessions yet" : "\ud83e\udde0 " + sc + " session" + (sc > 1 ? "s" : "") + " remembered"}</div>
                      {mc > 0 && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{"\ud83d\udcce"} {mc} material{mc > 1 ? "s" : ""} ready</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #eee" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", marginBottom: 10 }}>{"\ud83d\udca1"} Tips</div>
              {[["Memory is automatic", "Summaries save after each session and inject into the next."], ["Upload materials", "Tap \ud83d\udcce to upload worksheets \u2014 tutor uses them directly."], ["Test prep", "Upload notes then ask 'Prepare me for my test'."], ["Export backup", "Tap \ud83e\udde0 Memory \u2192 Export to save progress."]].map(([t, d]) => <div key={t} style={{ display: "flex", gap: 10, marginBottom: 8 }}><div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 12, minWidth: 150 }}>{t}</div><div style={{ color: "#888", fontSize: 12 }}>{d}</div></div>)}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 61px)" }}>
            {examMode && <div style={{ background: subject.color, color: "#fff", textAlign: "center", padding: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{"\ud83d\udcdd"} EXAM PRACTICE {"\u2014"} Attempt the question first. Tutor will mark it properly.</div>}
            {convoMode && <div style={{ background: "#059669", color: "#fff", textAlign: "center", padding: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{"\ud83d\udde3\ufe0f"} CONVERSATION MODE {"\u2014"} Speak naturally. {subject.tutor.name} will listen, respond, and keep the conversation going.</div>}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                {msgs.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10, animation: "mi .25s ease" }}>
                    <div style={{ maxWidth: "78%", position: "relative" }}>
                      <div style={{ padding: "11px 15px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? subject.color : "#fff", color: m.role === "user" ? "#fff" : "#1a1a2e", fontSize: 14, lineHeight: 1.65, boxShadow: m.role === "user" ? `0 4px 14px ${subject.color}40` : "0 2px 10px rgba(0,0,0,0.07)", border: m.role === "user" ? "none" : "1px solid rgba(0,0,0,0.07)", whiteSpace: "pre-wrap" }}>{m.content}</div>
                      {voiceCfg && m.role === "assistant" && !m.content.startsWith("\u274c") && (
                        <button onClick={() => { if (speaking) stopSpeaking(); else { setSpeaking(true); speakText(m.content, voiceCfg, () => setSpeaking(false)); } }}
                          style={{ position: "absolute", bottom: -4, right: -4, width: 26, height: 26, borderRadius: "50%", border: "1px solid #eee", background: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
                          title="Listen to this message">{"\ud83d\udd0a"}</button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && <div style={{ display: "flex" }}><div style={{ background: "#fff", borderRadius: 18, padding: "10px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}><div style={{ display: "flex", gap: 5 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: subject.color, animation: `db 1.2s ease ${i * .2}s infinite` }} />)}</div></div></div>}
                <div ref={bottomRef} />
              </div>
            </div>
            <div style={{ padding: "0 22px 5px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {quickPrompts.filter((v, i, a) => a.indexOf(v) === i).map(q => <button key={q} onClick={() => send(q)} style={{ padding: "5px 11px", borderRadius: 20, border: "1.5px solid " + subject.color, background: "transparent", color: subject.color, cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", transition: "all .15s" }}>{q}</button>)}
              </div>
            </div>
            <div style={{ padding: "5px 22px 16px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
              {(listening || transcribing) && <div style={{ maxWidth: 680, margin: "0 auto 6px", padding: "8px 14px", borderRadius: 10, background: transcribing ? "#eff6ff" : "#fef2f2", border: "1px solid " + (transcribing ? "#bfdbfe" : "#fecaca"), fontSize: 12, color: transcribing ? "#1d4ed8" : "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: transcribing ? "#1d4ed8" : "#dc2626", animation: "mp 1.2s ease infinite" }} />{transcribing ? "Transcribing your speech..." : "Recording... tap \ud83c\udf99\ufe0f again when done"}</div>}
              <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={listening ? "Recording..." : transcribing ? "Transcribing..." : examMode ? "Paste your question or attempt here..." : voiceCfg ? "Type or tap \ud83c\udf99\ufe0f to speak..." : "Message " + subject.tutor.name + "..."} rows={1}
                  style={{ flex: 1, padding: "12px 15px", borderRadius: 14, border: `2px solid ${listening ? "#dc2626" : transcribing ? "#1d4ed8" : input ? subject.color : "#e0e0e0"}`, resize: "none", fontSize: 14, lineHeight: 1.5, background: "#fff", maxHeight: 120, overflow: "auto", transition: "border-color .2s", outline: "none" }}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
                {voiceCfg && micSupported && (
                  <button onClick={() => { if (listening) stopMic(); else if (!transcribing) { stopSpeaking(); startMic(); } }} disabled={transcribing}
                    style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: listening ? "#dc2626" : transcribing ? "#93c5fd" : "#fef2f2", color: listening ? "#fff" : transcribing ? "#fff" : "#dc2626", fontSize: 18, cursor: transcribing ? "default" : "pointer", transition: "all .2s", animation: listening ? "mp 1.2s ease infinite" : "none", opacity: transcribing ? 0.6 : 1 }}
                    title={listening ? "Stop recording" : transcribing ? "Transcribing..." : "Speak"}>{listening ? "\u23f9" : "\ud83c\udf99\ufe0f"}</button>
                )}
                <button onClick={() => send()} disabled={!input.trim() || loading}
                  style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: input.trim() && !loading ? subject.color : "#e8e8e8", color: input.trim() && !loading ? "#fff" : "#bbb", fontSize: 17, cursor: input.trim() && !loading ? "pointer" : "default", transition: "all .2s" }}>{"\u2191"}</button>
              </div>
              <div style={{ maxWidth: 680, margin: "4px auto 0", fontSize: 10, color: "#bbb", paddingLeft: 2 }}>Enter to send {"\u00b7"} Shift+Enter new line{voiceCfg && micSupported ? " \u00b7 \ud83c\udf99\ufe0f Tap mic to speak" : ""}</div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
