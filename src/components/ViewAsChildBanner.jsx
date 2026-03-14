export function ViewAsChildBanner({ childName, onBack }) {
  return (
    <div style={{ background: "linear-gradient(90deg,#302b63,#1a1a2e)", padding: "8px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{"\ud83d\udc41\ufe0f"}</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>
          Viewing as <strong style={{ color: "#f0c040" }}>{childName}</strong> (read-only)
        </span>
      </div>
      <button onClick={onBack} style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
        {"\u2190"} Back to Parent Dashboard
      </button>
    </div>
  );
}
