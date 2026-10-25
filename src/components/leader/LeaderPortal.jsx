import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import { CATS, STUDENT_CATS, ACCENT } from "../../styles/DesignTokens";
import { triggerHaptic } from "../../utils/haptics";
import { getHashRoute, useHashSync, useModalBackHandler } from "../../utils/useRouting";

const VALID_TABS = ["home", "members", "events", "results"];

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
  { id: "results",  icon: "award",   label: "Results"  },
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
    background: dark ? "#171923" : "#ffffff",
    border: "none",
    boxShadow: dark ? "0 12px 36px rgba(0, 0, 0, 0.6)" : "0 12px 36px rgba(15, 23, 42, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
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
  const { groups, programs, students, registrations, setRegistrations, addRegistration, removeRegistration, updateRegistration, logActivity, messages, sendMessage, markRead, setMessages, deleteMessage, isLocked } = useApp();

  const [tab, setTabState]               = useState(() => getHashRoute("leader", "home", VALID_TABS, { programs: "events", messages: "results" }));
  const setTab                            = useHashSync("leader", tab, setTabState, VALID_TABS, { programs: "events", messages: "results" });

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
  const [showSettings, setShowSettings]   = useState(false);
  const [showCatStatsModal, setShowCatStatsModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  // Results Tab State
  const [resView, setResView]             = useState("all"); // "all" | "mine" | "leaderboard"
  const [resCatFilter, setResCatFilter]   = useState("All");
  const [resTypeFilter, setResTypeFilter] = useState("All");
  const [resSearch, setResSearch]         = useState("");
  const [resSearchOpen, setResSearchOpen] = useState(false);

  const isAnyModalOpen = regModal || !!delConfirm || !!viewTarget || showSettings || showCatStatsModal || showMessagesModal;
  const closeAllModals = useCallback(() => {
    setRegModal(false);
    setDelConfirm(null);
    setViewTarget(null);
    setShowSettings(false);
    setShowCatStatsModal(false);
    setShowMessagesModal(false);
  }, []);

  useModalBackHandler(isAnyModalOpen, closeAllModals);

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
  }).sort((a, b) => {
    const aReg = groupRegs.some(r => r.programId === a.id);
    const bReg = groupRegs.some(r => r.programId === b.id);
    if (aReg && !bReg) return 1;  // Push registered to bottom
    if (!aReg && bReg) return -1; // Keep unregistered at top
    return (a.order || 0) - (b.order || 0);
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

  const getCatStats = (catName, pType = progType) => {
    const totalCatProgs = programs.filter(p => 
      (p.type || p.session || "Stage").toLowerCase() === pType.toLowerCase() &&
      p.category?.toLowerCase() === catName.toLowerCase()
    );
    const registeredCount = totalCatProgs.filter(p => 
      groupRegs.some(r => r.programId === p.id)
    ).length;
    const remainingCount = Math.max(0, totalCatProgs.length - registeredCount);
    return { total: totalCatProgs.length, registered: registeredCount, remaining: remainingCount };
  };

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
      // Use atomic update for existing registration
      updateRegistration(editTarget, regForm);
      logActivity(user.name, "Updated registration", `${p?.name} for ${group.name}`);
    } else {
      // Use atomic add for new registration
      const newReg = { id: "r-" + Math.random().toString(36).substr(2, 5), groupId: group.id, ...regForm };
      addRegistration(newReg);
      logActivity(user.name, "Registered", `${p?.name} for ${group.name}`);
    }
    setRegModal(false);
  };

  const confirmDeleteReg = () => {
    const reg = groupRegs.find(r => r.id === delConfirm);
    const p   = programs.find(pg => pg.id === reg?.programId);
    const pType = (p?.type || p?.session || "Stage").toLowerCase();
    if (isLocked(group.id, pType)) return;

    // Use atomic remove function
    removeRegistration(delConfirm);
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
    const leaderStudent = groupStudents.find(s => s.groupRole === "Leader");
    const asstStudent   = groupStudents.find(s => s.groupRole === "Asst. Leader");

    const stageProgs = programs.filter(p => (p.type || p.session || "Stage").toLowerCase() === "stage");
    const offStageProgs = programs.filter(p => (p.type || p.session || "Stage").toLowerCase() === "off-stage");

    const stageRegs = groupRegs.filter(r => stageProgs.some(p => p.id === r.programId));
    const offStageRegs = groupRegs.filter(r => offStageProgs.some(p => p.id === r.programId));

    const isStageLocked = isLocked(group.id, "stage");
    const isOffStageLocked = isLocked(group.id, "off-stage");

    const solidBg = dark ? "rgba(255,255,255,0.04)" : "#f8fafc";
    const solidCardShadow = dark ? "none" : "0 4px 16px rgba(0,0,0,0.02)";

    return (
      <div className="anim-fadeIn" style={{ padding: "24px 16px 110px", maxWidth: 600, margin: "0 auto" }}>
        {/* Header - Group Name & Settings Gear */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: "-0.6px",
              color: dark ? "#f8fafc" : "#0f172a"
            }}>
              {group.name}
            </div>

            <button onClick={() => setShowSettings(true)} style={{
              width: 40, height: 40, borderRadius: 12, border: `1px solid ${border}`,
              background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: dark ? "#f8fafc" : "#0f172a", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s ease"
            }} title="Settings">
              <Ic name="settings" size={18} />
            </button>
          </div>

          {/* Pro Leader & Asst. Subtitle */}
          {(leaderStudent || asstStudent) && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 8,
              flexWrap: "wrap"
            }}>
              {leaderStudent && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px 4px 8px",
                  borderRadius: 20,
                  background: dark ? "rgba(241, 77, 77, 0.1)" : "rgba(241, 77, 77, 0.06)",
                  border: "1px solid rgba(241, 77, 77, 0.2)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: dark ? "#f8fafc" : "#0f172a"
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f14d4d", boxShadow: "0 0 6px rgba(241, 77, 77, 0.6)" }} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: "#f14d4d", textTransform: "uppercase", letterSpacing: "0.4px" }}>Leader</span>
                  <span style={{ width: 1, height: 10, background: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
                  <span>{leaderStudent.name}</span>
                </div>
              )}

              {asstStudent && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px 4px 8px",
                  borderRadius: 20,
                  background: dark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.06)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: dark ? "#f8fafc" : "#0f172a"
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 6px rgba(59, 130, 246, 0.6)" }} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.4px" }}>Asst.</span>
                  <span style={{ width: 1, height: 10, background: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
                  <span>{asstStudent.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Solid Borderless Primary Stat Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Card 1: Team Members */}
          <div style={{
            padding: "20px 18px", borderRadius: 18, border: "none",
            background: solidBg, boxShadow: solidCardShadow
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.6px" }}>
              Total Members
            </div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 34,
              color: dark ? "#f8fafc" : "#0f172a", marginTop: 4
            }}>
              {groupStudents.length}
            </div>
          </div>

          {/* Card 2: Total Registrations */}
          <div style={{
            padding: "20px 18px", borderRadius: 18, border: "none",
            background: solidBg, boxShadow: solidCardShadow
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.6px" }}>
              Registrations
            </div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 34,
              color: ACCENT, marginTop: 4
            }}>
              {totalRegs}
            </div>
          </div>
        </div>

        {/* Solid Borderless Session Status Card (Mobile Friendly) */}
        <div style={{
          padding: "18px 20px", borderRadius: 18, border: "none",
          background: solidBg, boxShadow: solidCardShadow, marginBottom: 20
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
            Session Status
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Stage Session */}
            <div onClick={() => { triggerHaptic("light"); setProgType("Stage"); setTab("events"); }} style={{
              padding: "12px 14px", borderRadius: 14, cursor: "pointer",
              background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              border: `1px solid ${border}`
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: dark ? "#f8fafc" : "#0f172a" }}>Stage Session</div>
                <div style={{ fontSize: 11, color: mutedTx, marginTop: 1 }}>{stageRegs.length} Registered</div>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 800, padding: "4px 10px", borderRadius: 8, flexShrink: 0,
                background: isStageLocked ? "rgba(244,63,94,0.12)" : "rgba(16,185,129,0.12)",
                color: isStageLocked ? "#f43f5e" : "#10b981",
                border: isStageLocked ? "1px solid rgba(244,63,94,0.2)" : "1px solid rgba(16,185,129,0.2)"
              }}>
                {isStageLocked ? "Locked" : "Open"}
              </span>
            </div>

            {/* Off-Stage Session */}
            <div onClick={() => { triggerHaptic("light"); setProgType("Off-Stage"); setTab("events"); }} style={{
              padding: "12px 14px", borderRadius: 14, cursor: "pointer",
              background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              border: `1px solid ${border}`
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: dark ? "#f8fafc" : "#0f172a" }}>Off-Stage Session</div>
                <div style={{ fontSize: 11, color: mutedTx, marginTop: 1 }}>{offStageRegs.length} Registered</div>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 800, padding: "4px 10px", borderRadius: 8, flexShrink: 0,
                background: isOffStageLocked ? "rgba(244,63,94,0.12)" : "rgba(16,185,129,0.12)",
                color: isOffStageLocked ? "#f43f5e" : "#10b981",
                border: isOffStageLocked ? "1px solid rgba(244,63,94,0.2)" : "1px solid rgba(16,185,129,0.2)"
              }}>
                {isOffStageLocked ? "Locked" : "Open"}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button onClick={() => { triggerHaptic("medium"); setTab("events"); }} style={{
          width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #f14d4d 0%, #e11d48 100%)", color: "#ffffff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15,
          boxShadow: "0 8px 24px rgba(241, 77, 77, 0.35)", transition: "all 0.15s ease"
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
          <input
            className="input"
            type="text"
            placeholder="Filter by student name..."
            value={memSearch}
            onChange={e => setMemSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") {
                setMemSearch("");
                setMemSearchOpen(false);
              }
            }}
            style={{ fontSize: 13, borderRadius: 12 }}
            autoFocus
          />
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
      {/* Page Header & Stage Switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 24, letterSpacing: "-0.6px", color: dark ? "#f8fafc" : "#0f172a" }}>
            {progType} Session
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: mutedTx, marginTop: 2 }}>{group.name}</div>
        </div>

        {/* Stage / Off-Stage Segmented Toggle */}
        <div style={{ display: "flex", background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", borderRadius: 10, padding: 3 }}>
          {["Stage", "Off-Stage"].map(t => (
            <button key={t} onClick={() => { triggerHaptic("light"); setProgType(t); setCatFilter("Sub-Junior"); }}
              style={{
                padding: "5px 12px", border: "none", cursor: "pointer", borderRadius: 8,
                fontFamily: "inherit", fontSize: 11.5, fontWeight: 800,
                background: progType === t ? (dark ? "rgba(255,255,255,0.14)" : "#ffffff") : "transparent",
                color: progType === t ? (dark ? "#f8fafc" : "#0f172a") : mutedTx,
                boxShadow: progType === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Lock Warning Banner */}
      {locked && (
        <div style={{
          marginBottom: 14, padding: "10px 14px", borderRadius: 12,
          background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)",
          color: "#f43f5e", fontSize: 12, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span>{progType} registrations are currently locked by Admin</span>
        </div>
      )}

      {/* Sub-tab Switcher (All vs Registered) */}
      <div style={{ display: "flex", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 12, padding: 3, marginBottom: 12, border: `1px solid ${border}` }}>
        <button onClick={() => { triggerHaptic("light"); setEventSubTab("all"); }} style={{
          flex: 1, padding: "8px 10px", cursor: "pointer", borderRadius: 9, border: "none",
          fontWeight: 800, fontSize: 12, textAlign: "center",
          background: eventSubTab === "all" ? ACCENT : "transparent",
          color: eventSubTab === "all" ? "#ffffff" : mutedTx,
          transition: "all 0.15s ease",
        }}>All Programs ({filtProgs.length})</button>

        <button onClick={() => { triggerHaptic("light"); setEventSubTab("mine"); }} style={{
          flex: 1, padding: "8px 10px", cursor: "pointer", borderRadius: 9, border: "none",
          fontWeight: 800, fontSize: 12, textAlign: "center",
          background: eventSubTab === "mine" ? ACCENT : "transparent",
          color: eventSubTab === "mine" ? "#ffffff" : mutedTx,
          transition: "all 0.15s ease",
        }}>Registered ({filtRegs.length})</button>
      </div>

      {/* Standard Mobile Category Tab Bar */}
      <div style={{
        display: "flex",
        borderBottom: `1px solid ${border}`,
        marginBottom: 16,
        position: "relative"
      }}>
        {CATS.map(cat => {
          const stats = getCatStats(cat, progType);
          const catLabel = cat === "Sub-Junior" ? "Sub-Jr" : cat;
          const isSelected = catFilter === cat;
          return (
            <button key={cat} onClick={() => { triggerHaptic("light"); setCatFilter(cat); }}
              style={{
                flex: 1,
                padding: "10px 4px 12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                color: isSelected ? (dark ? "#f8fafc" : "#0f172a") : mutedTx,
                fontWeight: isSelected ? 800 : 600,
                fontSize: 12,
                fontFamily: "inherit",
                transition: "all 0.15s ease"
              }}>
              <span>{catLabel}</span>
              <span style={{
                fontSize: 9.5, padding: "1px 5px", borderRadius: 6,
                background: isSelected ? "rgba(241,77,77,0.12)" : (stats.remaining > 0 ? "rgba(241,77,77,0.08)" : "rgba(16,185,129,0.08)"),
                color: isSelected ? ACCENT : (stats.remaining > 0 ? "#f14d4d" : "#10b981"),
                fontWeight: 800
              }}>
                {stats.remaining > 0 ? stats.remaining : "✓"}
              </span>

              {/* Active Tab Underline Indicator */}
              {isSelected && (
                <div style={{
                  position: "absolute",
                  bottom: -1,
                  left: "15%",
                  width: "70%",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  background: ACCENT
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Program Cards List */}
      {eventSubTab === "all" ? (
        filtProgs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>No programs available</div>
            <div style={{ fontSize: 12 }}>No {progType} programs found in {catFilter}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtProgs.map(p => {
              const reg = groupRegs.find(r => r.programId === p.id);
              return (
                <div key={p.id} onClick={() => reg ? setViewTarget(reg) : null} style={{
                  padding: "12px 16px", borderRadius: 14, background: cardBg, border: `1px solid ${border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  cursor: reg ? "pointer" : "default",
                  transition: "all 0.15s ease",
                  boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 12, color: ACCENT, minWidth: 24 }}>{p?.order ? `#${p.order}` : ""}</span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: dark ? "#f8fafc" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {reg ? (
                      <span style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 800, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 9, fontSize: 11, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        ✓ Registered <Ic name="chevronRight" size={12} color="#10b981" />
                      </span>
                    ) : locked ? (
                      <span style={{ fontSize: 11, color: "#f43f5e", fontWeight: 800, background: "rgba(244,63,94,0.08)", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(244,63,94,0.15)" }}>🔒 Locked</span>
                    ) : (
                      <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); triggerHaptic("medium"); setEditTarget(null); setRegForm({ programId: p.id, participantIds: [] }); setRegModal(true); }} style={{ borderRadius: 9, fontWeight: 800, fontSize: 11.5, padding: "6px 14px" }}>
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
          <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>No registrations yet</div>
            <div style={{ fontSize: 12 }}>Switch to "All Programs" above to register your team</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 80 }}>
            {filtRegs.map(r => {
              const p = programs.find(pg => pg.id === r.programId);
              return (
                <div key={r.id} onClick={() => { triggerHaptic("light"); setViewTarget(r); }} style={{
                  padding: "12px 16px", borderRadius: 14, background: cardBg, border: `1px solid ${border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 12, color: ACCENT, minWidth: 24 }}>{p?.order ? `#${p.order}` : ""}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: dark ? "#f8fafc" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name}</span>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.12)", padding: "4px 10px", borderRadius: 9, border: "1px solid rgba(16,185,129,0.2)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Details <Ic name="chevronRight" size={12} color="#10b981" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Floating Pinned Button at Bottom-Left */}
      {eventSubTab === "mine" && (
        <button onClick={() => { triggerHaptic("light"); setShowCatStatsModal(true); }} style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 86px)",
          left: 16,
          zIndex: 90,
          padding: "10px 16px",
          borderRadius: 30,
          background: "linear-gradient(135deg, #f14d4d 0%, #e11d48 100%)",
          color: "#ffffff",
          border: "1px solid rgba(255,255,255,0.2)",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 8px 24px rgba(241,77,77,0.38)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <span style={{ fontSize: 13 }}>📊</span>
          <span>Remaining ({getCatStats(catFilter, progType).remaining})</span>
        </button>
      )}
    </div>
  );

  // ── RESULTS OPS & HELPERS ──────────────────────────────────────────────────
  // ── RESULTS OPS & HELPERS ──────────────────────────────────────────────────
  const findStudentInfo = useCallback((studentId) => {
    if (!studentId) return null;
    const sId = String(studentId);
    const grpList = groups && groups.length > 0 ? groups : [group];
    for (const [gId, stuList] of Object.entries(students || {})) {
      const st = (stuList || []).find(s => String(s.id) === sId);
      if (st) {
        const grp = grpList.find(g => g.id === gId) || { id: gId, name: gId, color: "#f14d4d" };
        return {
          ...st,
          groupId: gId,
          groupName: grp.name,
          groupColor: grp.color || "#f14d4d",
          isMyGroup: gId === group.id,
        };
      }
    }
    return null;
  }, [students, groups, group]);

  const resolveStudent = useCallback((item) => {
    if (!item) return null;
    const st = item.studentId ? findStudentInfo(item.studentId) : null;
    const gId = st?.groupId || item.groupId || "";
    const grp = (groups && groups.length > 0 ? groups : [group]).find(g => g.id === gId) || {
      id: gId,
      name: item.groupName || gId || "Team",
      color: item.groupColor || "#f14d4d",
    };
    const isMe = gId === group.id || (item.groupName && group.name && item.groupName.toLowerCase() === group.name.toLowerCase());

    return {
      studentId: item.studentId || st?.id,
      name: item.studentName || item.rawName || st?.name || (item.studentId ? `Contestant #${item.studentId}` : "—"),
      chestNo: item.chestNo || st?.chestNo || "",
      groupId: gId,
      groupName: grp.name || item.groupName || "Team",
      groupColor: grp.color || item.groupColor || "#f14d4d",
      isMyGroup: isMe,
    };
  }, [findStudentInfo, groups, group]);

  const publishedPrograms = useMemo(() => {
    return programs
      .filter(p => p.status === "published" || (p.results?.entries && p.results.entries.length > 0))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [programs]);

  const groupScores = useMemo(() => {
    const scores = {};
    const grpList = groups && groups.length > 0 ? groups : [group];
    grpList.forEach(g => {
      scores[g.id] = {
        group: g,
        totalPoints: 0,
        firsts: 0,
        seconds: 0,
        thirds: 0,
        gradeA: 0,
        gradeB: 0,
        gradeC: 0,
        totalAwards: 0,
      };
    });

    publishedPrograms.forEach(p => {
      if (p.results?.entries && Array.isArray(p.results.entries)) {
        p.results.entries.forEach(e => {
          const sInfo = resolveStudent(e);
          const targetGid = sInfo?.groupId || e.groupId;
          if (targetGid) {
            if (!scores[targetGid]) {
              scores[targetGid] = {
                group: { id: targetGid, name: sInfo?.groupName || e.groupName || targetGid, color: sInfo?.groupColor || e.groupColor || "#f14d4d" },
                totalPoints: 0,
                firsts: 0,
                seconds: 0,
                thirds: 0,
                gradeA: 0,
                gradeB: 0,
                gradeC: 0,
                totalAwards: 0,
              };
            }
            const pts = parseFloat(e.points) || 0;
            scores[targetGid].totalPoints += pts;
            const place = Number(e.place);
            if (place === 1) scores[targetGid].firsts += 1;
            else if (place === 2) scores[targetGid].seconds += 1;
            else if (place === 3) scores[targetGid].thirds += 1;
            if (e.grade === "A") scores[targetGid].gradeA += 1;
            else if (e.grade === "B") scores[targetGid].gradeB += 1;
            else if (e.grade === "C") scores[targetGid].gradeC += 1;
            scores[targetGid].totalAwards += 1;
          }
        });
      }
      if (p.results?.otherGrades && Array.isArray(p.results.otherGrades)) {
        p.results.otherGrades.forEach(o => {
          const sInfo = resolveStudent(o);
          const targetGid = sInfo?.groupId || o.groupId;
          if (targetGid) {
            if (!scores[targetGid]) {
              scores[targetGid] = {
                group: { id: targetGid, name: sInfo?.groupName || o.groupName || targetGid, color: sInfo?.groupColor || o.groupColor || "#f14d4d" },
                totalPoints: 0,
                firsts: 0,
                seconds: 0,
                thirds: 0,
                gradeA: 0,
                gradeB: 0,
                gradeC: 0,
                totalAwards: 0,
              };
            }
            if (o.grade === "A") scores[targetGid].gradeA += 1;
            else if (o.grade === "B") scores[targetGid].gradeB += 1;
            else if (o.grade === "C") scores[targetGid].gradeC += 1;
            scores[targetGid].totalAwards += 1;
          }
        });
      }
    });

    return Object.values(scores).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.firsts !== a.firsts) return b.firsts - a.firsts;
      return b.seconds - a.seconds;
    });
  }, [publishedPrograms, groups, group, resolveStudent]);

  const myGroupStanding = useMemo(() => {
    const idx = groupScores.findIndex(s => s.group.id === group.id);
    const score = groupScores[idx];
    return {
      rank: idx >= 0 ? idx + 1 : 1,
      totalPoints: score?.totalPoints || 0,
      firsts: score?.firsts || 0,
      seconds: score?.seconds || 0,
      thirds: score?.thirds || 0,
      gradeA: score?.gradeA || 0,
      gradeB: score?.gradeB || 0,
      gradeC: score?.gradeC || 0,
      ...score,
    };
  }, [groupScores, group.id]);

  const filteredPublishedProgs = useMemo(() => {
    let list = publishedPrograms;
    if (resCatFilter !== "All") {
      list = list.filter(p => p.category?.toLowerCase() === resCatFilter.toLowerCase());
    }
    if (resTypeFilter !== "All") {
      list = list.filter(p => (p.type || p.session || "Stage").toLowerCase() === resTypeFilter.toLowerCase());
    }
    if (resView === "mine") {
      list = list.filter(p => {
        const hasEntry = (p.results?.entries || []).some(e => {
          const s = resolveStudent(e);
          return s && s.isMyGroup;
        });
        const hasOther = (p.results?.otherGrades || []).some(o => {
          const s = resolveStudent(o);
          return s && s.isMyGroup;
        });
        return hasEntry || hasOther;
      });
    }
    if (resSearch.trim()) {
      const q = resSearch.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, "").trim();
      list = list.filter(p => {
        const name = (p.name || "").toLowerCase();
        const code = String(p.order || "").toLowerCase();
        return name.includes(q) || code.includes(cleanQ);
      });
    }
    return list;
  }, [publishedPrograms, resCatFilter, resTypeFilter, resView, resSearch, resolveStudent]);

  const fmtPublishTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + " • " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  // ── RESULTS TAB ────────────────────────────────────────────────────────────
  const renderResults = () => (
    <div className="anim-fadeIn" style={{ maxWidth: 540, margin: "0 auto", padding: "20px 16px 120px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 900,
            fontSize: 24,
            letterSpacing: "-0.5px",
            color: dark ? "#f8fafc" : "#0f172a"
          }}>
            Results & Standings
          </div>
          <div style={{ fontSize: 13, color: mutedTx, marginTop: 4, fontWeight: 500 }}>
            {publishedPrograms.length} {publishedPrograms.length === 1 ? "event" : "events"} published
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => {
              setResSearchOpen(o => !o);
              if (resSearchOpen) setResSearch("");
            }}
            style={{
              width: 40, height: 40, borderRadius: 12, border: `1px solid ${border}`,
              background: resSearchOpen ? (dark ? "rgba(241,77,77,0.15)" : "rgba(241,77,77,0.1)") : (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
              color: resSearchOpen ? ACCENT : (dark ? "#f8fafc" : "#0f172a"),
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s ease"
            }}
            title="Search events"
          >
            <Ic name="search" size={17} />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            style={{
              width: 40, height: 40, borderRadius: 12, border: `1px solid ${border}`,
              background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: dark ? "#f8fafc" : "#0f172a", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s ease"
            }}
            title="Settings"
          >
            <Ic name="settings" size={18} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {resSearchOpen && (
        <div style={{ marginBottom: 16 }}>
          <input
            className="input"
            type="text"
            placeholder="Search event name or #..."
            value={resSearch}
            onChange={e => setResSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") {
                setResSearch("");
                setResSearchOpen(false);
              }
            }}
            style={{ fontSize: 13, borderRadius: 12 }}
            autoFocus
          />
        </div>
      )}

      {/* Team Scorecard Hero */}
      <div style={{
        borderRadius: 20,
        padding: "18px 20px",
        marginBottom: 18,
        background: dark
          ? "linear-gradient(135deg, rgba(241, 77, 77, 0.18) 0%, rgba(225, 29, 72, 0.08) 100%), #131524"
          : "linear-gradient(135deg, rgba(241, 77, 77, 0.12) 0%, rgba(255, 255, 255, 0.95) 100%)",
        border: dark ? "1px solid rgba(241, 77, 77, 0.25)" : "1px solid rgba(241, 77, 77, 0.2)",
        boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 30px rgba(241, 77, 77, 0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 12,
              background: "linear-gradient(135deg, #ff5c5c, #f14d4d)",
              color: "#fff", display: "grid", placeItems: "center",
              fontSize: 18, fontWeight: 900
            }}>
              🏆
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {group.name}
              </div>
              <div style={{ fontSize: 11.5, color: mutedTx }}>
                Team Performance
              </div>
            </div>
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 12,
            background: dark ? "rgba(255,255,255,0.08)" : "#ffffff",
            border: `1px solid ${border}`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: mutedTx }}>RANK</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: ACCENT, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              #{myGroupStanding.rank}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.2fr repeat(3, 1fr)",
          gap: 8,
          background: dark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.6)",
          padding: "12px 14px",
          borderRadius: 14,
          border: `1px solid ${border}`,
          textAlign: "center"
        }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: mutedTx, textTransform: "uppercase" }}>Total Points</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT, fontFamily: "'Plus Jakarta Sans',sans-serif", marginTop: 2 }}>
              {myGroupStanding.totalPoints || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: mutedTx }}>🥇 1st</div>
            <div style={{ fontSize: 17, fontWeight: 900, marginTop: 2 }}>{myGroupStanding.firsts || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: mutedTx }}>🥈 2nd</div>
            <div style={{ fontSize: 17, fontWeight: 900, marginTop: 2 }}>{myGroupStanding.seconds || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: mutedTx }}>🥉 3rd</div>
            <div style={{ fontSize: 17, fontWeight: 900, marginTop: 2 }}>{myGroupStanding.thirds || 0}</div>
          </div>
        </div>

        {(myGroupStanding.gradeA > 0 || myGroupStanding.gradeB > 0 || myGroupStanding.gradeC > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 12, color: mutedTx, justifyContent: "center" }}>
            <span>Grades Achieved:</span>
            {myGroupStanding.gradeA > 0 && <span style={{ fontWeight: 800, color: ACCENT }}>{myGroupStanding.gradeA} A</span>}
            {myGroupStanding.gradeB > 0 && <span style={{ fontWeight: 800 }}>{myGroupStanding.gradeB} B</span>}
            {myGroupStanding.gradeC > 0 && <span style={{ fontWeight: 800 }}>{myGroupStanding.gradeC} C</span>}
          </div>
        )}
      </div>

      {/* Subtab Switcher: All Events | Our Wins | Standings */}
      <div style={{
        display: "flex",
        background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
      }}>
        {[
          { id: "all", label: "All Events", icon: "book" },
          { id: "mine", label: "Our Wins", icon: "star" },
          { id: "leaderboard", label: "Standings", icon: "award" },
        ].map(st => {
          const active = resView === st.id;
          return (
            <button
              key={st.id}
              onClick={() => { triggerHaptic("light"); setResView(st.id); }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 10,
                border: "none",
                background: active ? (dark ? "#1f2233" : "#ffffff") : "transparent",
                color: active ? (dark ? "#ffffff" : "#0f172a") : mutedTx,
                fontWeight: active ? 800 : 600,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Ic name={st.icon} size={14} />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Chips (Category & Session) when browsing events */}
      {resView !== "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {["All", ...CATS].map(cat => (
              <button
                key={cat}
                onClick={() => { triggerHaptic("light"); setResCatFilter(cat); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  border: "none",
                  cursor: "pointer",
                  background: resCatFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                  color: resCatFilter === cat ? "#ffffff" : mutedTx,
                  transition: "all 0.15s ease",
                }}
              >
                {cat === "Sub-Junior" ? "Sub" : cat}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Stage", "Off-Stage"].map(t => (
              <button
                key={t}
                onClick={() => setResTypeFilter(t)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  border: `1px solid ${resTypeFilter === t ? ACCENT : border}`,
                  background: resTypeFilter === t ? (dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)") : "transparent",
                  color: resTypeFilter === t ? ACCENT : mutedTx,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content: Standings Leaderboard OR Events List */}
      {resView === "leaderboard" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupScores.map((s, idx) => {
            const isMe = s.group.id === group.id;
            const rank = idx + 1;
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            return (
              <div
                key={s.group.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 18px",
                  borderRadius: 16,
                  background: isMe
                    ? (dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.06)")
                    : cardBg,
                  border: isMe
                    ? `1.5px solid ${ACCENT}`
                    : `1px solid ${border}`,
                  boxShadow: isMe
                    ? "0 6px 20px rgba(241,77,77,0.15)"
                    : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: medal
                        ? (rank === 1 ? "#fbbf24" : rank === 2 ? "#cbd5e1" : "#d97706")
                        : (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                      color: medal ? "#000" : (dark ? "#fff" : "#000"),
                      fontWeight: 900,
                      fontSize: medal ? 16 : 14,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {medal || rank}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: 14.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: isMe ? ACCENT : (dark ? "#f8fafc" : "#0f172a"),
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <span>{s.group.name}</span>
                      {isMe && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: ACCENT,
                          color: "#fff",
                        }}>
                          You
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: mutedTx, marginTop: 2, display: "flex", gap: 8 }}>
                      <span>🥇 {s.firsts}</span>
                      <span>🥈 {s.seconds}</span>
                      <span>🥉 {s.thirds}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontSize: 19,
                    fontWeight: 900,
                    color: isMe ? ACCENT : (dark ? "#f8fafc" : "#0f172a"),
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}>
                    {s.totalPoints}
                    <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 2, color: mutedTx }}>pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredPublishedProgs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: mutedTx }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                {resView === "mine"
                  ? "No awards in published events yet"
                  : publishedPrograms.length === 0
                  ? "No results published yet"
                  : "No events match your search or filter"}
              </div>
              <div style={{ fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
                {resView === "mine"
                  ? "When your team members secure placements or grades in published events, they will appear here!"
                  : publishedPrograms.length === 0
                  ? "Results will be published live as soon as organizers evaluate and finalize them."
                  : "Try clearing your search query or selecting a different category."}
              </div>
            </div>
          ) : (
            filteredPublishedProgs.map(p => {
              const entries = p.results?.entries || [];
              const otherGrades = p.results?.otherGrades || [];
              const hasMyTeamWin = entries.some(e => {
                const st = resolveStudent(e);
                return st && st.isMyGroup;
              }) || otherGrades.some(o => {
                const st = resolveStudent(o);
                return st && st.isMyGroup;
              });

              return (
                <div
                  key={p.id}
                  style={{
                    borderRadius: 18,
                    padding: "16px 18px",
                    background: cardBg,
                    border: hasMyTeamWin
                      ? (dark ? "1.5px solid rgba(241,77,77,0.4)" : "1.5px solid rgba(241,77,77,0.3)")
                      : `1px solid ${border}`,
                    boxShadow: hasMyTeamWin
                      ? (dark ? "0 8px 24px rgba(241,77,77,0.12)" : "0 8px 24px rgba(241,77,77,0.06)")
                      : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Event Card Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontWeight: 800,
                          fontSize: 12,
                          color: ACCENT,
                          background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                          padding: "2px 7px",
                          borderRadius: 6,
                        }}>
                          #{p.order || p.code || "—"}
                        </span>
                        <Tag label={p.category} dark={dark} />
                        <Tag label={p.type || p.session || "Stage"} dark={dark} variant="accent" />
                        {hasMyTeamWin && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#10b981",
                            background: "rgba(16,185,129,0.12)",
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}>
                            🎉 Team Placed!
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: dark ? "#f8fafc" : "#0f172a" }}>
                        {p.name}
                      </div>
                    </div>

                    {p.results?.publishedAt && (
                      <div style={{ fontSize: 10.5, color: mutedTx, flexShrink: 0, textAlign: "right" }}>
                        {fmtPublishTime(p.results.publishedAt)}
                      </div>
                    )}
                  </div>

                  {/* 1st, 2nd, 3rd Placements */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {entries.map((e, idx) => {
                      const st = resolveStudent(e);
                      const isMe = st?.isMyGroup;
                      const place = Number(e.place || idx + 1);
                      const placeLabel = place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`;
                      const medalColor = place === 1 ? "#f59e0b" : place === 2 ? "#94a3b8" : "#d97706";

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "8px 12px",
                            borderRadius: 12,
                            background: isMe
                              ? (dark ? "rgba(241,77,77,0.14)" : "rgba(241,77,77,0.07)")
                              : (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                            border: isMe
                              ? `1px solid rgba(241,77,77,0.3)`
                              : `1px solid ${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                            <span style={{
                              width: 32,
                              height: 24,
                              borderRadius: 6,
                              background: `${medalColor}22`,
                              color: medalColor,
                              fontWeight: 900,
                              fontSize: 11.5,
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}>
                              {placeLabel}
                            </span>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{
                                fontWeight: 700,
                                fontSize: 13,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: isMe ? ACCENT : (dark ? "#f8fafc" : "#0f172a"),
                              }}>
                                {st?.chestNo && <span style={{ opacity: 0.8, marginRight: 5 }}>#{st.chestNo}</span>}
                                {st?.name || `Contestant #${e.studentId}`}
                              </div>
                              <div style={{ fontSize: 11, color: mutedTx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {st?.groupName || "—"}
                                {isMe && <span style={{ marginLeft: 6, color: ACCENT, fontWeight: 700 }}>• Your Team</span>}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {e.points !== undefined && e.points !== "" && (
                              <span style={{ fontSize: 12, fontWeight: 800, color: isMe ? ACCENT : mutedTx }}>
                                {e.points} pts
                              </span>
                            )}
                            {e.grade && e.grade !== "—" && (
                              <span style={{
                                width: 24,
                                height: 24,
                                borderRadius: 7,
                                display: "grid",
                                placeItems: "center",
                                fontSize: 11.5,
                                fontWeight: 900,
                                background: isMe ? "rgba(241,77,77,0.2)" : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                                color: isMe ? ACCENT : (dark ? "#e2e8f0" : "#334155"),
                              }}>
                                {e.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Other Grades list if available */}
                  {otherGrades.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: mutedTx, marginBottom: 6 }}>
                        Other Honors & Grades:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {otherGrades.map((og, ogIdx) => {
                          const ost = resolveStudent(og);
                          const isMe = ost?.isMyGroup;
                          return (
                            <span
                              key={ogIdx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 9px",
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 600,
                                background: isMe ? "rgba(241,77,77,0.12)" : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
                                color: isMe ? ACCENT : (dark ? "#cbd5e1" : "#475569"),
                                border: `1px solid ${isMe ? "rgba(241,77,77,0.25)" : border}`,
                              }}
                            >
                              <span>
                                {ost?.chestNo && <span style={{ opacity: 0.8, marginRight: 4 }}>#{ost.chestNo}</span>}
                                {ost?.name}
                              </span>
                              <span style={{
                                fontWeight: 900,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: isMe ? ACCENT : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"),
                                color: isMe ? "#fff" : "inherit",
                                fontSize: 10,
                              }}>
                                {og.grade}
                              </span>
                              {ost?.groupName && (
                                <span style={{ fontSize: 10, color: mutedTx }}>({ost.groupName})</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  const renderViews = { home: renderHome, members: renderMembers, events: renderEvents, results: renderResults };

  return (
    <div className="anim-fadeIn" style={{ minHeight: "100vh" }}>
      {renderViews[tab] ? renderViews[tab]() : renderViews.home()}

      <BottomNav tab={tab} setTab={setTab} dark={dark} />

      {/* ── Messages Floating Action Button (FAB) on all pages except results ── */}
      {tab !== "results" && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            setShowMessagesModal(true);
          }}
          aria-label="Support Chat"
          title="Admin Support Chat"
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 86px)",
            right: 18,
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ff5c5c 0%, #f14d4d 100%)",
            color: "#ffffff",
            border: "none",
            boxShadow: dark
              ? "0 8px 24px rgba(241, 77, 77, 0.45), 0 2px 8px rgba(0,0,0,0.5)"
              : "0 8px 24px rgba(241, 77, 77, 0.4), 0 2px 8px rgba(0,0,0,0.12)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 140,
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "scale(1.08) translateY(-2px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "none";
          }}
        >
          <Ic name="message" size={22} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                minWidth: 19,
                height: 19,
                padding: "0 4px",
                borderRadius: 10,
                background: "#ffffff",
                color: "#f14d4d",
                fontSize: 10.5,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                border: "2px solid #f14d4d",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Messages Modal Sheet ── */}
      {showMessagesModal && (
        <div
          className="anim-fadeIn"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowMessagesModal(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 580,
              height: "92vh",
              maxHeight: 760,
              borderRadius: "24px 24px 0 0",
              background: dark ? "#0a0c16" : "#ffffff",
              border: `1px solid ${border}`,
              borderBottom: "none",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <EmbeddedInbox
              group={group}
              dark={dark}
              messages={messages}
              sendMessage={sendMessage}
              markRead={markRead}
              setMessages={setMessages}
              deleteMessage={deleteMessage}
              onClose={() => setShowMessagesModal(false)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* ── Settings modal ── */}
      {showSettings && (
        <Topbar
          _settingsOnly
          _forceOpen={true}
          onSettingsClose={() => setShowSettings(false)}
          dark={dark}
          setDark={setDark}
          onBack={onBack}
          context={group.name}
        />
      )}

      {/* ── Registration modal ── */}
      {regModal && (
        <Modal title={editTarget ? "Edit Registration" : "Register for Event"} onClose={() => setRegModal(false)} wide>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (regForm.programId && regForm.participantIds.length > 0) {
                saveReg();
              }
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
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
                        <div
                          key={s.id}
                          tabIndex={disabled ? -1 : 0}
                          role="checkbox"
                          aria-checked={active}
                          onClick={() => !disabled && togglePart(s.id)}
                          onKeyDown={e => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              if (!disabled) togglePart(s.id);
                            }
                          }}
                          style={{
                            padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: registered ? 0.35 : (!active && atMax) ? 0.45 : 1,
                            background: active ? (dark ? "rgba(241,77,77,0.1)" : "rgba(241,77,77,0.06)") : "transparent",
                            borderTop: i > 0 ? `1px solid ${border}` : "none",
                            transition: "background 0.12s",
                            outline: "none",
                          }}
                        >
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
              <button type="button" className="btn btn-ghost" onClick={() => setRegModal(false)} style={{ borderRadius: 12 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!regForm.programId || regForm.participantIds.length === 0} style={{ borderRadius: 12, fontWeight: 800 }}>
                {editTarget ? "Update Registration" : "Confirm Registration"}
              </button>
            </div>
          </form>
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
          <form
            onSubmit={e => {
              e.preventDefault();
              confirmDeleteReg();
            }}
          >
            <p style={{ fontSize: 14, color: mutedTx, marginBottom: 20 }}>
              Are you sure you want to remove this event registration?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDelConfirm(null)} style={{ borderRadius: 12 }}>Cancel</button>
              <button type="submit" className="btn btn-danger" style={{ borderRadius: 12, fontWeight: 800 }}>Confirm Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Remaining Registrations Breakdown Modal */}
      {showCatStatsModal && (
        <Modal title={`Remaining Registrations (${progType})`} onClose={() => setShowCatStatsModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CATS.map(cat => {
              const stats = getCatStats(cat, progType);
              const isCurrent = catFilter === cat;
              return (
                <div key={cat} onClick={() => { setCatFilter(cat); setEventSubTab("all"); setShowCatStatsModal(false); triggerHaptic("light"); }} style={{
                  padding: "13px 15px", borderRadius: 14,
                  background: isCurrent ? (dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.06)") : (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                  border: `1px solid ${isCurrent ? "rgba(241,77,77,0.25)" : border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", transition: "all 0.15s ease"
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: dark ? "#f8fafc" : "#0f172a" }}>{cat}</div>
                    <div style={{ fontSize: 11.5, color: mutedTx, marginTop: 2 }}>{stats.registered} of {stats.total} Registered</div>
                  </div>
                  <span style={{
                    padding: "5px 11px", borderRadius: 9, fontSize: 11.5, fontWeight: 800,
                    background: stats.remaining > 0 ? "rgba(241,77,77,0.12)" : "rgba(16,185,129,0.12)",
                    color: stats.remaining > 0 ? "#f14d4d" : "#10b981",
                    border: `1px solid ${stats.remaining > 0 ? "rgba(241,77,77,0.2)" : "rgba(16,185,129,0.2)"}`
                  }}>
                    {stats.remaining > 0 ? `${stats.remaining} Remaining` : "✓ Complete"}
                  </span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── WHATSAPP VOICE NOTE BUBBLE COMPONENT ───────────────────────────────────────────
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

      {/* Play / Pause Circular Button */}
      <button onClick={togglePlay} style={{
        width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
        background: isOwn ? "#ffffff" : "linear-gradient(135deg, #f14d4d 0%, #e11d48 100%)",
        color: isOwn ? "#e11d48" : "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "transform 0.1s ease"
      }}>
        <Ic name={isPlaying ? "pause" : "play"} size={16} />
      </button>

      {/* Interactive WhatsApp Waveform Scrubber */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 22, cursor: "pointer" }}
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

        {/* Live Duration Counter & Mic Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, opacity: 0.85, fontWeight: 700 }}>
          <span>{isPlaying ? fmtDur(currentTime) : fmtDur(duration)}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <Ic name="mic" size={11} />
          </span>
        </div>
      </div>
    </div>
  );
};

// ── EMBEDDED CHAT ─────────────────────────────────────────────────────────────
const EmbeddedInbox = ({ group, dark, messages, sendMessage, markRead, setMessages, deleteMessage, onClose, isModal = false }) => {
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
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: isModal ? "100%" : "calc(100vh - 70px)",
      maxWidth: 600,
      margin: "0 auto",
      width: "100%",
      paddingBottom: isModal ? 0 : 80,
    }} onClick={() => setShowMenu(false)}>
      {/* Header bar */}
      <div style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: isModal ? (dark ? "#111322" : "#fdfaf9") : "transparent",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: mutedTx,
                padding: "4px 8px 4px 0",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
              }}
              title="Close chat"
            >
              <Ic name="back" size={17} />
              <span>Back</span>
            </button>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Admin Support Chat
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#10b981", fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              Live · {group.name}
            </div>
          </div>
        </div>
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

export default LeaderPortal;
