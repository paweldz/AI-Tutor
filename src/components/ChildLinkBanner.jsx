import { useState, useEffect } from "react";
import { loadPendingLinks, confirmLink, rejectLink } from "../utils/parentSync.js";

export function ChildLinkBanner() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    loadPendingLinks().then(setLinks).catch(() => {});
  }, []);

  if (links.length === 0) return null;

  async function handleConfirm(link) {
    await confirmLink(link.id);
    setLinks(prev => prev.filter(l => l.id !== link.id));
  }

  async function handleReject(link) {
    await rejectLink(link.id);
    setLinks(prev => prev.filter(l => l.id !== link.id));
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 22px" }}>
      {links.map(link => (
        <div key={link.id} style={{ background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", border: "1px solid #bae6fd", borderRadius: 14, padding: "14px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>{"\ud83d\udc68\u200d\ud83d\udc67"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Parent link request</div>
            <div style={{ fontSize: 11, color: "#666" }}>A parent wants to view your progress</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => handleConfirm(link)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Allow</button>
            <button onClick={() => handleReject(link)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Deny</button>
          </div>
        </div>
      ))}
    </div>
  );
}
