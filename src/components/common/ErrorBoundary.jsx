import { Component } from "react";

class ErrorBoundary extends Component {
  state = { crashed: false, error: null };

  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    if (window.confirm("Are you sure you want to reset app data? This will clear local offline data.")) {
      try {
        localStorage.clear();
      } catch {}
      window.location.reload();
    }
  };

  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          minHeight: "100vh", background: "#fdfaf9", display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "'Inter', sans-serif", color: "#0f172a", padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, maxWidth: 340, lineHeight: 1.6 }}>
            The app ran into a temporary error. Reloading will fix this without affecting your stored data.
          </div>
          {this.state.error && (
            <div style={{
              fontSize: 11, color: "#dc2626", marginBottom: 24, maxWidth: 360,
              background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
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

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
            <button onClick={this.handleReload} style={{
              padding: "12px 28px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#f14d4d,#dc2626)",
              color: "#ffffff", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(241,77,77,0.3)",
            }}>
              Reload App (Safe)
            </button>

            <button onClick={this.handleClearAndReload} style={{
              padding: "8px 16px", borderRadius: 10, border: "none",
              background: "transparent",
              color: "#94a3b8", fontWeight: 600, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Reset App Data (Advanced)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
