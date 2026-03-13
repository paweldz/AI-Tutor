import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", fontFamily: "'Source Sans 3', sans-serif" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u26a0\ufe0f"}</div>
          <h2 style={{ marginBottom: 12, fontFamily: "'Playfair Display', serif" }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: 20 }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

