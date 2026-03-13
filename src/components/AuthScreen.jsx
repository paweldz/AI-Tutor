import { useState } from "react";
import s from "./AuthScreen.module.css";

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
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.glass}>{children}</div>
      </div>
    </div>
  );

  if (mode === "reset") return wrap(
    <form onSubmit={handleSubmit}>
      <div className={s.tag}>ACCOUNT</div>
      <h2 className={s.heading}>Reset password</h2>
      {resetSent ? (
        <>
          <p className={s.successMsg}>Check your email for a reset link.</p>
          <button type="button" onClick={() => { setMode("login"); setResetSent(false); }} className={`hb ${s.btnActive}`}>Back to login</button>
        </>
      ) : (
        <>
          <p className={s.subtitleReset}>Enter your email to receive a password reset link.</p>
          <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required className={s.input} />
          {error && <div className={s.error}>{error}</div>}
          <button type="submit" disabled={loading} className={`hb ${loading ? s.btnDisabled : s.btnActive}`}>{loading ? "Sending..." : "Send reset link"}</button>
          <div className={s.linkRow}><span className={s.link} onClick={() => setMode("login")}>Back to login</span></div>
        </>
      )}
    </form>
  );

  return wrap(
    <form onSubmit={handleSubmit}>
      <div className={s.tag}>WELCOME</div>
      <h2 className={s.heading}>
        {mode === "signup" ? "Create your account" : "Sign in to your tutor"}
      </h2>
      <p className={s.subtitle}>
        {mode === "signup" ? "Get started with GCSE Tutor Hub" : "Your progress is saved securely in the cloud"}
      </p>
      <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required className={s.inputSpaced} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6} className={s.input} />
      {error && <div className={s.error}>{error}</div>}
      <button type="submit" disabled={loading} className={`hb ${loading ? s.btnDisabled : s.btnActive}`}>
        {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <div className={s.linkRow}>
        {mode === "login" ? (
          <>
            <span className={s.link} onClick={() => setMode("signup")}>Create account</span>
            <span className={s.link} onClick={() => setMode("reset")}>Forgot password?</span>
          </>
        ) : (
          <span className={s.link} onClick={() => setMode("login")}>Already have an account? Sign in</span>
        )}
      </div>
    </form>
  );
}
