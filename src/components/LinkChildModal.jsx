import { useState } from "react";
import { linkChildByEmail } from "../utils/parentSync.js";

export function LinkChildModal({ onClose, onLinked }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await linkChildByEmail(email.trim());
      setSuccess(true);
      if (onLinked) onLinked();
    } catch (err) {
      setError(err.message || "Failed to send link request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 440, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "22px 26px", background: "linear-gradient(135deg,#1a1a2e,#302b63)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>LINK A CHILD</div>
            <div style={{ color: "#fff", fontSize: 18, fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>Connect to your child's account</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>{"\u2715"}</button>
        </div>

        <div style={{ padding: "24px 26px" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{"\u2705"}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Link request sent!</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>
                Your child will see a notification to confirm the link next time they open the app. Once confirmed, their progress will appear on your dashboard.
              </div>
              <button onClick={onClose} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>
                Enter your child's email address (the one they use to sign in to Cheato). They'll need to confirm the link from their account.
              </p>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="child@example.com"
                required
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
              />
              {error && <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: loading ? "#ccc" : "#1a1a2e", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer" }}
              >
                {loading ? "Sending..." : "Send Link Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
