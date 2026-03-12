import { useState } from "react";

export function AuthScreen({ onSignIn, onSignUp, onReset }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "reset") {
        await onReset(email);
        setResetSent(true);
      } else if (mode === "signup") {
        await onSignUp(email, password);
      } else {
        await onSignIn(email, password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const wrap = children => (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", padding: "40px 36px" }}>
          {children}
        </div>
      </div>
    </div>
  );

  if (mode === "reset") return wrap(
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>ACCOUNT</div>
      <h2 style={{ fontSize: 24, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Reset password</h2>
      {resetSent ? (
        <>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 20 }}>Check your email for a reset link.</p>
          <button type="button" onClick={() => { setMode("login"); setResetSent(false); }} className="hb" style={btnStyle(true)}>Back to login</button>
        </>
      ) : (
        <>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>Enter your email to receive a password reset link.</p>
          <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required style={inputStyle} />
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" disabled={loading} className="hb" style={btnStyle(!loading)}>{loading ? "Sending..." : "Send reset link"}</button>
          <div style={linkRow}><span style={linkStyle} onClick={() => setMode("login")}>Back to login</span></div>
        </>
      )}
    </form>
  );

  return wrap(
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em", marginBottom: 6 }}>WELCOME</div>
      <h2 style={{ fontSize: 24, color: "#fff", fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>
        {mode === "signup" ? "Create your account" : "Sign in to your tutor"}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24 }}>
        {mode === "signup" ? "Get started with GCSE Tutor Hub" : "Your progress is saved securely in the cloud"}
      </p>
      <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required style={{ ...inputStyle, marginBottom: 10 }} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6} style={inputStyle} />
      {error && <div style={errorStyle}>{error}</div>}
      <button type="submit" disabled={loading} className="hb" style={btnStyle(!loading)}>
        {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <div style={linkRow}>
        {mode === "login" ? (
          <>
            <span style={linkStyle} onClick={() => setMode("signup")}>Create account</span>
            <span style={linkStyle} onClick={() => setMode("reset")}>Forgot password?</span>
          </>
        ) : (
          <span style={linkStyle} onClick={() => setMode("login")}>Already have an account? Sign in</span>
        )}
      </div>
    </form>
  );
}

const inputStyle = { width: "100%", padding: "14px 18px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 15, outline: "none", marginBottom: 16, boxSizing: "border-box" };
const errorStyle = { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 };
const linkRow = { display: "flex", justifyContent: "center", gap: 16, marginTop: 16 };
const linkStyle = { color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", textDecoration: "underline" };
function btnStyle(active) {
  return { width: "100%", padding: 14, borderRadius: 10, border: "none", background: active ? "#f0c040" : "rgba(255,255,255,0.1)", color: active ? "#1a1a2e" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 700, cursor: "pointer" };
}
