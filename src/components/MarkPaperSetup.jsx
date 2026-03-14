import { useState, useRef } from "react";
import { processFiles } from "../utils/files.js";

/**
 * Mark Paper modal — student uploads a completed test (photo/PDF/text)
 * and optionally an official mark scheme. The tutor then marks and reviews.
 */
export function MarkPaperSetup({ subject, onStart, onClose }) {
  const [description, setDescription] = useState("");
  const [paperMats, setPaperMats] = useState([]);
  const [schemeMats, setSchemeMats] = useState([]);
  const [error, setError] = useState(null);
  const paperFileRef = useRef(null);
  const paperCameraRef = useRef(null);
  const schemeFileRef = useRef(null);
  const schemeCameraRef = useRef(null);

  const canStart = paperMats.length > 0;

  function handlePaperFiles(files) {
    processFiles(files, mats => setPaperMats(prev => [...prev, ...mats]), err => setError(err));
  }
  function handleSchemeFiles(files) {
    processFiles(files, mats => setSchemeMats(prev => [...prev, ...mats]), err => setError(err));
  }

  function handleStart() {
    if (!canStart) return;
    onStart({
      paperMats,
      schemeMats,
      description: description.trim(),
      subjectId: subject.id,
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ background: subject.gradient, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>MARK PAPER</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{subject.emoji} {subject.label}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>{"\u2715"}</button>
        </div>

        <div style={{ padding: 22 }}>
          {/* Info */}
          <div style={{ background: subject.color + "0c", border: "1px solid " + subject.color + "20", borderRadius: 12, padding: "12px 14px", marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: subject.color, marginBottom: 4 }}>How it works</div>
            <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>
              Upload your completed test and your tutor will mark each answer, explain where marks were gained or lost, and give you a final score with feedback. If you have the official mark scheme, upload it too for more accurate marking.
            </div>
          </div>

          {/* Completed test upload */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Completed Test *</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div onClick={() => paperFileRef.current?.click()} style={{ flex: 1, border: "2px dashed #ddd", borderRadius: 12, padding: "16px 14px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{"\ud83d\udcce"}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>Upload file</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>PDF, photo, or text</div>
              <input ref={paperFileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => handlePaperFiles(e.target.files)} />
            </div>
            <div onClick={() => paperCameraRef.current?.click()} style={{ flex: 1, border: "2px dashed #ddd", borderRadius: 12, padding: "16px 14px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{"\ud83d\udcf7"}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>Take photo</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Snap your paper</div>
              <input ref={paperCameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handlePaperFiles(e.target.files)} />
            </div>
          </div>
          <FileList files={paperMats} onRemove={id => setPaperMats(prev => prev.filter(x => x.id !== id))} />

          {/* Mark scheme upload (optional) */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, marginTop: 18 }}>Mark Scheme (optional)</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div onClick={() => schemeFileRef.current?.click()} style={{ flex: 1, border: "2px dashed " + (schemeMats.length ? "#bbf7d0" : "#ddd"), borderRadius: 12, padding: "14px 12px", textAlign: "center", cursor: "pointer", background: schemeMats.length ? "#f0fdf4" : "#fafafa" }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{"\ud83d\udcce"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>Upload mark scheme</div>
              <input ref={schemeFileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{ display: "none" }} onChange={e => handleSchemeFiles(e.target.files)} />
            </div>
            <div onClick={() => schemeCameraRef.current?.click()} style={{ flex: 1, border: "2px dashed " + (schemeMats.length ? "#bbf7d0" : "#ddd"), borderRadius: 12, padding: "14px 12px", textAlign: "center", cursor: "pointer", background: schemeMats.length ? "#f0fdf4" : "#fafafa" }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{"\ud83d\udcf7"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>Photo mark scheme</div>
              <input ref={schemeCameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleSchemeFiles(e.target.files)} />
            </div>
          </div>
          <FileList files={schemeMats} onRemove={id => setSchemeMats(prev => prev.filter(x => x.id !== id))} />

          {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}

          {/* Description */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, marginTop: 18 }}>Description (optional)</div>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Paper 1 Higher, June 2024, Algebra & Geometry"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 22 }}
          />

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: canStart ? subject.color : "#e0e0e0",
              color: canStart ? "#fff" : "#aaa",
              fontWeight: 700, fontSize: 15, cursor: canStart ? "pointer" : "default",
            }}
          >
            {"\ud83d\udcdd"} Start Marking
          </button>
        </div>
      </div>
    </div>
  );
}

function FileList({ files, onRemove }) {
  if (!files.length) return null;
  return (
    <div>
      {files.map(m => (
        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>{m.isPdf ? "\ud83d\udcc4" : m.isImg ? "\ud83d\uddbc\ufe0f" : "\ud83d\udcdd"}</span>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
          <button onClick={() => onRemove(m.id)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 11 }}>{"\u2715"}</button>
        </div>
      ))}
    </div>
  );
}
