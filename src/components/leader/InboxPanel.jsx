import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { ACCENT } from "../../styles/DesignTokens";

const InboxPanel = ({ user, group, dark, onClose }) => {
  const { messages, sendMessage, markRead } = useApp();
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx = dark ? "#6b7280" : "#9ca3af";

  // Thread between this group and admin
  const thread = messages.filter(m =>
    (m.from === "admin" && m.to === group.id) ||
    (m.from === group.id && m.to === "admin")
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Mark admin messages as read on open
  useEffect(() => {
    markRead(group.id);
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  const send = () => {
    if (!text.trim()) return;
    sendMessage(group.id, group.name, "admin", text.trim());
    setText("");
  };

  const fmt = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · " +
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: dark ? "#07080f" : "#f4f4fb",
      display: "flex", flexDirection: "column",
      animation: "slideRight 0.28s cubic-bezier(0.22,1,0.36,1)",
    }}>
      {/* Header */}
      <div style={{
        height: 58, display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
        borderBottom: `1px solid ${border}`,
        background: dark ? "rgba(7,8,15,0.92)" : "rgba(244,244,251,0.92)",
        backdropFilter: "blur(24px)", flexShrink: 0,
      }}>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><Ic name="back" size={16} /></button>
        <div>
          <div className="topbar-title">Messages</div>
          <div className="topbar-sub">Admin</div>
        </div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {thread.length === 0 ? (
          <div style={{ textAlign: "center", margin: "auto", color: mutedTx }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>No messages yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Messages from admin will appear here</div>
          </div>
        ) : (
          thread.map(m => {
            const isOwn = m.from === group.id;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
                {!isOwn && (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.12)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 11, flexShrink: 0, marginRight: 8, alignSelf: "flex-end" }}>A</div>
                )}
                <div style={{
                  maxWidth: "72%", padding: "10px 14px",
                  borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isOwn
                    ? "linear-gradient(135deg,#f59e0b,#d97706)"
                    : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
                  color: isOwn ? "#0a0b12" : (dark ? "#e8e8f5" : "#12121e"),
                }}>
                  {!isOwn && <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>Admin</div>}
                  <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, wordBreak: "break-word" }}>{m.text}</div>
                  <div style={{ fontSize: 10, marginTop: 5, opacity: 0.6, textAlign: isOwn ? "right" : "left" }}>{fmt(m.timestamp)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px", borderTop: `1px solid ${border}`,
        display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0,
        background: dark ? "rgba(7,8,15,0.8)" : "rgba(244,244,251,0.8)",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Reply to Admin…"
          rows={1}
          style={{
            flex: 1, resize: "none", padding: "10px 14px", borderRadius: 12, fontSize: 13.5,
            background: dark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.04)",
            border: `1.5px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
            color: dark ? "#e8e8f5" : "#12121e", fontFamily: "inherit",
            outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
          }}
          onFocus={e => e.target.style.borderColor = ACCENT}
          onBlur={e => e.target.style.borderColor = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}
        />
        <button onClick={send} disabled={!text.trim()} style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0, border: "none",
          background: text.trim() ? "linear-gradient(135deg,#f59e0b,#d97706)" : (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
          color: text.trim() ? "#0a0b12" : mutedTx,
          cursor: text.trim() ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.18s ease",
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default InboxPanel;
