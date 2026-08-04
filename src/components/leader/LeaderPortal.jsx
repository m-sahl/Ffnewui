import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import { CATS, STUDENT_CATS, ACCENT } from "../../styles/DesignTokens";
import { triggerHaptic } from "../../utils/haptics";

const Tag = ({ label, dark, variant = "default" }) => {
  const isAccent = variant === "accent";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 9px",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.2px",
      background: isAccent 
        ? "rgba(241, 77, 77, 0.12)" 
        : dark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
      color: isAccent 
        ? "#f14d4d" 
        : dark ? "#94a3b8" : "#64748b",
      border: isAccent 
        ? "1px solid rgba(241, 77, 77, 0.2)" 
        : `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
      transition: "all 0.15s ease",
    }}>
      {label}
    </span>
  );
};

// ── Floating Minimalist Tab Bar ───────────────────────────────────────────────────────────
const NAV = [
  { id: "home",     icon: "home",    label: "Home"     },
  { id: "members",  icon: "users",   label: "Members"  },
  { id: "events",   icon: "book",    label: "Events"   },
  { id: "messages", icon: "message", label: "Messages" },
];

const BottomNav = ({ tab, setTab, unread, dark }) => (
  <div style={{
    position: "fixed",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 32px)",
    maxWidth: 440,
    height: 62,
    borderRadius: 24,
    background: dark ? "rgba(15, 17, 26, 0.85)" : "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${dark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
    boxShadow: dark ? "0 12px 32px rgba(0, 0, 0, 0.5)" : "0 12px 32px rgba(0, 0, 0, 0.08)",
    display: "flex",
    alignItems: "center",
    justify: "space-around",
    padding: "0 8px",
    zIndex: 150,
  }}>
    {NAV.map(n => {
      const active = tab === n.id;
      return (
        <button
          key={n.id}
          onClick={() => { triggerHaptic("light"); setTab(n.id); }}
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            position: "relative",
            color: active ? ACCENT : (dark ? "#64748b" : "#94a3b8"),
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic name={n.icon} size={19} />
            {n.id === "messages" && unread > 0 && (
              <span style={{
                position: "absolute",
                top: -3,
                right: -6,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: "#f14d4d",
                color: "#ffffff",
                fontSize: 9,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(241,77,77,0.4)"
              }}>
                {unread}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: active ? 700 : 500,
            letterSpacing: "0.1px",
          }}>
            {n.label}
          </span>
          {active && (
            <span style={{
              position: "absolute",
              bottom: 6,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: ACCENT,
            }} />
          )}
        </button>
      );
    })}
  </div>
);

const LeaderPortal = ({ user, group, dark, setDark, onBack }) => {
  const { programs, students, registrations, setRegistrations, logActivity, messages, sendMessage, markRead, setMessages, deleteMessage, isLocked } = useApp();

  const [tab, setTab]                     = useState("home");
  const [progType, setProgType]           = useState("Stage");
  const [catFilter, setCatFilter]         = useState("Sub-Junior");
  const [eventSubTab, setEventSubTab]     = useState("all");
  const [memSearch, setMemSearch]         = useState("");
  const [memSearchOpen, setMemSearchOpen] = useState(false);
  const [regModal, setRegModal]           = useState(false);
  const [regForm, setRegForm]             = useState({ programId: "", participantIds: [] });
  const [editTarget, setEditTarget]       = useState(null);
  const [viewTarget, setViewTarget]       = useState(null);
  const [delConfirm, setDelConfirm]       = useState(null);

  const groupStudents = students[group.id] || [];
  const groupRegs     = registrations.filter(r => r.groupId === group.id);
  const locked        = isLocked(group.id, progType);

  const mutedTx  = dark ? "#94a3b8" : "#64748b";
  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg   = dark ? "rgba(255,255,255,0.025)" : "#ffffff";
  const cardHover= dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const initBg   = dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)";

  const unreadCount = messages.filter(m => m.from === "admin" && m.to === group.id && !m.read).length;

  const filtStudents = (catFilter === "All" ? [...groupStudents] : groupStudents.filter(s => s.category === catFilter))
    .filter(s => !memSearch.trim() || s.name.toLowerCase().includes(memSearch.toLowerCase()))
    .sort((a, b) => {
      const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 };
      return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2);
    });

  const filtProgs = programs.filter(p => {
    const pType = (p.type || p.session || "Stage").toLowerCase();
    const targetType = progType.toLowerCase();
    if (pType !== targetType) return false;
    if (p.category?.toLowerCase() !== catFilter.toLowerCase()) return false;
    return true;
  });

  const filtRegs = groupRegs.filter(r => {
    const p = programs.find(pg => pg.id === r.programId);
    if (!p) return false;
    const pType = (p.type || p.session || "Stage").toLowerCase();
    const targetType = progType.toLowerCase();
    if (pType !== targetType) return false;
    if (p.category?.toLowerCase() !== catFilter.toLowerCase()) return false;
    return true;
  });

  // ── Registration ops ──────────────────────────────────────────────────────
  const openReg = (existing = null) => {
    if (existing) {
      const p = programs.find(pg => pg.id === existing.programId);
      const pType = (p?.type || p?.session || "Stage").toLowerCase();
      if (isLocked(group.id, pType)) return;
      setEditTarget(existing.id);
      setRegForm({ programId: existing.programId, participantIds: [...existing.participantIds] });
    } else {
      if (isLocked(group.id, progType)) return;
      setEditTarget(null);
      setRegForm({ programId: "", participantIds: [] });
    }
    setRegModal(true);
  };

  const saveReg = () => {
    if (!regForm.programId) return;
    const p = programs.find(pg => pg.id === regForm.programId);
    const pType = (p?.type || p?.session || "Stage").toLowerCase();
    if (isLocked(group.id, pType)) return;

    const alreadyExists = !editTarget && groupRegs.some(r => r.programId === regForm.programId);
    if (alreadyExists) return;
    if (editTarget) {
      setRegistrations(prev => prev.map(r => r.id === editTarget ? { ...r, ...regForm } : r));
      logActivity(user.name, "Updated registration", `${p?.name} for ${group.name}`);
    } else {
      const newReg = { id: "r-" + Math.random().toString(36).substr(2, 5), groupId: group.id, ...regForm };
      setRegistrations(prev => [...prev, newReg]);
      logActivity(user.name, "Registered", `${p?.name} for ${group.name}`);
    }
    setRegModal(false);
  };

  const confirmDeleteReg = () => {
    const reg = groupRegs.find(r => r.id === delConfirm);
    const p   = programs.find(pg => pg.id === reg?.programId);
    const pType = (p?.type || p?.session || "Stage").toLowerCase();
    if (isLocked(group.id, pType)) return;

    setRegistrations(prev => prev.filter(r => r.id !== delConfirm));
    logActivity(user.name, "Deleted registration", `${p?.name || "Program"} for ${group.name}`);
    setDelConfirm(null);
  };

  const selectedProg = programs.find(p => p.id === regForm.programId);
  const max          = selectedProg?.maxParticipants || 1;
  const atMax        = regForm.participantIds.length >= max;

  const alreadyRegistered = new Set(
    groupRegs
      .filter(r => r.programId === regForm.programId && r.id !== editTarget)
      .flatMap(r => r.participantIds)
  );

  const togglePart = id => {
    if (alreadyRegistered.has(id)) return;
    setRegForm(prev => {
      const has = prev.participantIds.includes(id);
      if (has) return { ...prev, participantIds: prev.participantIds.filter(x => x !== id) };
      if (prev.participantIds.length >= max) return prev;
      return { ...prev, participantIds: [...prev.participantIds, id] };
    });
  };

  // ── HOME TAB ───────────────────────────────────────────────────────────────
  const renderHome = () => {
    const totalRegs = groupRegs.length;
    const typeStatus = ["Stage", "Off-Stage"].map(t => ({ type: t, locked: isLocked(group.id, t) }));

    return (
      <div className="anim-fadeIn" style={{ padding: "20px 16px 110px", maxWidth: 600, margin: "0 auto" }}>
        {/* Group Name Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: "-0.5px", color: dark ? "#f8fafc" : "#0f172a" }}>
            {group.name}
          </div>
        </div>

        {/* Minimal Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ padding: "20px 18px", borderRadius: 16, border: `1px solid ${border}`, background: cardBg, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.5px" }}>Team Members</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 32, color: dark ? "#f8fafc" : "#0f172a", marginTop: 6 }}>{groupStudents.length}</div>
          </div>
          <div style={{ padding: "20px 18px", borderRadius: 16, border: `1px solid ${border}`, background: cardBg, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.5px" }}>Registrations</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 32, color: ACCENT, marginTop: 6 }}>{totalRegs}</div>
          </div>
        </div>

        {/* Minimal Status Strip */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: mutedTx, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>Stage Status</div>
          <div style={{ display: "flex", gap: 10 }}>
            {typeStatus.map(s => (
              <div key={s.type} style={{
                flex: 1, padding: "14px 16px", borderRadius: 14, border: `1px solid ${border}`, background: cardBg,
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.type}</span>
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                  background: s.locked ? "rgba(225,29,72,0.1)" : "rgba(16,185,129,0.1)",
                  color: s.locked ? "#f43f5e" : "#10b981"
                }}>
                  {s.locked ? "LOCKED" : "OPEN"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Action Button */}
        <button onClick={() => { setTab("events"); }} style={{
          width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#f14d4d,#dc2626)", color: "#ffffff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15,
          boxShadow: "0 8px 24px rgba(241, 77, 77, 0.35)", transition: "transform 0.15s ease",
        }}>
          <Ic name="plus" size={18} /> Register for Events
        </button>
      </div>
    );
  };

  // ── MEMBERS TAB ────────────────────────────────────────────────────────────
  const renderMembers = () => (
    <div className="anim-fadeIn" style={{ padding: "20px 16px 110px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20 }}>Team Roster</div>
          <div style={{ fontSize: 12, color: mutedTx, marginTop: 2 }}>{filtStudents.length} of {groupStudents.length} members shown</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setMemSearchOpen(o => !o); setMemSearch(""); }} style={{ color: memSearchOpen ? ACCENT : mutedTx }}>
          <Ic name="search" size={16} />
        </button>
      </div>

      {memSearchOpen && (
        <div style={{ marginBottom: 16 }}>
          <input className="input" type="text" placeholder="Filter by student name..." value={memSearch} onChange={e => setMemSearch(e.target.value)} style={{ fontSize: 13, borderRadius: 12 }} autoFocus />
        </div>
      )}

      {/* Category Pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 18 }}>
        {["All", ...STUDENT_CATS].map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            style={{
              padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, flexShrink: 0, border: "none", cursor: "pointer",
              background: catFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
              color: catFilter === cat ? "#ffffff" : mutedTx, transition: "all 0.15s ease"
            }}>
            {cat === "Sub-Junior" ? "Sub" : cat}
          </button>
        ))}
      </div>

      {filtStudents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No members found</div>
          <div style={{ fontSize: 13 }}>No student records registered in {catFilter}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtStudents.map(s => {
            const isLeader = s.groupRole === "Leader";
            const isAsst   = s.groupRole === "Asst. Leader";
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, background: cardBg, border: `1px solid ${border}` }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: ACCENT, fontSize: 13.5, minWidth: 36 }}>#{s.chestNo}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: dark ? "#f8fafc" : "#0f172a" }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: mutedTx, marginTop: 2 }}>{s.category}</div>
                </div>
                {isLeader && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#f14d4d", background: "rgba(241,77,77,0.12)", padding: "3px 9px", borderRadius: 8, border: "1px solid rgba(241,77,77,0.22)", flexShrink: 0 }}>
                    Leader
                  </span>
                )}
                {isAsst && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", background: "rgba(59,130,246,0.12)", padding: "3px 9px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.22)", flexShrink: 0 }}>
                    Asst.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── EVENTS TAB ─────────────────────────────────────────────────────────────
  const renderEvents = () => (
    <div className="anim-fadeIn" style={{ padding: "16px 14px 100px", maxWidth: 540, margin: "0 auto" }}>
      {/* Top Header Row with Stage Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: "-0.4px" }}>Events</div>

        {/* Stage / Off-Stage Toggle */}
        <div style={{ display: "flex", background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", borderRadius: 10, padding: 2 }}>
          {["Stage", "Off-Stage"].map(t => (
            <button key={t} onClick={() => { setProgType(t); setCatFilter("Sub-Junior"); }}
              style={{
                padding: "5px 11px", border: "none", cursor: "pointer", borderRadius: 8,
                fontFamily: "inherit", fontSize: 11.5, fontWeight: 800,
                background: progType === t ? (dark ? "rgba(255,255,255,0.12)" : "#ffffff") : "transparent",
                color: progType === t ? (dark ? "#f8fafc" : "#0f172a") : mutedTx,
                transition: "all 0.15s ease",
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Real-Time Lock Status Warning Banner */}
      {locked && (
        <div style={{
          marginBottom: 12, padding: "10px 14px", borderRadius: 12,
          background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.25)",
          color: "#f43f5e", fontSize: 12.5, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span>{progType} Registration is currently locked by Admin</span>
        </div>
      )}

      {/* Segmented Sub-tab switcher */}
      <div style={{ display: "flex", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)", borderRadius: 12, padding: 3, marginBottom: 12, border: `1px solid ${border}` }}>
        <button onClick={() => setEventSubTab("all")} style={{
          flex: 1, padding: "8px 10px", cursor: "pointer", borderRadius: 9, border: "none",
          fontWeight: 800, fontSize: 12, textAlign: "center",
          background: eventSubTab === "all" ? ACCENT : "transparent",
          color: eventSubTab === "all" ? "#ffffff" : mutedTx,
          transition: "all 0.15s ease",
        }}>All ({filtProgs.length})</button>

        <button onClick={() => setEventSubTab("mine")} style={{
          flex: 1, padding: "8px 10px", cursor: "pointer", borderRadius: 9, border: "none",
          fontWeight: 800, fontSize: 12, textAlign: "center",
          background: eventSubTab === "mine" ? ACCENT : "transparent",
          color: eventSubTab === "mine" ? "#ffffff" : mutedTx,
          transition: "all 0.15s ease",
        }}>Registered ({filtRegs.length})</button>
      </div>

      {/* Category Pills Bar */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 14 }}>
        {CATS.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            style={{
              padding: "4px 11px", borderRadius: 8, fontSize: 11, fontWeight: 800, flexShrink: 0, border: "none", cursor: "pointer",
              background: catFilter === cat ? (dark ? "rgba(255,255,255,0.12)" : "#0f172a") : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
              color: catFilter === cat ? "#ffffff" : mutedTx, transition: "all 0.15s ease"
            }}>
            {cat === "Sub-Junior" ? "Sub" : cat}
          </button>
        ))}
      </div>

      {locked && (
        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.18)", marginBottom: 12, fontSize: 11.5, fontWeight: 700, color: "#f43f5e", display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔒</span> {progType} registrations locked by admin.
        </div>
      )}

      {/* Compact Event Cards List */}
      {eventSubTab === "all" ? (
        filtProgs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: mutedTx }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>No programs found</div>
            <div style={{ fontSize: 11 }}>No {progType} programs in {catFilter}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtProgs.map(p => {
              const reg = groupRegs.find(r => r.programId === p.id);
              return (
                <div key={p.id} onClick={() => reg ? setViewTarget(reg) : null} style={{
                  padding: "11px 14px", borderRadius: 12, background: cardBg, border: `1px solid ${border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  cursor: reg ? "pointer" : "default"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 11.5, color: ACCENT, minWidth: 22 }}>{p?.order ? `#${p.order}` : ""}</span>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: dark ? "#f8fafc" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {reg ? (
                      <span style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 800, border: "1px solid rgba(16,185,129,0.22)", borderRadius: 9, fontSize: 11, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        ✓ Registered <Ic name="chevronRight" size={12} color="#10b981" />
                      </span>
                    ) : locked ? (
                      <span style={{ fontSize: 11, color: "#f43f5e", fontWeight: 800 }}>Locked</span>
                    ) : (
                      <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); setEditTarget(null); setRegForm({ programId: p.id, participantIds: [] }); setRegModal(true); }} style={{ borderRadius: 9, fontWeight: 800, fontSize: 11.5, padding: "5px 12px" }}>
                        + Register
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        filtRegs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: mutedTx }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>No registrations yet</div>
            <div style={{ fontSize: 11 }}>Tap "All" above to register your team</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtRegs.map(r => {
              const p = programs.find(pg => pg.id === r.programId);
              return (
                <div key={r.id} onClick={() => setViewTarget(r)} style={{
                  padding: "11px 14px", borderRadius: 12, background: cardBg, border: `1px solid ${border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 11.5, color: ACCENT, minWidth: 22 }}>{p?.order ? `#${p.order}` : ""}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: dark ? "#f8fafc" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name}</span>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.12)", padding: "4px 10px", borderRadius: 9, border: "1px solid rgba(16,185,129,0.22)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Details <Ic name="chevronRight" size={12} color="#10b981" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );

  // ── MESSAGES TAB ───────────────────────────────────────────────────────────
  const renderMessages = () => (
    <EmbeddedInbox group={group} dark={dark} messages={messages} sendMessage={sendMessage} markRead={markRead} setMessages={setMessages} deleteMessage={deleteMessage} />
  );

  const renderViews = { home: renderHome, members: renderMembers, events: renderEvents, messages: renderMessages };

  return (
    <div className="anim-fadeIn" style={{ minHeight: "100vh" }}>
      <Topbar
        left={
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif", color: dark ? "#f8fafc" : "#0f172a" }}>{group.name}</div>
            <div style={{ fontSize: 11, color: mutedTx }}>Leader Portal</div>
          </div>
        }
        dark={dark} setDark={setDark} onBack={onBack}
      />

      {renderViews[tab]()}

      <BottomNav tab={tab} setTab={setTab} unread={unreadCount} dark={dark} />

      {/* ── Registration modal ── */}
      {regModal && (
        <Modal title={editTarget ? "Edit Registration" : "Register for Event"} onClose={() => setRegModal(false)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">Select Program</label>
              <select className="input select" value={regForm.programId} onChange={e => setRegForm({ programId: e.target.value, participantIds: [] })} style={{ borderRadius: 12 }}>
                <option value="">Choose a program…</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.order ? `#${p.order} ` : ""}{p.name} · {p.category} ({p.type || p.session || "Stage"})</option>
                ))}
              </select>
            </div>

            {regForm.programId && (
              <div className="anim-fadeIn">
                <label className="label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Select Participants <span style={{ color: ACCENT, fontWeight: 800 }}>({regForm.participantIds.length}/{max})</span></span>
                  {atMax && <span style={{ fontSize: 10, fontWeight: 800, color: mutedTx, letterSpacing: 0.5 }}>MAX REACHED</span>}
                </label>
                <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}`, maxHeight: 280, overflowY: "auto" }}>
                  {groupStudents.filter(s => !selectedProg?.category || selectedProg.category === "General" || s.category?.toLowerCase() === selectedProg.category?.toLowerCase()).length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: mutedTx }}>No students available in {selectedProg?.category || "General"} category</div>
                  ) : (
                    groupStudents.filter(s => !selectedProg?.category || selectedProg.category === "General" || s.category?.toLowerCase() === selectedProg.category?.toLowerCase()).map((s, i) => {
                      const active     = regForm.participantIds.includes(s.id);
                      const registered = alreadyRegistered.has(s.id);
                      const disabled   = registered || (!active && atMax);
                      return (
                        <div key={s.id} onClick={() => !disabled && togglePart(s.id)} style={{
                          padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: registered ? 0.35 : (!active && atMax) ? 0.45 : 1,
                          background: active ? (dark ? "rgba(241,77,77,0.1)" : "rgba(241,77,77,0.06)") : "transparent",
                          borderTop: i > 0 ? `1px solid ${border}` : "none",
                          transition: "background 0.12s",
                        }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${active ? ACCENT : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)")}`, background: active ? ACCENT : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}>
                            {active && <Ic name="check" size={12} color="#ffffff" />}
                          </div>
                          <span style={{ color: ACCENT, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, minWidth: 32 }}>{s.chestNo}</span>
                          <span style={{ fontWeight: 600, fontSize: 13, flex: 1, color: dark ? "#f8fafc" : "#0f172a" }}>{s.name}</span>
                          {registered && <span style={{ fontSize: 10, fontWeight: 800, color: mutedTx, letterSpacing: 0.4 }}>REGISTERED</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setRegModal(false)} style={{ borderRadius: 12 }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveReg} disabled={!regForm.programId || regForm.participantIds.length === 0} style={{ borderRadius: 12, fontWeight: 800 }}>
                {editTarget ? "Update Registration" : "Confirm Registration"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Registered Program Details & Edit Modal */}
      {viewTarget && (
        <Modal title="Registration Details" onClose={() => setViewTarget(null)}>
          {(() => {
            const p = programs.find(pg => pg.id === viewTarget.programId);
            const pSession = p?.type || p?.session || progType || "Stage";
            const isTargetLocked = isLocked(group.id, pSession);
            const parts = viewTarget.participantIds.map(id => groupStudents.find(s => s.id === id)).filter(Boolean);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Simplified Header Card */}
                <div style={{ padding: "14px 16px", borderRadius: 14, background: dark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.03)", border: `1px solid ${border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 14, color: ACCENT }}>{p?.order ? `#${p.order}` : ""}</span>
                    <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Plus Jakarta Sans',sans-serif", color: dark ? "#f8fafc" : "#0f172a" }}>{p?.name}</div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: mutedTx, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>{p?.category}</span>
                    <span>•</span>
                    <span>{p?.type || p?.session || "Stage"}</span>
                    <span>•</span>
                    <span style={{ color: "#10b981", fontWeight: 800 }}>{parts.length}/{p?.maxParticipants || 1} Registered</span>
                  </div>
                </div>

                {/* Student details list */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: mutedTx, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
                    Registered Students ({parts.length})
                  </div>
                  <div>
                    {parts.length === 0 ? (
                      <div style={{ padding: "12px 0", fontSize: 13, color: mutedTx }}>No students attached</div>
                    ) : parts.map((s, i) => (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                        borderBottom: i < parts.length - 1 ? `1px solid ${border}` : "none"
                      }}>
                        <span style={{ color: ACCENT, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, minWidth: 36 }}>#{s.chestNo}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: dark ? "#f8fafc" : "#0f172a" }}>{s.name}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: mutedTx }}>{s.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 50/50 Action buttons inside modal */}
                {!isTargetLocked ? (
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button className="btn btn-ghost" onClick={() => { setDelConfirm(viewTarget.id); setViewTarget(null); }}
                      style={{ flex: 1, borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)", height: 44 }}>
                      Cancel Registration
                    </button>
                    <button className="btn btn-primary" onClick={() => { openReg(viewTarget); setViewTarget(null); }}
                      style={{ flex: 1, borderRadius: 12, fontSize: 13, fontWeight: 800, height: 44 }}>
                      Edit Registration
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.18)", textAlign: "center", color: "#f43f5e", fontWeight: 800, fontSize: 12.5 }}>
                    🔒 Registration for this program is locked by Admin
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Delete confirmation */}
      {delConfirm && (
        <Modal title="Cancel Registration" onClose={() => setDelConfirm(null)}>
          <p style={{ fontSize: 14, color: mutedTx, marginBottom: 20 }}>
            Are you sure you want to remove this event registration?
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setDelConfirm(null)} style={{ borderRadius: 12 }}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDeleteReg} style={{ borderRadius: 12, fontWeight: 800 }}>Confirm Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── EMBEDDED CHAT ─────────────────────────────────────────────────────────────
const EmbeddedInbox = ({ group, dark, messages, sendMessage, markRead, setMessages, deleteMessage }) => {
  const [text, setText]         = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [ctxMsg, setCtxMsg]     = useState(null);
  const [ctxPos, setCtxPos]     = useState({ x: 0, y: 0 });

  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx  = dark ? "#94a3b8" : "#64748b";
  const bubbleBg = dark ? "rgba(255,255,255,0.08)" : "#ffffff";

  const thread = messages
    .filter(m => !(m.deletedFor || []).includes(group.id))
    .filter(m => (m.from === "admin" && m.to === group.id) || (m.from === group.id && m.to === "admin"))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  useEffect(() => { markRead(group.id); }, [thread.length]);

  const send = () => {
    if (!text.trim()) return;
    sendMessage(group.id, group.name, "admin", text.trim());
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

  const threadWithDates = [];
  let lastDate = null;
  thread.forEach(m => {
    const d = fmtDate(m.timestamp);
    if (d !== lastDate) { threadWithDates.push({ type: "date", label: d, id: "d-" + d }); lastDate = d; }
    threadWithDates.push({ type: "msg", ...m });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px - 84px)", maxWidth: 600, margin: "0 auto" }} onClick={() => setShowMenu(false)}>
      {/* Header bar */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {threadWithDates.length === 0 ? (
          <div style={{ textAlign: "center", margin: "auto" }}>
            <div style={{ fontSize: 12, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", padding: "8px 16px", borderRadius: 14, color: mutedTx, fontWeight: 600 }}>
              End-to-End Chat Channel Active
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
                background: isOwn ? "linear-gradient(135deg,#f14d4d,#dc2626)" : bubbleBg,
                color: isOwn ? "#ffffff" : (dark ? "#f8fafc" : "#0f172a"),
                boxShadow: isOwn ? "0 4px 14px rgba(241,77,77,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                border: isOwn ? "none" : `1px solid ${border}`,
              }}>
                {!isOwn && <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, marginBottom: 3 }}>System Admin</div>}
                <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{m.text}</div>
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: "right", fontWeight: 600 }}>{fmtTime(m.timestamp)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${border}`, background: dark ? "#0f111a" : "#ffffff", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", borderRadius: 16, padding: "2px 14px", display: "flex", alignItems: "center" }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message to admin..." rows={1}
            style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: 14, color: dark ? "#f8fafc" : "#0f172a", fontFamily: "inherit", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", paddingTop: 10, paddingBottom: 10 }}
          />
        </div>
        <button onClick={send} style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0, border: "none",
          background: text.trim() ? "linear-gradient(135deg,#f14d4d,#dc2626)" : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
          color: text.trim() ? "#ffffff" : mutedTx,
          cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: text.trim() ? "0 4px 14px rgba(241,77,77,0.3)" : "none", transition: "all 0.15s ease"
        }}>
          <Ic name="send" size={16} />
        </button>
      </div>

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

export default LeaderPortal;
