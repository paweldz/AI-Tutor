/* ═══════════════════════════════════════════════════════════════════
   SUBJECT CATALOG — Full list of available GCSE subjects.
   Each child picks their own subjects during setup.
   ═══════════════════════════════════════════════════════════════════ */

export const BOARDS = ["AQA","Edexcel","OCR","WJEC","Eduqas"];
export const YEARS  = ["Pre-GCSE","Year 10","Year 11"];
export const TIERS  = ["Foundation","Higher"];

/* Template helpers to reduce repetition */
function buildWelcomeMessage(tutorName, p, board, memCount, extra) {
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

  math: {
    id: "math", label: "Maths", emoji: "\ud83d\udcd0",
    tutor: { name: "Mr. Chen" },
    color: "#1a3a7a", gradient: "linear-gradient(135deg,#1a3a7a,#2980b9)", bg: "#f3f6fd",
    description: "Number, algebra, geometry & stats",
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Mr. Chen", p, board, memCount, "What are we working on?"); },
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
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Ms. Williams", p, board, memCount, "Language or Literature today?"); },
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
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Dr. Patel", p, board, memCount, "Biology, Chemistry or Physics today?"); },
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

  biology: {
    id: "biology", label: "Biology", emoji: "\ud83e\uddec",
    tutor: { name: "Dr. Okafor" },
    color: "#16a34a", gradient: "linear-gradient(135deg,#15803d,#22c55e)", bg: "#f0fdf4",
    description: "Cells, organisms, genetics & ecology",
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Dr. Okafor", p, board, memCount, "Cells, genetics, ecology \u2014 what shall we tackle?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nBIOLOGY (Triple): Use diagrams and analogies. Flag required practicals. Show every calculation step. Teach 6-mark extended response structure.";
      if (board === "AQA") s += " AQA: 2 papers, 10 topics. Required practicals examined.";
      else if (board === "Edexcel") s += " Edexcel: 2 papers, 9 topic areas. Core practicals.";
      else if (board === "OCR") s += " OCR: Gateway or 21C, 7 modules.";
      s += tier === "Higher" ? " Higher: complex mechanisms, homeostasis detail, monoclonal antibodies, brain & eye." : " Foundation: core concepts, simplified mechanisms.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  chemistry: {
    id: "chemistry", label: "Chemistry", emoji: "\u2697\ufe0f",
    tutor: { name: "Dr. Kapoor" },
    color: "#0891b2", gradient: "linear-gradient(135deg,#0e7490,#22d3ee)", bg: "#ecfeff",
    description: "Atoms, reactions, organic & analysis",
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Dr. Kapoor", p, board, memCount, "Bonding, reactions, organic chemistry \u2014 where shall we start?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nCHEMISTRY (Triple): Balance equations in every answer. Use particle diagrams. Flag required practicals. Show moles calculations step by step.";
      if (board === "AQA") s += " AQA: 2 papers, 10 topics. ~20% maths content.";
      else if (board === "Edexcel") s += " Edexcel: 2 papers, 9 topic areas. Core practicals.";
      else if (board === "OCR") s += " OCR: Gateway or 21C, breadth + depth papers.";
      s += tier === "Higher" ? " Higher: titration calcs, Haber process equilibrium, organic mechanisms, nanoparticles." : " Foundation: core reactions, simple calculations, key concepts.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  physics: {
    id: "physics", label: "Physics", emoji: "\u269b\ufe0f",
    tutor: { name: "Professor Newton" },
    color: "#4f46e5", gradient: "linear-gradient(135deg,#4338ca,#6366f1)", bg: "#eef2ff",
    description: "Forces, energy, waves, electricity & space",
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Professor Newton", p, board, memCount, "Forces, energy, electricity, waves \u2014 what shall we work on?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nPHYSICS (Triple): Show every calculation with units. Use SUVAT where appropriate. Draw force diagrams. Flag required practicals. Teach equation recall and rearrangement.";
      if (board === "AQA") s += " AQA: 2 papers, 8 topics. ~40% maths, equation sheet provided for some.";
      else if (board === "Edexcel") s += " Edexcel: 2 papers, core practicals, ~40% maths.";
      else if (board === "OCR") s += " OCR: Gateway or 21C, practical skills embedded.";
      s += tier === "Higher" ? " Higher: moments, pressure in fluids, EM induction, space physics, momentum." : " Foundation: core equations, basic circuits, forces & energy.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  history: {
    id: "history", label: "History", emoji: "\ud83c\udfdb\ufe0f",
    tutor: { name: "Mr. Hartley" },
    color: "#7a4a1a", gradient: "linear-gradient(135deg,#7a4a1a,#a66b2f)", bg: "#fdf8f3",
    description: "British, world & thematic history",
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Mr. Hartley", p, board, memCount, "Which period or topic shall we explore?"); },
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
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Ms. Rivera", p, board, memCount, "Physical or human geography today?"); },
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
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Dr. Okonkwo", p, board, memCount, "Theory, programming, or algorithms today?"); },
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
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Ms. Begum", p, board, memCount, "Which religion or ethical topic shall we discuss?"); },
    systemPromptSpecific(board, tier) {
      let s = "\nRELIGIOUS STUDIES: Always present multiple viewpoints. Use specific teachings and sacred texts as evidence. Practice 12-mark evaluation questions.";
      if (board === "AQA") s += " AQA: 2 religions + 4 thematic studies.";
      else if (board === "Edexcel") s += " Edexcel: Beliefs, Marriage & Family, Living the Faith, Peace & Conflict.";
      return s;
    },
    quickPrompts: stdQuickPrompts,
  },

  astronomy: {
    id: "astronomy", label: "Astronomy", emoji: "\ud83d\udd2d",
    tutor: { name: "Dr. Starling" },
    color: "#1a1a5a", gradient: "linear-gradient(135deg,#1a1a5a,#3a3a9a)", bg: "#f3f3fd",
    description: "Solar system, stars & cosmology",
    welcomeMessage(p, board, memCount) { return buildWelcomeMessage("Dr. Starling", p, board, memCount, "Planets, stars, or the universe today?"); },
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
  math: ["Number: fractions, decimals, percentages", "Number: indices & surds", "Algebra: expressions & equations", "Algebra: graphs & functions", "Algebra: sequences", "Algebra: inequalities", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Geometry: circle theorems", "Geometry: vectors", "Trigonometry", "Probability", "Statistics: averages & spread", "Statistics: charts & diagrams"],
  english: ["Language Paper 1: fiction reading", "Language Paper 1: creative writing", "Language Paper 2: non-fiction reading", "Language Paper 2: viewpoint writing", "Spoken language assessment", "Literature: Shakespeare", "Literature: 19th century novel", "Literature: modern text", "Literature: poetry anthology", "Literature: unseen poetry", "Analytical writing techniques", "Spelling, punctuation & grammar", "Quotation & evidence skills", "Comparative writing"],
  science: ["Biology: cell biology", "Biology: organisation", "Biology: infection & disease", "Biology: bioenergetics", "Biology: homeostasis", "Biology: inheritance & variation", "Biology: ecology", "Chemistry: atomic structure", "Chemistry: bonding & structure", "Chemistry: quantitative chemistry", "Chemistry: chemical changes", "Chemistry: energy changes", "Chemistry: rates & equilibrium", "Chemistry: organic chemistry", "Chemistry: chemical analysis", "Chemistry: atmosphere & resources", "Physics: energy", "Physics: electricity", "Physics: particle model", "Physics: atomic structure", "Physics: forces", "Physics: waves", "Physics: magnetism", "Physics: space"],
  biology: ["Cell biology", "Cell division & mitosis", "Transport in cells", "Organisation & organ systems", "Digestive system & enzymes", "Heart & blood vessels", "Plant tissues & organs", "Communicable diseases", "Human defence systems", "Vaccination & antibiotics", "Monoclonal antibodies", "Plant disease", "Photosynthesis", "Respiration", "Homeostasis & response", "Nervous system", "Hormonal coordination", "Reproduction", "Variation & evolution", "Genetics & inheritance", "Classification", "Ecosystems", "Biodiversity", "Required practicals"],
  chemistry: ["Atomic structure & periodic table", "Electronic structure", "Development of the periodic table", "Group 1, 7 & 0", "Bonding: ionic", "Bonding: covalent & metallic", "Properties of structures", "Quantitative chemistry & moles", "Equations & calculations", "Chemical changes & electrolysis", "Reactivity series & extraction", "Acids, bases & salts", "Energy changes & bond energies", "Rates of reaction", "Reversible reactions & equilibrium", "Crude oil & hydrocarbons", "Organic reactions", "Polymers", "Chemical analysis & chromatography", "Identification of ions", "Earth's atmosphere", "Using Earth's resources", "Sustainable development", "Required practicals"],
  physics: ["Energy stores & transfers", "Energy efficiency & resources", "Electrical circuits", "Series & parallel circuits", "Mains electricity & power", "Energy transfers in circuits", "Density & states of matter", "Internal energy & specific heat", "Pressure in fluids", "Atomic structure & radiation", "Nuclear decay & half-life", "Hazards & uses of radiation", "Forces & Newton's laws", "Resultant forces", "Momentum", "Stopping distances", "Waves: properties", "Electromagnetic spectrum", "Lenses & visible light", "Sound waves", "Magnetic fields & electromagnets", "The motor effect", "Electromagnetic induction", "Space physics", "Required practicals"],
  history: ["Medicine through time", "Crime & punishment", "Warfare & British society", "Elizabethan England", "Norman England", "American West", "Weimar & Nazi Germany", "Cold War", "Vietnam War", "Source analysis skills", "Extended writing skills", "Historical interpretations"],
  geography: ["Natural hazards", "Weather hazards & climate change", "Ecosystems & tropical rainforests", "Hot deserts", "Cold environments", "River landscapes", "Coastal landscapes", "Urban issues & challenges", "Changing economic world", "Resource management", "Energy", "Water & food", "Fieldwork skills", "Map skills & data interpretation"],
  computer_science: ["Computational thinking", "Algorithms: searching & sorting", "Programming fundamentals", "Data types & structures", "Boolean logic", "Systems architecture", "Memory & storage", "Networks & protocols", "Network security", "Databases & SQL", "Ethical & legal issues", "Software development lifecycle"],
  religious_studies: ["Christian beliefs & teachings", "Christian practices", "Islam: beliefs & teachings", "Islam: practices", "Relationships & families", "Religion & life", "Peace & conflict", "Crime & punishment", "Human rights", "Philosophical arguments for God", "Revelation & religious experience", "Evaluation & argument skills"],
  astronomy: ["Earth, Moon & Sun", "The solar system", "Lenses & telescopes", "Electromagnetic spectrum", "Stellar evolution", "HR diagrams", "Galaxies & cosmology", "The Big Bang", "Observational techniques", "Space exploration", "Gravity & orbits", "Astrophotography & data"],
};

/* ═══════════════════════════════════════════════════════════════════
   BOARD/TIER-SPECIFIC TOPIC OVERRIDES
   Keys: `${board}_${tier}` or just `${board}` for subjects without tier splits.
   Only subjects with meaningful board differences need entries here;
   others fall back to SUBJECT_TOPICS above.
   ═══════════════════════════════════════════════════════════════════ */

export const BOARD_TIER_TOPICS = {
  math: {
    AQA_Higher: ["Number: fractions, decimals, percentages", "Number: indices & surds", "Algebra: expressions & equations", "Algebra: graphs & functions", "Algebra: sequences", "Algebra: inequalities", "Quadratic equations & simultaneous equations", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Geometry: circle theorems", "Geometry: vectors", "Trigonometry (inc. sine/cosine rule)", "Probability (inc. conditional)", "Statistics: averages & spread", "Statistics: charts & diagrams", "Functions & iteration"],
    AQA_Foundation: ["Number: fractions, decimals, percentages", "Number: basic indices & roots", "Algebra: expressions & equations", "Algebra: linear graphs", "Algebra: sequences", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Trigonometry (basic SOHCAHTOA)", "Probability", "Statistics: averages & spread", "Statistics: charts & diagrams"],
    Edexcel_Higher: ["Number: fractions, decimals, percentages", "Number: indices & surds", "Algebra: expressions & equations", "Algebra: graphs & functions", "Algebra: sequences", "Algebra: inequalities", "Quadratic equations & formulae", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Geometry: circle theorems", "Geometry: vectors", "Trigonometry (inc. sine/cosine rule)", "Probability (inc. conditional)", "Statistics: averages & spread", "Statistics: charts & diagrams", "Functions & iteration"],
    Edexcel_Foundation: ["Number: fractions, decimals, percentages", "Number: basic indices & roots", "Algebra: expressions & equations", "Algebra: linear graphs", "Algebra: sequences", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Trigonometry (basic SOHCAHTOA)", "Probability", "Statistics: averages & spread", "Statistics: charts & diagrams"],
    OCR_Higher: ["Number: fractions, decimals, percentages", "Number: indices & surds", "Algebra: expressions & equations", "Algebra: graphs & functions", "Algebra: sequences", "Algebra: inequalities", "Quadratic equations & simultaneous equations", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Geometry: circle theorems", "Geometry: vectors", "Trigonometry (inc. sine/cosine rule)", "Probability (inc. conditional)", "Statistics: averages & spread", "Statistics: charts & diagrams", "Proof & functions"],
    OCR_Foundation: ["Number: fractions, decimals, percentages", "Number: basic indices & roots", "Algebra: expressions & equations", "Algebra: linear graphs", "Algebra: sequences", "Ratio & proportion", "Geometry: angles & shapes", "Geometry: area & volume", "Geometry: transformations", "Trigonometry (basic SOHCAHTOA)", "Probability", "Statistics: averages & spread", "Statistics: charts & diagrams"],
  },
  science: {
    AQA_Higher: ["Biology: cell biology", "Biology: organisation", "Biology: infection & response", "Biology: bioenergetics", "Biology: homeostasis & response", "Biology: inheritance, variation & evolution", "Biology: ecology", "Chemistry: atomic structure & periodic table", "Chemistry: bonding, structure & properties", "Chemistry: quantitative chemistry", "Chemistry: chemical changes", "Chemistry: energy changes", "Chemistry: rates & equilibrium", "Chemistry: organic chemistry", "Chemistry: chemical analysis", "Chemistry: atmosphere & resources", "Physics: energy", "Physics: electricity", "Physics: particle model of matter", "Physics: atomic structure & radiation", "Physics: forces", "Physics: waves", "Physics: magnetism & electromagnetism", "Physics: space physics"],
    AQA_Foundation: ["Biology: cell biology", "Biology: organisation", "Biology: infection & response", "Biology: bioenergetics", "Biology: homeostasis (basic)", "Biology: inheritance & variation (basic)", "Biology: ecology", "Chemistry: atomic structure (basic)", "Chemistry: bonding & structure", "Chemistry: quantitative chemistry (basic)", "Chemistry: chemical changes", "Chemistry: energy changes", "Chemistry: rates of reaction", "Chemistry: chemical analysis", "Chemistry: atmosphere & resources", "Physics: energy", "Physics: electricity", "Physics: particle model of matter", "Physics: atomic structure (basic)", "Physics: forces", "Physics: waves", "Physics: magnetism"],
    Edexcel_Higher: ["Biology: key concepts", "Biology: cells & control", "Biology: genetics", "Biology: natural selection & modification", "Biology: health, disease & medicine", "Biology: plant structures & functions", "Biology: animal coordination", "Biology: exchange & transport", "Biology: ecosystems", "Chemistry: key concepts", "Chemistry: states of matter", "Chemistry: chemical changes", "Chemistry: extracting metals & equilibria", "Chemistry: groups in the periodic table", "Chemistry: rates of reaction & energy", "Chemistry: fuels & Earth science", "Physics: key concepts", "Physics: motion & forces", "Physics: conservation of energy", "Physics: waves", "Physics: light & the EM spectrum", "Physics: radioactivity", "Physics: astronomy", "Physics: energy (forces doing work)", "Physics: electricity & circuits", "Physics: magnetism & motor effect", "Physics: electromagnetic induction", "Physics: particle model"],
    Edexcel_Foundation: ["Biology: key concepts", "Biology: cells & control", "Biology: genetics (basic)", "Biology: natural selection", "Biology: health & disease", "Biology: plant structures", "Biology: animal coordination", "Biology: ecosystems", "Chemistry: key concepts", "Chemistry: states of matter", "Chemistry: chemical changes", "Chemistry: extracting metals", "Chemistry: groups in the periodic table", "Chemistry: rates of reaction", "Chemistry: fuels & Earth science", "Physics: key concepts", "Physics: motion & forces", "Physics: conservation of energy", "Physics: waves", "Physics: light & EM spectrum", "Physics: radioactivity", "Physics: astronomy", "Physics: electricity & circuits", "Physics: magnetism"],
    OCR_Higher: ["Biology: cell-level systems", "Biology: scaling up", "Biology: organism-level systems", "Biology: community-level systems", "Biology: genes, inheritance & selection", "Biology: global challenges", "Chemistry: particles", "Chemistry: elements, compounds & mixtures", "Chemistry: chemical reactions", "Chemistry: predicting & identifying reactions", "Chemistry: monitoring & controlling reactions", "Chemistry: global challenges (chemistry)", "Physics: matter", "Physics: forces & motion", "Physics: electricity", "Physics: magnetism & EM induction", "Physics: waves in matter", "Physics: radioactivity", "Physics: energy", "Physics: global challenges (physics)"],
    OCR_Foundation: ["Biology: cell-level systems", "Biology: scaling up", "Biology: organism-level systems", "Biology: community-level systems", "Biology: genes & inheritance (basic)", "Biology: global challenges", "Chemistry: particles", "Chemistry: elements, compounds & mixtures", "Chemistry: chemical reactions", "Chemistry: predicting & identifying reactions", "Chemistry: monitoring reactions", "Chemistry: global challenges (chemistry)", "Physics: matter", "Physics: forces & motion", "Physics: electricity", "Physics: waves in matter", "Physics: radioactivity", "Physics: energy"],
  },
  biology: {
    AQA_Higher: ["Cell biology", "Cell division & mitosis", "Transport in cells", "Organisation & organ systems", "Digestive system & enzymes", "Heart, blood & blood vessels", "Plant tissues & organs", "Communicable diseases", "Human defence systems", "Vaccination & antibiotics", "Monoclonal antibodies", "Plant disease", "Photosynthesis", "Respiration (aerobic & anaerobic)", "Homeostasis & response", "Nervous system & reflex arcs", "Hormonal coordination", "Contraception & fertility", "Reproduction (sexual & asexual)", "DNA, genes & the genome", "Variation & evolution", "Genetics & inheritance (inc. Punnett squares)", "Speciation & classification", "Ecosystems & biodiversity", "Trophic levels & biomass", "Required practicals"],
    AQA_Foundation: ["Cell biology", "Cell division (basic)", "Transport in cells", "Organisation & organ systems", "Digestive system & enzymes", "Heart & blood vessels", "Communicable diseases", "Human defence systems", "Vaccination", "Photosynthesis (basic)", "Respiration", "Homeostasis (basic)", "Nervous system", "Hormonal coordination (basic)", "Reproduction", "Variation & evolution", "Genetics (basic)", "Ecosystems", "Biodiversity", "Required practicals"],
    Edexcel_Higher: ["Key concepts in biology", "Cells & control", "Genetics", "Natural selection & genetic modification", "Health, disease & medicine", "Plant structures & functions", "Animal coordination, control & homeostasis", "Exchange & transport in animals", "Ecosystems & material cycles", "Required practicals"],
    Edexcel_Foundation: ["Key concepts in biology", "Cells & control", "Genetics (basic)", "Natural selection", "Health & disease", "Plant structures", "Animal coordination", "Exchange & transport", "Ecosystems", "Required practicals"],
  },
  chemistry: {
    AQA_Higher: ["Atomic structure & periodic table", "Electronic structure", "Group 1, 7 & 0", "Ionic bonding", "Covalent & metallic bonding", "Properties of structures", "Quantitative chemistry & moles", "Reacting masses & concentrations", "Chemical changes & electrolysis", "Reactivity series & extraction", "Acids, bases & salts", "Energy changes & bond energies", "Rates of reaction", "Reversible reactions & equilibrium", "Crude oil & hydrocarbons", "Organic reactions & functional groups", "Polymers", "Chemical analysis & chromatography", "Identification of ions & gases", "Earth's atmosphere", "Using Earth's resources", "Life cycle assessments", "Required practicals"],
    AQA_Foundation: ["Atomic structure (basic)", "Periodic table", "Ionic & covalent bonding", "Properties of structures", "Quantitative chemistry (basic)", "Chemical changes", "Reactivity series", "Acids & alkalis", "Energy changes", "Rates of reaction", "Hydrocarbons & fuels", "Chemical analysis", "Earth's atmosphere", "Using resources", "Required practicals"],
    Edexcel_Higher: ["Key concepts in chemistry", "States of matter & mixtures", "Chemical changes", "Extracting metals & equilibria", "Separate chemistry 1", "Groups in the periodic table", "Rates of reaction & energy changes", "Fuels & Earth science", "Separate chemistry 2", "Required practicals"],
    Edexcel_Foundation: ["Key concepts in chemistry", "States of matter & mixtures", "Chemical changes", "Extracting metals", "Groups in the periodic table", "Rates of reaction", "Fuels & Earth science", "Required practicals"],
  },
  physics: {
    AQA_Higher: ["Energy stores & transfers", "Energy efficiency", "Energy resources", "Electrical circuits", "Series & parallel", "Mains electricity & power", "Density & states of matter", "Internal energy & specific heat", "Pressure in fluids", "Atomic structure", "Nuclear decay & half-life", "Hazards & uses of radiation", "Forces & Newton's laws", "Resultant forces & free-body diagrams", "Momentum (HT only)", "Stopping distances", "Waves: properties & behaviour", "Electromagnetic spectrum", "Lenses & magnification", "Sound waves", "Magnetic fields & electromagnets", "The motor effect", "Electromagnetic induction (HT only)", "Space physics", "Required practicals"],
    AQA_Foundation: ["Energy stores & transfers", "Energy efficiency", "Energy resources", "Electrical circuits", "Series & parallel", "Mains electricity", "Density & states of matter", "Internal energy", "Atomic structure (basic)", "Radioactive decay", "Forces & Newton's laws", "Stopping distances", "Waves: properties", "Electromagnetic spectrum", "Sound waves", "Magnetic fields", "The motor effect", "Space physics", "Required practicals"],
    Edexcel_Higher: ["Key concepts of physics", "Motion & forces", "Conservation of energy", "Waves", "Light & the EM spectrum", "Radioactivity", "Astronomy", "Energy: forces doing work", "Electricity & circuits", "Magnetism & motor effect", "Electromagnetic induction", "Particle model", "Forces & their effects", "Required practicals"],
    Edexcel_Foundation: ["Key concepts of physics", "Motion & forces", "Conservation of energy", "Waves", "Light & the EM spectrum", "Radioactivity", "Astronomy", "Electricity & circuits", "Magnetism", "Particle model", "Required practicals"],
  },
  english: {
    AQA: ["Language P1: fiction reading (AO1-AO4)", "Language P1: creative writing (AO5-AO6)", "Language P2: non-fiction reading (AO1-AO3)", "Language P2: viewpoint writing (AO5-AO6)", "Spoken language endorsement", "Literature: Shakespeare (Macbeth/R&J/Tempest/MND)", "Literature: 19th century novel (ACC/JE/SS/FRK)", "Literature: modern text (AIC/LF/ATDP/P)", "Literature: poetry anthology (Power & Conflict)", "Literature: unseen poetry & comparison", "Analytical writing techniques", "SPaG & sentence structures", "Quotation & evidence embedding", "Comparative writing skills"],
    Edexcel: ["Language P1: fiction & imaginative reading", "Language P1: transactional writing", "Language P2: non-fiction & literary reading", "Language P2: imaginative & creative writing", "Spoken language endorsement", "Literature: Shakespeare", "Literature: post-1914 British play/novel", "Literature: 19th century novel", "Literature: poetry anthology (Relationships/Conflict)", "Literature: unseen poetry", "Analytical writing techniques", "SPaG & sentence structures", "Quotation & evidence embedding", "Personal response & interpretation"],
    OCR: ["Language P1: communicating information & ideas", "Language P1: writing to present a viewpoint", "Language P2: reading literary texts", "Language P2: creative & imaginative writing", "Spoken language endorsement", "Literature: Shakespeare", "Literature: modern prose or drama", "Literature: 19th century prose", "Literature: poetry (Love & Relationships)", "Literature: unseen poetry", "Analytical writing techniques", "SPaG & sentence structures", "Audience, purpose & form", "Comparative essay skills"],
  },
};

/**
 * Resolve the topic list for a subject, respecting board/tier overrides
 * and student customisations.
 *
 * Priority: customTopics > BOARD_TIER_TOPICS > SUBJECT_TOPICS
 */
export function getDefaultTopics(subjectId, board, tier) {
  const overrides = BOARD_TIER_TOPICS[subjectId];
  if (overrides) {
    if (board && tier && overrides[`${board}_${tier}`]) return overrides[`${board}_${tier}`];
    if (board && overrides[board]) return overrides[board];
  }
  return SUBJECT_TOPICS[subjectId] || [];
}

/* Derived helpers */
export const ALL_SUBJECT_IDS   = Object.keys(SUBJECTS);
export const ALL_SUBJECT_LIST  = Object.values(SUBJECTS);
export function mySubjects(profile) {
  const ids = profile?.subjects || [];
  return ids.length ? ids.map(id => SUBJECTS[id]).filter(Boolean) : ALL_SUBJECT_LIST.slice(0, 4);
}
export function emptyMats() { return Object.fromEntries(ALL_SUBJECT_IDS.map(id => [id, []])); }
