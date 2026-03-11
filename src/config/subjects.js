/* ═══════════════════════════════════════════════════════════════════
   SUBJECT CATALOG — Full list of available GCSE subjects.
   Each child picks their own subjects during setup.
   ═══════════════════════════════════════════════════════════════════ */

export const BOARDS = ["AQA","Edexcel","OCR","WJEC","Eduqas"];
export const YEARS  = ["Pre-GCSE","Year 10","Year 11"];
export const TIERS  = ["Foundation","Higher"];

/* Template helpers to reduce repetition */
function stdWelcome(tutorName, p, board, memCount, extra) {
  const b = board ? ` ${board} ${p.tier}.` : "";
  const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""}.` : "";
  return `Hello ${p.name}! I'm ${tutorName}.${b}${m}\n\n${extra || "What shall we work on?"}`;
}
function stdQuickPrompts(exam, hasMats) {
  return [exam ? "Here's my answer:" : hasMats ? "Quiz me on my materials" : "Can you quiz me?", hasMats ? "Prepare me for my test" : "How am I doing?", "How am I doing?", hasMats ? "Summarise my notes" : "What should I focus on?"];
}

export const SUBJECTS = {
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

  astronomy: {
    id: "astronomy", label: "Astronomy", emoji: "\ud83d\udd2d",
    tutor: { name: "Dr. Starling" },
    color: "#1a1a5a", gradient: "linear-gradient(135deg,#1a1a5a,#3a3a9a)", bg: "#f3f3fd",
    description: "Solar system, stars & cosmology",
    welcomeMessage(p, board, memCount) { return stdWelcome("Dr. Starling", p, board, memCount, "Planets, stars, or the universe today?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nASTRONOMY: Use scale analogies to make distances relatable. Cover observational techniques, the solar system, stellar evolution, and cosmology. Encourage diagram sketching for orbits and HR diagrams.";
      if (board === "Edexcel") s += " Edexcel: 2 papers, practical astronomy skills, use of telescopes.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },
};

/* ═══════════════════════════════════════════════════════════════════
   TOPIC REGISTRY — GCSE exam topics per subject (based on common specs)
   ═══════════════════════════════════════════════════════════════════ */

export const SUBJECT_TOPICS = {
  spanish: ["Family & relationships", "Free time & hobbies", "School & education", "Future plans & work", "Town & local area", "Social issues & charity", "Healthy living", "Holidays & travel", "Environment", "Technology & media", "Grammar: present tense", "Grammar: past tenses", "Grammar: future & conditional", "Speaking skills", "Writing skills", "Listening skills", "Reading comprehension", "Translation skills"],
  french: ["Family & relationships", "Free time & hobbies", "School & education", "Future plans & work", "Town & local area", "Social issues & charity", "Healthy living", "Holidays & travel", "Environment", "Technology & media", "Grammar: present tense", "Grammar: past tenses", "Grammar: future & conditional", "Speaking skills", "Writing skills", "Listening skills", "Reading comprehension", "Translation skills"],
  german: ["Family & relationships", "Free time & hobbies", "School & education", "Future plans & work", "Town & local area", "Social issues & charity", "Healthy living", "Holidays & travel", "Environment", "Technology & media", "Grammar: present tense", "Grammar: past tenses", "Grammar: future & conditional", "Grammar: cases & word order", "Speaking skills", "Writing skills", "Listening skills", "Translation skills"],
  math: ["Number: fractions, decimals, percentages", "Number: indices & surds", "Algebra: expressions & equations", "Algebra: graphs & functions", "Algebra: sequences", "Algebra: inequalities", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Geometry: circle theorems", "Geometry: vectors", "Trigonometry", "Probability", "Statistics: averages & spread", "Statistics: charts & diagrams"],
  english: ["Language Paper 1: fiction reading", "Language Paper 1: creative writing", "Language Paper 2: non-fiction reading", "Language Paper 2: viewpoint writing", "Spoken language assessment", "Literature: Shakespeare", "Literature: 19th century novel", "Literature: modern text", "Literature: poetry anthology", "Literature: unseen poetry", "Analytical writing techniques", "Spelling, punctuation & grammar", "Quotation & evidence skills", "Comparative writing"],
  science: ["Biology: cell biology", "Biology: organisation", "Biology: infection & disease", "Biology: bioenergetics", "Biology: homeostasis", "Biology: inheritance & variation", "Biology: ecology", "Chemistry: atomic structure", "Chemistry: bonding & structure", "Chemistry: quantitative chemistry", "Chemistry: chemical changes", "Chemistry: energy changes", "Chemistry: rates & equilibrium", "Chemistry: organic chemistry", "Chemistry: chemical analysis", "Chemistry: atmosphere & resources", "Physics: energy", "Physics: electricity", "Physics: particle model", "Physics: atomic structure", "Physics: forces", "Physics: waves", "Physics: magnetism", "Physics: space"],
  history: ["Medicine through time", "Crime & punishment", "Warfare & British society", "Elizabethan England", "Norman England", "American West", "Weimar & Nazi Germany", "Cold War", "Vietnam War", "Source analysis skills", "Extended writing skills", "Historical interpretations"],
  geography: ["Natural hazards", "Weather hazards & climate change", "Ecosystems & tropical rainforests", "Hot deserts", "Cold environments", "River landscapes", "Coastal landscapes", "Urban issues & challenges", "Changing economic world", "Resource management", "Energy", "Water & food", "Fieldwork skills", "Map skills & data interpretation"],
  computer_science: ["Computational thinking", "Algorithms: searching & sorting", "Programming fundamentals", "Data types & structures", "Boolean logic", "Systems architecture", "Memory & storage", "Networks & protocols", "Network security", "Databases & SQL", "Ethical & legal issues", "Software development lifecycle"],
  religious_studies: ["Christian beliefs & teachings", "Christian practices", "Islam: beliefs & teachings", "Islam: practices", "Relationships & families", "Religion & life", "Peace & conflict", "Crime & punishment", "Human rights", "Philosophical arguments for God", "Revelation & religious experience", "Evaluation & argument skills"],
  business: ["Enterprise & entrepreneurship", "Spotting a business opportunity", "Marketing mix", "Business finance", "Human resources", "Business operations", "Business growth", "Globalisation", "Ethics & environment", "Economic climate", "Cash flow & break-even", "Business plans"],
  art: ["Drawing & mark-making", "Painting techniques", "Printmaking", "3D & sculpture", "Photography & digital", "Artist research & analysis", "Formal elements", "Annotation skills", "Personal portfolio", "Externally set assignment", "Contextual understanding", "Creative development"],
  music: ["Rhythm & metre", "Melody & harmony", "Texture & structure", "Timbre & dynamics", "Set work analysis", "Musical dictation", "Composition techniques", "Performance skills", "Music technology", "World music traditions", "Popular music styles", "Classical traditions"],
  drama: ["Theatrical skills & techniques", "Devising theatre", "Performing from text", "Set text study", "Stage design & lighting", "Costume & makeup", "Evaluation & analysis", "Practitioners: Brecht", "Practitioners: Stanislavski", "Physical theatre", "Script interpretation", "Live theatre review"],
  dt: ["Core technical principles", "Specialist technical principles", "Materials: timber", "Materials: metals & alloys", "Materials: polymers", "Materials: textiles", "Manufacturing processes", "Design principles", "Environmental impact", "Systems & electronics", "Iterative design process", "NEA project skills"],
  pe: ["Skeletal system", "Muscular system", "Cardiovascular system", "Respiratory system", "Movement analysis", "Components of fitness", "Training methods & principles", "Injury prevention", "Sport psychology", "Socio-cultural influences", "Health & wellbeing", "Data analysis in sport"],
  psychology: ["Memory", "Perception", "Development", "Research methods", "Social influence", "Language, thought & communication", "Brain & neuropsychology", "Psychological problems", "Criminal psychology", "Sleep & dreaming", "Ethical issues", "Data handling & statistics"],
  economics: ["Supply & demand", "Price determination", "Market failure", "Government intervention", "Types of economy", "GDP & economic growth", "Unemployment & inflation", "Fiscal policy", "Monetary policy", "International trade", "Exchange rates", "Development economics"],
  sociology: ["Socialisation & culture", "Social structures & stratification", "Families & households", "Education", "Crime & deviance", "Social research methods", "Media", "Power & politics", "Functionalism", "Marxism", "Feminism", "Interactionism"],
  latin: ["Nouns: all declensions", "Verbs: present system", "Verbs: perfect system", "Adjectives & adverbs", "Pronouns & prepositions", "Subordinate clauses", "Indirect statement", "Participles & ablative absolute", "Translation: Latin to English", "Translation: English to Latin", "Prose literature set text", "Civilisation & Roman life"],
  astronomy: ["Earth, Moon & Sun", "The solar system", "Lenses & telescopes", "Electromagnetic spectrum", "Stellar evolution", "HR diagrams", "Galaxies & cosmology", "The Big Bang", "Observational techniques", "Space exploration", "Gravity & orbits", "Astrophotography & data"],
};

/* Derived helpers */
export const ALL_SUBJECT_IDS   = Object.keys(SUBJECTS);
export const ALL_SUBJECT_LIST  = Object.values(SUBJECTS);
export function mySubjects(profile) {
  const ids = profile?.subjects || [];
  return ids.length ? ids.map(id => SUBJECTS[id]).filter(Boolean) : ALL_SUBJECT_LIST.slice(0, 4);
}
export function emptyMats() { return Object.fromEntries(ALL_SUBJECT_IDS.map(id => [id, []])); }
