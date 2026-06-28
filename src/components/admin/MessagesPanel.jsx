import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { ACCENT } from "../../styles/DesignTokens";

const MessagesPanel = ({ user, dark, onClose }) => {
  const { groups, messages, sendMessage, markRead } = useApp();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const bg      = dark ? "#07080f" : "#f4f4fb";
  const cardBg  = dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.88)";

  const thread = selectedGroup
    ? messages
        .filter(m => (m.from === "admin" && m.to === selectedGroup) || (m.from === selectedGroup && m.to === "admin"))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  const unreadFor = (gId) => messages.filter(m => m.from === gId && m.to === "admin" && !m.read).length;
  const totalUnread = messages.filter(m => m.to === "admin" && !m.read).length;

  useEffect(() => {
    if (selectedGroup) {
      markRead("admin");
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [selectedGroup]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  const send = () => {
    if (!text.trim() || !selectedGroup) return;
    sendMessage("admin", user.name, selectedGroup, text.trim());
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const fmt = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · " +
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const lastMsg = (gId) => {
    const msgs = messages
      .filter(m => (m.from === gId && m.to === "admin") || (m.from === "admin" && m.to === gId))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return msgs[0] || null;
  };

  const selectedGroupObj = groups.find(g => g.id === selectedGroup);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: bg,
      display: "flex", flexDirection: "column",
      animation: "slideRight 0.25s cubic-bezier(0.22,1,0.36,1)",
    }}>

      {/* ── Header ── */}
      <div style={{
        height: 58, display: "flex", alignItems: "center", gap: 10, padding: "0 16px",
        borderBottom: `1px solid ${border}`,
        background: dark ? "rgba(7,8,15,0.95)" : "rgba(244,244,251,0.95)",
        backdropFilter: "blur(24px)", flexShrink: 0,
      }}>
        <button className="btn btn-ghost btn-icon"
          onClick={() => selectedGroup ? setSelectedGroup(null) : onClose()}>
          <Ic name="back" size={16} />
        </button>

        {selectedGroup ? (
          <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(245,158,11,0.12)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 14 }}>
              {selectedGroupObj?.name.charAt(0)}
            </div>
            <div>
              <div className="topbar-title">{selectedGroupObj?.name}</div>
              <div className="topbar-sub">Leader</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div className="topbar-title">Messages</div>
            {totalUnread > 0 && <div className="topbar-sub">{totalUnread} unread</div>}
          </div>
        )}
      </div>

      {/* ── Group list ── */}
      {!selectedGroup && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {groups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: mutedTx }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>No groups yet</div>
            </div>
          ) : (
            groups.map((g, i) => {
              const last   = lastMsg(g.id);
              const unread = unreadFor(g.id);
              return (
                <button key={g.id} onClick={() => setSelectedGroup(g.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 18px",
                  borderBottom: `1px solid ${border}`,
                  background: "transparent", border: "none",
                  borderBottom: `1px solid ${border}`,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.12s",
                }}
                  onTouchStart={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}
                  onTouchEnd={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: cardBg,
                    border: `1px solid ${border}`,
                    color: dark ? "#e8e8f5" : "#12121e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 18,
                  }}>
                    {g.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, color: dark ? "#e8e8f5" : "#12121e" }}>{g.name}</div>
                    <div style={{ fontSize: 12.5, color: mutedTx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {last ? (last.from === "admin" ? `You: ${last.text}` : last.text) : "No messages yet"}
                    </div>
                  </div>

                  {/* Right side */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    {last && <div style={{ fontSize: 10.5, color: mutedTx }}>{new Date(last.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>}
                    {unread > 0
                      ? <div style={{ width: 20, height: 20, borderRadius: "50%", background: ACCENT, color: "#0a0b12", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</div>
                      : <Ic name="chevronRight" size={14} color={mutedTx} />
                    }
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── Chat thread ── */}
      {selectedGroup && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {thread.length === 0 ? (
              <div style={{ textAlign: "center", margin: "auto", color: mutedTx }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>No messages yet</div>
                <div style={{ fontSize: 12, marginTop: 4, color: mutedTx }}>Send the first message</div>
              </div>
            ) : (
              thread.map(m => {
                const isAdmin = m.from === "admin";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                    {!isAdmin && (
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(245,158,11,0.12)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 11, flexShrink: 0 }}>
                        {selectedGroupObj?.name.charAt(0)}
                      </div>
                    )}
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px",
                      borderRadius: isAdmin ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isAdmin
                        ? "linear-gradient(135deg,#f59e0b,#d97706)"
                        : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                      color: isAdmin ? "#0a0b12" : (dark ? "#e8e8f5" : "#12121e"),
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, wordBreak: "break-word" }}>{m.text}</div>
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.55, textAlign: isAdmin ? "right" : "left" }}>{fmt(m.timestamp)}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            paddingBottom: "max(10px, env(safe-area-inset-bottom))",
            borderTop: `1px solid ${border}`,
            display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0,
            background: dark ? "rgba(7,8,15,0.95)" : "rgba(244,244,251,0.95)",
          }}>
            <textarea ref={inputRef}
              value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Message…" rows={1}
              style={{
                flex: 1, resize: "none", padding: "10px 14px", borderRadius: 22, fontSize: 14,
                background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                border: `1.5px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
                color: dark ? "#e8e8f5" : "#12121e", fontFamily: "inherit",
                outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto",
              }}
            />
            <button onClick={send} disabled={!text.trim()} style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0, border: "none",
              background: text.trim() ? "linear-gradient(135deg,#f59e0b,#d97706)" : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
              color: text.trim() ? "#0a0b12" : mutedTx,
              cursor: text.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MessagesPanel;
