import { Component } from "react";

class ErrorBoundary extends Component {
  state = { crashed: false, error: null };

  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }

  clearAndReload = () => {
    try {
      // Clear potentially corrupt data but keep user preferences
      const dark = localStorage.getItem("ff_dark");
      localStorage.clear();
      if (dark) localStorage.setItem("ff_dark", dark);
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          minHeight: "100vh", background: "#07080f", display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "'Inter', sans-serif", color: "#e8e8f5", padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, maxWidth: 320, lineHeight: 1.6 }}>
            The app ran into an error. Clearing cached data and reloading usually fixes this.
          </div>
          {this.state.error && (
            <div style={{
              fontSize: 11, color: "#e11d48", marginBottom: 24, maxWidth: 340,
              background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)",
              borderRadius: 10, padding: "10px 14px", fontFamily: "monospace",
              wordBreak: "break-word", textAlign: "left", maxHeight: 150, overflowY: "auto",
            }}>
              {this.state.error.toString()}
              {this.state.error.stack && (
                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 10 }}>
                  {this.state.error.stack.split("\n").slice(1, 4).join("\n")}
                </div>
              )}
            </div>
          )}
          <button onClick={this.clearAndReload} style={{
            padding: "11px 28px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            color: "#0a0b12", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Clear & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
