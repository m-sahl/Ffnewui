import { useState } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import { CATS, ACCENT } from "../../styles/DesignTokens";

const Tag = ({ label, dark }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: dark ? "#6b7280" : "#9ca3af" }}>{label}</span>
);

const LeaderPortal = ({ user, group, dark, setDark, onBack }) => {
  const { programs, students, registrations, setRegistrations, logActivity } = useApp();

  const [tab, setTab]                     = useState("members");
  const [session, setSession]             = useState("Stage");
  const [catFilter, setCatFilter]         = useState("All");
  const [memSearch, setMemSearch]         = useState("");
  const [memSearchOpen, setMemSearchOpen] = useState(false);
  const [regModal, setRegModal]           = useState(false);
  const [regForm, setRegForm]             = useState({ programId: "", participantIds: [] });
  const [editTarget, setEditTarget]       = useState(null);
  const [delConfirm, setDelConfirm]       = useState(null);

  const groupStudents = students[group.id] || [];
  const groupRegs     = registrations.filter(r => r.groupId === group.id);

  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg  = dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)";
  const initBg  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const initCol = dark ? "#9ca3af" : "#6b7280";

  const filtStudents = (catFilter === "All" ? [...groupStudents] : groupStudents.filter(s => s.category === catFilter))
    .filter(s => !memSearch.trim() || s.name.toLowerCase().includes(memSearch.toLowerCase()))
    .sort((a, b) => {
      const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 };
      return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2);
    });

  const filtRegs = groupRegs.filter(r => {
    const p = programs.find(pg => pg.id === r.programId);
    if (!p) return false;
    if (p.session !== session) return false;
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
    if (!regForm.programId || regForm.participantIds.length === 0) return;
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

  // Selected program info
  const selectedProg = programs.find(p => p.id === regForm.programId);
  const max          = selectedProg?.maxParticipants || 1;
  const atMax        = regForm.participantIds.length >= max;

  // Students already registered for this program in ANY group (excluding current edit)
  const alreadyRegistered = new Set(
    registrations
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

  // Programs for this session not yet registered by this group
  const sessionPrograms = programs.filter(p => {
    if (p.session !== session) return false;
    if (editTarget) return true; // when editing allow current program
    return !groupRegs.some(r => r.programId === p.id);
  });

  return (
    <div className="anim-fadeIn" style={{ minHeight: "100vh" }}>
      <Topbar
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button className="btn btn-ghost btn-icon" onClick={onBack}><Ic name="back" size={16} /></button>
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

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 100px" }}>

        {/* ── Top controls ── */}
        <div style={{ paddingTop: 20, marginBottom: 16 }}>

          {/* Members / Registrations toggle */}
          <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 14 }}>
            {[{ id: "members", label: "Team Members" }, { id: "events", label: "Registrations" }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setCatFilter("All"); setMemSearch(""); setMemSearchOpen(false); }}
                style={{
                  flex: 1, padding: "9px", border: "none", cursor: "pointer", borderRadius: 9,
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  background: tab === t.id ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
                  color: tab === t.id ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                  boxShadow: tab === t.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.18s ease",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Stage / Off-Stage — only on events tab */}
          {tab === "events" && (
            <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 14 }}>
              {["Stage", "Off-Stage"].map(s => (
                <button key={s} onClick={() => { setSession(s); setCatFilter("All"); }}
                  style={{
                    flex: 1, padding: "9px", border: "none", cursor: "pointer", borderRadius: 9,
                    fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                    background: session === s ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
                    color: session === s ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                    boxShadow: session === s ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.18s ease",
                  }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Category filter */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {["All", ...CATS].map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} className="btn btn-sm"
                style={{
                  flexShrink: 0, fontWeight: 700,
                  background: catFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                  color: catFilter === cat ? "#0a0b12" : mutedTx,
                }}>
                {cat === "Sub-Junior" ? "Sub" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Members tab ── */}
        {tab === "members" && (
          <div className="anim-fadeIn">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                {memSearchOpen && (
                  <input className="input anim-slideDown" type="text" placeholder="Search by name…"
                    value={memSearch} onChange={e => setMemSearch(e.target.value)}
                    style={{ fontSize: 13 }} autoFocus />
                )}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm"
                onClick={() => { setMemSearchOpen(o => !o); setMemSearch(""); }}
                style={{ flexShrink: 0, color: memSearchOpen ? ACCENT : mutedTx }}>
                <Ic name="search" size={15} />
              </button>
            </div>

            {filtStudents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No members</div>
                <div style={{ fontSize: 13 }}>No students in {catFilter === "All" ? "this group" : `${catFilter} category`}</div>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Chest</th><th>Name</th><th>Category</th><th>Role</th></tr>
                  </thead>
                  <tbody>
                    {filtStudents.map(s => (
                      <tr key={s.id}>
                        <td><span className="ff-display fw-800" style={{ color: ACCENT, fontSize: 14 }}>{s.chestNo}</span></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: initBg, color: initCol, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                              {s.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                          </div>
                        </td>
                        <td><Tag label={s.category} dark={dark} /></td>
                        <td><span style={{ fontSize: 12, color: mutedTx }}>{s.groupRole || "Member"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Registrations tab ── */}
        {tab === "events" && (
          <div className="anim-fadeIn">
            {filtRegs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🎭</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No registrations</div>
                <div style={{ fontSize: 13 }}>Tap + to register for an event</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtRegs.map(r => {
                  const p     = programs.find(pg => pg.id === r.programId);
                  const parts = r.participantIds.map(id => groupStudents.find(s => s.id === id)).filter(Boolean);
                  return (
                    <div key={r.id} style={{
                      padding: "16px 18px", borderRadius: 14,
                      background: cardBg,
                      border: `1px solid ${border}`,
                    }}>
                      {/* Program name + actions */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 6 }}>{p?.name}</div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <Tag label={p?.category} dark={dark} />
                            <Tag label={p?.type} dark={dark} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openReg(r)}><Ic name="edit" size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDelConfirm(r.id)}><Ic name="trash" size={13} /></button>
                        </div>
                      </div>

                      {/* Participants list */}
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

            {/* FAB */}
            <button onClick={() => openReg()} style={{
              position: "fixed", bottom: 24, right: 20, width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none",
              color: "#0a0b12", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 24px rgba(245,158,11,0.45)", zIndex: 100,
              transition: "transform 0.18s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
            >
              <Ic name="plus" size={22} />
            </button>
          </div>
        )}
      </div>

      {/* ── Registration modal ── */}
      {regModal && (
        <Modal title={editTarget ? "Edit Registration" : "Register for Event"} onClose={() => { setRegModal(false); }} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Program selector */}
            <div>
              <label className="label">Program</label>
              <select className="input select" value={regForm.programId}
                onChange={e => setRegForm({ programId: e.target.value, participantIds: [] })}>
                <option value="">Choose a program…</option>
                {sessionPrograms.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.category} · {p.session}</option>
                ))}
              </select>
            </div>

            {/* Participant selector */}
            {regForm.programId && (
              <div className="anim-fadeIn">
                <label className="label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Participants <span style={{ color: ACCENT, fontWeight: 700 }}>({regForm.participantIds.length}/{max})</span></span>
                  {atMax && <span style={{ fontSize: 10, fontWeight: 700, color: mutedTx, letterSpacing: 0.5 }}>MAX REACHED</span>}
                </label>

                <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, maxHeight: 280, overflowY: "auto" }}>
                  {groupStudents.filter(s => s.category === selectedProg?.category).length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: mutedTx }}>
                      No students in {selectedProg?.category} category
                    </div>
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
                          {/* Checkbox */}
                          <div style={{
                            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                            border: `2px solid ${active ? ACCENT : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)")}`,
                            background: active ? ACCENT : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.12s",
                          }}>
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
              <button className="btn btn-primary" style={{ flex: 2, height: 44 }} onClick={saveReg}
                disabled={!regForm.programId || regForm.participantIds.length === 0}>
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

export default LeaderPortal;
