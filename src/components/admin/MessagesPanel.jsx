import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { ACCENT } from "../../styles/DesignTokens";

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, fill = "none", stroke = "currentColor", sw = 2, vb = "0 0 24 24", children }) => (
  <svg width={size} height={size} viewBox={vb} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d ? <path d={d} /> : children}</svg>
);
const BackIcon    = ({ s }) => <Icon size={s}><polyline points="15 18 9 12 15 6" /></Icon>;
const SearchIcon  = ({ s }) => <Icon size={s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>;
const SendIcon    = ({ s }) => <Icon size={s} fill="currentColor" stroke="none" vb="0 0 24 24"><polygon points="2 21 23 12 2 3 2 10 17 12 2 14 2 21"/></Icon>;
const DotsIcon    = ({ s }) => <Icon size={s}><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></Icon>;
const InfoIcon    = ({ s }) => <Icon size={s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Icon>;
const TrashIcon   = ({ s }) => <Icon size={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></Icon>;
const CloseIcon   = ({ s }) => <Icon size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
const CheckIcon   = () => <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5l3.5 3.5L13 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const DblCheckIcon = ({ color }) => <svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5l3.5 3.5L10 2" stroke={color||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 5l3.5 3.5L16 2" stroke={color||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const MessagesPanel = ({ user, dark, onClose }) => {
  const { groups, messages, sendMessage, markRead, deleteMessage, clearChat } = useApp();
  const [selectedGroup, setSelectedGroup]     = useState(null);
  const [text, setText]                       = useState("");
  const [search, setSearch]                   = useState("");
  const [showSearch, setShowSearch]           = useState(false);
  const [showMenu, setShowMenu]               = useState(false);
  const [showInfo, setShowInfo]               = useState(false);
  const [ctxMsg, setCtxMsg]                   = useState(null); // context menu message
  const [ctxPos, setCtxPos]                   = useState({ x: 0, y: 0 });
  const [searchChat, setSearchChat]           = useState("");
  const [showChatSearch, setShowChatSearch]   = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const longPress  = useRef(null);

  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx  = dark ? "#6b7280" : "#9ca3af";
  const bg       = dark ? "#0a0b12" : "#ece5dd";
  const headerBg = dark ? "rgba(7,8,15,0.97)" : "rgba(18,18,30,0.97)";
  const bubbleBg = dark ? "rgba(255,255,255,0.09)" : "#ffffff";
  const inputBg  = dark ? "#0a0b12" : "#f0f0f0";

  const selectedGroupObj = groups.find(g => g.id === selectedGroup);

  const thread = (selectedGroup ? messages.filter(m => !(m.deletedFor||[]).includes("admin")).filter(m =>
    (m.from === "admin" && m.to === selectedGroup) ||
    (m.from === selectedGroup && m.to === "admin")
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [])
  .filter(m => !searchChat.trim() || m.text.toLowerCase().includes(searchChat.toLowerCase()));

  const filteredGroups = groups.filter(g =>
    !search.trim() || g.name.toLowerCase().includes(search.toLowerCase())
  );

  const unreadFor   = (gId) => messages.filter(m => m.from === gId && m.to === "admin" && !m.read).length;
  const totalUnread = messages.filter(m => m.to === "admin" && !m.read).length;

  const lastMsg = (gId) => {
    const msgs = messages
      .filter(m => !(m.deletedFor||[]).includes("admin"))
      .filter(m => (m.from === gId && m.to === "admin") || (m.from === "admin" && m.to === gId))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return msgs[0] || null;
  };

  useEffect(() => {
    if (selectedGroup) { markRead("admin"); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [selectedGroup]);

  useEffect(() => {
    if (!showChatSearch) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  const send = () => {
    if (!text.trim() || !selectedGroup) return;
    sendMessage("admin", user.name, selectedGroup, text.trim());
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  const deleteMsg = (mode) => {
    deleteMessage(ctxMsg._id, mode, "admin");
    setCtxMsg(null);
  };

  const clearChat = () => {
    clearChat({ a: "admin", b: selectedGroup });
    setShowMenu(false);
  };

  const handleLongPress = (e, msg) => {
    const touch = e.touches?.[0] || e;
    longPress.current = setTimeout(() => {
      setCtxMsg(msg);
      setCtxPos({ x: Math.min(touch.clientX, window.innerWidth - 180), y: Math.min(touch.clientY, window.innerHeight - 120) });
    }, 500);
  };

  const cancelLongPress = () => clearTimeout(longPress.current);

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (ts) => {
    const d = new Date(ts); const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Group messages by date for date separators
  const threadWithDates = [];
  let lastDate = null;
  thread.forEach(m => {
    const d = fmtDate(m.timestamp);
    if (d !== lastDate) { threadWithDates.push({ type: "date", label: d, id: "d-" + d }); lastDate = d; }
    threadWithDates.push({ type: "msg", ...m });
  });

  // ── Chat wallpaper pattern ───────────────────────────────────────────────────
  const wallpaperStyle = {
    backgroundImage: dark
      ? `radial-gradient(circle at 1px 1px, rgba(245,158,11,0.04) 1px, transparent 0)`
      : `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)`,
    backgroundSize: "20px 20px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: bg, display: "flex", flexDirection: "column", animation: "slideRight 0.25s cubic-bezier(0.22,1,0.36,1)" }}>

      {/* ════════════════════════════════════════
          LIST VIEW
      ════════════════════════════════════════ */}
      {!selectedGroup && (
        <>
          {/* Header */}
          <div style={{ background: headerBg, flexShrink: 0 }}>
            <div style={{ height: 58, display: "flex", alignItems: "center", gap: 10, padding: "0 6px 0 4px" }}>
              <button onClick={onClose} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#e8e8f5", borderRadius: 12 }}>
                <BackIcon s={20} />
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, color: "#e8e8f5" }}>Messages</div>
                {totalUnread > 0 && <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>{totalUnread} unread</div>}
              </div>
              <button onClick={() => setShowSearch(s => !s)} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: showSearch ? ACCENT : "#9ca3af", borderRadius: 10 }}>
                <SearchIcon s={18} />
              </button>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div style={{ padding: "0 12px 10px" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…" autoFocus
                  style={{ width: "100%", padding: "9px 14px", borderRadius: 22, fontSize: 13.5, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)", border: "none", color: "#e8e8f5", fontFamily: "inherit", outline: "none" }} />
              </div>
            )}
          </div>

          {/* Group list */}
          <div style={{ flex: 1, overflowY: "auto", background: dark ? "#0a0b12" : "#fff" }}>
            {filteredGroups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: mutedTx }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                <div style={{ fontWeight: 700 }}>No groups</div>
              </div>
            ) : filteredGroups.map((g) => {
              const last   = lastMsg(g.id);
              const unread = unreadFor(g.id);
              return (
                <button key={g.id} onClick={() => setSelectedGroup(g.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 18px",
                  background: "transparent", border: "none", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}
                  onTouchStart={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}
                  onTouchEnd={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Avatar */}
                  <div style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(145deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 20, color: "#0a0b12" }}>
                    {g.name.charAt(0)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: dark ? "#e8e8f5" : "#111" }}>{g.name}</span>
                      {last && <span style={{ fontSize: 11, color: unread > 0 ? ACCENT : mutedTx, fontWeight: unread > 0 ? 700 : 400 }}>{fmtTime(last.timestamp)}</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: mutedTx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                        {last ? (last.from === "admin" ? `You: ${last.text}` : last.text) : "No messages yet"}
                      </span>
                      {unread > 0 && <div style={{ width: 20, height: 20, borderRadius: "50%", background: ACCENT, color: "#0a0b12", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{unread}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          CHAT VIEW
      ════════════════════════════════════════ */}
      {selectedGroup && (
        <>
          {/* Chat header */}
          <div style={{ background: headerBg, flexShrink: 0 }}>
            <div style={{ height: 62, display: "flex", alignItems: "center", gap: 8, padding: "0 6px 0 4px" }}>
              <button onClick={() => { setSelectedGroup(null); setShowChatSearch(false); setSearchChat(""); }} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#e8e8f5", borderRadius: 12, flexShrink: 0 }}>
                <BackIcon s={20} />
              </button>

              {/* Avatar + name — tappable for info */}
              <button onClick={() => setShowInfo(true)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "4px 0" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(145deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 17, color: "#0a0b12", flexShrink: 0 }}>
                  {selectedGroupObj?.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#e8e8f5" }}>{selectedGroupObj?.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Leader</div>
                </div>
              </button>

              {/* Actions */}
              <button onClick={() => { setShowChatSearch(s => !s); setSearchChat(""); }} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: showChatSearch ? ACCENT : "#9ca3af", borderRadius: 10 }}>
                <SearchIcon s={18} />
              </button>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowMenu(s => !s)} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", borderRadius: 10 }}>
                  <DotsIcon s={18} />
                </button>
                {showMenu && (
                  <div style={{ position: "absolute", right: 0, top: 44, background: dark ? "#1a1b2e" : "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 180, zIndex: 10, border: `1px solid ${border}` }}>
                    {[
                      { label: "Group info",   icon: <InfoIcon s={15} />,  action: () => { setShowInfo(true); setShowMenu(false); } },
                      { label: "Search",        icon: <SearchIcon s={15} />, action: () => { setShowChatSearch(true); setShowMenu(false); } },
                      { label: "Clear chat",    icon: <TrashIcon s={15} />,  action: clearChat, danger: true },
                    ].map((item, i) => (
                      <button key={i} onClick={item.action} style={{
                        width: "100%", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
                        background: "none", border: "none", borderTop: i > 0 ? `1px solid ${border}` : "none",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500,
                        color: item.danger ? "#e11d48" : (dark ? "#e8e8f5" : "#111"),
                      }}>
                        <span style={{ color: item.danger ? "#e11d48" : mutedTx }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* In-chat search bar */}
            {showChatSearch && (
              <div style={{ padding: "0 12px 10px", display: "flex", gap: 8, alignItems: "center" }}>
                <input value={searchChat} onChange={e => setSearchChat(e.target.value)} placeholder="Search in chat…" autoFocus
                  style={{ flex: 1, padding: "9px 14px", borderRadius: 22, fontSize: 13.5, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)", border: "none", color: "#e8e8f5", fontFamily: "inherit", outline: "none" }} />
                <button onClick={() => { setShowChatSearch(false); setSearchChat(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><CloseIcon s={16} /></button>
              </div>
            )}
          </div>

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 3, ...wallpaperStyle }}
            onClick={() => { setShowMenu(false); setCtxMsg(null); }}>

            {threadWithDates.length === 0 ? (
              <div style={{ textAlign: "center", margin: "auto", color: mutedTx, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 12, background: dark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)", padding: "6px 14px", borderRadius: 12, display: "inline-block" }}>
                  Messages are end-to-end secured
                </div>
              </div>
            ) : threadWithDates.map(item => {
              if (item.type === "date") return (
                <div key={item.id} style={{ textAlign: "center", margin: "10px 0 6px" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)", color: dark ? "#9ca3af" : "#666", backdropFilter: "blur(8px)" }}>{item.label}</span>
                </div>
              );

              const m = item;
              const isAdmin = m.from === "admin";
              const isRead  = isAdmin && messages.find(x => x.id === m.id)?.read !== false;

              return (
                <div key={m._id}
                  style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", marginBottom: 2 }}
                  onTouchStart={e => handleLongPress(e, m)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onContextMenu={e => { e.preventDefault(); setCtxMsg(m); setCtxPos({ x: e.clientX, y: e.clientY }); }}
                >
                  <div style={{
                    maxWidth: "78%", padding: "8px 10px 6px 12px",
                    borderRadius: isAdmin ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: isAdmin ? "linear-gradient(145deg,#f59e0b,#d97706)" : bubbleBg,
                    color: isAdmin ? "#0a0b12" : (dark ? "#e8e8f5" : "#111"),
                    boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                    position: "relative",
                  }}>
                    {/* Bubble tail */}
                    <div style={{
                      position: "absolute",
                      top: 0,
                      [isAdmin ? "right" : "left"]: -6,
                      width: 0, height: 0,
                      borderStyle: "solid",
                      borderWidth: isAdmin ? "0 0 8px 8px" : "0 8px 8px 0",
                      borderColor: isAdmin
                        ? `transparent transparent transparent #d97706`
                        : `transparent ${bubbleBg} transparent transparent`,
                    }} />

                    <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", paddingRight: isAdmin ? 4 : 0 }}>{m.text}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 3 }}>
                      <span style={{ fontSize: 10, opacity: 0.65 }}>{fmtTime(m.timestamp)}</span>
                      {isAdmin && (
                        <span style={{ opacity: 0.8, marginLeft: 1 }}>
                          {isRead ? <DblCheckIcon color="#0a0b12" /> : <CheckIcon />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: "8px 8px",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
            background: dark ? "#080912" : "#ece5dd",
            display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0,
          }}>
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
        </>
      )}

      {/* ── Context menu (long press) ── */}
      {ctxMsg && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setCtxMsg(null)} />
          <div style={{ position: "fixed", top: ctxPos.y, left: ctxPos.x, zIndex: 301, background: dark ? "#1a1b2e" : "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.45)", minWidth: 200, border: `1px solid ${border}` }}>
            <div style={{ padding: "10px 16px 6px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: mutedTx }}>Delete message</div>
            <button onClick={() => deleteMsg("me")} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", borderTop: `1px solid ${border}`, cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: dark ? "#e8e8f5" : "#111" }}>
              <TrashIcon s={14} /> Delete for me
            </button>
            {ctxMsg.from === "admin" && (
              <button onClick={() => deleteMsg("everyone")} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", borderTop: `1px solid ${border}`, cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#e11d48" }}>
                <TrashIcon s={14} /> Delete for everyone
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Group info sheet ── */}
      {showInfo && selectedGroupObj && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }} onClick={() => setShowInfo(false)}>
          <div style={{ width: "100%", background: dark ? "#0e0f1f" : "#fff", borderRadius: "22px 22px 0 0", padding: "20px 20px 40px", animation: "modalIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(145deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 28, color: "#0a0b12" }}>
                {selectedGroupObj.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20 }}>{selectedGroupObj.name}</div>
                <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>Leader Group</div>
              </div>
            </div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
              {[
                { label: "Total messages", value: messages.filter(m => (m.from === "admin" && m.to === selectedGroup) || (m.from === selectedGroup && m.to === "admin")).length },
                { label: "Unread replies",  value: unreadFor(selectedGroup) },
                { label: "Group ID",        value: selectedGroup },
              ].map((row, i) => (
                <div key={i} style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", borderTop: i > 0 ? `1px solid ${border}` : "none", background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)" }}>
                  <span style={{ fontSize: 13.5, color: mutedTx }}>{row.label}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { clearChat(); setShowInfo(false); }} style={{ width: "100%", marginTop: 14, padding: "14px", borderRadius: 14, border: "none", background: "rgba(225,29,72,0.08)", color: "#e11d48", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Clear Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPanel;
