import { useState } from "react";
import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { EVENT_TYPES, createEvent } from "../utils/events.js";
import { getTopicsForSubject } from "../utils/topics.js";

export function EventModal({ subjectId, profile, customTopics, event, onSave, onClose }) {
  const isEdit = !!event;
  const subs = mySubjects(profile);
  const needsPicker = !subjectId && !isEdit;

  const [pickedSubject, setPickedSubject] = useState(subs.length === 1 ? subs[0].id : "");
  const effectiveSubjectId = subjectId || (isEdit ? event.subjectId : pickedSubject) || null;
  const sub = effectiveSubjectId ? SUBJECTS[effectiveSubjectId] : null;
  const topics = effectiveSubjectId ? getTopicsForSubject(effectiveSubjectId, profile, customTopics) : [];

  const [type, setType] = useState(event?.type || "test");
  const [title, setTitle] = useState(event?.title || "");
  const [date, setDate] = useState(event?.date || "");
  const [description, setDescription] = useState(event?.description || "");
  const [selectedTopics, setSelectedTopics] = useState(event?.topics || []);
  const [reminder, setReminder] = useState(event?.reminderDays?.[0] ?? 7);

  function toggleTopic(t) {
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function handleSave() {
    if (!title.trim() || !date || !effectiveSubjectId) return;
    if (isEdit) {
      onSave({
        ...event,
        type, title: title.trim(), date, description: description.trim(),
        topics: selectedTopics,
        reminderDays: reminder > 0 ? [reminder, 1] : [1],
      });
    } else {
      onSave(createEvent({
        subjectId: effectiveSubjectId,
        type, title: title.trim(), date, description: description.trim(),
        topics: selectedTopics,
        reminderDays: reminder > 0 ? [reminder, 1] : [1],
        createdBy: profile.role || "student",
      }));
    }
    onClose();
  }

  const color = sub?.color || "#6366f1";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>{isEdit ? "Edit Event" : "New Event"}</div>
              {sub && <div style={{ fontSize: 12, color: color }}>{sub.emoji} {sub.label}</div>}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#999", cursor: "pointer" }}>{"\u2715"}</button>
          </div>
        </div>

        <div style={{ padding: "16px 24px 24px" }}>
          {/* Subject picker — shown when no subject pre-selected */}
          {needsPicker && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {subs.map(s => (
                  <button key={s.id} onClick={() => { setPickedSubject(s.id); setSelectedTopics([]); }} style={{ padding: "7px 14px", borderRadius: 12, border: pickedSubject === s.id ? `2px solid ${s.color}` : "2px solid #eee", background: pickedSubject === s.id ? s.color + "14" : "#fff", color: pickedSubject === s.id ? s.color : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Event type */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {EVENT_TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)} style={{ padding: "6px 12px", borderRadius: 12, border: type === t.value ? `2px solid ${color}` : "2px solid #eee", background: type === t.value ? color + "14" : "#fff", color: type === t.value ? color : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Trigonometry Quiz" style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, marginTop: 6, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, marginTop: 6, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any extra details..." rows={2} style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 13, marginTop: 6, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          {/* Reminder */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Remind me</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[{ v: 0, l: "None" }, { v: 1, l: "1 day" }, { v: 3, l: "3 days" }, { v: 7, l: "1 week" }, { v: 14, l: "2 weeks" }].map(r => (
                <button key={r.v} onClick={() => setReminder(r.v)} style={{ padding: "6px 12px", borderRadius: 10, border: reminder === r.v ? `2px solid ${color}` : "2px solid #eee", background: reminder === r.v ? color + "14" : "#fff", color: reminder === r.v ? color : "#666", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {r.l}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          {topics.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Topics covered (optional)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, maxHeight: 120, overflow: "auto" }}>
                {topics.map(t => (
                  <button key={t} onClick={() => toggleTopic(t)} style={{ padding: "4px 10px", borderRadius: 8, border: selectedTopics.includes(t) ? `2px solid ${color}` : "1px solid #ddd", background: selectedTopics.includes(t) ? color + "14" : "#fafafa", color: selectedTopics.includes(t) ? color : "#666", fontSize: 11, cursor: "pointer" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={!title.trim() || !date || !effectiveSubjectId} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: (!title.trim() || !date || !effectiveSubjectId) ? "#ccc" : color, color: "#fff", fontSize: 14, fontWeight: 700, cursor: (!title.trim() || !date || !effectiveSubjectId) ? "default" : "pointer" }}>
            {isEdit ? "Save Changes" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
