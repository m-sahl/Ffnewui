import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import { CATS, ACCENT } from "../../styles/DesignTokens";

const Tag = ({ label, dark }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: dark ? "#6b7280" : "#9ca3af" }}>{label}</span>
);

// ── Bottom tab bar ───────────────────────────────────────────────────────────
const NAV = [
  { id: "home",     icon: "home",    label: "Home"     },
  { id: "members",  icon: "users",   label: "Members"  },
  { id: "events",   icon: "book",    label: "Events"   },
  { id: "messages", icon: "message", label: "Messages" },
];

const BottomNav = ({ tab, setTab, unread }) => (
  <div className="tabbar" style={{ zIndex: 150 }}>
    {NAV.map(n => (
      <button key={n.id} className={`tab-item${tab === n.id ? " active" : ""}`} onClick={() => setTab(n.id)} style={{ position: "relative" }}>
        <Ic name={n.icon} size={18} />
        <span>{n.label}</span>
        {n.id === "messages" && unread > 0 && (
          <span style={{ position: "absolute", top: 2, right: "28%", width: 16, height: 16, borderRadius: "50%", background: "#f59e0b", color: "#0a0b12", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
        )}
      </button>
    ))}
  </div>
);

const LeaderPortal = ({ user, group, dark, setDark, onBack }) => {
  const { programs, students, registrations, setRegistrations, logActivity, messages, sendMessage, markRead, setMessages, deleteMessage, isLocked } = useApp();

  const [tab, setTab]                     = useState("home");
  const [progType, setProgType]           = useState("Stage");
  const [catFilter, setCatFilter]         = useState("All");
  const [memSearch, setMemSearch]         = useState("");
  const [memSearchOpen, setMemSearchOpen] = useState(false);
  const [regModal, setRegModal]           = useState(false);
  const [regForm, setRegForm]             = useState({ programId: "", participantIds: [] });
  const [editTarget, setEditTarget]       = useState(null);
  const [delConfirm, setDelConfirm]       = useState(null);

  const groupStudents = students[group.id] || [];
  const groupRegs     = registrations.filter(r => r.groupId === group.id);
  const locked        = isLocked(group.id, progType);

  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg  = dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)";
  const initBg  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const initCol = dark ? "#9ca3af" : "#6b7280";

  const unreadCount = messages.filter(m => m.from === "admin" && m.to === group.id && !m.read).length;

  const filtStudents = (catFilter === "All" ? [...groupStudents] : groupStudents.filter(s => s.category === catFilter))
    .filter(s => !memSearch.trim() || s.name.toLowerCase().includes(memSearch.toLowerCase()))
    .sort((a, b) => {
      const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 };
      return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2);
    });

  const filtRegs = groupRegs.filter(r => {
    const p = programs.find(pg => pg.id === r.programId);
    if (!p) return false;
    const pType = p.type || p.session || "Stage";
    if (pType !== progType) return false;
    if (catFilter !== "All" && p.category !== catFilter) return false;
    return true;
  });

  // ── Registration ops ──────────────────────────────────────────────────────
  const openReg = (existing = null) => {
    if (existing) {
      setEditTarget(existing.id);
      setRegForm({ programId: existing.programId, participantIds: [...existing.participantIds] });
    } else {
      setEditTarget(null);
      setRegForm({ programId: "", participantIds: [] });
    }
    setRegModal(true);
  };

  const saveReg = () => {
    if (!regForm.programId) return;
    const alreadyExists = !editTarget && groupRegs.some(r => r.programId === regForm.programId);
    if (alreadyExists) return;
    const p = programs.find(pg => pg.id === regForm.programId);
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

  const confirmDelete = () => {
    const r  = registrations.find(x => x.id === delConfirm);
    const p  = programs.find(pg => pg.id === r?.programId);
    setRegistrations(prev => prev.filter(x => x.id !== delConfirm));
    logActivity(user.name, "Cancelled registration", `${p?.name} for ${group.name}`);
    setDelConfirm(null);
  };

  const selectedProg = programs.find(p => p.id === regForm.programId);
  const max          = selectedProg?.maxParticipants || 1;
  const atMax        = regForm.participantIds.length >= max;

  const alreadyRegistered = new Set(
    registrations.filter(r => r.programId === regForm.programId && r.id !== editTarget).flatMap(r => r.participantIds)
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

  const typePrograms = programs.filter(p => {
    const pType = p.type || p.session || "Stage";
    if (pType !== progType) return false;
    if (editTarget) return true;
    return !groupRegs.some(r => r.programId === p.id);
  });

  // ── HOME TAB ───────────────────────────────────────────────────────────────
  const renderHome = () => {
    const totalRegs = groupRegs.length;
    const typeStatus = ["Stage", "Off-Stage"].map(t => ({ type: t, locked: isLocked(group.id, t) }));
    const lastMsg = [...messages].filter(m => (m.from === "admin" && m.to === group.id) || (m.from === group.id && m.to === "admin")).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    return (
      <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 22 }}>{group.name}</div>
          <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>Welcome back, {user.name}</div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ padding: "16px", borderRadius: 14, border: `1px solid ${border}`, background: cardBg }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 26, color: ACCENT }}>{groupStudents.length}</div>
            <div style={{ fontSize: 12, color: mutedTx, marginTop: 2 }}>Members</div>
          </div>
          <div style={{ padding: "16px", borderRadius: 14, border: `1px solid ${border}`, background: cardBg }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 26, color: ACCENT }}>{totalRegs}</div>
            <div style={{ fontSize: 12, color: mutedTx, marginTop: 2 }}>Registrations</div>
          </div>
        </div>

        {/* Type lock status */}
        <div style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 8 }}>Registration Status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            {typeStatus.map((s, i) => (
              <div key={s.type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: i % 2 === 0 ? cardBg : "transparent", borderTop: i > 0 ? `1px solid ${border}` : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.type}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.locked ? "#e11d48" : "#10b981" }}>{s.locked ? "🔒 Locked" : "🔓 Open"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Last message preview */}
        <div style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 8 }}>Latest from Admin</div>
          <button onClick={() => { setTab("messages"); markRead(group.id); }} style={{
            width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 14,
            border: `1px solid ${border}`, background: cardBg, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(145deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 15, color: "#0a0b12", flexShrink: 0 }}>A</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lastMsg ? (lastMsg.from === group.id ? `You: ${lastMsg.text}` : lastMsg.text) : "No messages yet"}
              </div>
              {unreadCount > 0 && <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, marginTop: 2 }}>{unreadCount} unread</div>}
            </div>
            <Ic name="chevronRight" size={14} color={mutedTx} />
          </button>
        </div>

        {/* Quick action */}
        <button onClick={() => { setTab("events"); }} style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0a0b12",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "inherit", fontWeight: 700, fontSize: 14,
        }}>
          <Ic name="plus" size={16} /> Register for an Event
        </button>
      </div>
    );
  };

  // ── MEMBERS TAB ────────────────────────────────────────────────────────────
  const renderMembers = () => (
    <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>
      <div className="section-header">
        <div>
          <div className="section-title">Team Members</div>
          <div className="section-sub">{filtStudents.length} of {groupStudents.length}</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setMemSearchOpen(o => !o); setMemSearch(""); }} style={{ color: memSearchOpen ? ACCENT : mutedTx }}>
          <Ic name="search" size={15} />
        </button>
      </div>

      {memSearchOpen && (
        <div style={{ marginBottom: 14 }}>
          <input className="input" type="text" placeholder="Search by name…" value={memSearch} onChange={e => setMemSearch(e.target.value)} style={{ fontSize: 13 }} autoFocus />
        </div>
      )}

      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 16 }}>
        {["All", ...CATS].map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)} className="btn btn-sm"
            style={{ flexShrink: 0, fontWeight: 700, background: catFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: catFilter === cat ? "#0a0b12" : mutedTx }}>
            {cat === "Sub-Junior" ? "Sub" : cat}
          </button>
        ))}
      </div>

      {filtStudents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No members</div>
          <div style={{ fontSize: 13 }}>No students in {catFilter === "All" ? "this group" : `${catFilter} category`}</div>
        </div>
      ) : (
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
          {filtStudents.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent" }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: ACCENT, fontSize: 13, minWidth: 36 }}>{s.chestNo}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: mutedTx, marginTop: 1 }}>{s.category} {s.groupRole && s.groupRole !== "Member" ? `· ${s.groupRole}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── EVENTS TAB ─────────────────────────────────────────────────────────────
  const renderEvents = () => (
    <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>
      <div className="section-header">
        <div>
          <div className="section-title">Registrations</div>
          <div className="section-sub">{filtRegs.length} in {progType}</div>
        </div>
      </div>

      {/* Program Type toggle */}
      <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 14 }}>
        {["Stage", "Off-Stage"].map(t => (
          <button key={t} onClick={() => { setProgType(t); setCatFilter("All"); }}
            style={{
              flex: 1, padding: "9px", border: "none", cursor: "pointer", borderRadius: 9,
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              background: progType === t ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
              color: progType === t ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
              boxShadow: progType === t ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.18s ease",
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 16 }}>
        {["All", ...CATS].map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)} className="btn btn-sm"
            style={{ flexShrink: 0, fontWeight: 700, background: catFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: catFilter === cat ? "#0a0b12" : mutedTx }}>
            {cat === "Sub-Junior" ? "Sub" : cat}
          </button>
        ))}
      </div>

      {locked && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.15)", marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#e11d48" }}>{progType} registrations are locked</div>
            <div style={{ fontSize: 11, color: mutedTx, marginTop: 1 }}>Contact admin to unlock</div>
          </div>
        </div>
      )}

      {filtRegs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎭</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No registrations</div>
          <div style={{ fontSize: 13 }}>
            {typePrograms.length === 0 ? `No ${progType} programs added yet. Contact admin.` : "Tap + to register for an event"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtRegs.map(r => {
            const p     = programs.find(pg => pg.id === r.programId);
            const parts = r.participantIds.map(id => groupStudents.find(s => s.id === id)).filter(Boolean);
            return (
              <div key={r.id} style={{ padding: "16px 18px", borderRadius: 14, background: cardBg, border: `1px solid ${border}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 12, color: mutedTx }}>{p?.order ? `#${p.order}` : ""}</span>
                      <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{p?.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <Tag label={p?.category} dark={dark} />
                      <Tag label={p?.type || p?.session} dark={dark} />
                    </div>
                  </div>
                  {!locked && (
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openReg(r)}><Ic name="edit" size={13} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDelConfirm(r.id)}><Ic name="trash" size={13} /></button>
                    </div>
                  )}
                </div>
                <div style={{ height: 1, background: border, marginBottom: 10 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {parts.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: ACCENT, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 12, minWidth: 30 }}>{s.chestNo}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!locked && (
        <button onClick={() => openReg()} style={{
          position: "fixed", bottom: 80, right: 20, width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none",
          color: "#0a0b12", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 24px rgba(245,158,11,0.45)", zIndex: 100, transition: "transform 0.18s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
        >
          <Ic name="plus" size={22} />
        </button>
      )}
    </div>
  );

  // ── MESSAGES TAB (embedded, not overlay) ─────────────────────────────────
  const renderMessages = () => (
    <EmbeddedInbox group={group} dark={dark} messages={messages} sendMessage={sendMessage} markRead={markRead} setMessages={setMessages} deleteMessage={deleteMessage} />
  );

  const renderViews = { home: renderHome, members: renderMembers, events: renderEvents, messages: renderMessages };

  return (
    <div className="anim-fadeIn" style={{ minHeight: "100vh" }}>
      <Topbar
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: initBg, color: initCol, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 15, flexShrink: 0 }}>
              {group.name.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="topbar-title">{group.name}</div>
              <div className="topbar-sub">Leader Portal</div>
            </div>
          </div>
        }
        dark={dark} setDark={setDark}
        context={group.name}
        onLogout={onBack}
        verify={(val) => val === user.pin}
        pinLength={user.pin?.length || 3}
      />

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {tab === "messages" ? renderMessages() : renderViews[tab]?.()}
      </div>

      <BottomNav tab={tab} setTab={setTab} unread={unreadCount} />

      {/* ── Registration modal ── */}
      {regModal && (
        <Modal title={editTarget ? "Edit Registration" : "Register for Event"} onClose={() => setRegModal(false)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">Program</label>
              <select className="input select" value={regForm.programId} onChange={e => setRegForm({ programId: e.target.value, participantIds: [] })}>
                <option value="">Choose a program…</option>
                {sessionPrograms.map(p => (
                  <option key={p.id} value={p.id}>{p.order ? `#${p.order} ` : ""}{p.name} · {p.category}</option>
                ))}
              </select>
            </div>

            {regForm.programId && (
              <div className="anim-fadeIn">
                <label className="label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Participants <span style={{ color: ACCENT, fontWeight: 700 }}>({regForm.participantIds.length}/{max})</span></span>
                  {atMax && <span style={{ fontSize: 10, fontWeight: 700, color: mutedTx, letterSpacing: 0.5 }}>MAX REACHED</span>}
                </label>
                <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, maxHeight: 280, overflowY: "auto" }}>
                  {groupStudents.filter(s => s.category === selectedProg?.category).length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: mutedTx }}>No students in {selectedProg?.category} category</div>
                  ) : (
                    groupStudents.filter(s => s.category === selectedProg?.category).map((s, i) => {
                      const active     = regForm.participantIds.includes(s.id);
                      const registered = alreadyRegistered.has(s.id);
                      const disabled   = registered || (!active && atMax);
                      return (
                        <div key={s.id} onClick={() => !disabled && togglePart(s.id)} style={{
                          padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: registered ? 0.35 : (!active && atMax) ? 0.45 : 1,
                          background: active ? (dark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.05)") : "transparent",
                          borderTop: i > 0 ? `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` : "none",
                          transition: "background 0.12s",
                        }}>
                          <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${active ? ACCENT : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)")}`, background: active ? ACCENT : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}>
                            {active && <Ic name="check" size={12} color="#0a0b12" />}
                          </div>
                          <span style={{ color: ACCENT, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 12, minWidth: 32 }}>{s.chestNo}</span>
                          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{s.name}</span>
                          {registered && <span style={{ fontSize: 10, fontWeight: 700, color: mutedTx, letterSpacing: 0.4 }}>REGISTERED</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setRegModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 44 }} onClick={saveReg} disabled={!regForm.programId || regForm.participantIds.length === 0}>
                {editTarget ? "Save Changes" : "Register"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      {delConfirm && (
        <div className="modal-bg" onClick={() => setDelConfirm(null)}>
          <div className="modal" style={{ maxWidth: 320, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div className="ff-display fw-800" style={{ fontSize: 17, marginBottom: 8 }}>Remove Registration?</div>
            <div style={{ fontSize: 13, color: mutedTx, marginBottom: 20, lineHeight: 1.6 }}>This will permanently remove the registration.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setDelConfirm(null)}>Keep</button>
              <button className="btn" style={{ flex: 1, height: 44, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", fontWeight: 700 }} onClick={confirmDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Embedded inbox (full tab, not overlay) ──────────────────────────────────
const EmbeddedInbox = ({ group, dark, messages, sendMessage, markRead, setMessages, deleteMessage }) => {
  const [text, setText]         = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [ctxMsg, setCtxMsg]     = useState(null);
  const [ctxPos, setCtxPos]     = useState({ x: 0, y: 0 });

  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx  = dark ? "#6b7280" : "#9ca3af";
  const bubbleBg = dark ? "rgba(255,255,255,0.09)" : "#ffffff";

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

  const wallpaper = {
    backgroundImage: dark ? `radial-gradient(circle at 1px 1px, rgba(245,158,11,0.04) 1px, transparent 0)` : `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)`,
    backgroundSize: "20px 20px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 58px - 76px)" }} onClick={() => setShowMenu(false)}>
      {/* Header bar */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Admin Messages</div>
        <div style={{ position: "relative" }}>
          <button onClick={e => { e.stopPropagation(); setShowMenu(s => !s); }} style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 6 }}>
            <Ic name="list" size={16} />
          </button>
          {showMenu && (
            <div style={{ position: "absolute", right: 0, top: 32, background: dark ? "#1a1b2e" : "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 150, zIndex: 10, border: `1px solid ${border}` }}>
              <button onClick={() => { setMessages(prev => prev.filter(m => !((m.from === "admin" && m.to === group.id) || (m.from === group.id && m.to === "admin")))); setShowMenu(false); }}
                style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#e11d48" }}>
                <Ic name="trash" size={14} /> Clear chat
              </button>
            </div>
          )}
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
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)", color: dark ? "#9ca3af" : "#666" }}>{item.label}</span>
            </div>
          );
          const m = item;
          const isOwn = m.from === group.id;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", marginBottom: 2 }}
              onContextMenu={e => { e.preventDefault(); setCtxMsg(m); setCtxPos({ x: e.clientX, y: e.clientY }); }}
            >
              <div style={{
                maxWidth: "78%", padding: "8px 10px 6px 12px",
                borderRadius: isOwn ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                background: isOwn ? "linear-gradient(145deg,#f59e0b,#d97706)" : bubbleBg,
                color: isOwn ? "#0a0b12" : (dark ? "#e8e8f5" : "#111"),
                boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
              }}>
                {!isOwn && <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 3 }}>Admin</div>}
                <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{m.text}</div>
                <div style={{ fontSize: 10, marginTop: 3, opacity: 0.65, textAlign: "right" }}>{fmtTime(m.timestamp)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ padding: "8px 8px", paddingBottom: "max(8px, env(safe-area-inset-bottom))", background: dark ? "#080912" : "#ece5dd", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", background: dark ? "#1a1b2e" : "#fff", borderRadius: 26, padding: "4px 14px", minHeight: 44 }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message" rows={1}
            style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: 14, color: dark ? "#e8e8f5" : "#111", fontFamily: "inherit", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", paddingTop: 8, paddingBottom: 8 }}
          />
        </div>
        <button onClick={send} style={{
          width: 42, height: 42, borderRadius: "50%", flexShrink: 0, border: "none",
          background: text.trim() ? "linear-gradient(135deg,#f59e0b,#d97706)" : (dark ? "#1a1b2e" : "#ccc"),
          color: text.trim() ? "#0a0b12" : (dark ? "#4b5563" : "#888"),
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      {ctxMsg && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setCtxMsg(null)} />
          <div style={{ position: "fixed", top: ctxPos.y, left: ctxPos.x, zIndex: 301, background: dark ? "#1a1b2e" : "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.45)", minWidth: 190, border: `1px solid ${border}` }}>
            <button onClick={() => deleteMsg("me")} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: dark ? "#e8e8f5" : "#111" }}>
              <Ic name="trash" size={14} /> Delete for me
            </button>
            {ctxMsg.from === group.id && (
              <button onClick={() => deleteMsg("everyone")} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", borderTop: `1px solid ${border}`, cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#e11d48" }}>
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
