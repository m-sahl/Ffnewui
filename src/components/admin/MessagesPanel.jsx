import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { ACCENT } from "../../styles/DesignTokens";
import Ic from "../common/Ic";

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

// ── WhatsApp Voice Note Component ──────────────────────────────────────────
const WhatsAppVoiceNote = ({ mediaUrl, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      document.querySelectorAll("audio").forEach(a => a.pause());
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const pct = duration > 0 ? (currentTime / duration) : 0;
  const waveformHeights = [30, 45, 65, 35, 80, 50, 90, 40, 70, 30, 60, 85, 45, 75, 50, 90, 60, 40, 70, 35];

  const fmtDur = (secs) => {
    if (!secs || isNaN(secs)) return "0:05";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200, padding: "4px 0" }}>
      <audio
        ref={audioRef}
        src={mediaUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        style={{ display: "none" }}
      />

      <button onClick={togglePlay} style={{
        width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
        background: isOwn ? "#ffffff" : "#f14d4d",
        color: isOwn ? "#dc2626" : "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: 13, fontWeight: 900
      }}>
        {isPlaying ? "❚❚" : "▶"}
      </button>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20, cursor: "pointer" }}
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            audioRef.current.currentTime = ratio * duration;
            setCurrentTime(ratio * duration);
          }}
        >
          {waveformHeights.map((h, idx) => {
            const barPct = idx / waveformHeights.length;
            const isPlayed = barPct <= pct;
            return (
              <span key={idx} style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: 2,
                background: isOwn
                  ? (isPlayed ? "#ffffff" : "rgba(255,255,255,0.4)")
                  : (isPlayed ? "#f14d4d" : "rgba(0,0,0,0.2)"),
                transition: "all 0.1s ease"
              }} />
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, opacity: 0.85, fontWeight: 700 }}>
          <span>{isPlaying ? fmtDur(currentTime) : fmtDur(duration)}</span>
          <span>🎙️</span>
        </div>
      </div>
    </div>
  );
};

const MessagesPanel = ({ user, dark, onClose }) => {
  const { groups, messages, sendMessage, markRead, setMessages, deleteMessage } = useApp();
  const [selectedGroup, setSelectedGroup]     = useState(null);
  const [text, setText]                       = useState("");
  const [search, setSearch]                   = useState("");
  const [showSearch, setShowSearch]           = useState(false);
  const [showMenu, setShowMenu]               = useState(false);
  const [showInfo, setShowInfo]               = useState(false);
  const [ctxMsg, setCtxMsg]                   = useState(null);
  const [ctxPos, setCtxPos]                   = useState({ x: 0, y: 0 });
  const [searchChat, setSearchChat]           = useState("");
  const [showChatSearch, setShowChatSearch]   = useState(false);
  const [imagePreview, setImagePreview]       = useState(null);
  const [isRecording, setIsRecording]         = useState(false);
  const [recordingSecs, setRecordingSecs]     = useState(0);
  const [viewImg, setViewImg]                 = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const fileInputRef     = useRef(null);
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
    m.groupId === selectedGroup || m.from === selectedGroup || m.to === selectedGroup
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [])
  .filter(m => !searchChat.trim() || (m.text && m.text.toLowerCase().includes(searchChat.toLowerCase())));

  const filteredGroups = groups.filter(g =>
    !search.trim() || g.name.toLowerCase().includes(search.toLowerCase())
  );

  const unreadFor   = (gId) => messages.filter(m => (m.from === gId || m.groupId === gId) && m.from !== "admin" && !m.read).length;
  const totalUnread = messages.filter(m => m.from !== "admin" && !m.read).length;

  const lastMsg = (gId) => {
    const msgs = messages
      .filter(m => !(m.deletedFor||[]).includes("admin"))
      .filter(m => m.groupId === gId || m.from === gId || m.to === gId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return msgs[0] || null;
  };

  useEffect(() => {
    if (selectedGroup) { markRead("admin"); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [selectedGroup]);

  useEffect(() => {
    if (!showChatSearch) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startRecording = async () => {
    if (!selectedGroup) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendMessage("admin", user.name, selectedGroup, "🎙️ Voice Message", { mediaType: "audio", mediaUrl: reader.result });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSecs(0);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Microphone permission needed to record audio.");
    }
  };

  const stopRecording = (sendIt = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!sendIt) {
        mediaRecorderRef.current.onstop = () => {
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
          }
        };
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const send = () => {
    if ((!text.trim() && !imagePreview) || !selectedGroup) return;
    if (imagePreview) {
      sendMessage("admin", user.name, selectedGroup, text.trim() || "📷 Image", { mediaType: "image", mediaUrl: imagePreview });
      setImagePreview(null);
    } else {
      sendMessage("admin", user.name, selectedGroup, text.trim());
    }
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  const deleteMsg = (mode) => {
    deleteMessage(ctxMsg.id, mode, "admin");
    setCtxMsg(null);
  };

  const clearChat = () => {
    setMessages(prev => prev.filter(m =>
      !((m.from === "admin" && m.to === selectedGroup) || (m.from === selectedGroup && m.to === "admin"))
    ));
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
    background: dark
      ? "radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(37, 99, 235, 0.09) 0%, transparent 55%), radial-gradient(circle at 1.5px 1.5px, rgba(96, 165, 250, 0.05) 1.5px, transparent 0), #080914"
      : "radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.09) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(37, 99, 235, 0.06) 0%, transparent 55%), radial-gradient(circle at 1.5px 1.5px, rgba(37, 99, 235, 0.04) 1.5px, transparent 0), #f0f4f8",
    backgroundSize: "100% 100%, 100% 100%, 28px 28px, 100% 100%",
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
                  <div style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(145deg,#f14d4d,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 20, color: "#ffffff" }}>
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
                      {unread > 0 && <div style={{ width: 20, height: 20, borderRadius: "50%", background: ACCENT, color: "#ffffff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{unread}</div>}
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
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(145deg,#f14d4d,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 17, color: "#ffffff", flexShrink: 0 }}>
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
                <div key={m.id}
                  style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", marginBottom: 2 }}
                  onTouchStart={e => handleLongPress(e, m)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onContextMenu={e => { e.preventDefault(); setCtxMsg(m); setCtxPos({ x: e.clientX, y: e.clientY }); }}
                >
                  <div style={{
                    maxWidth: "78%", padding: "8px 10px 6px 12px",
                    borderRadius: isAdmin ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: isAdmin ? "linear-gradient(145deg,#f14d4d,#dc2626)" : bubbleBg,
                    color: isAdmin ? "#ffffff" : (dark ? "#e8e8f5" : "#111"),
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
                        ? `transparent transparent transparent #dc2626`
                        : `transparent ${bubbleBg} transparent transparent`,
                    }} />

                    {m.mediaType === "image" && m.mediaUrl && (
                      <img src={m.mediaUrl} alt="Attachment" onClick={() => setViewImg(m.mediaUrl)}
                        style={{ width: "100%", maxHeight: 220, borderRadius: 10, objectFit: "cover", marginBottom: 4, cursor: "pointer" }} />
                    )}

                    {m.mediaType === "audio" && m.mediaUrl && (
                      <WhatsAppVoiceNote mediaUrl={m.mediaUrl} isOwn={isAdmin} />
                    )}

                    {m.text && m.text !== "🎙️ Voice Message" && m.text !== "📷 Image" && (
                      <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", paddingRight: isAdmin ? 4 : 0 }}>{m.text}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 3 }}>
                      <span style={{ fontSize: 10, opacity: 0.65 }}>{fmtTime(m.timestamp)}</span>
                      {isAdmin && (
                        <span style={{ opacity: 0.8, marginLeft: 1 }}>
                          {isRead ? <DblCheckIcon color="#ffffff" /> : <CheckIcon />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Image Preview Bar */}
          {imagePreview && (
            <div style={{ padding: "8px 14px", borderTop: `1px solid ${border}`, background: dark ? "#0a0b12" : "#ffffff", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <img src={imagePreview} alt="Preview" style={{ width: 50, height: 50, borderRadius: 10, objectFit: "cover" }} />
                <button onClick={() => setImagePreview(null)} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#f43f5e", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: mutedTx }}>Image Attached</span>
            </div>
          )}

          {/* Input / Voice Bar */}
          <div style={{
            padding: "8px 8px",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
            background: dark ? "#080912" : "#ece5dd",
            display: "flex", gap: 8, alignItems: "center", flexShrink: 0,
          }}>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />

            {isRecording ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 20, padding: "8px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 8px #f43f5e" }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#f43f5e" }}>Recording {recordingSecs}s</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => stopRecording(false)} style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, fontSize: 12, fontWeight: 700 }}>Cancel</button>
                  <button onClick={() => stopRecording(true)} style={{ background: "#10b981", color: "#fff", border: "none", cursor: "pointer", borderRadius: 12, padding: "4px 12px", fontSize: 12, fontWeight: 800 }}>Send</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 6 }}>
                  <Ic name="image" size={18} />
                </button>
                <button onClick={startRecording} style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 6 }}>
                  <Ic name="mic" size={18} />
                </button>

                <div style={{ flex: 1, display: "flex", alignItems: "center", background: dark ? "#1a1b2e" : "#fff", borderRadius: 26, padding: "4px 14px", minHeight: 46 }}>
                  <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Message..." rows={1}
                    style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: 15, color: dark ? "#e8e8f5" : "#111", fontFamily: "inherit", outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", paddingTop: 9, paddingBottom: 9 }}
                  />
                </div>
                <button onClick={send} style={{
                  width: 46, height: 46, borderRadius: "50%", flexShrink: 0, border: "none",
                  background: (text.trim() || imagePreview) ? "linear-gradient(135deg,#f14d4d,#dc2626)" : (dark ? "#1a1b2e" : "#ccc"),
                  color: (text.trim() || imagePreview) ? "#ffffff" : (dark ? "#4b5563" : "#888"),
                  cursor: (text.trim() || imagePreview) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", boxShadow: (text.trim() || imagePreview) ? "0 4px 14px rgba(241,77,77,0.4)" : "none",
                }}>
                  <SendIcon s={18} />
                </button>
              </>
            )}
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
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(145deg,#f14d4d,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 28, color: "#ffffff" }}>
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

      {/* Fullscreen Image Preview Modal */}
      {viewImg && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setViewImg(null)}>
          <img src={viewImg} alt="Enlarged" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
};

export default MessagesPanel;
