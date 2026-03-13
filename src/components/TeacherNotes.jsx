import { useState } from "react";

const EMPTY_NOTE = {
  source: "",
  date: new Date().toISOString().slice(0, 10),
  focus: "",
  strengths: "",
  weaknesses: "",
  approach: "",
  expires: "",
};

function NoteForm({ subject, note, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...EMPTY_NOTE, ...note });
  const set = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
  const canSave = draft.source.trim() && (draft.focus.trim() || draft.strengths.trim() || draft.weaknesses.trim() || draft.approach.trim());

  return (
    <div style={{ padding: "16px 22px" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Record feedback from your teacher so your AI tutor can adapt.</div>

      <label style={lbl}>Source / Teacher name</label>
      <input value={draft.source} onChange={e => set("source", e.target.value)} placeholder="e.g. Mrs Smith, Parents Evening" style={inp} />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Date of feedback</label>
          <input type="date" value={draft.date} onChange={e => set("date", e.target.value)} style={inp} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Expires (optional)</label>
          <input type="date" value={draft.expires} onChange={e => set("expires", e.target.value)} style={inp} />
        </div>
      </div>

      <label style={lbl}>Focus areas</label>
      <textarea value={draft.focus} onChange={e => set("focus", e.target.value)} placeholder="e.g. Past papers only, Topic 7 — Organic Chemistry" rows={2} style={{ ...inp, resize: "vertical" }} />

      <label style={lbl}>Strengths noted</label>
      <textarea value={draft.strengths} onChange={e => set("strengths", e.target.value)} placeholder="e.g. Good grasp of equations, confident in speaking" rows={2} style={{ ...inp, resize: "vertical" }} />

      <label style={lbl}>Weaknesses noted</label>
      <textarea value={draft.weaknesses} onChange={e => set("weaknesses", e.target.value)} placeholder="e.g. Exam technique under timed conditions, grammar accuracy" rows={2} style={{ ...inp, resize: "vertical" }} />

      <label style={lbl}>Approach / method</label>
      <textarea value={draft.approach} onChange={e => set("approach", e.target.value)} placeholder="e.g. Exam-style questions only, focus on mark schemes" rows={2} style={{ ...inp, resize: "vertical" }} />

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => canSave && onSave({ ...draft, id: note?.id || Date.now().toString() })} disabled={!canSave} style={{ flex: 1.5, padding: "10px 0", borderRadius: 10, border: "none", background: canSave ? subject.color : "#ccc", color: "#fff", fontSize: 12, fontWeight: 700, cursor: canSave ? "pointer" : "default" }}>Save note</button>
      </div>
    </div>
  );
}

function NoteCard({ note, subject, isExpired, onEdit, onDelete }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid " + (isExpired ? "#e8e8e8" : "#e0e8f0"), marginBottom: 8, background: isExpired ? "#fafafa" : "#fff", opacity: isExpired ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{note.source}</div>
          <div style={{ fontSize: 10, color: "#999" }}>{formatDate(note.date)}{note.expires ? " \u00b7 expires " + formatDate(note.expires) : ""}{isExpired ? " \u00b7 EXPIRED" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888", padding: "2px 6px" }}>Edit</button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#e74c3c", padding: "2px 6px" }}>{"\u2715"}</button>
        </div>
      </div>
      {note.focus && <Field label="Focus" value={note.focus} color={subject.color} />}
      {note.strengths && <Field label="Strengths" value={note.strengths} color="#22c55e" />}
      {note.weaknesses && <Field label="Weaknesses" value={note.weaknesses} color="#ef4444" />}
      {note.approach && <Field label="Approach" value={note.approach} color="#8b5cf6" />}
    </div>
  );
}

function Field({ label, value, color }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}: </span>
      <span style={{ fontSize: 12, color: "#444" }}>{value}</span>
    </div>
  );
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}

export function isNoteExpired(note) {
  if (!note.expires) return false;
  return new Date(note.expires + "T23:59:59") < new Date();
}

export function getActiveNotes(notes, subjectId) {
  const subjectNotes = notes?.[subjectId] || [];
  return subjectNotes.filter(n => !isNoteExpired(n));
}

export function buildTeacherNotesPrompt(notes, subjectId) {
  const active = getActiveNotes(notes, subjectId);
  if (!active.length) return "";
  const lines = active.map(n => {
    const parts = [];
    if (n.focus) parts.push("FOCUS: " + n.focus);
    if (n.strengths) parts.push("STRENGTHS: " + n.strengths);
    if (n.weaknesses) parts.push("WEAKNESSES: " + n.weaknesses);
    if (n.approach) parts.push("APPROACH: " + n.approach);
    return `[${n.source}, ${formatDate(n.date)}]:\n${parts.join("\n")}`;
  });
  return "\n\nTEACHER GUIDANCE (from real teacher feedback — treat as HIGH PRIORITY instructions):\n" + lines.join("\n---\n") + "\n\nYou MUST incorporate this teacher guidance into every interaction. Prioritise the focus areas, reinforce strengths, target weaknesses, and follow the recommended approach. This feedback comes from the student's actual teacher and should override your own assessment of what to work on.\n";
}

export function TeacherNotes({ subject, notes, onSave, onClose }) {
  const subjectNotes = notes?.[subject.id] || [];
  const [editing, setEditing] = useState(null); // null = list view, "new" = new note, note object = editing

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

  const activeCount = subjectNotes.filter(n => !isNoteExpired(n)).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>TEACHER NOTES</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{subjectNotes.length} note{subjectNotes.length !== 1 ? "s" : ""}{activeCount !== subjectNotes.length ? " \u00b7 " + activeCount + " active" : ""}</div>
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
              note={editing === "new" ? null : editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : subjectNotes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{"\ud83d\udcdd"}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>No teacher notes yet</div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>After parents evening or a progress review, add your teacher's feedback here. Your AI tutor will use it to focus on what matters most.</div>
            </div>
          ) : (
            <div style={{ padding: "12px 22px 22px" }}>
              {subjectNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  subject={subject}
                  isExpired={isNoteExpired(note)}
                  onEdit={() => setEditing(note)}
                  onDelete={() => handleDelete(note.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 3, marginTop: 10, textTransform: "uppercase", letterSpacing: "0.04em" };
const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
