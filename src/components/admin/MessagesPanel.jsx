import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { ACCENT } from "../../styles/DesignTokens";

const MessagesPanel = ({ user, dark, onClose }) => {
  const { groups, messages, sendMessage, markRead } = useApp();
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.id || null);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  // Thread for selected group — messages between admin and this group
  const thread = messages.filter(m =>
    (m.from === "admin" && m.to === selectedGroup) ||
    (m.from === selectedGroup && m.to === "admin")
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Unread count per group
  const unreadFor = (gId) => messages.filter(m => m.from === gId && m.to === "admin" && !m.read).length;

  // Mark messages as read when viewing a thread
  useEffect(() => {
    if (selectedGroup) markRead("admin");
  }, [selectedGroup, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, selectedGroup]);

  const send = () => {
    if (!text.trim() || !selectedGroup) return;
    sendMessage("admin", user.name, selectedGroup, text.trim());
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
        <div className="topbar-title">Messages</div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Group list — left column */}
        <div style={{
          width: 200, flexShrink: 0, borderRight: `1px solid ${border}`,
          overflowY: "auto", padding: "10px 8px", scrollbarWidth: "none",
          background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: mutedTx, padding: "4px 8px 10px" }}>Groups</div>
          {groups.map(g => {
            const unread = unreadFor(g.id);
            const active = selectedGroup === g.id;
            return (
              <button key={g.id} onClick={() => setSelectedGroup(g.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: active ? "rgba(245,158,11,0.10)" : "transparent",
                transition: "background 0.15s", marginBottom: 2,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: active ? "rgba(245,158,11,0.18)" : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
                  color: active ? ACCENT : mutedTx,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 14,
                }}>
                  {g.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: active ? ACCENT : (dark ? "#e8e8f5" : "#12121e"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                  {(() => {
                    const last = [...messages].filter(m => (m.from === g.id && m.to === "admin") || (m.from === "admin" && m.to === g.id)).sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp))[0];
                    return last ? <div style={{ fontSize: 11, color: mutedTx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{last.text}</div> : null;
                  })()}
                </div>
                {unread > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: ACCENT, color: "#0a0b12", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{unread}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Chat thread — right */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Thread header */}
          {selectedGroup && (
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{groups.find(g => g.id === selectedGroup)?.name}</div>
              <span style={{ fontSize: 11, color: mutedTx }}>· Leader</span>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {thread.length === 0 ? (
              <div style={{ textAlign: "center", margin: "auto", color: mutedTx }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>No messages yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Send a message to {groups.find(g => g.id === selectedGroup)?.name}</div>
              </div>
            ) : (
              thread.map(m => {
                const isAdmin = m.from === "admin";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "72%", padding: "10px 14px", borderRadius: isAdmin ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isAdmin
                        ? "linear-gradient(135deg,#f59e0b,#d97706)"
                        : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
                      color: isAdmin ? "#0a0b12" : (dark ? "#e8e8f5" : "#12121e"),
                    }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, wordBreak: "break-word" }}>{m.text}</div>
                      <div style={{ fontSize: 10, marginTop: 5, opacity: 0.6, textAlign: isAdmin ? "right" : "left" }}>{fmt(m.timestamp)}</div>
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
          }}>
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Message ${groups.find(g => g.id === selectedGroup)?.name || ""}…`}
              rows={1}
              style={{
                flex: 1, resize: "none", padding: "10px 14px", borderRadius: 12, fontSize: 13.5,
                background: dark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.04)",
                border: `1.5px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
                color: dark ? "#e8e8f5" : "#12121e", fontFamily: "inherit",
                outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                transition: "border-color 0.2s",
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
      </div>
    </div>
  );
};

export default MessagesPanel;
