import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { ACCENT } from "../../styles/DesignTokens";

const Icon = ({ size = 20, children, fill = "none", stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const BackIcon  = ({ s }) => <Icon size={s}><polyline points="15 18 9 12 15 6"/></Icon>;
const SendIcon  = ({ s }) => <Icon size={s} fill="currentColor" stroke="none"><polygon points="2 21 23 12 2 3 2 10 17 12 2 14 2 21"/></Icon>;
const TrashIcon = ({ s }) => <Icon size={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></Icon>;
const DotsIcon  = ({ s }) => <Icon size={s} fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></Icon>;
const CheckIcon = () => <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5l3.5 3.5L13 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const InboxPanel = ({ user, group, dark, onClose }) => {
  const { messages, sendMessage, markRead, setMessages } = useApp();
  const [text, setText]         = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [ctxMsg, setCtxMsg]     = useState(null);
  const [ctxPos, setCtxPos]     = useState({ x: 0, y: 0 });
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const longPress = useRef(null);

  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx  = dark ? "#6b7280" : "#9ca3af";
  const bubbleBg = dark ? "rgba(255,255,255,0.09)" : "#ffffff";
  const headerBg = dark ? "rgba(7,8,15,0.97)" : "rgba(18,18,30,0.97)";

  const thread = messages
    .filter(m => (m.from === "admin" && m.to === group.id) || (m.from === group.id && m.to === "admin"))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  useEffect(() => { markRead(group.id); }, [messages.length]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 200); }, []);

  const send = () => {
    if (!text.trim()) return;
    sendMessage(group.id, group.name, "admin", text.trim());
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  const deleteMsg = (id) => { setMessages(prev => prev.filter(m => m.id !== id)); setCtxMsg(null); };

  const clearChat = () => {
    setMessages(prev => prev.filter(m =>
      !((m.from === "admin" && m.to === group.id) || (m.from === group.id && m.to === "admin"))
    ));
    setShowMenu(false);
  };

  const handleLongPress = (e, msg) => {
    const touch = e.touches?.[0] || e;
    longPress.current = setTimeout(() => {
      setCtxMsg(msg);
      setCtxPos({ x: Math.min(touch.clientX, window.innerWidth - 180), y: Math.min(touch.clientY, window.innerHeight - 100) });
    }, 500);
  };
  const cancelLongPress = () => clearTimeout(longPress.current);

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (ts) => {
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const threadWithDates = [];
  let lastDate = null;
  thread.forEach(m => {
    const d = fmtDate(m.timestamp);
    if (d !== lastDate) { threadWithDates.push({ type: "date", label: d, id: "d-" + d }); lastDate = d; }
    threadWithDates.push({ type: "msg", ...m });
  });

  const wallpaper = {
    backgroundImage: dark
      ? `radial-gradient(circle at 1px 1px, rgba(245,158,11,0.04) 1px, transparent 0)`
      : `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)`,
    backgroundSize: "20px 20px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: dark ? "#0a0b12" : "#ece5dd", display: "flex", flexDirection: "column", animation: "slideRight 0.25s cubic-bezier(0.22,1,0.36,1)" }}
      onClick={() => { setShowMenu(false); setCtxMsg(null); }}>

      {/* Header */}
      <div style={{ background: headerBg, flexShrink: 0 }}>
        <div style={{ height: 62, display: "flex", alignItems: "center", gap: 8, padding: "0 6px 0 4px" }}>
          <button onClick={onClose} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#e8e8f5", borderRadius: 12 }}>
            <BackIcon s={20} />
          </button>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(145deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 17, color: "#0a0b12", flexShrink: 0 }}>
            A
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#e8e8f5" }}>Admin</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>FestFlow Portal</div>
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={e => { e.stopPropagation(); setShowMenu(s => !s); }} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", borderRadius: 10 }}>
              <DotsIcon s={18} />
            </button>
            {showMenu && (
              <div style={{ position: "absolute", right: 0, top: 44, background: dark ? "#1a1b2e" : "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 160, zIndex: 10, border: `1px solid ${border}` }}>
                <button onClick={clearChat} style={{ width: "100%", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#e11d48" }}>
                  <TrashIcon s={14} /> Clear chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 3, ...wallpaper }}>
        {threadWithDates.length === 0 ? (
          <div style={{ textAlign: "center", margin: "auto" }}>
            <div style={{ fontSize: 12, background: dark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)", padding: "6px 14px", borderRadius: 12, display: "inline-block", color: mutedTx }}>
              🔒 Messages are end-to-end secured
            </div>
          </div>
        ) : threadWithDates.map(item => {
          if (item.type === "date") return (
            <div key={item.id} style={{ textAlign: "center", margin: "10px 0 6px" }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)", color: dark ? "#9ca3af" : "#666", backdropFilter: "blur(8px)" }}>{item.label}</span>
            </div>
          );
          const m = item;
          const isOwn = m.from === group.id;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", marginBottom: 2 }}
              onTouchStart={e => handleLongPress(e, m)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onContextMenu={e => { e.preventDefault(); setCtxMsg(m); setCtxPos({ x: e.clientX, y: e.clientY }); }}
            >
              <div style={{
                maxWidth: "78%", padding: "8px 10px 6px 12px",
                borderRadius: isOwn ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                background: isOwn ? "linear-gradient(145deg,#f59e0b,#d97706)" : bubbleBg,
                color: isOwn ? "#0a0b12" : (dark ? "#e8e8f5" : "#111"),
                boxShadow: "0 1px 3px rgba(0,0,0,0.18)", position: "relative",
              }}>
                <div style={{ position: "absolute", top: 0, [isOwn ? "right" : "left"]: -6, width: 0, height: 0, borderStyle: "solid", borderWidth: isOwn ? "0 0 8px 8px" : "0 8px 8px 0", borderColor: isOwn ? `transparent transparent transparent #d97706` : `transparent ${bubbleBg} transparent transparent` }} />
                {!isOwn && <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 3 }}>Admin</div>}
                <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{m.text}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 3 }}>
                  <span style={{ fontSize: 10, opacity: 0.65 }}>{fmtTime(m.timestamp)}</span>
                  {isOwn && <span style={{ opacity: 0.7 }}><CheckIcon /></span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 8px", paddingBottom: "max(8px, env(safe-area-inset-bottom))", background: dark ? "#080912" : "#ece5dd", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", background: dark ? "#1a1b2e" : "#fff", borderRadius: 26, padding: "4px 14px", minHeight: 46 }}>
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message" rows={1}
            style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: 15, color: dark ? "#e8e8f5" : "#111", fontFamily: "inherit", outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", paddingTop: 9, paddingBottom: 9 }}
          />
        </div>
        <button onClick={send} style={{
          width: 46, height: 46, borderRadius: "50%", flexShrink: 0, border: "none",
          background: text.trim() ? "linear-gradient(135deg,#f59e0b,#d97706)" : (dark ? "#1a1b2e" : "#ccc"),
          color: text.trim() ? "#0a0b12" : (dark ? "#4b5563" : "#888"),
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", boxShadow: text.trim() ? "0 4px 14px rgba(245,158,11,0.4)" : "none",
        }}>
          <SendIcon s={18} />
        </button>
      </div>

      {/* Context menu */}
      {ctxMsg && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setCtxMsg(null)} />
          <div style={{ position: "fixed", top: ctxPos.y, left: ctxPos.x, zIndex: 301, background: dark ? "#1a1b2e" : "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.45)", minWidth: 170, border: `1px solid ${border}` }}>
            <button onClick={() => deleteMsg(ctxMsg.id)} style={{ width: "100%", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#e11d48" }}>
              <TrashIcon s={15} /> Delete message
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InboxPanel;
