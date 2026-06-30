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
  { id: "students",      icon: "users",   label: "Students" },
  { id: "programs",      icon: "book",    label: "Programs" },
  { id: "users",         icon: "shield",  label: "Groups"   },
  { id: "registrations", icon: "list",    label: "Entries"  },
  { id: "print",         icon: "printer", label: "Print"    },
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
  const { groups, users, students, studentsFlat, programs, registrations, activityLogs, messages, logActivity, clearLogs, toggleLock, isLocked, addStudent, updateStudentRole, deleteStudent, addProgram, editProgram, deleteProgram, addRegistration, editRegistration, deleteRegistration, addGroup, editGroup, deleteGroup } = useApp();

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
  const [regGroupFilter, setRegGroupFilter] = useState("all");
  const [regCatFilter, setRegCatFilter] = useState("All");
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.id === activeGroup)) setActiveGroup(groups[0].id);
  }, [groups, activeGroup]);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showSearch]);

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
    const newStudent = { id: sId, ...stuForm, chestNo: nextChestNo(stuForm.category) };
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
  const confirmDeleteStudent = async () => {
    const { gId, sId } = delConfirm.id;
    const s = (students[gId] || []).find(x => x._id === sId);
    await deleteStudent(sId);
    if (s) logActivity(user.name, "Deleted student", `${s.name} from ${groups.find(g => g.id === gId)?.name}`);
    setDelConfirm(null);
  };

  const updateStudentRole = async (gId, sId, role) => {
    await updateStudentRole(sId, role);
    const s = (students[gId] || []).find(x => x._id === sId);
    logActivity(user.name, "Updated designation", `${s?.name} → ${role}`);
  };

  // ── Program ops ────────────────────────────────────────────────────────────
  const openAddProg = () => {
    setEditProg(null);
    setProgForm({ name: "", session, category: catFilter === "All" ? "Senior" : catFilter, type: "Single", maxParticipants: 1, criteria: ["", ""] });
    setProgModal(true);
  };
  const openEditProg = (p) => { setEditProg(p._id); setProgForm({ ...p, id: undefined }); setProgModal(true); };
  const saveProg = async () => {
    if (!progForm.name.trim()) return;
    const data = { name: progForm.name, session: progForm.session, category: progForm.category, type: progForm.type, maxParticipants: progForm.maxParticipants, criteria: progForm.criteria.filter(Boolean) };
    if (editProg) {
      await editProgram(editProg, data);
      logActivity(user.name, "Updated program", progForm.name);
    } else {
      await addProgram(data);
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
  const confirmDeleteProg = async () => {
    await deleteProgram(delConfirm.id);
    logActivity(user.name, "Deleted program", delConfirm.label);
    setDelConfirm(null);
  };

  // ── Group ops ──────────────────────────────────────────────────────────────
  const saveUser = async () => {
    if (!userForm.name.trim() || !userForm.pin.trim()) return;
    await addGroup(userForm.name.trim(), userForm.pin.trim());
    logActivity(user.name, "Added group", userForm.name);
    setUserModal(false); setUserForm({ name: "", pin: "" });
  };
  const openEditUser = (u) => { setEditingUser(u); setEditUserForm({ name: u.name, pin: u.pin }); setEditUserModal(true); };
  const saveEditUser = async () => {
    if (!editUserForm.name.trim() || !editUserForm.pin.trim()) return;
    await editGroup(editingUser._id, editUserForm.name.trim(), editUserForm.pin.trim());
    logActivity(user.name, "Edited group", editUserForm.name);
    setEditUserModal(false); setEditingUser(null);
  };
  const deleteUser = (id, name) => {
    if (id === user._id) { setDelConfirm({ type: "blocked", label: "You cannot delete your own account." }); return; }
    setDelConfirm({ type: "user", id, label: name });
  };
  const confirmDeleteUser = async () => {
    await deleteGroup(delConfirm.id);
    logActivity(user.name, "Deleted group", delConfirm.label);
    setDelConfirm(null);
  };
  const confirmClearLogs = () => { clearLogs(); setDelConfirm(null); };

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
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setStuSearchOpen(o => !o); setStuSearch(""); }}
              style={{ color: stuSearchOpen ? ACCENT : mutedTx }}>
              <Ic name="search" size={15} />
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setStuModal(true)}>
              <Ic name="plus" size={13} /> Add
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 18 }}>
          {groups.map(g => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)}
              style={{
                flex: 1, padding: "10px 6px", border: "none", cursor: "pointer", borderRadius: 9,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: activeGroup === g.id ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
                color: activeGroup === g.id ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                boxShadow: activeGroup === g.id ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.18s ease",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
              {g.name}
            </button>
          ))}
        </div>

        {/* Search */}
        {stuSearchOpen && (
          <div style={{ marginBottom: 14 }}>
            <input className="input" type="text" placeholder="Search by name…"
              value={stuSearch} onChange={e => setStuSearch(e.target.value)}
              style={{ fontSize: 13 }} autoFocus />
          </div>
        )}

        {groupStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No students yet</div>
            <div style={{ fontSize: 13 }}>Add students to this group to get started</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            {groupStudents.map((s, i) => (
              <div key={s._id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                borderTop: i > 0 ? `1px solid ${border}` : "none",
                background: i % 2 === 0 ? cardBg : "transparent",
              }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: ACCENT, fontSize: 13, minWidth: 36 }}>{s.chestNo}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: mutedTx, marginTop: 1 }}>{s.category === "Sub-Junior" ? "Sub-Junior" : s.category}</div>
                </div>
                <select value={s.groupRole || "Member"} onChange={e => updateStudentRole(activeGroup, s._id, e.target.value)}
                  style={{ background: "transparent", border: "none", color: mutedTx, fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none", flexShrink: 0 }}>
                  <option>Member</option><option>Leader</option><option>Asst. Leader</option>
                </select>
                <button onClick={() => deleteStudent(activeGroup, s._id, s.name)} style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 4, flexShrink: 0, display: "flex", alignItems: "center" }}>
                  <Ic name="trash" size={14} />
                </button>
              </div>
            ))}
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
              <div key={p._id} style={{
                padding: "14px 16px",
                background: i % 2 === 0 ? cardBg : (dark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.01)"),
                borderTop: i > 0 ? `1px solid ${border}` : "none",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 12, color: mutedTx, flexShrink: 0 }}>#{p.order || (i + 1)}</span>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <Tag label={p.category} dark={dark} />
                    <Tag label={p.type} dark={dark} />
                    <Tag label={`Max ${p.maxParticipants}`} dark={dark} />
                    {p.criteria?.filter(Boolean).map(c => <Tag key={c} label={c} dark={dark} />)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditProg(p)}><Ic name="edit" size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteProg(p._id, p.name)}><Ic name="trash" size={13} /></button>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
          {users.filter(u => u.role !== "admin").map((u, i) => (
            <div key={u._id} style={{
              padding: "14px 16px",
              background: i % 2 === 0 ? cardBg : "transparent",
              borderTop: i > 0 ? `1px solid ${border}` : "none",
            }}>
              {/* Group name + actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: mutedTx, marginTop: 1 }}>{(students[u.id] || []).length} members</div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditUser(u)}><Ic name="edit" size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteUser(u._id, u.name)} disabled={u.id === user.id}><Ic name="trash" size={13} /></button>
                </div>
              </div>
              {/* Lock toggles */}
              <div style={{ display: "flex", gap: 6 }}>
                {["Stage", "Off-Stage", "General"].map(session => {
                  const locked = isLocked(u._id, session);
                  return (
                    <button key={session} onClick={() => toggleLock(u._id, session)} style={{
                      flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${locked ? "rgba(225,29,72,0.2)" : "rgba(16,185,129,0.2)"}`,
                      background: locked ? "rgba(225,29,72,0.07)" : "rgba(16,185,129,0.07)",
                      color: locked ? "#e11d48" : "#10b981",
                      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}>
                      {locked ? "🔒" : "🔓"} {session}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRegistrations = () => {
    const groupList = groups.map(g => {
      const regs = registrations.filter(r => r.groupId === g.id);
      return { ...g, regs, count: regs.length };
    });

    const activeGroupId = regGroupFilter === "all" ? groupList[0]?.id : regGroupFilter;
    const activeGroupData = groupList.find(g => g.id === activeGroupId);

    const filteredRegs = (activeGroupData?.regs || []).filter(r => {
      if (regCatFilter === "All") return true;
      const p = programs.find(pg => pg.id === r.programId);
      return p?.category === regCatFilter;
    });

    return (
      <div className="anim-fadeIn" style={{ padding: "20px 16px 100px" }}>
        <div className="section-header">
          <div>
            <div className="section-title">Entries</div>
            <div className="section-sub">{activeGroupData?.count || 0} registrations</div>
          </div>
        </div>

        {/* Group toggle — large pill style matching Programs page */}
        <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 16 }}>
          {groupList.map(g => (
            <button key={g.id} onClick={() => setRegGroupFilter(g.id)}
              style={{
                flex: 1, padding: "10px 6px", border: "none", cursor: "pointer", borderRadius: 9,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: activeGroupId === g.id ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
                color: activeGroupId === g.id ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                boxShadow: activeGroupId === g.id ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.18s ease",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
              {g.name}
            </button>
          ))}
        </div>

        {/* Category filter pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 18 }}>
          {["All", ...CATS].map(cat => (
            <button key={cat} onClick={() => setRegCatFilter(cat)} className="btn btn-sm"
              style={{ flexShrink: 0, fontWeight: 700, background: regCatFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: regCatFilter === cat ? "#0a0b12" : mutedTx }}>
              {cat === "Sub-Junior" ? "Sub" : cat}
            </button>
          ))}
        </div>

        {/* Registrations list */}
        {!activeGroupData || filteredRegs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: mutedTx }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎭</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No registrations</div>
            <div style={{ fontSize: 13 }}>{activeGroupData?.name || "This group"} has no entries{regCatFilter !== "All" ? ` in ${regCatFilter}` : ""}</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, border: `1px solid ${border}`, overflow: "hidden" }}>
            {filteredRegs.map((r, i) => {
              const p     = programs.find(pg => pg.id === r.programId);
              const parts = (r.participantIds || []).map(id => (students[activeGroupId] || []).find(s => s.id === id)).filter(Boolean);
              return (
                <div key={r.id} style={{ padding: "13px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: parts.length ? 6 : 0 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 11, color: mutedTx }}>{p?.order ? `#${p.order}` : ""}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{p?.name}</span>
                    <Tag label={p?.session} dark={dark} />
                  </div>
                  {parts.length > 0 && (
                    <div style={{ fontSize: 12, color: mutedTx }}>
                      {parts.map(s => `${s.chestNo} ${s.name}`).join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderViews = { students: renderStudents, programs: renderPrograms, users: renderGroups, registrations: renderRegistrations };

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
                    onClick={delConfirm.type === "student" ? confirmDeleteStudent : delConfirm.type === "program" ? confirmDeleteProg : delConfirm.type === "logs" ? confirmClearLogs : confirmDeleteUser}>
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
