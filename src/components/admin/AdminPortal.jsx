import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import PrintSection from "./PrintSection";
import { CATS, catColor, ACCENT } from "../../styles/DesignTokens";

// ── Sidebar nav items ──────────────────────────────────────────────────────────
const NAV = [
  { id: "students", icon: "users",   label: "Students",  sub: "Enrollment" },
  { id: "programs", icon: "book",    label: "Programs",  sub: "Events" },
  { id: "users",    icon: "shield",  label: "Groups",    sub: "Access" },
  { id: "logs",     icon: "list",    label: "Audit Log", sub: "Activity" },
  { id: "print",    icon: "printer", label: "Print",     sub: "Export" },
];

// ── Mobile bottom nav ──────────────────────────────────────────────────────────
const MobileNav = ({ view, setView }) => (
  <div className="tabbar mobile-nav" style={{ zIndex: 150 }}>
    {NAV.map(n => (
      <button key={n.id} className={`tab-item${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}>
        <Ic name={n.icon} size={18} />
        <span>{n.label}</span>
      </button>
    ))}
  </div>
);

const AdminPortal = ({ user, dark, setDark, onBack }) => {
  const { groups, programs, setPrograms, students, setStudents, registrations, users, setUsers, activityLogs, logActivity } = useApp();
  const [view, setView]           = useState("students");
  const [activeGroup, setActiveGroup] = useState(groups[0]?.id);

  const [progModal, setProgModal] = useState(false);
  const [editProg, setEditProg]   = useState(null);
  const [progForm, setProgForm]   = useState({ name: "", category: "Senior", type: "Single", maxParticipants: 1, criteria: ["", ""] });
  const [progFilter, setProgFilter] = useState("All");

  const [stuModal, setStuModal]   = useState(false);
  const [stuForm, setStuForm]     = useState({ name: "", category: "Senior" });

  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm]   = useState({ name: "", pin: "" });

  const [editUserModal, setEditUserModal] = useState(false);
  const [editingUser, setEditingUser]     = useState(null);
  const [editUserForm, setEditUserForm]   = useState({ name: "", pin: "" });

  const [delConfirm, setDelConfirm] = useState(null); // { type, id, label }

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.id === activeGroup)) setActiveGroup(groups[0].id);
  }, [groups, activeGroup]);

  const catBase = { "Sub-Junior": 100, "Junior": 200, "Senior": 300 };

  // ── Student operations ───────────────────────────────────────────────────────
  const saveStudent = () => {
    if (!stuForm.name.trim()) return;
    const sId   = "s-" + Math.random().toString(36).substr(2, 5);
    const catStus = (students[activeGroup] || []).filter(s => s.category === stuForm.category);
    const chest = catBase[stuForm.category] + catStus.length + 1;
    const newStudent = { id: sId, ...stuForm, chestNo: chest.toString() };
    setStudents(prev => ({ ...prev, [activeGroup]: [...(prev[activeGroup] || []), newStudent] }));
    const grp = groups.find(g => g.id === activeGroup);
    logActivity(user.name, "Added student", `${newStudent.name} (${newStudent.chestNo}) to ${grp?.name}`);
    setStuModal(false); setStuForm({ name: "", category: "Senior" });
  };

  const deleteStudent = (gId, sId, name) => {
    if (registrations.some(r => r.groupId === gId && r.participantIds.includes(sId))) {
      setDelConfirm({ type: "blocked", label: "This student has active registrations and cannot be deleted." });
      return;
    }
    setDelConfirm({ type: "student", id: { gId, sId }, label: name });
  };

  const confirmDeleteStudent = () => {
    const { gId, sId } = delConfirm.id;
    const s = (students[gId] || []).find(x => x.id === sId);
    setStudents(prev => ({ ...prev, [gId]: prev[gId].filter(s => s.id !== sId) }));
    const grp = groups.find(g => g.id === gId);
    if (s) logActivity(user.name, "Deleted student", `${s.name} from ${grp?.name}`);
    setDelConfirm(null);
  };

  const updateStudentRole = (gId, sId, role) => {
    setStudents(prev => {
      const gs = prev[gId] || [];
      const updated = gs.map(s => {
        if (s.id === sId) return { ...s, groupRole: role };
        if (role === "Leader" && s.groupRole === "Leader") return { ...s, groupRole: "Member" };
        if (role === "Asst. Leader" && s.groupRole === "Asst. Leader") return { ...s, groupRole: "Member" };
        return s;
      });
      return { ...prev, [gId]: updated };
    });
    const s = (students[gId] || []).find(x => x.id === sId);
    const grp = groups.find(g => g.id === gId);
    logActivity(user.name, "Updated designation", `${s?.name} → ${role} in ${grp?.name}`);
  };

  // ── Program operations ───────────────────────────────────────────────────────
  const openAddProg  = () => { setEditProg(null); setProgForm({ name: "", category: "Senior", type: "Single", maxParticipants: 1, criteria: ["", ""] }); setProgModal(true); };
  const openEditProg = (p) => { setEditProg(p.id); setProgForm(p); setProgModal(true); };

  const saveProg = () => {
    if (!progForm.name.trim()) return;
    if (editProg) {
      setPrograms(prev => prev.map(p => p.id === editProg ? { ...p, ...progForm } : p));
      logActivity(user.name, "Updated program", progForm.name);
    } else {
      const newP = { id: "p-" + Math.random().toString(36).substr(2, 5), ...progForm };
      setPrograms(prev => [...prev, newP]);
      logActivity(user.name, "Added program", progForm.name);
    }
    setProgModal(false);
  };

  const deleteProg = (id, name) => {
    if (registrations.some(r => r.programId === id)) {
      setDelConfirm({ type: "blocked", label: "This program has active registrations and cannot be deleted." });
      return;
    }
    setDelConfirm({ type: "program", id, label: name });
  };

  const confirmDeleteProg = () => {
    setPrograms(prev => prev.filter(p => p.id !== delConfirm.id));
    logActivity(user.name, "Deleted program", delConfirm.label);
    setDelConfirm(null);
  };

  // ── User/group operations ────────────────────────────────────────────────────
  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.pin.trim()) return;
    const id = "u-" + Math.random().toString(36).substr(2, 5);
    const newU = { id, name: userForm.name.trim(), pin: userForm.pin.trim(), role: "group", groupId: id };
    setUsers(prev => [...prev, newU]);
    logActivity(user.name, "Added group", newU.name);
    setUserModal(false); setUserForm({ name: "", pin: "" });
  };

  const openEditUser = (u) => { setEditingUser(u); setEditUserForm({ name: u.name, pin: u.pin }); setEditUserModal(true); };

  const saveEditUser = () => {
    if (!editUserForm.name.trim() || !editUserForm.pin.trim()) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editUserForm.name.trim(), pin: editUserForm.pin.trim() } : u));
    logActivity(user.name, "Edited group", editUserForm.name);
    setEditUserModal(false); setEditingUser(null);
  };

  const deleteUser = (id, name) => {
    if (id === user.id) { setDelConfirm({ type: "blocked", label: "You cannot delete your own account." }); return; }
    setDelConfirm({ type: "user", id, label: name });
  };

  const confirmDeleteUser = () => {
    setUsers(prev => prev.filter(u => u.id !== delConfirm.id));
    logActivity(user.name, "Deleted group", delConfirm.label);
    setDelConfirm(null);
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalStudents = Object.values(students).flat().length;
  const totalRegs     = registrations.length;

  // ── View panels ──────────────────────────────────────────────────────────────
  const renderStudents = () => {
    const groupStudents = [...(students[activeGroup] || [])].sort((a, b) => {
      const order = { Leader: 0, "Asst. Leader": 1, Member: 2 };
      return (order[a.groupRole || "Member"] ?? 2) - (order[b.groupRole || "Member"] ?? 2);
    });

    return (
      <div className="anim-fadeIn">
        {/* Stats row */}
        <div className="grid-4" style={{ marginBottom: 22 }}>
          {[
            { label: "Total Students", value: totalStudents,          color: "#f59e0b", icon: "users" },
            { label: "Groups",         value: groups.length,          color: "#0ea5e9", icon: "shield" },
            { label: "Programs",       value: programs.length,        color: "#10b981", icon: "book" },
            { label: "Registrations",  value: totalRegs,              color: "#8b5cf6", icon: "list" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic name={s.icon} size={17} />
                </div>
              </div>
              <div className="ff-display fw-800" style={{ fontSize: 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="section-header">
          <div>
            <div className="section-title">Manage Enrollment</div>
            <div className="section-sub">{groupStudents.length} students in selected group</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setStuModal(true)}>
            <Ic name="plus" size={13} /> Add Student
          </button>
        </div>

        {/* Group tabs */}
        <div className="group-tabs" style={{ marginBottom: 20 }}>
          {groups.map(g => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)} className="btn"
              style={{
                background: activeGroup === g.id ? g.color : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                color: activeGroup === g.id ? "white" : (dark ? "#9ca3af" : "#6b7280"),
                minWidth: 100, fontWeight: 700, boxShadow: activeGroup === g.id ? `0 4px 14px ${g.color}44` : "none",
              }}>{g.name}</button>
          ))}
        </div>

        {groupStudents.length === 0 ? (
          <div className="card-flat empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No students yet</div>
            <div className="empty-desc">Add students to this group to get started</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Chest</th><th>Name</th><th>Category</th><th>Designation</th><th style={{ textAlign: "right" }}>Action</th></tr>
              </thead>
              <tbody>
                {groupStudents.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className="ff-display fw-800" style={{ color: ACCENT, fontSize: 15 }}>{s.chestNo}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9, flexShrink: 0, fontSize: 12, fontWeight: 800,
                          background: catColor[s.category] + "18", color: catColor[s.category],
                          display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif",
                        }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                          {s.groupRole && s.groupRole !== "Member" && (
                            <span className="badge" style={{
                              background: s.groupRole === "Leader" ? "rgba(245,158,11,0.12)" : "rgba(139,92,246,0.12)",
                              color: s.groupRole === "Leader" ? "#f59e0b" : "#8b5cf6",
                              fontSize: 9, padding: "1px 6px", marginTop: 2,
                            }}>{s.groupRole === "Leader" ? "★" : "☆"} {s.groupRole}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${s.category === "Sub-Junior" ? "sj" : s.category.toLowerCase()}`}>{s.category}</span></td>
                    <td>
                      <select className="input select" value={s.groupRole || "Member"} onChange={e => updateStudentRole(activeGroup, s.id, e.target.value)}
                        style={{ width: 148, height: 34, fontSize: 12, padding: "2px 10px", borderRadius: 8 }}>
                        <option value="Member">Member</option>
                        <option value="Leader">Leader</option>
                        <option value="Asst. Leader">Asst. Leader</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteStudent(activeGroup, s.id, s.name)}>
                        <Ic name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderPrograms = () => {
    const filtered = programs.filter(p => progFilter === "All" || p.category === progFilter);
    return (
      <div className="anim-fadeIn">
        <div className="section-header">
          <div>
            <div className="section-title">Programs & Events</div>
            <div className="section-sub">{programs.length} total · {filtered.length} shown</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAddProg}><Ic name="plus" size={13} /> Add Program</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {["All", ...CATS].map(cat => {
            const active = progFilter === cat;
            const col = cat === "All" ? ACCENT : catColor[cat];
            return (
              <button key={cat} onClick={() => setProgFilter(cat)} className="btn btn-sm"
                style={{
                  flexShrink: 0,
                  background: active ? col : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                  color: active ? (cat === "All" ? "#0a0b12" : "white") : (dark ? "#9ca3af" : "#6b7280"),
                  boxShadow: active ? `0 4px 14px ${col}44` : "none", fontWeight: 700, padding: "7px 16px",
                }}>
                {cat}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="card-flat empty-state"><div className="empty-icon">🎭</div><div className="empty-title">No programs</div><div className="empty-desc">Add programs to get started</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((p, i) => {
              const progRegs   = registrations.filter(r => r.programId === p.id);
              const allParts   = progRegs.flatMap(r => {
                const gs  = students[r.groupId] || [];
                const grp = groups.find(g => g.id === r.groupId);
                return r.participantIds.map(id => { const s = gs.find(st => st.id === id); return s ? { ...s, groupName: grp?.name, groupColor: grp?.color } : null; }).filter(Boolean);
              });
              const col = catColor[p.category];
              return (
                <div key={p.id} className={`card anim-fadeUp stagger-${Math.min(i+1,8)}`} style={{ padding: 20, borderLeft: `4px solid ${col}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
                    <div>
                      <div className="ff-display fw-800" style={{ fontSize: 16, marginBottom: 7 }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span className={`badge badge-${p.category === "Sub-Junior" ? "sj" : p.category.toLowerCase()}`}>{p.category}</span>
                        <span className={`badge badge-${p.type.toLowerCase()}`}>{p.type}</span>
                        <span className="chip" style={{ background: `${ACCENT}12`, color: ACCENT, fontSize: 11 }}>Max {p.maxParticipants}</span>
                        {p.criteria?.filter(Boolean).map(c => <span key={c} className="chip" style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: dark ? "#9ca3af" : "#6b7280", fontSize: 11 }}>{c}</span>)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditProg(p)}><Ic name="edit" size={13} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteProg(p.id, p.name)}><Ic name="trash" size={13} /></button>
                    </div>
                  </div>
                  {allParts.length > 0 && (
                    <>
                      <div className="divider" />
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: dark ? "#4b5563" : "#9ca3af", marginBottom: 8 }}>
                        {allParts.length} Registered
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {allParts.map((s, j) => (
                          <div key={j} className="chip" style={{ background: `${s.groupColor}18`, color: s.groupColor, border: `1px solid ${s.groupColor}30`, fontSize: 11.5 }}>
                            <span className="fw-800">{s.chestNo}</span> {s.name}
                            <span style={{ opacity: 0.6, fontSize: 10 }}> · {s.groupName}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGroups = () => (
    <div className="anim-fadeIn">
      <div className="section-header">
        <div>
          <div className="section-title">Group Control</div>
          <div className="section-sub">Manage groups that appear on the login screen</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setUserModal(true)}><Ic name="plus" size={13} /> Add Group</button>
      </div>
      {users.filter(u => u.role !== "admin").length === 0 ? (
        <div className="card-flat empty-state"><div className="empty-icon">🏷️</div><div className="empty-title">No groups yet</div><div className="empty-desc">Add a group to get started</div></div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>#</th><th>Group Name</th><th>Students</th><th>PIN</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {users.filter(u => u.role !== "admin").map((u, idx) => {
                const memberCount = (students[u.id] || []).length;
                const groupColor  = groups.find(g => g.id === u.id)?.color || ACCENT;
                return (
                  <tr key={u.id}>
                    <td><span className="ff-display fw-800" style={{ color: ACCENT }}>{idx + 1}</span></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${groupColor}18`, color: groupColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                          {u.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 700 }}>{u.name}</span>
                      </div>
                    </td>
                    <td><span className="chip" style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: dark ? "#9ca3af" : "#6b7280" }}>{memberCount} members</span></td>
                    <td><span style={{ fontFamily: "monospace", letterSpacing: 3, color: dark ? "#374151" : "#d1d5db", fontSize: 14 }}>{"•".repeat(u.pin?.length || 3)}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditUser(u)}><Ic name="edit" size={13} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteUser(u.id, u.name)} disabled={u.id === user.id}><Ic name="trash" size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderLogs = () => (
    <div className="anim-fadeIn">
      <div className="section-header">
        <div>
          <div className="section-title">Audit Trail</div>
          <div className="section-sub">{activityLogs.length} events recorded</div>
        </div>
      </div>
      {activityLogs.length === 0 ? (
        <div className="card-flat empty-state"><div className="empty-icon">📋</div><div className="empty-title">No activity yet</div><div className="empty-desc">Actions will appear here as you use the system</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 14, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
          {activityLogs.map((l, i) => (
            <div key={l.id} style={{
              padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
              background: i % 2 === 0 ? (dark ? "rgba(255,255,255,0.018)" : "rgba(255,255,255,0.7)") : (dark ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.45)"),
              borderTop: i > 0 ? `1px solid ${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` : "none",
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: ACCENT, marginBottom: 2 }}>{l.action}</div>
                  <div style={{ fontSize: 13, marginBottom: 4, wordBreak: "break-word" }}>{l.details}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: dark ? "#4b5563" : "#9ca3af" }}>By {l.userName}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: dark ? "#374151" : "#c4c4d4", whiteSpace: "nowrap", flexShrink: 0 }}>
                {new Date(l.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderViews = { students: renderStudents, programs: renderPrograms, users: renderGroups, logs: renderLogs };

  return (
    <div className="anim-fadeIn" style={{ minHeight: "100vh" }}>
      {/* Topbar */}
      <Topbar
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button className="btn btn-ghost btn-icon" onClick={onBack}><Ic name="back" size={16} /></button>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(145deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" }}>
              <Ic name="shield" size={17} color="#0a0b12" />
            </div>
            <div>
              <div className="topbar-title grad-text">Admin Portal</div>
              <div className="topbar-sub">{user.name}</div>
            </div>
          </div>
        }
        dark={dark} setDark={setDark}
        context="Admin mode · Full access"
        onLogout={onBack} isAdmin
        verify={(val) => val === user.pin}
      />

      {/* Layout */}
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">Navigation</div>
          {NAV.map(n => (
            <div key={n.id} className={`sidebar-item${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}>
              <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: view === n.id ? "rgba(245,158,11,0.15)" : "transparent", flexShrink: 0 }}>
                <Ic name={n.icon} size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{n.label}</div>
                <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 500 }}>{n.sub}</div>
              </div>
            </div>
          ))}

          <div style={{ flex: 1 }} />
          <div className="divider" />
          <div style={{ padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: dark ? "#374151" : "#c4c4d4", fontWeight: 600, marginBottom: 4 }}>Signed in as</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{user.name}</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="admin-main">
          {view === "print" ? <PrintSection dark={dark} /> : renderViews[view]?.()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav view={view} setView={setView} />

      {/* ── Modals ──────────────────────────────────────────────────── */}

      {/* Add Student */}
      {stuModal && (
        <Modal title="Add Student" subtitle="Admin · Only admins can add students" icon="users" onClose={() => setStuModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="label">Group</label>
              <select className="input select" value={activeGroup} onChange={e => setActiveGroup(e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Student Name</label>
              <input type="text" className="input" placeholder="Full name" value={stuForm.name} onChange={e => setStuForm({ ...stuForm, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">Category</label>
              <div className="grid-3">
                {CATS.map(c => (
                  <button key={c} className="btn" onClick={() => setStuForm({ ...stuForm, category: c })}
                    style={{ background: stuForm.category === c ? catColor[c] : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"), color: stuForm.category === c ? "white" : (dark ? "#9ca3af" : "#6b7280"), fontWeight: 700, fontSize: 12, boxShadow: stuForm.category === c ? `0 4px 12px ${catColor[c]}44` : "none" }}>{c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 46 }} onClick={() => setStuModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 46 }} onClick={saveStudent} disabled={!stuForm.name.trim()}>
                <Ic name="plus" size={15} /> Add Student
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Program */}
      {progModal && (
        <Modal title={editProg ? "Edit Program" : "New Program"} icon="book" iconColor="#10b981" onClose={() => setProgModal(false)} wide>
          <div style={{ display: "grid", gap: 18 }}>
            <div className="form-row">
              <div>
                <label className="label">Program Name</label>
                <input type="text" className="input" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} placeholder="e.g. Solo Song" autoFocus />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input select" value={progForm.category} onChange={e => setProgForm({ ...progForm, category: e.target.value })}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label className="label">Type</label>
                <select className="input select" value={progForm.type} onChange={e => setProgForm({ ...progForm, type: e.target.value })}>
                  <option value="Single">Single</option>
                  <option value="Group">Group</option>
                </select>
              </div>
              <div>
                <label className="label">Max Participants</label>
                <input type="number" className="input" min={1} value={progForm.maxParticipants} onChange={e => setProgForm({ ...progForm, maxParticipants: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div>
              <label className="label">Valuation Criteria</label>
              <div className="grid-2">
                <input type="text" className="input" placeholder="Criteria 1" value={progForm.criteria[0]} onChange={e => setProgForm({ ...progForm, criteria: [e.target.value, progForm.criteria[1]] })} />
                <input type="text" className="input" placeholder="Criteria 2" value={progForm.criteria[1]} onChange={e => setProgForm({ ...progForm, criteria: [progForm.criteria[0], e.target.value] })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 46 }} onClick={() => setProgModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 46 }} onClick={saveProg} disabled={!progForm.name.trim()}>
                <Ic name="check" size={15} /> {editProg ? "Save Changes" : "Add Program"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Group */}
      {userModal && (
        <Modal title="Add Group" subtitle="This group will appear on the login screen" icon="users" iconColor="#0ea5e9" onClose={() => setUserModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="label">Group Name</label>
              <input type="text" className="input" placeholder="e.g. Red Eagles, Team Alpha…" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">Login PIN / Password</label>
              <input type="text" className="input" placeholder="e.g. 1234 or mypass" value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value })} autoComplete="new-password" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 46 }} onClick={() => setUserModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 46 }} onClick={saveUser} disabled={!userForm.name.trim() || !userForm.pin.trim()}>
                <Ic name="plus" size={15} /> Add Group
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Group */}
      {editUserModal && editingUser && (
        <Modal title="Edit Group" subtitle={`Editing: ${editingUser.name}`} icon="edit" onClose={() => { setEditUserModal(false); setEditingUser(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="label">Group Name</label>
              <input type="text" className="input" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">PIN / Password</label>
              <input type="text" className="input" value={editUserForm.pin} onChange={e => setEditUserForm({ ...editUserForm, pin: e.target.value })} autoComplete="new-password" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 46 }} onClick={() => { setEditUserModal(false); setEditingUser(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 46 }} onClick={saveEditUser} disabled={!editUserForm.name.trim() || !editUserForm.pin.trim()}>
                <Ic name="check" size={15} /> Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete / Blocked Confirmation */}
      {delConfirm && (
        <div className="modal-bg" onClick={() => setDelConfirm(null)}>
          <div className="modal" style={{ maxWidth: 340, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            {delConfirm.type === "blocked" ? (
              <>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(245,158,11,0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Ic name="info" size={26} />
                </div>
                <div className="ff-display fw-800" style={{ fontSize: 17, marginBottom: 8 }}>Cannot Delete</div>
                <div className="text-muted" style={{ fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{delConfirm.label}</div>
                <button className="btn btn-primary" style={{ width: "100%", height: 46 }} onClick={() => setDelConfirm(null)}>Got it</button>
              </>
            ) : (
              <>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(225,29,72,0.1)", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Ic name="trash" size={26} />
                </div>
                <div className="ff-display fw-800" style={{ fontSize: 17, marginBottom: 8 }}>Delete {delConfirm.type === "student" ? "Student" : delConfirm.type === "program" ? "Program" : "Group"}?</div>
                <div className="text-muted" style={{ fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                  "<strong>{delConfirm.label}</strong>" will be permanently removed.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setDelConfirm(null)}>Cancel</button>
                  <button className="btn" style={{ flex: 1, height: 44, background: "#e11d48", color: "white", fontWeight: 700 }}
                    onClick={delConfirm.type === "student" ? confirmDeleteStudent : delConfirm.type === "program" ? confirmDeleteProg : confirmDeleteUser}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
