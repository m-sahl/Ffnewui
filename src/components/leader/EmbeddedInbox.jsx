import { useState, useEffect, useRef } from "react";
import Ic from "../common/Ic";
import { ACCENT } from "../../styles/DesignTokens";
import { WhatsAppVoiceNote } from "../common/VoiceNote";

// ── EMBEDDED CHAT ─────────────────────────────────────────────────────────────
const EmbeddedInbox = ({ group, dark, messages, sendMessage, markRead, setMessages, deleteMessage }) => {
  const [text, setText]                 = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [showMenu, setShowMenu]         = useState(false);
  const [ctxMsg, setCtxMsg]             = useState(null);
  const [ctxPos, setCtxPos]             = useState({ x: 0, y: 0 });
  const [viewImg, setViewImg]           = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const mediaRecorderRef   = useRef(null);
  const audioChunksRef     = useRef([]);
  const fileInputRef       = useRef(null);
  const bottomRef          = useRef(null);
  const scrollContainerRef = useRef(null);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollDown(isUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollDown(false);
  };

  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx  = dark ? "#94a3b8" : "#64748b";
  const bubbleBg = dark ? "rgba(255,255,255,0.08)" : "#ffffff";

  const thread = messages
    .filter(m => !(m.deletedFor || []).includes(group.id))
    .filter(m => (m.from === "admin" && m.to === group.id) || (m.from === group.id && m.to === "admin"))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  useEffect(() => {
    markRead(group.id);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendMessage(group.id, group.name, "admin", "🎙️ Voice Message", { mediaType: "audio", mediaUrl: reader.result });
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
    if (!text.trim() && !imagePreview) return;
    if (imagePreview) {
      sendMessage(group.id, group.name, "admin", text.trim() || "📷 Image", { mediaType: "image", mediaUrl: imagePreview });
      setImagePreview(null);
    } else {
      sendMessage(group.id, group.name, "admin", text.trim());
    }
    setText("");
  };

  const deleteMsg = (mode) => { deleteMessage(ctxMsg.id, mode, group.id); setCtxMsg(null); };

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (ts) => {
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const fmtRecSecs = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const threadWithDates = [];
  let lastDate = null;
  thread.forEach(m => {
    const d = fmtDate(m.timestamp);
    if (d !== lastDate) { threadWithDates.push({ type: "date", label: d, id: "d-" + d }); lastDate = d; }
    threadWithDates.push({ type: "msg", ...m });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 70px)", maxWidth: 600, margin: "0 auto", paddingBottom: 80 }} onClick={() => setShowMenu(false)}>
      {/* Header bar */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Admin Support Chat</div>
        <div style={{ position: "relative" }}>
          <button onClick={e => { e.stopPropagation(); setShowMenu(s => !s); }} style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 6 }}>
            <Ic name="list" size={16} />
          </button>
          {showMenu && (
            <div style={{ position: "absolute", right: 0, top: 32, background: dark ? "#151726" : "#ffffff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", minWidth: 150, zIndex: 10, border: `1px solid ${border}` }}>
              <button onClick={() => { setMessages(prev => prev.filter(m => !((m.from === "admin" && m.to === group.id) || (m.from === group.id && m.to === "admin")))); setShowMenu(false); }}
                style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#f43f5e", fontWeight: 700 }}>
                <Ic name="trash" size={14} /> Clear chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages thread */}
      <div ref={scrollContainerRef} onScroll={handleScroll} style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        background: dark
          ? "radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(37, 99, 235, 0.09) 0%, transparent 55%), radial-gradient(circle at 1.5px 1.5px, rgba(96, 165, 250, 0.05) 1.5px, transparent 0), #080914"
          : "radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.09) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(37, 99, 235, 0.06) 0%, transparent 55%), radial-gradient(circle at 1.5px 1.5px, rgba(37, 99, 235, 0.04) 1.5px, transparent 0), #f0f4f8",
        backgroundSize: "100% 100%, 100% 100%, 28px 28px, 100% 100%"
      }}>
        {threadWithDates.length === 0 ? (
          <div style={{ textAlign: "center", margin: "auto" }}>
            <div style={{ fontSize: 12, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", padding: "8px 16px", borderRadius: 14, color: mutedTx, fontWeight: 600 }}>
              End-to-End Support Chat Active
            </div>
          </div>
        ) : threadWithDates.map(item => {
          if (item.type === "date") return (
            <div key={item.id} style={{ textAlign: "center", margin: "10px 0 6px" }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: mutedTx }}>{item.label}</span>
            </div>
          );
          const m = item;
          const isOwn = m.from === group.id;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }}
              onContextMenu={e => { e.preventDefault(); setCtxMsg(m); setCtxPos({ x: e.clientX, y: e.clientY }); }}
            >
              <div style={{
                maxWidth: "80%", padding: "10px 14px",
                borderRadius: isOwn ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                background: isOwn ? "linear-gradient(135deg, #f14d4d 0%, #e11d48 100%)" : bubbleBg,
                color: isOwn ? "#ffffff" : (dark ? "#f8fafc" : "#0f172a"),
                boxShadow: isOwn ? "0 4px 14px rgba(241,77,77,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                border: isOwn ? "none" : `1px solid ${border}`,
              }}>
                {!isOwn && <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, marginBottom: 3 }}>System Admin</div>}

                {/* Render Media */}
                {m.mediaType === "image" && m.mediaUrl && (
                  <img src={m.mediaUrl} alt="Attachment" onClick={() => setViewImg(m.mediaUrl)}
                    style={{ width: "100%", maxHeight: 220, borderRadius: 12, objectFit: "cover", marginBottom: 6, cursor: "pointer" }} />
                )}

                {m.mediaType === "audio" && m.mediaUrl && (
                  <WhatsAppVoiceNote mediaUrl={m.mediaUrl} isOwn={isOwn} />
                )}

                {m.text && m.text !== "🎙️ Voice Message" && m.text !== "📷 Image" && (
                  <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{m.text}</div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4, opacity: 0.85, fontSize: 10, fontWeight: 600 }}>
                  <span>{fmtTime(m.timestamp)}</span>
                  {isOwn && (
                    m.read ? (
                      <span title="Read" style={{ display: "inline-flex" }}>
                        <Ic name="checkCheck" size={14} color="#60a5fa" />
                      </span>
                    ) : (
                      <span title="Delivered" style={{ display: "inline-flex" }}>
                        <Ic name="check" size={13} color="rgba(255,255,255,0.7)" />
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick Scroll Down FAB (Centered like WhatsApp) */}
      {showScrollDown && (
        <button onClick={scrollToBottom} style={{
          position: "sticky", bottom: 70, marginLeft: "auto", marginRight: "auto", marginBottom: -36,
          width: 38, height: 38, borderRadius: "50%",
          background: dark ? "#1f2233" : "#ffffff",
          color: dark ? "#f8fafc" : "#0f172a",
          border: `1px solid ${border}`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 20, transition: "transform 0.15s ease"
        }} title="Scroll to bottom">
          <Ic name="chevronDown" size={18} />
        </button>
      )}

      {/* Image Preview Bar */}
      {imagePreview && (
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${border}`, background: dark ? "#0f111a" : "#ffffff", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <img src={imagePreview} alt="Preview" style={{ width: 50, height: 50, borderRadius: 10, objectFit: "cover" }} />
            <button onClick={() => setImagePreview(null)} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#f43f5e", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: mutedTx }}>Image Attached</span>
        </div>
      )}

      {/* Input / Voice Bar */}
      <div style={{
        position: "sticky", bottom: 0, padding: "10px 14px", borderTop: `1px solid ${border}`,
        background: dark ? "#0f111a" : "#ffffff", display: "flex", gap: 8, alignItems: "center",
        zIndex: 10, flexShrink: 0
      }}>
        <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />

        {isRecording ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 20, padding: "8px 16px" }}>
            <style>{`
              @keyframes waveBounce {
                0% { height: 4px; opacity: 0.4; }
                100% { height: 18px; opacity: 1; }
              }
            `}</style>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 8px #f43f5e" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f43f5e" }}>Recording {fmtRecSecs(recordingSecs)}</span>

              {/* Real-time Animated Audio Sound Waves */}
              <div style={{ display: "flex", alignItems: "center", gap: 3, height: 18, marginLeft: 4 }}>
                <span style={{ width: 3, borderRadius: 2, background: "#f43f5e", animation: "waveBounce 0.6s ease-in-out 0.1s infinite alternate" }} />
                <span style={{ width: 3, borderRadius: 2, background: "#f43f5e", animation: "waveBounce 0.6s ease-in-out 0.3s infinite alternate" }} />
                <span style={{ width: 3, borderRadius: 2, background: "#f43f5e", animation: "waveBounce 0.6s ease-in-out 0.2s infinite alternate" }} />
                <span style={{ width: 3, borderRadius: 2, background: "#f43f5e", animation: "waveBounce 0.6s ease-in-out 0.5s infinite alternate" }} />
                <span style={{ width: 3, borderRadius: 2, background: "#f43f5e", animation: "waveBounce 0.6s ease-in-out 0.4s infinite alternate" }} />
                <span style={{ width: 3, borderRadius: 2, background: "#f43f5e", animation: "waveBounce 0.6s ease-in-out 0.25s infinite alternate" }} />
              </div>
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

            <div style={{ flex: 1, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderRadius: 20, padding: "4px 14px", display: "flex", alignItems: "center" }}>
              <textarea value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type a message..." rows={1}
                style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: 14, color: dark ? "#f8fafc" : "#0f172a", fontFamily: "inherit", outline: "none", lineHeight: 1.4, maxHeight: 90, overflowY: "auto", paddingTop: 8, paddingBottom: 8 }}
              />
            </div>

            <button onClick={send} style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0, border: "none",
              background: (text.trim() || imagePreview) ? "linear-gradient(135deg, #f14d4d 0%, #e11d48 100%)" : (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
              color: (text.trim() || imagePreview) ? "#ffffff" : mutedTx,
              cursor: (text.trim() || imagePreview) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: (text.trim() || imagePreview) ? "0 4px 14px rgba(241,77,77,0.3)" : "none", transition: "all 0.15s ease"
            }}>
              <Ic name="send" size={16} />
            </button>
          </>
        )}
      </div>

      {/* Fullscreen Image Preview Modal */}
      {viewImg && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setViewImg(null)}>
          <img src={viewImg} alt="Enlarged" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
        </div>
      )}

      {ctxMsg && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setCtxMsg(null)} />
          <div style={{ position: "fixed", top: ctxPos.y, left: ctxPos.x, zIndex: 301, background: dark ? "#151726" : "#ffffff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.35)", minWidth: 190, border: `1px solid ${border}` }}>
            <button onClick={() => deleteMsg("me")} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: dark ? "#f8fafc" : "#0f172a" }}>
              <Ic name="trash" size={14} /> Delete for me
            </button>
            {ctxMsg.from === group.id && (
              <button onClick={() => deleteMsg("everyone")} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", borderTop: `1px solid ${border}`, cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#f43f5e", fontWeight: 700 }}>
                <Ic name="trash" size={14} /> Delete for everyone
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmbeddedInbox;
