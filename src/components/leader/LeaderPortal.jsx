import { useState } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import { CATS, catColor, ACCENT } from "../../styles/DesignTokens";

const LeaderPortal = ({ user, group, dark, setDark, onBack }) => {
  const { programs, students, registrations, setRegistrations, logActivity } = useApp();
  const [tab, setTab]           = useState("members");  // members | events
  const [catFilter, setCatFilter] = useState("All");
  const [regModal, setRegModal] = useState(false);
  const [regForm, setRegForm]   = useState({ programId: "", participantIds: [] });
  const [editTarget, setEditTarget] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const groupStudents = students[group.id] || [];
  const groupRegs     = registrations.filter(r => r.groupId === group.id);

  const filtStudents = catFilter === "All"
    ? [...groupStudents].sort((a, b) => {
        const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 };
        return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2);
      })
    : groupStudents.filter(s => s.category === catFilter);

  const filtRegs = groupRegs.filter(r => {
    if (catFilter === "All") return true;
    const p = programs.find(pg => pg.id === r.programId);
    return p?.category === catFilter;
  });

  const openReg = (existing = null) => {
    if (existing) {
      setEditTarget(existing.id);
      setRegForm({ programId: existing.programId, participantIds: existing.participantIds });
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

  const selectedProg = programs.find(p => p.id === regForm.programId);
  const isSelected   = id => regForm.participantIds.includes(id);
  const togglePart   = id => {
    setRegForm(prev => {
      const ids = prev.participantIds.includes(id)
        ? prev.participantIds.filter(x => x !== id)
        : (selectedProg?.type === "Single" ? [id] : [...prev.participantIds, id].slice(0, selectedProg?.maxParticipants));
      return { ...prev, participantIds: ids };
    });
  };

  const deleteReg = (id) => setDelConfirm(id);
  const confirmDelete = () => {
    const r = registrations.find(x => x.id === delConfirm);
    const p = programs.find(pg => pg.id === r?.programId);
    setRegistrations(prev => prev.filter(x => x.id !== delConfirm));
    logActivity(user.name, "Cancelled registration", `${p?.name} for ${group.name}`);
    setDelConfirm(null);
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = [
    { label: "Members",      value: groupStudents.length,    color: ACCENT },
    { label: "Registered",   value: groupRegs.length,        color: "#0ea5e9" },
    { label: "Programs left",value: Math.max(0, programs.filter(p => !groupRegs.some(r => r.programId === p.id)).length), color: "#10b981" },
  ];

  return (
    <div className="anim-fadeIn" style={{ minHeight: "100vh" }}>
      {/* Topbar */}
      <Topbar
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button className="btn btn-ghost btn-icon" onClick={onBack}><Ic name="back" size={16} /></button>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: `${group.color}22`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${group.color}44`, color: group.color, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 16 }}>
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

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 120px" }}>
        {/* Hero summary */}
        <div style={{ padding: "20px 16px 0" }}>
          <div style={{ display: "flex", gap: 0, borderRadius: 16, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, marginBottom: 20 }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: "14px 12px", textAlign: "center",
                background: dark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.8)",
                borderRight: i < stats.length - 1 ? `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
              }}>
                <div className="ff-display fw-800" style={{ fontSize: 22, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: dark ? "#6b7280" : "#9ca3af", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 20 }}>
            {["All", ...CATS].map(cat => {
              const active = catFilter === cat;
              const col = cat === "All" ? ACCENT : catColor[cat];
              return (
                <button key={cat} onClick={() => setCatFilter(cat)} className="btn btn-sm"
                  style={{
                    flexShrink: 0,
                    background: active ? col : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                    color: active ? (cat === "All" ? "#0a0b12" : "white") : (dark ? "#9ca3af" : "#6b7280"),
                    boxShadow: active ? `0 4px 14px ${col}44` : "none",
                    fontWeight: 700, padding: "7px 16px",
                  }}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 20 }}>
            {[
              { id: "members", label: "Team Members", icon: "users" },
              { id: "events",  label: "Registrations", icon: "book" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
                  borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  background: tab === t.id ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
                  color: tab === t.id ? ACCENT : (dark ? "#6b7280" : "#9ca3af"),
                  boxShadow: tab === t.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.18s ease",
                }}>
                <Ic name={t.icon} size={14} /> {t.label}
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginLeft: 2 }}>
                  ({t.id === "members" ? filtStudents.length : filtRegs.length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Members tab ──────────────────────────────────────── */}
        {tab === "members" && (
          <div className="anim-fadeIn" style={{ padding: "0 16px" }}>
            {filtStudents.length === 0 ? (
              <div className="card-flat empty-state">
                <div className="empty-icon">👥</div>
                <div className="empty-title">No members</div>
                <div className="empty-desc">No students in {catFilter === "All" ? "this group" : `the ${catFilter} category`}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtStudents.map((s, i) => (
                  <div key={s.id} className={`card anim-fadeUp stagger-${Math.min(i+1,8)}`}
                    style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, borderLeft: `4px solid ${catColor[s.category]}` }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: `${catColor[s.category]}18`, color: catColor[s.category],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 14,
                    }}>
                      {s.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{s.name}</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <span className={`badge badge-${s.category === "Sub-Junior" ? "sj" : s.category.toLowerCase()}`} style={{ fontSize: 10 }}>{s.category}</span>
                        {s.groupRole && s.groupRole !== "Member" && (
                          <span className="badge" style={{ background: s.groupRole === "Leader" ? "rgba(245,158,11,0.12)" : "rgba(139,92,246,0.12)", color: s.groupRole === "Leader" ? "#f59e0b" : "#8b5cf6", fontSize: 10 }}>
                            {s.groupRole === "Leader" ? "★" : "☆"} {s.groupRole}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ff-display fw-800" style={{ fontSize: 20, color: catColor[s.category], opacity: 0.9 }}>{s.chestNo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Events / Registrations tab ────────────────────── */}
        {tab === "events" && (
          <div className="anim-fadeIn" style={{ padding: "0 16px" }}>
            {/* Register action card */}
            <button onClick={() => openReg()}
              style={{
                width: "100%", padding: "16px 20px", border: `1.5px dashed ${dark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.4)"}`,
                borderRadius: 16, cursor: "pointer", background: "rgba(245,158,11,0.04)",
                display: "flex", alignItems: "center", gap: 14, marginBottom: 18,
                fontFamily: "inherit", transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; e.currentTarget.style.borderColor = "#f59e0b"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.04)"; e.currentTarget.style.borderColor = dark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.4)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245,158,11,0.12)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic name="plus" size={22} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div className="ff-display fw-800" style={{ fontSize: 14, color: ACCENT }}>Register for an Event</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Tap to select a program and participants</div>
              </div>
            </button>

            {filtRegs.length === 0 ? (
              <div className="card-flat empty-state">
                <div className="empty-icon">🎭</div>
                <div className="empty-title">No registrations</div>
                <div className="empty-desc">{catFilter === "All" ? "Register for events to get started" : `No events registered in ${catFilter} category`}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtRegs.map((r, i) => {
                  const p     = programs.find(pg => pg.id === r.programId);
                  const parts = r.participantIds.map(id => groupStudents.find(s => s.id === id)).filter(Boolean);
                  const col   = catColor[p?.category] || ACCENT;
                  return (
                    <div key={r.id} className={`card anim-fadeUp stagger-${Math.min(i+1,8)}`}
                      style={{ padding: 18, borderLeft: `4px solid ${col}` }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div className="ff-display fw-800" style={{ fontSize: 15.5, marginBottom: 6 }}>{p?.name}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span className={`badge badge-${p?.category === "Sub-Junior" ? "sj" : p?.category?.toLowerCase()}`} style={{ fontSize: 10 }}>{p?.category}</span>
                            <span className={`badge badge-${p?.type?.toLowerCase()}`} style={{ fontSize: 10 }}>{p?.type}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openReg(r)}><Ic name="edit" size={13} /></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteReg(r.id)}><Ic name="trash" size={13} /></button>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {parts.map(s => (
                          <div key={s.id} className="chip" style={{ background: `${catColor[s.category]}14`, color: catColor[s.category], border: `1px solid ${catColor[s.category]}22`, fontSize: 12 }}>
                            <span className="fw-800" style={{ fontSize: 11 }}>{s.chestNo}</span> {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom tab bar ──────────────────────────────────────────── */}
      <div className="tabbar">
        {[
          { id: "members", icon: "users",  label: "Members" },
          { id: "events",  icon: "book",   label: "Events" },
        ].map(t => (
          <button key={t.id} className={`tab-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            <Ic name={t.icon} size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Register / Edit modal ──────────────────────────────────── */}
      {regModal && (
        <Modal title={editTarget ? "Edit Registration" : "Register for Event"} icon="book" iconColor="#0ea5e9" onClose={() => setRegModal(false)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Category context */}
            {catFilter !== "All" && (
              <div style={{ padding: "9px 14px", borderRadius: 10, background: `${catColor[catFilter]}10`, border: `1px solid ${catColor[catFilter]}22`, display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge badge-${catFilter === "Sub-Junior" ? "sj" : catFilter.toLowerCase()}`}>{catFilter}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: catColor[catFilter] }}>Filtered to {catFilter} programs</span>
              </div>
            )}

            <div>
              <label className="label">Select Program</label>
              <select className="input select" value={regForm.programId} onChange={e => setRegForm({ programId: e.target.value, participantIds: [] })}>
                <option value="">Choose an event…</option>
                {programs.filter(p => catFilter === "All" || p.category === catFilter).map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.category}</option>
                ))}
              </select>
              {selectedProg && (
                <div style={{ marginTop: 10, display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <span className={`badge badge-${selectedProg.type.toLowerCase()}`}>{selectedProg.type}</span>
                  <span className="chip" style={{ background: `${ACCENT}12`, color: ACCENT, fontSize: 11 }}>Max {selectedProg.maxParticipants} participants</span>
                </div>
              )}
            </div>

            {regForm.programId && (
              <div className="anim-fadeIn">
                <label className="label">
                  Select Participant{selectedProg?.type !== "Single" ? "s" : ""}
                  {regForm.participantIds.length > 0 && <span style={{ marginLeft: 6, color: ACCENT }}>({regForm.participantIds.length} selected)</span>}
                </label>
                <div className="tbl-wrap" style={{ maxHeight: 260 }}>
                  {groupStudents.filter(s => s.category === selectedProg?.category).map(s => {
                    const active = isSelected(s.id);
                    return (
                      <div key={s.id} onClick={() => togglePart(s.id)}
                        style={{
                          padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                          background: active ? (dark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.06)") : "transparent",
                          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                          transition: "background 0.15s",
                        }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          border: `2px solid ${active ? ACCENT : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)")}`,
                          background: active ? ACCENT : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                          {active && <Ic name="check" size={13} color="#0a0b12" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: ACCENT, fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800 }}>{s.chestNo}</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                          </div>
                        </div>
                        <span className={`badge badge-${s.category === "Sub-Junior" ? "sj" : s.category.toLowerCase()}`} style={{ fontSize: 10 }}>{s.category}</span>
                      </div>
                    );
                  })}
                  {groupStudents.filter(s => s.category === selectedProg?.category).length === 0 && (
                    <div style={{ padding: "24px", textAlign: "center", opacity: 0.5, fontSize: 13 }}>No students in {selectedProg?.category} category</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 46 }} onClick={() => setRegModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 46 }} onClick={saveReg}
                disabled={!regForm.programId || regForm.participantIds.length === 0}>
                <Ic name="check" size={15} /> {editTarget ? "Save Changes" : "Register Now"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {delConfirm && (
        <div className="modal-bg" onClick={() => setDelConfirm(null)}>
          <div className="modal" style={{ maxWidth: 330, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(225,29,72,0.1)", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Ic name="trash" size={26} />
            </div>
            <div className="ff-display fw-800" style={{ fontSize: 17, marginBottom: 8 }}>Cancel Registration?</div>
            <div className="text-muted" style={{ fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>This will remove the registration permanently.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setDelConfirm(null)}>Keep</button>
              <button className="btn" style={{ flex: 1, height: 44, background: "#e11d48", color: "white", fontWeight: 700 }} onClick={confirmDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderPortal;
