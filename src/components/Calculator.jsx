import { useState, useRef, useEffect, useCallback } from "react";

const MODES = { simple: "Simple", scientific: "Scientific" };

// Safe math evaluation — no eval()
function calculate(expression) {
  try {
    // Tokenize
    const expr = expression
      .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
      .replace(/π/g, String(Math.PI)).replace(/e(?![x])/g, String(Math.E))
      .replace(/\^/g, "**")
      .replace(/√\(/g, "Math.sqrt(")
      .replace(/sin\(/g, "Math.sin(").replace(/cos\(/g, "Math.cos(").replace(/tan\(/g, "Math.tan(")
      .replace(/log\(/g, "Math.log10(").replace(/ln\(/g, "Math.log(")
      .replace(/abs\(/g, "Math.abs(")
      .replace(/(\d+)!/g, (_, n) => factorial(Number(n)));
    // Restricted eval via Function constructor — only math allowed
    const fn = new Function(`"use strict"; return (${expr})`);
    const result = fn();
    if (typeof result !== "number" || !isFinite(result)) return "Error";
    // Round to avoid floating point display issues
    return Number(result.toPrecision(12)).toString();
  } catch {
    return "Error";
  }
}

function factorial(n) {
  if (n < 0 || n > 170 || !Number.isInteger(n)) return NaN;
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

const SIMPLE_KEYS = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "()", "="],
];

const SCI_KEYS = [
  ["sin", "cos", "tan", "π", "e"],
  ["x²", "xʸ", "√(", "!", "log"],
  ["ln", "abs", "(", ")", "^"],
];

export function Calculator({ onClose, onSendToChat, subjectColor }) {
  const [display, setDisplay] = useState("0");
  const [history, setHistory] = useState("");
  const [mode, setMode] = useState("simple");
  const [pos, setPos] = useState({ x: 20, y: 80 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const panelRef = useRef(null);
  const color = subjectColor || "#6366f1";

  // Drag handlers
  const onMouseDown = useCallback((e) => {
    if (e.target.closest("button")) return;
    setDragging(true);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 260, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, dragOffset]);

  // Touch drag
  const onTouchStart = useCallback((e) => {
    if (e.target.closest("button")) return;
    const t = e.touches[0];
    setDragging(true);
    setDragOffset({ x: t.clientX - pos.x, y: t.clientY - pos.y });
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const t = e.touches[0];
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 260, t.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, t.clientY - dragOffset.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
  }, [dragging, dragOffset]);

  function press(key) {
    if (key === "C") { setDisplay("0"); setHistory(""); return; }
    if (key === "=") {
      const result = calculate(display);
      setHistory(display + " =");
      setDisplay(result);
      return;
    }
    if (key === "±") {
      if (display !== "0" && display !== "Error") {
        setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
      }
      return;
    }
    if (key === "%") {
      const result = calculate(display + "/100");
      setDisplay(result);
      return;
    }
    if (key === "()") {
      const opens = (display.match(/\(/g) || []).length;
      const closes = (display.match(/\)/g) || []).length;
      const lastChar = display.slice(-1);
      if (opens > closes && !/[0-9)]$/.test(lastChar)) {
        append("(");
      } else if (opens > closes) {
        append(")");
      } else {
        append("(");
      }
      return;
    }
    // Scientific keys
    if (key === "x²") { setDisplay(display + "^2"); return; }
    if (key === "xʸ") { setDisplay(display + "^"); return; }
    if (key === "!") { setDisplay(display + "!"); return; }
    if (["sin", "cos", "tan", "log", "ln", "abs", "√("].includes(key)) {
      append(key + (key === "√(" ? "" : "("));
      return;
    }
    if (key === "π" || key === "e") { append(key); return; }
    if (key === "^" || key === "(" || key === ")") { append(key); return; }
    // Number or operator
    append(key);
  }

  function append(val) {
    if (display === "0" && /[0-9π]/.test(val)) setDisplay(val);
    else if (display === "Error") setDisplay(/[0-9(πe]/.test(val) ? val : "0");
    else setDisplay(display + val);
  }

  function handleSend() {
    if (!onSendToChat || display === "0" || display === "Error") return;
    const text = history ? `${history} ${display}` : display;
    onSendToChat(text);
  }

  // Keyboard support
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const p = pressRef.current;
      if (e.key >= "0" && e.key <= "9") p(e.key);
      else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") p(e.key === "*" ? "×" : e.key === "/" ? "÷" : e.key === "-" ? "−" : e.key);
      else if (e.key === "Enter" || e.key === "=") p("=");
      else if (e.key === "Escape") p("C");
      else if (e.key === ".") p(".");
      else if (e.key === "(" || e.key === ")") p(e.key);
      else if (e.key === "Backspace") {
        e.preventDefault();
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const btnStyle = (key, isOp) => ({
    padding: "10px 0",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: isOp ? 16 : 14,
    fontWeight: 700,
    background: key === "=" ? color : key === "C" ? "#fee2e2" : isOp ? "#f5f5f5" : "#fff",
    color: key === "=" ? "#fff" : key === "C" ? "#ef4444" : isOp ? color : "#1a1a2e",
    transition: "background .1s",
  });

  const sciBtnStyle = {
    padding: "8px 4px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    background: "#f8f9fa",
    color: "#555",
  };

  if (minimized) {
    return (
      <div
        style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 1000, background: color, borderRadius: 14, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "move", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", userSelect: "none" }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <span style={{ fontSize: 16 }}>{"\ud83e\uddee"}</span>
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span>
        <button onClick={() => setMinimized(false)} style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 6, padding: "2px 8px", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>{"\u25b3"}</button>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "2px 6px", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" }}>{"\u2715"}</button>
      </div>
    );
  }

  const ops = new Set(["÷", "×", "−", "+", "="]);

  return (
    <div
      ref={panelRef}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 1000, width: 260, background: "#fff", borderRadius: 18, boxShadow: "0 8px 40px rgba(0,0,0,0.22)", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden", userSelect: "none" }}
    >
      {/* Title bar — draggable */}
      <div
        style={{ padding: "10px 14px", background: color, display: "flex", alignItems: "center", gap: 8, cursor: "move" }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <span style={{ fontSize: 16 }}>{"\ud83e\uddee"}</span>
        <div style={{ flex: 1, display: "flex", gap: 4 }}>
          {Object.entries(MODES).map(([k, v]) => (
            <button key={k} onClick={() => setMode(k)} style={{ padding: "3px 10px", borderRadius: 8, border: "none", background: mode === k ? "rgba(255,255,255,0.3)" : "transparent", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{v}</button>
          ))}
        </div>
        <button onClick={() => setMinimized(true)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, padding: "2px 8px", color: "#fff", fontSize: 12, cursor: "pointer" }}>{"\u25bf"}</button>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "2px 6px", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" }}>{"\u2715"}</button>
      </div>

      {/* Display */}
      <div style={{ padding: "12px 14px 8px", background: "#fafafa", borderBottom: "1px solid #eee" }}>
        {history && <div style={{ fontSize: 11, color: "#999", textAlign: "right", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{history}</div>}
        <div style={{ fontSize: 26, fontWeight: 900, color: "#1a1a2e", textAlign: "right", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{display}</div>
      </div>

      {/* Scientific keys */}
      {mode === "scientific" && (
        <div style={{ padding: "6px 8px 2px" }}>
          {SCI_KEYS.map((row, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 4, marginBottom: 4 }}>
              {row.map(k => <button key={k} onClick={() => press(k)} style={sciBtnStyle}>{k}</button>)}
            </div>
          ))}
        </div>
      )}

      {/* Main keypad */}
      <div style={{ padding: "6px 8px 8px" }}>
        {SIMPLE_KEYS.map((row, ri) => (
          <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 4 }}>
            {row.map(k => <button key={k} onClick={() => press(k)} style={btnStyle(k, ops.has(k) || k === "C" || k === "±" || k === "%")}>{k}</button>)}
          </div>
        ))}
      </div>

      {/* Send to chat + backspace */}
      <div style={{ padding: "0 8px 10px", display: "flex", gap: 4 }}>
        <button onClick={() => setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #eee", background: "#fff", color: "#999", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>{"\u232b"}</button>
        {onSendToChat && (
          <button onClick={handleSend} disabled={display === "0" || display === "Error"} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${color}`, background: "transparent", color: color, fontSize: 11, fontWeight: 700, cursor: display === "0" || display === "Error" ? "default" : "pointer", opacity: display === "0" || display === "Error" ? 0.4 : 1 }}>
            Send to chat {"\u2192"}
          </button>
        )}
      </div>
    </div>
  );
}
