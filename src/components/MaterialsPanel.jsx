import { useState, useRef } from "react";
import { processFiles } from "../utils/files.js";

export function MaterialsPanel({ subject, mats, onAdd, onRemove, onClose }) {
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

