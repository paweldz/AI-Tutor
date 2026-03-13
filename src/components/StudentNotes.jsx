import { useState } from "react";
import { getTopicsForSubject } from "../utils/topics.js";

const TAG_OPTIONS = [
  { label: "Important", emoji: "\u2757", color: "#ef4444", bg: "#fef2f2" },
  { label: "Tricky", emoji: "\ud83e\udde9", color: "#f59e0b", bg: "#fffbeb" },
  { label: "Practice later", emoji: "\ud83d\udd04", color: "#3b82f6", bg: "#eff6ff" },
  { label: "Cool fact", emoji: "\u2728", color: "#8b5cf6", bg: "#f5f3ff" },
  { label: "Exam tip", emoji: "\ud83c\udfaf", color: "#059669", bg: "#ecfdf5" },
  { label: "Formula", emoji: "\ud83d\udcca", color: "#0891b2", bg: "#ecfeff" },
];

const POSTIT_COLORS = ["#fff9c4", "#c8e6c9", "#bbdefb", "#f8bbd0", "#e1bee7", "#ffe0b2", "#b2dfdb"];

function NoteForm({ subject, profile, customTopics, note, onSave, onCancel }) {
  const topics = getTopicsForSubject(subject.id, profile, customTopics);
  const [topic, setTopic] = useState(note?.topic || "");
  const [text, setText] = useState(note?.text || "");
  const [tags, setTags] = useState(note?.tags || []);

  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const canSave = text.trim().length > 0;

  return (
    <div style={{ padding: "16px 22px" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Jot down something worth remembering.</div>

      <label style={lbl}>Topic (optional)</label>
      <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
        <option value="">General / no specific topic</option>
        {topics.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <label style={lbl}>Note</label>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Mitosis = cell division for growth. Remember PMAT!" rows={3} style={{ ...inp, resize: "vertical" }} autoFocus />

      <label style={lbl}>Tags</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {TAG_OPTIONS.map(t => {
          const active = tags.includes(t.label);
          return (
            <button key={t.label} onClick={() => toggleTag(t.label)} style={{ padding: "5px 10px", borderRadius: 8, border: active ? "2px solid " + t.color : "1.5px solid #e0e0e0", background: active ? t.bg : "#fafafa", color: active ? t.color : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
              {t.emoji} {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => canSave && onSave({ id: note?.id || Date.now().toString(), topic, text: text.trim(), tags, date: new Date().toISOString().slice(0, 10), color: note?.color || POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)] })} disabled={!canSave} style={{ flex: 1.5, padding: "10px 0", borderRadius: 10, border: "none", background: canSave ? subject.color : "#ccc", color: "#fff", fontSize: 12, fontWeight: 700, cursor: canSave ? "pointer" : "default" }}>
          {note?.id ? "Update note" : "Add note"}
        </button>
      </div>
    </div>
  );
}

function NoteCard({ note, subject, onEdit, onDelete }) {
  const tagMap = Object.fromEntries(TAG_OPTIONS.map(t => [t.label, t]));

  return (
    <div style={{ padding: "14px 16px", borderRadius: 14, background: note.color || "#fff9c4", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          {note.topic && (
            <div style={{ fontSize: 10, fontWeight: 700, color: subject.color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
              {subject.emoji} {note.topic}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#999" }}>{formatDate(note.date)}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#888", padding: "2px 6px" }}>Edit</button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#e74c3c", padding: "2px 6px" }}>{"\u2715"}</button>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{note.text}</div>
      {note.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
          {note.tags.map(t => {
            const info = tagMap[t];
            return info ? (
              <span key={t} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,0.7)", color: info.color, fontWeight: 700 }}>{info.emoji} {t}</span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}

export function getStudentNoteCount(notes, subjectId) {
  return (notes?.[subjectId] || []).length;
}

export function buildStudentNotesPrompt(notes, subjectId) {
  const list = notes?.[subjectId] || [];
  if (!list.length) return "";
  const lines = list.map(n => {
    let line = "";
    if (n.topic) line += "[" + n.topic + "] ";
    line += n.text;
    if (n.tags?.length) line += " (" + n.tags.join(", ") + ")";
    return line;
  });
  return "\n\nSTUDENT'S OWN NOTES (post-it reminders the student saved — reference these when relevant to reinforce their self-directed learning):\n" + lines.join("\n") + "\n";
}

export function StudentNotes({ subject, profile, customTopics, notes, onSave, onClose }) {
  const subjectNotes = notes?.[subject.id] || [];
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");

  function handleSave(note) {
    const existing = [...subjectNotes];
    const idx = existing.findIndex(n => n.id === note.id);
    if (idx >= 0) existing[idx] = note; else existing.push(note);
    onSave(subject.id, existing);
    setEditing(null);
  }

  function handleDelete(id) {
    onSave(subject.id, subjectNotes.filter(n => n.id !== id));
  }

  const allTags = [...new Set(subjectNotes.flatMap(n => n.tags || []))];
  const filtered = filter === "all" ? subjectNotes : subjectNotes.filter(n => n.tags?.includes(filter));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>MY NOTES</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{subjectNotes.length} note{subjectNotes.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!editing && (
              <button onClick={() => setEditing("new")} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add note</button>
            )}
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {editing ? (
            <NoteForm
              subject={subject}
              profile={profile}
              customTopics={customTopics}
              note={editing === "new" ? null : editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : subjectNotes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{"\ud83d\udccc"}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>No notes yet</div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>Save quick reminders, key facts, formulas, or anything you want to remember. Tag them so you can find them easily later.</div>
            </div>
          ) : (
            <div style={{ padding: "12px 22px 22px" }}>
              {/* Tag filter bar */}
              {allTags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                  <button onClick={() => setFilter("all")} style={{ padding: "3px 9px", borderRadius: 6, border: filter === "all" ? "1.5px solid " + subject.color : "1px solid #e0e0e0", background: filter === "all" ? subject.color + "14" : "#fafafa", color: filter === "all" ? subject.color : "#888", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>All</button>
                  {allTags.map(t => {
                    const info = TAG_OPTIONS.find(o => o.label === t);
                    const active = filter === t;
                    return (
                      <button key={t} onClick={() => setFilter(active ? "all" : t)} style={{ padding: "3px 9px", borderRadius: 6, border: active ? "1.5px solid " + (info?.color || "#888") : "1px solid #e0e0e0", background: active ? (info?.bg || "#f5f5f5") : "#fafafa", color: active ? (info?.color || "#888") : "#888", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                        {info?.emoji} {t}
                      </button>
                    );
                  })}
                </div>
              )}
              {filtered.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  subject={subject}
                  onEdit={() => setEditing(note)}
                  onDelete={() => handleDelete(note.id)}
                />
              ))}
              {filtered.length === 0 && filter !== "all" && (
                <div style={{ textAlign: "center", padding: "20px", fontSize: 12, color: "#999" }}>No notes with this tag.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 3, marginTop: 10, textTransform: "uppercase", letterSpacing: "0.04em" };
const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
