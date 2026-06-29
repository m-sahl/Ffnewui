import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import PrintSection from "./PrintSection";
import MessagesPanel from "./MessagesPanel";
import { CATS, ACCENT } from "../../styles/DesignTokens";

// ── Bottom tab bar (all screen sizes) ─────────────────────────────────────────
const NAV = [
  { id: "students", icon: "users",   label: "Students" },
  { id: "programs", icon: "book",    label: "Programs" },
  { id: "users",    icon: "shield",  label: "Groups"   },
  { id: "logs",     icon: "list",    label: "Log"      },
  { id: "print",    icon: "printer", label: "Print"    },
];

const BottomNav = ({ view, setView }) => (
  <div className="tabbar" style={{ zIndex: 150 }}>
    {NAV.map(n => (
      <button key={n.id} className={`tab-item${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}>
        <Ic name={n.icon} size={18} />
        <span>{n.label}</span>
      </button>
    ))}
  </div>
);

// ── Neutral tag ────────────────────────────────────────────────────────────────
const Tag = ({ label, dark }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: dark ? "#6b7280" : "#9ca3af" }}>{label}</span>
);

const AdminMsgBtn = ({ onClick, unread }) => (
  <button onClick={onClick} style={{
    position: "relative", width: 32, height: 32, borderRadius: 9, border: "none",
    background: "rgba(255,255,255,0.055)", color: "#9ca3af",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    transition: "all 0.15s",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.1)"; e.currentTarget.style.color = "#f59e0b"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.055)"; e.currentTarget.style.color = "#9ca3af"; }}
  >
    <Ic name="message" size={15} />
    {unread > 0 && <span style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: "#f59e0b", color: "#0a0b12", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
  </button>
);

const AdminPortal = ({ user, dark, setDark, onBack }) => {
  const { groups, programs, setPrograms, students, setStudents, registrations, users, setUsers, activityLogs, logActivity, messages, locks, toggleLock } = useApp();

  const [view, setView]               = useState("students");
  const [activeGroup, setActiveGroup] = useState(groups[0]?.id);

  // Programs state
  const [session, setSession]         = useState("Stage");          // "Stage" | "Off-Stage"
  const [catFilter, setCatFilter]     = useState("All");
  const [search, setSearch]           = useState("");
  const [showSearch, setShowSearch]   = useState(false);
  const searchRef                     = useRef(null);

  const [stuSearch, setStuSearch]     = useState("");
  const [stuSearchOpen, setStuSearchOpen] = useState(false);
  const [progModal, setProgModal]     = useState(false);
  const [editProg, setEditProg]       = useState(null);
  const [progForm, setProgForm]       = useState({ name: "", session: "Stage", category: "Senior", type: "Single", maxParticipants: 1, criteria: ["", ""] });

  // Students state
  const [stuModal, setStuModal]       = useState(false);
  const [stuForm, setStuForm]         = useState({ name: "", category: "Senior" });

  // Groups state
  const [userModal, setUserModal]         = useState(false);
  const [userForm, setUserForm]           = useState({ name: "", pin: "" });
  const [editUserModal, setEditUserModal] = useState(false);
  const [editingUser, setEditingUser]     = useState(null);
  const [editUserForm, setEditUserForm]   = useState({ name: "", pin: "" });

  const [delConfirm, setDelConfirm]   = useState(null);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.id === activeGroup)) setActiveGroup(groups[0].id);
  }, [groups, activeGroup]);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showSearch]);

  const catBase = { "Sub-Junior": 100, "Junior": 200, "Senior": 300 };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg  = dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)";
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const initBg  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const initCol = dark ? "#9ca3af" : "#6b7280";

  // ── Student ops ────────────────────────────────────────────────────────────
  const saveStudent = () => {
    if (!stuForm.name.trim()) return;
    const sId = "s-" + Math.random().toString(36).substr(2, 5);
    const catStus = (students[activeGroup] || []).filter(s => s.category === stuForm.category);
    const chest = catBase[stuForm.category] + catStus.length + 1;
    const newStudent = { id: sId, ...stuForm, chestNo: chest.toString() };
    setStudents(prev => ({ ...prev, [activeGroup]: [...(prev[activeGroup] || []), newStudent] }));
    logActivity(user.name, "Added student", `${newStudent.name} (${newStudent.chestNo}) to ${groups.find(g => g.id === activeGroup)?.name}`);
    setStuModal(false); setStuForm({ name: "", category: "Senior" });
  };

  const deleteStudent = (gId, sId, name) => {
    if (registrations.some(r => r.groupId === gId && r.participantIds.includes(sId))) {
      setDelConfirm({ type: "blocked", label: "This student has active registrations and cannot be deleted." }); return;
    }
    setDelConfirm({ type: "student", id: { gId, sId }, label: name });
  };
  const confirmDeleteStudent = () => {
    const { gId, sId } = delConfirm.id;
    const s = (students[gId] || []).find(x => x.id === sId);
    setStudents(prev => ({ ...prev, [gId]: prev[gId].filter(s => s.id !== sId) }));
    if (s) logActivity(user.name, "Deleted student", `${s.name} from ${groups.find(g => g.id === gId)?.name}`);
    setDelConfirm(null);
  };

  const updateStudentRole = (gId, sId, role) => {
    setStudents(prev => {
      const updated = (prev[gId] || []).map(s => {
        if (s.id === sId) return { ...s, groupRole: role };
        if (role === "Leader" && s.groupRole === "Leader") return { ...s, groupRole: "Member" };
        if (role === "Asst. Leader" && s.groupRole === "Asst. Leader") return { ...s, groupRole: "Member" };
        return s;
      });
      return { ...prev, [gId]: updated };
    });
    const s = (students[gId] || []).find(x => x.id === sId);
    logActivity(user.name, "Updated designation", `${s?.name} → ${role}`);
  };

  // ── Program ops ────────────────────────────────────────────────────────────
  const openAddProg = () => {
    setEditProg(null);
    setProgForm({ name: "", session, category: catFilter === "All" ? "Senior" : catFilter, type: "Single", maxParticipants: 1, criteria: ["", ""] });
    setProgModal(true);
  };
  const openEditProg = (p) => { setEditProg(p.id); setProgForm(p); setProgModal(true); };
  const saveProg = () => {
    if (!progForm.name.trim()) return;
    if (editProg) {
      setPrograms(prev => prev.map(p => p.id === editProg ? { ...p, ...progForm } : p));
      logActivity(user.name, "Updated program", progForm.name);
    } else {
      setPrograms(prev => [...prev, { id: "p-" + Math.random().toString(36).substr(2, 5), ...progForm }]);
      logActivity(user.name, "Added program", `${progForm.name} (${progForm.session})`);
    }
    setProgModal(false);
  };
  const deleteProg = (id, name) => {
    if (registrations.some(r => r.programId === id)) {
      setDelConfirm({ type: "blocked", label: "This program has active registrations and cannot be deleted." }); return;
    }
    setDelConfirm({ type: "program", id, label: name });
  };
  const confirmDeleteProg = () => {
    setPrograms(prev => prev.filter(p => p.id !== delConfirm.id));
    logActivity(user.name, "Deleted program", delConfirm.label);
    setDelConfirm(null);
  };

  // ── Group ops ──────────────────────────────────────────────────────────────
  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.pin.trim()) return;
    const id = "u-" + Math.random().toString(36).substr(2, 5);
    setUsers(prev => [...prev, { id, name: userForm.name.trim(), pin: userForm.pin.trim(), role: "group", groupId: id }]);
    logActivity(user.name, "Added group", userForm.name);
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

  // ── Renders ────────────────────────────────────────────────────────────────
  const renderStudents = () => {
    const groupStudents = [...(students[activeGroup] || [])]
      .filter(s => !stuSearch.trim() || s.name.toLowerCase().includes(stuSearch.toLowerCase()))
      .sort((a, b) => {
        const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 };
        return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2);
      });
    return (
      <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>
        <div className="section-header">
          <div>
            <div className="section-title">Students</div>
            <div className="section-sub">{groupStudents.length} in selected group</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setStuModal(true)}>
            <Ic name="plus" size={13} /> Add
          </button>
        </div>

        <div className="group-tabs" style={{ marginBottom: 18 }}>
          {groups.map(g => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)} className="btn btn-sm"
              style={{ background: activeGroup === g.id ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: activeGroup === g.id ? "#0a0b12" : mutedTx, fontWeight: 700 }}>
              {g.name}
            </button>
          ))}
        </div>

        {/* Search row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            {stuSearchOpen && (
              <input className="input anim-slideDown" type="text" placeholder="Search by name…"
                value={stuSearch} onChange={e => setStuSearch(e.target.value)}
                style={{ fontSize: 13 }} autoFocus />
            )}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setStuSearchOpen(o => !o); setStuSearch(""); }}
            style={{ flexShrink: 0, color: stuSearchOpen ? ACCENT : mutedTx }}>
            <Ic name="search" size={15} />
          </button>
        </div>

        {groupStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No students yet</div>
            <div style={{ fontSize: 13 }}>Add students to this group to get started</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr><th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: mutedTx, background: dark ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.022)", borderBottom: `1px solid ${border}` }}>Chest</th><th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: mutedTx, background: dark ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.022)", borderBottom: `1px solid ${border}` }}>Name</th><th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: mutedTx, background: dark ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.022)", borderBottom: `1px solid ${border}` }}>Cat</th><th style={{ padding: "10px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: mutedTx, background: dark ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.022)", borderBottom: `1px solid ${border}` }}>Role</th></tr>
              </thead>
              <tbody>
                {groupStudents.map(s => (
                  <tr key={s.id}>
                    <td><span className="ff-display fw-800" style={{ color: ACCENT, fontSize: 14 }}>{s.chestNo}</span></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: initBg, color: initCol, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                          {s.groupRole && s.groupRole !== "Member" && <div style={{ fontSize: 10, color: mutedTx }}>{s.groupRole}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", borderTop: `1px solid ${border}` }}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: mutedTx }}>{s.category === "Sub-Junior" ? "Sub" : s.category}</span></td>
                    <td style={{ padding: "12px 14px", borderTop: `1px solid ${border}`, textAlign: "right" }}>
                      <select value={s.groupRole || "Member"} onChange={e => updateStudentRole(activeGroup, s.id, e.target.value)}
                        style={{ background: "transparent", border: "none", color: mutedTx, fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                        <option>Member</option><option>Leader</option><option>Asst. Leader</option>
                      </select>
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
    const filtered = programs.filter(p => {
      if (p.session !== session) return false;
      if (catFilter !== "All" && p.category !== catFilter) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return (
      <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>

        {/* Heading */}
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: mutedTx, marginBottom: 12 }}>
          Event Items
        </div>

        {/* Stage / Off-Stage toggle */}
        <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 16 }}>
          {["Stage", "Off-Stage", "General"].map(s => (
            <button key={s} onClick={() => { setSession(s); setCatFilter("All"); setSearch(""); setShowSearch(false); }}
              style={{
                flex: 1, padding: "10px", border: "none", cursor: "pointer", borderRadius: 9,
                fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                background: session === s ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
                color: session === s ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                boxShadow: session === s ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.18s ease",
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Category filter + Search icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
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
          <button onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch(""); }}
            className="btn btn-ghost btn-icon btn-sm" style={{ flexShrink: 0, color: showSearch ? ACCENT : mutedTx }}>
            <Ic name="search" size={15} />
          </button>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="anim-slideDown" style={{ marginBottom: 14 }}>
            <input ref={searchRef} type="text" className="input" placeholder="Search by name…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 13 }} />
          </div>
        )}

        {/* Program list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎭</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No {session} programs</div>
            <div style={{ fontSize: 13 }}>Tap + to add one</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            {filtered.map((p, i) => (
              <div key={p.id} style={{
                padding: "14px 16px",
                background: i % 2 === 0 ? cardBg : (dark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.01)"),
                borderTop: i > 0 ? `1px solid ${border}` : "none",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <Tag label={p.category} dark={dark} />
                    <Tag label={p.type} dark={dark} />
                    <Tag label={`Max ${p.maxParticipants}`} dark={dark} />
                    {p.criteria?.filter(Boolean).map(c => <Tag key={c} label={c} dark={dark} />)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditProg(p)}><Ic name="edit" size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteProg(p.id, p.name)}><Ic name="trash" size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating + button */}
        <button onClick={openAddProg} style={{
          position: "fixed", bottom: 80, right: 20, width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none",
          color: "#0a0b12", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 24px rgba(245,158,11,0.45)", zIndex: 100,
          transition: "transform 0.18s, box-shadow 0.18s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(245,158,11,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 24px rgba(245,158,11,0.45)"; }}
        >
          <Ic name="plus" size={22} />
        </button>
      </div>
    );
  };

  const renderGroups = () => (
    <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>
      <div className="section-header">
        <div>
          <div className="section-title">Groups</div>
          <div className="section-sub">Access & registration locks</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setUserModal(true)}><Ic name="plus" size={13} /> Add</button>
      </div>

      {users.filter(u => u.role !== "admin").length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏷️</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No groups yet</div>
          <div style={{ fontSize: 13 }}>Add a group to get started</div>
        </div>
      ) : (
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Group</th>
                <th style={{ textAlign: "center" }}>Stage</th>
                <th style={{ textAlign: "center" }}>Off-Stage</th>
                <th style={{ textAlign: "center" }}>General</th>
                <th style={{ textAlign: "right" }}>—</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== "admin").map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: initBg, color: initCol, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{u.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: mutedTx }}>{(students[u.id] || []).length} members</div>
                      </div>
                    </div>
                  </td>
                  {["Stage", "Off-Stage", "General"].map(session => {
                    const locked = locks[u.id]?.[session];
                    return (
                      <td key={session} style={{ textAlign: "center" }}>
                        <button onClick={() => toggleLock(u.id, session)} style={{
                          width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                          background: locked ? "rgba(225,29,72,0.1)" : "rgba(16,185,129,0.1)",
                          fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s ease",
                        }} title={locked ? `Unlock ${session}` : `Lock ${session}`}>
                          {locked ? "🔒" : "🔓"}
                        </button>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditUser(u)}><Ic name="edit" size={13} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteUser(u.id, u.name)} disabled={u.id === user.id}><Ic name="trash" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderLogs = () => (
    <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>
      <div className="section-header">
        <div>
          <div className="section-title">Audit Log</div>
          <div className="section-sub">{activityLogs.length} events</div>
        </div>
      </div>
      {activityLogs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No activity yet</div>
          <div style={{ fontSize: 13 }}>Actions will appear here</div>
        </div>
      ) : (
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
          {activityLogs.map((l, i) => (
            <div key={l.id} style={{
              padding: "13px 18px", display: "flex", justifyContent: "space-between", gap: 12,
              background: i % 2 === 0 ? cardBg : (dark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.01)"),
              borderTop: i > 0 ? `1px solid ${border}` : "none",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{l.action}</div>
                <div style={{ fontSize: 12, color: mutedTx }}>{l.details} · {l.userName}</div>
              </div>
              <div style={{ fontSize: 11, color: mutedTx, whiteSpace: "nowrap", flexShrink: 0 }}>
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
      <Topbar
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button className="btn btn-ghost btn-icon" onClick={onBack}><Ic name="back" size={16} /></button>
            <div>
              <div className="topbar-title">Admin Portal</div>
              <div className="topbar-sub">{user.name}</div>
            </div>
          </div>
        }
        right={<AdminMsgBtn onClick={() => setShowMessages(true)} unread={(messages||[]).filter(m => m.to === "admin" && !m.read).length} />}
        dark={dark} setDark={setDark}
        context="Admin mode · Full access"
        onLogout={onBack} isAdmin
        verify={(val) => val === user.pin}
      />

      {/* Main content — no sidebar */}
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {view === "print" ? (
          <div style={{ padding: "20px 16px 100px" }}><PrintSection dark={dark} /></div>
        ) : renderViews[view]?.()}
      </div>

      {/* Bottom nav — always visible */}
      <BottomNav view={view} setView={setView} />
      {showMessages && <MessagesPanel user={user} dark={dark} onClose={() => setShowMessages(false)} />}

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {stuModal && (
        <Modal title="Add Student" onClose={() => setStuModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">Group</label>
              <select className="input select" value={activeGroup} onChange={e => setActiveGroup(e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Name</label>
              <input type="text" className="input" placeholder="Full name" value={stuForm.name} onChange={e => setStuForm({ ...stuForm, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input select" value={stuForm.category} onChange={e => setStuForm({ ...stuForm, category: e.target.value })}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setStuModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 44 }} onClick={saveStudent} disabled={!stuForm.name.trim()}>Add Student</button>
            </div>
          </div>
        </Modal>
      )}

      {progModal && (
        <Modal title={editProg ? "Edit Program" : "Add Program"} onClose={() => setProgModal(false)} wide>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="form-row">
              <div>
                <label className="label">Name</label>
                <input type="text" className="input" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} placeholder="Program name" autoFocus />
              </div>
              <div>
                <label className="label">Session</label>
                <select className="input select" value={progForm.session} onChange={e => setProgForm({ ...progForm, session: e.target.value })}>
                  <option value="Stage">Stage</option>
                  <option value="Off-Stage">Off-Stage</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label className="label">Category</label>
                <select className="input select" value={progForm.category} onChange={e => setProgForm({ ...progForm, category: e.target.value })}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input select" value={progForm.type} onChange={e => setProgForm({ ...progForm, type: e.target.value })}>
                  <option value="Single">Single</option>
                  <option value="Group">Group</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Max Participants</label>
              <input type="number" className="input" min={1} value={progForm.maxParticipants} onChange={e => setProgForm({ ...progForm, maxParticipants: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="label">Criteria</label>
              <div className="grid-2">
                <input type="text" className="input" placeholder="Criteria 1" value={progForm.criteria[0]} onChange={e => setProgForm({ ...progForm, criteria: [e.target.value, progForm.criteria[1]] })} />
                <input type="text" className="input" placeholder="Criteria 2" value={progForm.criteria[1]} onChange={e => setProgForm({ ...progForm, criteria: [progForm.criteria[0], e.target.value] })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setProgModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 44 }} onClick={saveProg} disabled={!progForm.name.trim()}>{editProg ? "Save Changes" : "Add Program"}</button>
            </div>
          </div>
        </Modal>
      )}

      {userModal && (
        <Modal title="Add Group" onClose={() => setUserModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">Group Name</label>
              <input type="text" className="input" placeholder="e.g. Team Alpha" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">PIN / Password</label>
              <input type="text" className="input" placeholder="e.g. 1234" value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value })} autoComplete="new-password" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setUserModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 44 }} onClick={saveUser} disabled={!userForm.name.trim() || !userForm.pin.trim()}>Add Group</button>
            </div>
          </div>
        </Modal>
      )}

      {editUserModal && editingUser && (
        <Modal title="Edit Group" onClose={() => { setEditUserModal(false); setEditingUser(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">Group Name</label>
              <input type="text" className="input" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">PIN / Password</label>
              <input type="text" className="input" value={editUserForm.pin} onChange={e => setEditUserForm({ ...editUserForm, pin: e.target.value })} autoComplete="new-password" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => { setEditUserModal(false); setEditingUser(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 44 }} onClick={saveEditUser} disabled={!editUserForm.name.trim() || !editUserForm.pin.trim()}>Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {delConfirm && (
        <div className="modal-bg" onClick={() => setDelConfirm(null)}>
          <div className="modal" style={{ maxWidth: 320, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            {delConfirm.type === "blocked" ? (
              <>
                <div style={{ fontSize: 13, color: mutedTx, marginBottom: 20, lineHeight: 1.6 }}>{delConfirm.label}</div>
                <button className="btn btn-primary" style={{ width: "100%", height: 44 }} onClick={() => setDelConfirm(null)}>Got it</button>
              </>
            ) : (
              <>
                <div className="ff-display fw-800" style={{ fontSize: 17, marginBottom: 8 }}>Delete?</div>
                <div style={{ fontSize: 13, color: mutedTx, marginBottom: 20, lineHeight: 1.6 }}>
                  "<strong>{delConfirm.label}</strong>" will be permanently removed.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setDelConfirm(null)}>Cancel</button>
                  <button className="btn" style={{ flex: 1, height: 44, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", color: dark ? "#e8e8f5" : "#12121e", fontWeight: 700 }}
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
