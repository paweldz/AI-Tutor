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
   SUBJECT REGISTRY — Add new subjects here. This is the ONLY place.
   Copy one block, change the values, done. The app picks it up.
   ═══════════════════════════════════════════════════════════════════ */

const BOARDS = ["AQA","Edexcel","OCR","WJEC","Eduqas"];
const YEARS  = ["Year 10","Year 11"];
const TIERS  = ["Foundation","Higher"];

const SUBJECTS = {
  spanish: {
    id: "spanish", label: "Spanish", emoji: "\ud83c\uddea\ud83c\uddf8",
    tutor: { name: "Se\u00f1ora L\u00f3pez" },
    color: "#b5451b",
    gradient: "linear-gradient(135deg,#b5451b,#e8603a)",
    bg: "#fdf6f3",
    description: "Conversation, grammar & vocabulary \u00b7 \ud83c\udf99\ufe0f Voice",
    voice: { enabled: true, lang: "es-ES", rate: 0.9, pitch: 1.1 },
    welcomeMessage(p, board, memCount) {
      const b = board ? ` ${board} Spanish \u2014 perfect.` : "";
      const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""} \u2014 I remember your history.` : "";
      return `\u00a1Hola ${p.name}! I'm Se\u00f1ora L\u00f3pez.${b}${m}\n\nWhat shall we work on? \u00bfQu\u00e9 prefieres?\n\n\ud83c\udf99\ufe0f Tip: Tap "Voice" above to practise speaking!`;
    },
    systemPromptSpecific(board, tier) {
      let s = "\nSPANISH: Mix English/Spanish, increase Spanish as confidence grows. Correct gently (\"\u00a1Casi! Correct form: [X] because [reason]\"). End each exchange with a question.";
      if (board === "AQA") s += " AQA: 3 themes, 4 skills.";
      else if (board === "Edexcel") s += " Edexcel: translation + photo card.";
      else if (board === "OCR") s += " OCR: spontaneous speaking focus.";
      s += tier === "Higher" ? " Higher: subjunctive, complex tenses." : " Foundation: present/past/future, core vocab.";
      return s;
    },
    quickPrompts(exam, hasMats) {
      return [exam ? "Here's my answer:" : hasMats ? "Quiz me on my materials" : "Can you quiz me?", hasMats ? "Prepare me for my test" : "How am I doing?", "How am I doing?", hasMats ? "Summarise my notes" : "What should I focus on?"];
    },
  },

  science: {
    id: "science", label: "Science", emoji: "\ud83d\udd2c",
    tutor: { name: "Dr. Patel" },
    color: "#1a6b3c",
    gradient: "linear-gradient(135deg,#1a6b3c,#27ae60)",
    bg: "#f3fdf6",
    description: "Biology, Chemistry & Physics",
    welcomeMessage(p, board, memCount) {
      const b = board ? ` ${board} ${p.tier}.` : "";
      const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""}.` : "";
      return `Hello ${p.name}! I'm Dr. Patel.${b}${m}\n\nBiology, Chemistry or Physics today?`;
    },
    systemPromptSpecific(board, tier) {
      let s = "\nSCIENCE: Use analogies. Flag exam technique (\"6-mark answer needs 6 points\"). Show every calc step.";
      if (board === "AQA") s += " AQA: required practicals, ~30% maths, Trilogy or Triple.";
      else if (board === "Edexcel") s += " Edexcel: Core Practicals examined.";
      else if (board === "OCR") s += " OCR: Gateway or 21C spec.";
      s += tier === "Higher" ? " Higher: complex maths, mechanisms, organic chem." : " Foundation: concepts over derivation.";
      return s;
    },
    quickPrompts(exam, hasMats) {
      return [exam ? "Here's my answer:" : hasMats ? "Quiz me on my materials" : "Can you quiz me?", hasMats ? "Prepare me for my test" : "How am I doing?", "How am I doing?", hasMats ? "Summarise my notes" : "What should I focus on?"];
    },
  },

  math: {
    id: "math", label: "Maths", emoji: "\ud83d\udcd0",
    tutor: { name: "Mr. Chen" },
    color: "#1a3a7a",
    gradient: "linear-gradient(135deg,#1a3a7a,#2980b9)",
    bg: "#f3f6fd",
    description: "Number, algebra, geometry & stats",
    welcomeMessage(p, board, memCount) {
      const b = board ? ` ${p.tier} ${board}.` : "";
      const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""}.` : "";
      return `Hi ${p.name}! I'm Mr. Chen.${b}${m}\n\nWhat are we working on?`;
    },
    systemPromptSpecific(board, tier) {
      let s = "\nMATHS: Show every step. When wrong ask \"where did it go wrong?\" first. Offer multiple methods. Flag: units, sig figs. Scaffold: trivial>easy>medium>hard.";
      if (board === "Edexcel") s += " Edexcel: 3 papers (1 non-calc).";
      else if (board === "AQA") s += " AQA: multi-step context problems.";
      s += tier === "Higher" ? " Higher: quadratics, circle theorems, vectors, surds, functions, iteration." : " Foundation: arithmetic, algebra, geometry, probability.";
      return s;
    },
    quickPrompts(exam, hasMats) {
      return [exam ? "Here's my answer:" : hasMats ? "Quiz me on my materials" : "Can you quiz me?", hasMats ? "Prepare me for my test" : "How am I doing?", "How am I doing?", hasMats ? "Summarise my notes" : "What should I focus on?"];
    },
  },

  english: {
    id: "english", label: "English", emoji: "\ud83d\udcda",
    tutor: { name: "Ms. Williams" },
    color: "#5b1a6b",
    gradient: "linear-gradient(135deg,#5b1a6b,#8e44ad)",
    bg: "#faf3fd",
    description: "Language & Literature",
    welcomeMessage(p, board, memCount) {
      const b = board ? ` ${board} Language & Literature.` : "";
      const m = memCount > 0 ? `\n\n\ud83e\udde0 Memory loaded: ${memCount} past session${memCount > 1 ? "s" : ""}.` : "";
      return `Hello ${p.name}! I'm Ms. Williams.${b}${m}\n\nWhere shall we start?`;
    },
    systemPromptSpecific(board, tier) {
      let s = "\nENGLISH: Push for the 'so what' on every technique. Mark writing: score + reasons + one improvement. Build vocab: connotation, juxtaposition, semantic field.";
      if (board === "AQA") s += " AQA: P1 fiction+creative, P2 non-fiction+viewpoint, AO1-AO6.";
      else if (board === "Edexcel") s += " Edexcel: personal response emphasis.";
      else if (board === "OCR") s += " OCR: audience/purpose central.";
      s += " Literature: link to context for top marks.";
      return s;
    },
    quickPrompts(exam, hasMats) {
      return [exam ? "Here's my answer:" : hasMats ? "Quiz me on my materials" : "Can you quiz me?", hasMats ? "Prepare me for my test" : "How am I doing?", "How am I doing?", hasMats ? "Summarise my notes" : "What should I focus on?"];
    },
  },

  /* ────────────────────────────────────────────────
     TO ADD A NEW SUBJECT: Copy any block above, paste here, and change:
     - id, label, emoji, tutor.name
     - color, gradient, bg
     - description
     - welcomeMessage, systemPromptSpecific, quickPrompts
     That's it — the app picks it up automatically everywhere.
     ──────────────────────────────────────────────── */
};

/* Derived helpers — never edit these */
const SUBJECT_IDS   = Object.keys(SUBJECTS);
const SUBJECT_LIST  = Object.values(SUBJECTS);
const SUBJECT_STEPS = SUBJECT_LIST.map(s => ({ tutorId: s.id, label: s.label, emoji: s.emoji }));
function emptyMats() { return Object.fromEntries(SUBJECT_IDS.map(id => [id, []])); }


/* ═══════════════════════════════════════════════════════════════════
   STORAGE — localStorage with v1 → v2 migration
   ═══════════════════════════════════════════════════════════════════ */

const KEYS = { profile: "gcse_profile_v2", memory: "gcse_memory_v2", apiKey: "gcse_api_key", sbUrl: "gcse_sb_url", sbKey: "gcse_sb_anonkey" };

function readJSON(key, fallback = null) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function readStr(key) { try { return localStorage.getItem(key) || ""; } catch { return ""; } }
function writeStr(key, val) { try { localStorage.setItem(key, val); } catch {} }

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
  // v1 API key → v2 (same key name, just copy)
  const oldKey = readStr("gcse_api_key");
  // already same key, no migration needed
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
function loadApiKey()  { return readStr(KEYS.apiKey); }
function saveApiKey(k) { writeStr(KEYS.apiKey, k); }
function loadSbCreds() { return { url: readStr(KEYS.sbUrl), key: readStr(KEYS.sbKey) }; }
function saveSbCreds(url, key) { writeStr(KEYS.sbUrl, url); writeStr(KEYS.sbKey, key); }

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
   SUPABASE — cloud backup with conflict-aware merge
   ═══════════════════════════════════════════════════════════════════ */

async function sbTest(url, key) {
  const r = await fetch(url + "/rest/v1/tutor_memory?limit=1", { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (r.ok || r.status === 406) return true;
  const d = await r.json().catch(() => ({}));
  throw new Error("HTTP " + r.status + " - " + (d.message || d.hint || "check credentials"));
}

async function sbSave(url, key, studentName, subject, date, summary) {
  if (!url || !key) return false;
  try {
    const r = await fetch(url + "/rest/v1/tutor_memory", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: "Bearer " + key, Prefer: "return=minimal" },
      body: JSON.stringify({ student_name: studentName, subject, session_date: date, summary: typeof summary === "string" ? summary : JSON.stringify(summary) }),
    });
    return r.ok;
  } catch { return false; }
}

async function sbLoad(url, key, studentName) {
  if (!url || !key) return null;
  try {
    const r = await fetch(url + "/rest/v1/tutor_memory?student_name=eq." + encodeURIComponent(studentName) + "&order=created_at.asc", { headers: { apikey: key, Authorization: "Bearer " + key } });
    if (!r.ok) return null;
    const rows = await r.json();
    const subjects = {};
    for (const row of rows) {
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


/* ═══════════════════════════════════════════════════════════════════
   ANTHROPIC API — direct calls, no proxy needed
   ═══════════════════════════════════════════════════════════════════ */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-5-20250929";

const SUMMARY_PROMPT = `You are writing a session summary. Return ONLY valid JSON (no markdown, no backticks, no extra text). Exact shape:
{"date":"today DD Month YYYY","subject":"subject id","topics":["t1","t2"],"strengths":["s1"],"weaknesses":["w1"],"confidenceScores":{"topic1":70,"topic2":50},"messageCount":12,"examQuestionsAttempted":0,"rawSummaryText":"3-4 paragraph summary covering: topics, strengths, areas needing work, confidence levels, 3 priorities for next session."}`;

async function apiSend(apiKey, systemPrompt, messages, maxTokens = 1200) {
  let raw = "", status = 0;
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages }),
    });
    status = r.status; raw = await r.text();
  } catch (e) { throw new Error("Network error: " + e.message + ". Check your internet connection."); }

  let data; try { data = JSON.parse(raw); } catch { throw new Error("HTTP " + status + " \u2014 invalid response from API."); }
  if (data.error) {
    const msg = data.error.message || data.error.type || "Unknown";
    if (status === 401) throw new Error("Invalid API key. Check your key in Settings.");
    if (status === 429) throw new Error("Rate limited \u2014 wait a moment and try again.");
    if (status === 529) throw new Error("Anthropic servers are busy \u2014 try again shortly.");
    throw new Error("API error (" + status + "): " + msg);
  }
  if (!data.content) throw new Error("Unexpected response (" + status + ").");
  return data.content.map(b => b.text || "").join("");
}

async function apiSummary(apiKey, systemPrompt, chatMessages) {
  const msgs = [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: SUMMARY_PROMPT }];
  const raw = await apiSend(apiKey, systemPrompt, msgs, 1000);
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

function buildSystemPrompt(sid, profile, summaries, mats, examMode) {
  const sub = SUBJECTS[sid]; if (!sub) return "";
  const board = profile.examBoards?.[sid] || "";
  const boardNote = !board ? "Exam board unknown \u2014 cover broadly. Encourage student to find out." : "";
  const matBlock = mats?.length ? `\n\nTEACHER MATERIALS (${mats.length} file${mats.length > 1 ? "s" : ""}): ${mats.map(m => m.name).join(", ")}. Use as primary reference.` : "";
  let histBlock = "";
  if (summaries?.length) {
    const recent = summaries.slice(-4);
    histBlock = "\n\nPAST SESSIONS (" + recent.length + "):\n" + recent.map(s => "[" + s.date + "]: " + (s.rawSummaryText || "").slice(0, 400)).join("\n---\n") + "\n\nAvoid re-teaching mastered topics, prioritise weak areas.";
  }
  return (examMode ? "EXAM PRACTICE MODE: student attempts first, then mark properly, show model answer.\n\n" : "") +
    `You are ${sub.tutor.name}, GCSE ${sub.label} tutor.\nSTUDENT: ${profile.name} | ${profile.year} | ${profile.tier} | Board: ${board || "not confirmed"} ${boardNote}${histBlock}${matBlock}\n\nEMOTIONAL AWARENESS: If frustrated, slow down, validate, use analogies. If confident, push harder. Never make student feel stupid.\nEXAM PRACTICE: student attempts first \u2192 mark (X/Y marks because...) \u2192 explain mark scheme \u2192 model answer.\nTRACKING: Track topics/confidence/errors. On "how am I doing?" give honest assessment with confidence % per topic.` + sub.systemPromptSpecific(board, profile.tier);
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
   SPEECH SERVICE — voice input/output for language subjects
   Only activates for subjects with voice.enabled = true (Spanish).
   Uses browser-native Web Speech API — no external services needed.
   Best support: Chrome/Edge. Partial: Safari. Limited: Firefox.
   ═══════════════════════════════════════════════════════════════════ */

const SpeechRecognitionAPI = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
const speechSynth = typeof window !== "undefined" ? window.speechSynthesis : null;
const HAS_RECOGNITION = !!SpeechRecognitionAPI;
const HAS_SYNTHESIS = !!speechSynth;

function findVoice(lang) {
  if (!HAS_SYNTHESIS) return null;
  const voices = speechSynth.getVoices();
  const prefix = lang.split("-")[0];
  return voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(prefix)) || null;
}

function speakText(text, voiceCfg, onEnd) {
  if (!HAS_SYNTHESIS || !text) return;
  speechSynth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = voiceCfg?.lang || "es-ES";
  utt.rate = voiceCfg?.rate || 0.9;
  utt.pitch = voiceCfg?.pitch || 1.1;
  const voice = findVoice(utt.lang);
  if (voice) utt.voice = voice;
  if (onEnd) utt.onend = onEnd;
  speechSynth.speak(utt);
}

function stopSpeaking() { if (HAS_SYNTHESIS) speechSynth.cancel(); }

// Preload voices (Chrome loads them asynchronously)
if (HAS_SYNTHESIS) { speechSynth.getVoices(); if (speechSynth.onvoiceschanged !== undefined) speechSynth.onvoiceschanged = () => speechSynth.getVoices(); }

function useSpeechRecognition(lang, onResult) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const start = useCallback(() => {
    if (!HAS_RECOGNITION || listening) return;
    const rec = new SpeechRecognitionAPI();
    rec.lang = lang || "es-ES";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let final = "", interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (cbRef.current) cbRef.current(final || interim, !!final);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); } catch { setListening(false); }
  }, [lang, listening]);

  const stop = useCallback(() => {
    if (recRef.current) try { recRef.current.stop(); } catch {}
    setListening(false);
  }, []);

  useEffect(() => () => { if (recRef.current) try { recRef.current.stop(); } catch {} }, []);
  return { listening, start, stop, supported: HAS_RECOGNITION };
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
   API KEY SCREEN + SETUP — same look, driven by subject registry
   ═══════════════════════════════════════════════════════════════════ */

function ApiKeyScreen({ onDone }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState(null);
  function verify() {
    const k = key.trim();
    if (!k.startsWith("sk-ant-")) { setErr("Key should start with 'sk-ant-' \u2014 check you copied it in full."); return; }
    onDone(k);
  }
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", padding: "40px 36px" }}>
          <div style={{ fontSize: 40, marginBottom: 16, textAlign: "center" }}>{"\ud83d\udd11"}</div>
          <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6, textAlign: "center" }}>GCSE TUTOR HUB</div>
          <h2 style={{ fontSize: 26, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 10, textAlign: "center" }}>Enter your API Key</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24, lineHeight: 1.7, textAlign: "center" }}>
            Get a key at <strong style={{ color: "#f0c040" }}>console.anthropic.com</strong><br />
            {"\u2192"} API Keys {"\u2192"} Create Key<br />
            Add a small credit ({"\u00a3"}5 starts fine). Costs ~{"\u00a3"}3{"\u2013"}8/month.
          </p>
          <input autoFocus value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === "Enter" && verify()} placeholder="sk-ant-api03-..." type="password"
            style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: `2px solid ${err ? "#f87171" : key ? "#f0c040" : "rgba(255,255,255,0.2)"}`, background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, fontFamily: "monospace", outline: "none", marginBottom: err ? 8 : 20 }} />
          {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>{"\u26a0\ufe0f"} {err}</div>}
          <button className="hb" onClick={verify} disabled={!key.trim()}
            style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: key.trim() ? "#f0c040" : "rgba(255,255,255,0.1)", color: key.trim() ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: key.trim() ? "pointer" : "default", transition: "all .2s" }}>
            Continue {"\u2192"}
          </button>
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              {"\ud83d\udd12"} Key stored in your browser only {"\u2014"} never sent anywhere except Anthropic.<br />
              {"\ud83d\udca1"} Set a spend limit in Console {"\u2192"} Settings {"\u2192"} Limits.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Setup({ onDone }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ name: "", year: "", tier: "", examBoards: {} });
  const steps = [
    { type: "text", field: "name", title: "What's your name?", sub: "Your tutors will use this throughout your sessions", ph: "Enter your first name..." },
    { type: "choice", field: "year", title: "Which year are you in?", sub: "Helps tutors prioritise the right content", opts: YEARS },
    { type: "choice", field: "tier", title: "Foundation or Higher tier?", sub: "Applies to Maths & Science", opts: TIERS },
    ...SUBJECT_STEPS.map(s => ({ type: "board", tid: s.tutorId, emoji: s.emoji, title: s.emoji + " " + s.label + " exam board?", sub: "Skip if unsure \u2014 your tutor will cover all boards." })),
  ];
  const cur = steps[step], isBoard = cur.type === "board", isLast = step === steps.length - 1;
  const get = () => isBoard ? (p.examBoards[cur.tid] || "") : (p[cur.field] || "");
  const set = v => isBoard ? setP(x => ({ ...x, examBoards: { ...x.examBoards, [cur.tid]: v } })) : setP(x => ({ ...x, [cur.field]: v }));
  const ok = isBoard || get().trim().length > 0;
  function next() { if (!ok) return; if (!isLast) setStep(s => s + 1); else onDone(p); }
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40 }}>
          {steps.map((_, i) => <div key={i} style={{ width: i === step ? 28 : 8, height: 8, borderRadius: 4, background: i <= step ? "#f0c040" : "rgba(255,255,255,0.2)", transition: "all .3s" }} />)}
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", padding: "40px 36px" }}>
          <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>SETUP {step + 1}/{steps.length}{isBoard ? " \u00b7 optional" : ""}</div>
          <h2 style={{ fontSize: 28, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>{cur.title}</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>{cur.sub}</p>
          {cur.type === "text" && <input autoFocus value={get()} onChange={e => set(e.target.value)} onKeyDown={e => e.key === "Enter" && next()} placeholder={cur.ph} style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 18, fontFamily: "'Source Sans 3',sans-serif", outline: "none", marginBottom: 20 }} />}
          {(cur.type === "choice" || cur.type === "board") && (
            <div style={{ display: "grid", gridTemplateColumns: cur.type === "board" ? "1fr 1fr 1fr" : (cur.opts?.length > 3 ? "1fr 1fr" : "1fr"), gap: 8, marginBottom: 12 }}>
              {(cur.opts || BOARDS).map(o => (
                <div key={o} className="so" onClick={() => set(get() === o ? "" : o)}
                  style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${get() === o ? "#f0c040" : "rgba(255,255,255,0.15)"}`, background: get() === o ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: get() === o ? "#f0c040" : "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: get() === o ? 700 : 400, cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  {o}
                </div>
              ))}
            </div>
          )}
          {isBoard && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>{get() ? "Selected: " + get() + " \u2014 click to deselect" : "Nothing selected \u2014 fine to skip"}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {isBoard && <button className="hb" onClick={next} style={{ flex: 1, padding: 14, borderRadius: 10, border: "2px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Skip</button>}
            <button className="hb" onClick={next} disabled={!ok} style={{ flex: 2, padding: 14, borderRadius: 10, border: "none", background: ok ? "#f0c040" : "rgba(255,255,255,0.1)", color: ok ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: ok ? "pointer" : "default" }}>
              {isLast ? "Meet Your Tutors \u2192" : isBoard && get() ? "Save " + get() + " \u2192" : "Continue \u2192"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   MODALS — Materials, Memory, Dashboard, Supabase, Summary
   ═══════════════════════════════════════════════════════════════════ */

function MaterialsPanel({ subject, mats, onAdd, onRemove, onClose }) {
  const fileRef = useRef(null);
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
          <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); processFiles(e.dataTransfer.files, onAdd, setErr); }} onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${drag ? subject.color : "#ddd"}`, borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: drag ? subject.color + "0a" : "#fafafa", transition: "all .2s", marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{"\ud83d\udcce"}</div>
            <div style={{ fontWeight: 700, color: "#333", fontSize: 15, marginBottom: 4 }}>Drop files here or click to browse</div>
            <div style={{ color: "#999", fontSize: 12, lineHeight: 1.6 }}>Photos of worksheets {"\u00b7"} Screenshots {"\u00b7"} PDFs {"\u00b7"} Text files (max {MAX_MB}MB)</div>
            <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => processFiles(e.target.files, onAdd, setErr)} />
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
          {SUBJECT_LIST.map(t => {
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

function SupabaseSettings({ onClose, onSave, initialUrl, initialKey }) {
  const [sbUrl, setSbUrl] = useState(initialUrl || "");
  const [sbKey, setSbKey] = useState(initialKey || "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);
  async function testAndSave() {
    if (!sbUrl.trim() || !sbKey.trim()) return;
    setTesting(true); setStatus(null);
    try { await sbTest(sbUrl.trim(), sbKey.trim()); saveSbCreds(sbUrl.trim(), sbKey.trim()); onSave(sbUrl.trim(), sbKey.trim()); setStatus("success"); }
    catch (e) { setStatus("error:" + e.message); } finally { setTesting(false); }
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#302b63)", borderRadius: "24px 24px 0 0", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>CLOUD DATABASE</div><div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Supabase Settings</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Close</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Project URL</div><input value={sbUrl} onChange={e => setSbUrl(e.target.value)} placeholder="https://yourproject.supabase.co" style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, fontFamily: "monospace", outline: "none" }} /></div>
          <div style={{ marginBottom: 20 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Anon Public Key</div><textarea value={sbKey} onChange={e => setSbKey(e.target.value)} rows={3} placeholder="eyJhbGciOiJIUzI1NiIs..." style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 12, fontFamily: "monospace", outline: "none", resize: "vertical" }} /></div>
          {status === "success" && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", color: "#16a34a", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>Connected {"\u2014"} memory now syncs to Supabase</div>}
          {status?.startsWith("error:") && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{status.slice(6)}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "2px solid #e0e0e0", background: "transparent", color: "#666", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={testAndSave} disabled={!sbUrl.trim() || !sbKey.trim() || testing} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{testing ? "Testing..." : "Save & Test Connection"}</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#aaa", lineHeight: 1.6 }}>Get these from your Supabase project: Settings {"\u2192"} API. Credentials stored locally in your browser.</div>
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
  const allSums = Object.entries(memory.subjects || {}).flatMap(([id, sums]) => (sums || []).map(s => ({ ...s, tutor: SUBJECT_LIST.find(t => t.id === id) || { emoji: "", label: id, gradient: "#999", color: "#999" } }))).sort((a, b) => new Date(b.date) - new Date(a.date));
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
            {SUBJECT_LIST.map(t => {
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
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */

migrateIfNeeded();

export default function App() {
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [profile, setProfile] = useState(loadProfile);
  const [sbCreds, setSbCreds] = useState(loadSbCreds);
  const [memory, setMemory] = useState(loadMemory);
  const [sessions, setSessions] = useState({});
  const [mats, setMats] = useState(emptyMats);
  const [active, setActiveRaw] = useState(null);
  const [modal, setModal] = useState(null); // "mats"|"memory"|"dash"|"settings"|null — only one at a time
  const [showSum, setShowSum] = useState(null);
  const [examMode, setExamMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [autoSumming, setAutoSumming] = useState(false);
  const [sbSynced, setSbSynced] = useState(false);
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
  const [speaking, setSpeaking] = useState(false);
  const prevMsgCountRef = useRef(0);
  const sendRef = useRef(null); // avoids stale closure in speech callback

  // Speech recognition hook — only active for voice-enabled subjects
  const { listening, start: startMic, stop: stopMic, supported: micSupported } = useSpeechRecognition(
    voiceCfg?.lang || "es-ES",
    useCallback((text, isFinal) => {
      setInput(text);
      if (isFinal && text.trim()) {
        // Small delay so user sees recognised text before sending
        const t = text.trim();
        setTimeout(() => { setInput(""); if (sendRef.current) sendRef.current(t); }, 400);
      }
    }, [])
  );

  // Auto-speak new assistant messages when voice mode is on
  useEffect(() => {
    if (!voiceMode || !voiceCfg || !msgs.length) return;
    if (msgs.length > prevMsgCountRef.current) {
      const last = msgs[msgs.length - 1];
      if (last.role === "assistant" && !last.content.startsWith("\u274c")) {
        setSpeaking(true);
        speakText(last.content, voiceCfg, () => setSpeaking(false));
      }
    }
    prevMsgCountRef.current = msgs.length;
  }, [msgs.length, voiceMode, voiceCfg]);

  // Stop speaking when leaving a subject
  useEffect(() => { if (!active) { stopSpeaking(); setSpeaking(false); } }, [active]);

  // Turn off voice mode when switching to a non-voice subject
  useEffect(() => { if (!voiceCfg) setVoiceMode(false); }, [voiceCfg]);

  // Persist memory
  useEffect(() => { saveMemory(memory); }, [memory]);

  // Supabase sync — merge, don't overwrite
  useEffect(() => {
    if (profile && sbCreds.url && sbCreds.key && !sbSynced) {
      setSbSynced(true);
      sbLoad(sbCreds.url, sbCreds.key, profile.name).then(cloud => {
        if (cloud) setMemory(prev => mergeMemory(prev, cloud));
      });
    }
  }, [profile, sbCreds, sbSynced]);

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
    const sys = buildSystemPrompt(active, profile, curMem, curMats, examMode);
    const voiceNote = voiceMode ? "VOICE MODE ACTIVE: Student is speaking aloud (speech-to-text). Keep responses conversational, shorter (2-3 sentences), and end with a question to keep the conversation flowing. Use more Spanish than usual. If the student's Spanish has speech-recognition errors, interpret charitably.\n\n" : "";
    const textMats = curMats.filter(m => m.isText);
    const fullSys = voiceNote + (textMats.length ? "TEACHER MATERIALS:\n" + textMats.map(m => "[" + m.name + "]:\n" + m.textContent).join("\n---\n") + "\n\n---\n\n" : "") + sys;
    const apiMsgs = buildApiMsgs(curMats, updated.map(m => ({ role: m.role, content: m.content })));
    try {
      const reply = await apiSend(apiKey, fullSys, apiMsgs);
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
      const sys = buildSystemPrompt(active, profile, curMem, curMats, false);
      const data = await apiSummary(apiKey, sys, msgs);
      setMemory(prev => addSessionToMem(prev, active, data));
      if (sbCreds.url && sbCreds.key && profile) sbSave(sbCreds.url, sbCreds.key, profile.name, active, data.date, JSON.stringify(data));
      setShowSum(data);
    } catch (e) { console.error("Summary failed:", e); } finally { setSumLoading(false); }
  }

  // Auto-save on subject switch
  async function autoSave(sid, chatMsgs, sidMats) {
    if (chatMsgs.length < 6 || autoSumming) return;
    setAutoSumming(true);
    try {
      const sys = buildSystemPrompt(sid, profile, getSessions(memory, sid), sidMats, false);
      const data = await apiSummary(apiKey, sys, chatMsgs);
      setMemory(prev => addSessionToMem(prev, sid, data));
      if (sbCreds.url && sbCreds.key && profile) sbSave(sbCreds.url, sbCreds.key, profile.name, sid, data.date, JSON.stringify(data));
    } catch {} finally { setAutoSumming(false); }
  }

  const basePrompts = active && SUBJECTS[active] ? SUBJECTS[active].quickPrompts(examMode, curMats.length > 0) : [];
  const quickPrompts = voiceMode ? ["Habl\u00e9mos en espa\u00f1ol", "Correct my pronunciation", ...basePrompts] : basePrompts;

  if (!apiKey) return <ApiKeyScreen onDone={k => { saveApiKey(k); setApiKey(k); }} />;
  if (!profile) return <Setup onDone={p => { saveProfile(p); setProfile(p); }} />;

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: active && subject ? subject.bg : "#f5f4f0", fontFamily: "'Source Sans 3',sans-serif", transition: "background .4s" }}>
        <style>{GLOBAL_CSS}</style>

        {/* Modals — only one at a time */}
        {modal === "mats" && active && <MaterialsPanel subject={subject} mats={curMats} onAdd={f => setMats(prev => ({ ...prev, [active]: [...prev[active], ...f] }))} onRemove={id => setMats(prev => ({ ...prev, [active]: prev[active].filter(m => m.id !== id) }))} onClose={() => setModal(null)} />}
        {modal === "memory" && <MemoryManager memory={memory} profile={profile} onClearSubject={sid => setMemory(prev => clearSubjectMem(prev, sid))} onClearAll={() => setMemory(clearAllMem())} onClose={() => setModal(null)} onImport={(p, m) => { saveProfile(p); setProfile(p); setMemory(m); setModal(null); }} />}
        {modal === "dash" && <Dashboard memory={memory} mats={mats} profile={profile} onClose={() => setModal(null)} />}
        {modal === "settings" && <SupabaseSettings initialUrl={sbCreds.url} initialKey={sbCreds.key} onSave={(url, key) => { setSbCreds({ url, key }); setSbSynced(false); }} onClose={() => setModal(null)} />}
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
              {voiceCfg && <button className="btn" onClick={() => { setVoiceMode(v => { if (v) stopSpeaking(); return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: voiceMode ? "#dc2626" : "rgba(0,0,0,0.07)", color: voiceMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{voiceMode ? "\ud83d\udd0a Voice ON" : "\ud83c\udf99\ufe0f Voice"}</button>}
              <button className="btn" onClick={genSummary} disabled={sumLoading || msgs.length < 3} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: msgs.length >= 3 ? subject.color : "rgba(0,0,0,0.07)", color: msgs.length >= 3 ? "#fff" : "#aaa", fontSize: 11, fontWeight: 700, opacity: sumLoading ? .6 : 1 }}>{sumLoading ? "Saving..." : "\ud83d\udccb Summary"}</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 5 }}>
            <button className="btn" onClick={() => setModal("settings")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: sbCreds.url ? "#1a1a2e" : "transparent", color: sbCreds.url ? "#fff" : "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{sbCreds.url ? "Connected" : "Connect DB"}</button>
            <button className="btn" onClick={() => setModal("memory")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83e\udde0"} Memory{totalMem > 0 ? " (" + totalMem + ")" : ""}</button>
            <button className="btn" onClick={() => setModal("dash")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc68\u200d\ud83d\udc67"} Parent</button>
          </div>
        </div>

        {/* Home or Chat */}
        {!active ? (
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "44px 22px" }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Playfair Display',serif", color: "#1a1a2e", marginBottom: 8 }}>Hello, {profile.name}.<br /><span style={{ color: "#888", fontWeight: 400 }}>Who's tutoring you today?</span></h1>
            <p style={{ color: "#999", fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>{totalMem > 0 ? "\ud83e\udde0 " + totalMem + " session" + (totalMem > 1 ? "s" : "") + " in memory \u2014 your tutors remember your progress." : "Your tutors adapt to you and remember your progress after each session."}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
              {SUBJECT_LIST.map((t, i) => {
                const sc = getSessions(memory, t.id).length, mc = (mats[t.id] || []).length;
                return (
                  <div key={t.id} className="card" onClick={() => setActive(t.id)} style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", animation: `ci .4s ease ${i * .08}s both` }}>
                    <div style={{ background: t.gradient, padding: "20px 18px 16px" }}><div style={{ fontSize: 32, marginBottom: 6 }}>{t.emoji}</div><div style={{ fontFamily: "'Playfair Display',serif", color: "#fff", fontSize: 17, fontWeight: 700 }}>{t.tutor.name}</div><div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{t.label}</div></div>
                    <div style={{ background: "#fff", padding: "10px 18px" }}>
                      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{t.description}</div>
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
              {listening && <div style={{ maxWidth: 680, margin: "0 auto 6px", padding: "8px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "mp 1.2s ease infinite" }} />Listening... speak in Spanish or English</div>}
              <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={listening ? "Listening..." : examMode ? "Paste your question or attempt here..." : voiceCfg ? "Type or tap \ud83c\udf99\ufe0f to speak..." : "Message " + subject.tutor.name + "..."} rows={1}
                  style={{ flex: 1, padding: "12px 15px", borderRadius: 14, border: `2px solid ${listening ? "#dc2626" : input ? subject.color : "#e0e0e0"}`, resize: "none", fontSize: 14, lineHeight: 1.5, background: "#fff", maxHeight: 120, overflow: "auto", transition: "border-color .2s", outline: "none" }}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
                {voiceCfg && micSupported && (
                  <button onClick={() => { if (listening) stopMic(); else { stopSpeaking(); startMic(); } }}
                    style={{ width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0, background: listening ? "#dc2626" : "#fef2f2", color: listening ? "#fff" : "#dc2626", fontSize: 18, cursor: "pointer", transition: "all .2s", animation: listening ? "mp 1.2s ease infinite" : "none" }}
                    title={listening ? "Stop listening" : "Speak"}>{"\ud83c\udf99\ufe0f"}</button>
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
