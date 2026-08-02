import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import PrintSection from "./PrintSection";
import MessagesPanel from "./MessagesPanel";
import { CATS, STUDENT_CATS, ACCENT } from "../../styles/DesignTokens";

const NAV = [
  { id: "students",      icon: "users",   label: "Students"  },
  { id: "programs",      icon: "book",    label: "Programs"  },
  { id: "users",         icon: "shield",  label: "Groups"    },
  { id: "registrations", icon: "list",    label: "Entries"   },
  { id: "print",         icon: "printer", label: "Print"     },
];

const Tag = ({ label, dark }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: dark ? "#6b7280" : "#9ca3af" }}>{label}</span>
);

// Thin wrapper — just the gear icon that opens Topbar's SettingsPanel
const SettingsBtn = ({ dark, setDark, userPin, onLogout }) => {
  const [open, setOpen] = React.useState(false);
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        width: 34, height: 34, borderRadius: 9, border: `1px solid ${border}`,
        background: "transparent", color: mutedTx, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.color = "#f14d4d"; e.currentTarget.style.borderColor = "rgba(241,77,77,0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = mutedTx; e.currentTarget.style.borderColor = border; }}
      >
        <Ic name="settings" size={15} />
      </button>
      {open && (
        <Topbar
          _settingsOnly
          dark={dark} setDark={setDark}
          context="Admin mode · Full access"
          onLogout={onLogout} isAdmin
          verify={(val) => val === userPin}
          onSettingsClose={() => setOpen(false)}
          _forceOpen={open}
        />
      )}
    </>
  );
};

const AdminPortal = ({ user, dark, setDark, onBack }) => {
  const { groups, programs, setPrograms, addProgram, updateProgram, deleteProgram, students, setStudents, registrations, users, setUsers, activityLogs, logActivity, clearLogs, messages, locks, toggleLock, nextChestNo } = useApp();

  const [view, setView]               = useState("students");
  const [activeGroup, setActiveGroup] = useState(groups[0]?.id);
  const [progType, setProgType]       = useState("Stage");
  const [catFilter, setCatFilter]     = useState("All");
  const [search, setSearch]           = useState("");
  const [showSearch, setShowSearch]   = useState(false);
  const searchRef                     = useRef(null);
  const [stuSearch, setStuSearch]     = useState("");
  const [stuSearchOpen, setStuSearchOpen] = useState(false);
  const [progModal, setProgModal]     = useState(false);
  const [editProg, setEditProg]       = useState(null);
  const [progForm, setProgForm]       = useState({ name: "", type: "Stage", category: "General", maxParticipants: 1, criteria: ["", ""] });
  const [stuModal, setStuModal]       = useState(false);
  const [stuForm, setStuForm]         = useState({ name: "", category: "Senior" });
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

  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg  = dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)";
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const sideBg  = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";

  // ── Student ops ─────────────────────────────────────────────────────────
  const saveStudent = () => {
    if (!stuForm.name.trim()) return;
    const sId = "s-" + Math.random().toString(36).substr(2, 5);
    const newStudent = { id: sId, ...stuForm, groupId: activeGroup, chestNo: nextChestNo(stuForm.category) };
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
  };

  // ── Program ops ─────────────────────────────────────────────────────────
  const openAddProg  = () => { setEditProg(null); setProgForm({ name: "", type: progType, category: catFilter === "All" ? "General" : catFilter, maxParticipants: 1, criteria: ["", ""] }); setProgModal(true); };
  const openEditProg = (p) => { setEditProg(p.id); setProgForm({ ...p, type: p.type || p.session || "Stage" }); setProgModal(true); };
  const saveProg = () => {
    if (!progForm.name.trim()) return;
    const pData = { ...progForm, type: progForm.type || "Stage", session: progForm.type || "Stage" };
    if (editProg) {
      updateProgram(editProg, pData);
      logActivity(user.name, "Updated program", progForm.name);
    } else {
      const newProg = { id: "p-" + Math.random().toString(36).substr(2, 5), order: programs.length + 1, ...pData };
      addProgram(newProg);
      logActivity(user.name, "Added program", `${progForm.name} (${progForm.type})`);
    }
    setProgModal(false);
  };
  const deleteProg = (id, name) => {
    if (registrations.some(r => r.programId === id)) { setDelConfirm({ type: "blocked", label: "This program has active registrations and cannot be deleted." }); return; }
    setDelConfirm({ type: "program", id, label: name });
  };
  const confirmDeleteProg = () => { deleteProgram(delConfirm.id); logActivity(user.name, "Deleted program", delConfirm.label); setDelConfirm(null); };

  // ── Group ops ────────────────────────────────────────────────────────────
  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.pin.trim()) return;
    const id = "u-" + Math.random().toString(36).substr(2, 5);
    setUsers(prev => [...prev, { id, name: userForm.name.trim(), pin: userForm.pin.trim(), role: "group", groupId: id }]);
    logActivity(user.name, "Added group", userForm.name);
    setUserModal(false); setUserForm({ name: "", pin: "" });
  };
  const openEditUser  = (u) => { setEditingUser(u); setEditUserForm({ name: u.name, pin: u.pin }); setEditUserModal(true); };
  const saveEditUser  = () => {
    if (!editUserForm.name.trim() || !editUserForm.pin.trim()) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editUserForm.name.trim(), pin: editUserForm.pin.trim() } : u));
    logActivity(user.name, "Edited group", editUserForm.name);
    setEditUserModal(false); setEditingUser(null);
  };
  const deleteUser = (id, name) => {
    if (id === user.id) { setDelConfirm({ type: "blocked", label: "You cannot delete your own account." }); return; }
    setDelConfirm({ type: "user", id, label: name });
  };
  const confirmDeleteUser  = () => { setUsers(prev => prev.filter(u => u.id !== delConfirm.id)); logActivity(user.name, "Deleted group", delConfirm.label); setDelConfirm(null); };
  const confirmClearLogs   = () => { clearLogs(); setDelConfirm(null); };

  // ── RENDER: Students ─────────────────────────────────────────────────────
  const renderStudents = () => {
    const groupStudents = [...(students[activeGroup] || [])]
      .filter(s => !stuSearch.trim() || s.name.toLowerCase().includes(stuSearch.toLowerCase()))
      .sort((a, b) => { const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 }; return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2); });
    return (
      <div className="anim-fadeIn">
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22 }}>Students</div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>{groupStudents.length} in selected group</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => { setStuSearchOpen(o => !o); setStuSearch(""); }} style={{ color: stuSearchOpen ? ACCENT : mutedTx }}><Ic name="search" size={15} /></button>
            <button className="btn btn-primary" onClick={() => setStuModal(true)}><Ic name="plus" size={13} /> Add Student</button>
          </div>
        </div>

        {/* Group toggle */}
        <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4, marginBottom: 16 }}>
          {groups.map(g => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)} style={{
              flex: 1, padding: "8px 6px", border: "none", cursor: "pointer", borderRadius: 7,
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              background: activeGroup === g.id ? (dark ? "rgba(255,255,255,0.09)" : "white") : "transparent",
              color: activeGroup === g.id ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
              boxShadow: activeGroup === g.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s",
            }}>{g.name}</button>
          ))}
        </div>

        {stuSearchOpen && <div style={{ marginBottom: 14 }}><input className="input" type="text" placeholder="Search by name…" value={stuSearch} onChange={e => setStuSearch(e.target.value)} style={{ fontSize: 13 }} autoFocus /></div>}

        {groupStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No students yet</div>
            <div style={{ fontSize: 13 }}>Click "Add Student" to get started</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 140px 40px", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
              {["Chest", "Name", "Category", "Role", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: mutedTx }}>{h}</div>
              ))}
            </div>
            {groupStudents.map((s, i) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 140px 40px", alignItems: "center", padding: "12px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent", transition: "background 0.12s" }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: ACCENT, fontSize: 14 }}>{s.chestNo}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                <span style={{ fontSize: 12, color: mutedTx }}>{s.category === "Sub-Junior" ? "Sub-Junior" : s.category}</span>
                <select value={s.groupRole || "Member"} onChange={e => updateStudentRole(activeGroup, s.id, e.target.value)}
                  style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 6, color: dark ? "#e8e8f5" : "#12121e", fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none", padding: "4px 8px" }}>
                  <option>Member</option><option>Leader</option><option>Asst. Leader</option>
                </select>
                <button onClick={() => deleteStudent(activeGroup, s.id, s.name)} style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 4, display: "flex", alignItems: "center" }}>
                  <Ic name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── RENDER: Programs ─────────────────────────────────────────────────────
  const renderPrograms = () => {
    const filtered = programs.filter(p => {
      const pType = p.type || p.session || "Stage";
      if (pType !== progType) return false;
      if (catFilter !== "All" && p.category !== catFilter) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return (
      <div className="anim-fadeIn">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22 }}>Programs</div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>{filtered.length} {progType} programs</div>
          </div>
          <button className="btn btn-primary" onClick={openAddProg}><Ic name="plus" size={13} /> Add Program</button>
        </div>

        {/* Program Type + Category + Search in one toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 3 }}>
            {["Stage", "Off-Stage"].map(t => (
              <button key={t} onClick={() => { setProgType(t); setCatFilter("All"); setSearch(""); }} style={{
                padding: "7px 14px", border: "none", cursor: "pointer", borderRadius: 7,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: progType === t ? (dark ? "rgba(255,255,255,0.09)" : "white") : "transparent",
                color: progType === t ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                boxShadow: progType === t ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            {["All", ...CATS].map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} className="btn btn-sm"
                style={{ fontWeight: 700, background: catFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: catFilter === cat ? "#0a0b12" : mutedTx }}>
                {cat === "Sub-Junior" ? "Sub" : cat}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch(""); }} className="btn btn-ghost btn-icon" style={{ color: showSearch ? ACCENT : mutedTx }}><Ic name="search" size={15} /></button>
        </div>

        {showSearch && <div style={{ marginBottom: 14 }}><input ref={searchRef} type="text" className="input" placeholder="Search programs…" value={search} onChange={e => setSearch(e.target.value)} /></div>}

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No {progType} programs</div>
            <div style={{ fontSize: 13 }}>Click "Add Program" to create one</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto auto", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
              {["#", "Program", "Details", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: mutedTx }}>{h}</div>
              ))}
            </div>
            {filtered.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto auto", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent" }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>#{p.order || (i + 1)}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <Tag label={p.category} dark={dark} /><Tag label={p.type || p.session} dark={dark} /><Tag label={`Max ${p.maxParticipants}`} dark={dark} />
                    {p.criteria?.filter(Boolean).map(c => <Tag key={c} label={c} dark={dark} />)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditProg(p)}><Ic name="edit" size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteProg(p.id, p.name)}><Ic name="trash" size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── RENDER: Groups ───────────────────────────────────────────────────────
  const renderGroups = () => (
    <div className="anim-fadeIn">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22 }}>Groups</div>
          <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>Access & registration locks</div>
        </div>
        <button className="btn btn-primary" onClick={() => setUserModal(true)}><Ic name="plus" size={13} /> Add Group</button>
      </div>
      {users.filter(u => u.role !== "admin").length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No groups yet</div>
          <div style={{ fontSize: 13 }}>Add a group to get started</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {users.filter(u => u.role !== "admin").map((u) => (
            <div key={u.id} style={{ borderRadius: 14, border: `1px solid ${border}`, background: cardBg, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: mutedTx, marginTop: 2 }}>{(students[u.id] || []).length} members</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditUser(u)}><Ic name="edit" size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteUser(u.id, u.name)} disabled={u.id === user.id}><Ic name="trash" size={13} /></button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Stage", "Off-Stage"].map(t => {
                  const locked = locks[u.id]?.[t];
                  return (
                    <button key={t} onClick={() => toggleLock(u.id, t)} style={{
                      flex: 1, padding: "7px 0", borderRadius: 8,
                      border: `1px solid ${locked ? "rgba(225,29,72,0.2)" : "rgba(16,185,129,0.2)"}`,
                      background: locked ? "rgba(225,29,72,0.07)" : "rgba(16,185,129,0.07)",
                      color: locked ? "#e11d48" : "#10b981",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {locked ? "🔒" : "🔓"} {t}
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

  // ── RENDER: Registrations ────────────────────────────────────────────────
  const renderRegistrations = () => {
    const groupList = groups.map(g => ({ ...g, regs: registrations.filter(r => r.groupId === g.id) }));
    const activeGroupId = regGroupFilter === "all" ? groupList[0]?.id : regGroupFilter;
    const activeGroupData = groupList.find(g => g.id === activeGroupId);
    const filteredRegs = (activeGroupData?.regs || []).filter(r => {
      if (regCatFilter === "All") return true;
      const p = programs.find(pg => pg.id === r.programId);
      return p?.category === regCatFilter;
    });
    return (
      <div className="anim-fadeIn">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22 }}>Entries</div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>{activeGroupData?.regs.length || 0} registrations</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 3 }}>
            {groupList.map(g => (
              <button key={g.id} onClick={() => setRegGroupFilter(g.id)} style={{
                padding: "7px 14px", border: "none", cursor: "pointer", borderRadius: 7,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: activeGroupId === g.id ? (dark ? "rgba(255,255,255,0.09)" : "white") : "transparent",
                color: activeGroupId === g.id ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                boxShadow: activeGroupId === g.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>{g.name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["All", ...CATS].map(cat => (
              <button key={cat} onClick={() => setRegCatFilter(cat)} className="btn btn-sm"
                style={{ fontWeight: 700, background: regCatFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: regCatFilter === cat ? "#0a0b12" : mutedTx }}>
                {cat === "Sub-Junior" ? "Sub" : cat}
              </button>
            ))}
          </div>
        </div>
        {filteredRegs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No registrations</div>
            <div style={{ fontSize: 13 }}>{activeGroupData?.name} has no entries{regCatFilter !== "All" ? ` in ${regCatFilter}` : ""}</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 1fr", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
              {["#", "Program", "Session", "Participants"].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: mutedTx }}>{h}</div>
              ))}
            </div>
            {filteredRegs.map((r, i) => {
              const p = programs.find(pg => pg.id === r.programId);
              const parts = (r.participantIds || []).map(id => (students[activeGroupId] || []).find(s => s.id === id)).filter(Boolean);
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 1fr", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent" }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>{p?.order ? `#${p.order}` : ""}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p?.name}</span>
                  <Tag label={p?.session} dark={dark} />
                  <span style={{ fontSize: 12, color: mutedTx }}>{parts.map(s => `${s.chestNo} ${s.name}`).join(" · ") || "—"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderViews = { students: renderStudents, programs: renderPrograms, users: renderGroups, registrations: renderRegistrations };

  const unreadCount = (messages || []).filter(m => m.to === "admin" && !m.read).length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 58, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", borderBottom: `1px solid ${border}`,
        background: dark ? "rgba(7,8,15,0.95)" : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(145deg,#f14d4d,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 13, color: "#ffffff" }}>FF</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: dark ? "#e8e8f5" : "#12121e" }}>FestFlow</div>
          <div style={{ width: 1, height: 20, background: border, marginLeft: 4 }} />
          <div style={{ fontSize: 13, color: mutedTx, fontWeight: 500 }}>Admin Portal</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setShowMessages(true)} style={{
            position: "relative", width: 34, height: 34, borderRadius: 9, border: `1px solid ${border}`,
            background: "transparent", color: mutedTx, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = "rgba(241,77,77,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = mutedTx; e.currentTarget.style.borderColor = border; }}
          >
            <Ic name="message" size={15} />
            {unreadCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: ACCENT, color: "#ffffff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadCount}</span>}
          </button>
          <SettingsBtn dark={dark} setDark={setDark} userPin={user.pin} onLogout={onBack} />
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 220, flexShrink: 0, borderRight: `1px solid ${border}`,
          background: sideBg, display: "flex", flexDirection: "column",
          padding: "20px 12px", gap: 2, position: "sticky", top: 58, height: "calc(100vh - 58px)", overflowY: "auto",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: mutedTx, padding: "0 8px 10px" }}>Navigation</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: view === n.id ? (dark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)") : "transparent",
              color: view === n.id ? ACCENT : (dark ? "#9ca3af" : "#6b7280"),
              fontWeight: view === n.id ? 700 : 500, fontSize: 14,
              transition: "all 0.15s", width: "100%", textAlign: "left",
            }}
              onMouseEnter={e => { if (view !== n.id) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"; }}
              onMouseLeave={e => { if (view !== n.id) e.currentTarget.style.background = "transparent"; }}
            >
              <Ic name={n.icon} size={16} />
              {n.label}
            </button>
          ))}

          {/* Sidebar footer — sign out */}
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${border}` }}>
            <button onClick={onBack} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: "transparent", color: mutedTx, fontWeight: 500, fontSize: 14,
              width: "100%", textAlign: "left", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#e11d48"; e.currentTarget.style.background = "rgba(225,29,72,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = mutedTx; e.currentTarget.style.background = "transparent"; }}
            >
              <Ic name="logout" size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px 60px" }}>
          {view === "print" ? <PrintSection dark={dark} /> : renderViews[view]?.()}
        </div>
      </div>

      {showMessages && <MessagesPanel user={user} dark={dark} onClose={() => setShowMessages(false)} />}

      {/* ── Modals ── */}
      {stuModal && (
        <Modal title="Add Student" onClose={() => setStuModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="label">Group</label><select className="input select" value={activeGroup} onChange={e => setActiveGroup(e.target.value)}>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
            <div><label className="label">Name</label><input type="text" className="input" placeholder="Full name" value={stuForm.name} onChange={e => setStuForm({ ...stuForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">Category</label><select className="input select" value={stuForm.category} onChange={e => setStuForm({ ...stuForm, category: e.target.value })}>{STUDENT_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
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
              <div><label className="label">Name</label><input type="text" className="input" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} placeholder="Program name" autoFocus /></div>
              <div><label className="label">Type</label><select className="input select" value={progForm.type || progForm.session || "Stage"} onChange={e => setProgForm({ ...progForm, type: e.target.value, session: e.target.value })}><option value="Stage">Stage</option><option value="Off-Stage">Off-Stage</option></select></div>
            </div>
            <div className="form-row">
              <div><label className="label">Category</label><select className="input select" value={progForm.category} onChange={e => setProgForm({ ...progForm, category: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="label">Max Participants</label><input type="number" className="input" min={1} value={progForm.maxParticipants} onChange={e => setProgForm({ ...progForm, maxParticipants: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <div><label className="label">Criteria</label><div className="grid-2"><input type="text" className="input" placeholder="Criteria 1" value={progForm.criteria[0]} onChange={e => setProgForm({ ...progForm, criteria: [e.target.value, progForm.criteria[1]] })} /><input type="text" className="input" placeholder="Criteria 2" value={progForm.criteria[1]} onChange={e => setProgForm({ ...progForm, criteria: [progForm.criteria[0], e.target.value] })} /></div></div>
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
            <div><label className="label">Group Name</label><input type="text" className="input" placeholder="e.g. Team Alpha" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">PIN / Password</label><input type="text" className="input" placeholder="e.g. 1234" value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value })} autoComplete="new-password" /></div>
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
            <div><label className="label">Group Name</label><input type="text" className="input" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">PIN / Password</label><input type="text" className="input" value={editUserForm.pin} onChange={e => setEditUserForm({ ...editUserForm, pin: e.target.value })} autoComplete="new-password" /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => { setEditUserModal(false); setEditingUser(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 44 }} onClick={saveEditUser} disabled={!editUserForm.name.trim() || !editUserForm.pin.trim()}>Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {delConfirm && (
        <div className="modal-bg" onClick={() => setDelConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            {delConfirm.type === "blocked" ? (
              <><div style={{ fontSize: 13, color: mutedTx, marginBottom: 20, lineHeight: 1.6 }}>{delConfirm.label}</div><button className="btn btn-primary" style={{ width: "100%", height: 44 }} onClick={() => setDelConfirm(null)}>Got it</button></>
            ) : (
              <><div className="ff-display fw-800" style={{ fontSize: 18, marginBottom: 8 }}>Delete?</div>
              <div style={{ fontSize: 13, color: mutedTx, marginBottom: 24, lineHeight: 1.6 }}>"{delConfirm.label}" will be permanently removed.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setDelConfirm(null)}>Cancel</button>
                <button className="btn" style={{ flex: 1, height: 44, background: "#e11d48", color: "white", fontWeight: 700 }}
                  onClick={delConfirm.type === "student" ? confirmDeleteStudent : delConfirm.type === "program" ? confirmDeleteProg : delConfirm.type === "logs" ? confirmClearLogs : confirmDeleteUser}>
                  Delete
                </button>
              </div></>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
