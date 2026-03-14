import { useState } from "react";
import { SUBJECTS, mySubjects } from "../config/subjects.js";
import { EVENT_TYPES, getUpcoming, formatEventDate, daysUntil, eventTypeInfo } from "../utils/events.js";

/**
 * Full-screen events management panel — filterable by subject and type.
 * Works for both student (own events) and parent (child's events).
 */
export function EventsPanel({ events, profile, onAdd, onEdit, onComplete, onDelete, onClose }) {
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tab, setTab] = useState("upcoming"); // "upcoming" | "completed"
  const [confirmId, setConfirmId] = useState(null);

  const subs = mySubjects(profile);

  const filtered = (events || []).filter(ev => {
    if (subjectFilter !== "all" && ev.subjectId !== subjectFilter) return false;
    if (typeFilter !== "all" && ev.type !== typeFilter) return false;
    if (tab === "upcoming") return ev.status === "upcoming";
    return ev.status === "completed";
  }).sort((a, b) => tab === "upcoming" ? a.date.localeCompare(b.date) : (b.completedAt || b.date).localeCompare(a.completedAt || a.date));

  function handleDelete(id) {
    if (confirmId === id) { onDelete(id); setConfirmId(null); }
    else setConfirmId(id);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>MANAGE</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{"\ud83d\udcc5"} Events</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{(events || []).length} event{(events || []).length !== 1 ? "s" : ""} total</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={onAdd} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>+ Add Event</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
          {[["upcoming", "Upcoming"], ["completed", "Completed"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "10px 0", border: "none", borderBottom: tab === key ? "2px solid #6366f1" : "2px solid transparent", background: "transparent", color: tab === key ? "#6366f1" : "#999", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, padding: "12px 22px 8px", flexWrap: "wrap" }}>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12, fontWeight: 600, color: "#444", background: "#fff", cursor: "pointer" }}>
            <option value="all">All subjects</option>
            {subs.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12, fontWeight: 600, color: "#444", background: "#fff", cursor: "pointer" }}>
            <option value="all">All types</option>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </div>

        {/* Event list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 22px 22px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{tab === "upcoming" ? "\ud83d\udcc5" : "\u2705"}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{tab === "upcoming" ? "No upcoming events" : "No completed events"}</div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>{tab === "upcoming" ? "Tap '+ Add Event' to create one." : "Complete events to see them here."}</div>
            </div>
          ) : (
            filtered.map(ev => {
              const sub = SUBJECTS[ev.subjectId];
              const ti = eventTypeInfo(ev.type);
              const days = daysUntil(ev.date);
              const urgent = tab === "upcoming" && days <= 1;
              const isConfirming = confirmId === ev.id;
              return (
                <div key={ev.id} style={{ borderRadius: 14, border: urgent ? "2px solid #ef4444" : "1px solid #f0f0f0", marginBottom: 8, overflow: "hidden", background: "#fff" }}>
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{ti.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
                        {ev.title}
                        {ev.createdBy === "parent" && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#dbeafe", color: "#1d4ed8" }}>Parent</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                        {sub?.emoji} {sub?.label}
                        {ev.topics?.length > 0 ? " \u00b7 " + ev.topics.slice(0, 3).join(", ") : ""}
                      </div>
                      {ev.status === "completed" && ev.score != null && ev.maxScore && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: (ev.score / ev.maxScore) >= 0.7 ? "#22c55e" : "#f59e0b", marginTop: 2 }}>
                          Score: {ev.score}/{ev.maxScore} ({Math.round(ev.score / ev.maxScore * 100)}%)
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", marginRight: 4, flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? "#ef4444" : sub?.color || "#6366f1" }}>{formatEventDate(ev.date)}</div>
                      {tab === "upcoming" && days > 1 && <div style={{ fontSize: 10, color: "#bbb" }}>{days} days</div>}
                      {tab === "completed" && ev.selfAssessment && <div style={{ fontSize: 14 }}>{[null, "\ud83d\ude29", "\ud83d\ude1f", "\ud83d\ude10", "\ud83d\ude0a", "\ud83e\udd29"][ev.selfAssessment]}</div>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, padding: "0 14px 10px", flexWrap: "wrap" }}>
                    {tab === "upcoming" && onComplete && (
                      <button onClick={() => onComplete(ev)} style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid #22c55e", background: "transparent", color: "#22c55e", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{"\u2705"} Complete</button>
                    )}
                    {onEdit && (
                      <button onClick={() => onEdit(ev)} style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid #6366f1", background: "transparent", color: "#6366f1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{"\u270e"} Edit</button>
                    )}
                    {onDelete && (
                      <button onClick={() => handleDelete(ev.id)} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 8, border: isConfirming ? "1.5px solid #ef4444" : "1.5px solid #e5e7eb", background: isConfirming ? "#fef2f2" : "transparent", color: isConfirming ? "#ef4444" : "#aaa", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{isConfirming ? "Confirm?" : "\ud83d\uddd1\ufe0f"}</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
