import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import PrintSection from "./PrintSection";
import MessagesPanel from "./MessagesPanel";
import ImportStudentsModal from "./ImportStudentsModal";
import ImportProgramsModal from "./ImportProgramsModal";
import PublishResultsModal from "./PublishResultsModal";
import { CATS, STUDENT_CATS, ACCENT, catColor, ACCENT4 } from "../../styles/DesignTokens";
import { getHashRoute, useHashSync, useModalBackHandler } from "../../utils/useRouting";

const VALID_VIEWS = ["dashboard", "students", "events", "programs", "users", "registrations", "results", "print"];

const NAV = [
  { id: "dashboard",     icon: "dashboard", label: "Dashboard" },
  { id: "students",      icon: "users",   label: "Students"  },
  { id: "events",        icon: "book",    label: "Events"    },
  { id: "users",         icon: "shield",  label: "Groups"    },
  { id: "registrations", icon: "list",    label: "Entries"   },
  { id: "results",       icon: "award",   label: "Results"   },
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
  const { groups, programs, setPrograms, addProgram, updateProgram, deleteProgram, students, setStudents, updateStudent, registrations, setRegistrations, addRegistration, removeRegistration, users, setUsers, addUser, updateUser, deleteUser, activityLogs, logActivity, clearLogs, messages, locks, toggleLock, isLocked, nextChestNo, programLimits, updateProgramLimits, getStudentQuotaUsage } = useApp();

  const [view, setViewState]         = useState(() => getHashRoute("admin", "students", VALID_VIEWS, { programs: "events" }));
  const setView                       = useHashSync("admin", view, setViewState, VALID_VIEWS, { programs: "events" });

  const [activeGroup, setActiveGroup] = useState(groups[0]?.id);
  const [progType, setProgType]       = useState("Stage");
  const [catFilter, setCatFilter]     = useState("All");
  const [search, setSearch]           = useState("");
  const [showSearch, setShowSearch]   = useState(false);
  const searchRef                     = useRef(null);
  const [stuSearch, setStuSearch]     = useState("");
  const [stuSearchOpen, setStuSearchOpen] = useState(false);
  const [stuCatFilter, setStuCatFilter]   = useState("All");
  const [progModal, setProgModal]     = useState(false);
  const [editProg, setEditProg]       = useState(null);
  const [progForm, setProgForm]       = useState({ name: "", type: "Stage", category: "General", maxParticipants: 1 });
  const [stuModal, setStuModal]       = useState(false);
  const [stuForm, setStuForm]         = useState({ name: "", category: "Senior" });
  const [userModal, setUserModal]         = useState(false);
  const [userForm, setUserForm]           = useState({ name: "", pin: "" });
  const [editUserModal, setEditUserModal] = useState(false);
  const [editingUser, setEditingUser]     = useState(null);
  const [editUserForm, setEditUserForm]   = useState({ name: "", pin: "" });
  const [delConfirm, setDelConfirm]         = useState(null);
  const [regGroupFilter, setRegGroupFilter] = useState("all");
  const [regCatFilter, setRegCatFilter]     = useState("All");
  const [regSearch, setRegSearch]           = useState("");
  const [regSearchOpen, setRegSearchOpen]   = useState(false);
  const [showMessages, setShowMessages]         = useState(false);
  const [importModal, setImportModal]             = useState(false);
  const [progImportModal, setProgImportModal]     = useState(false);
  const [selectedEntryInfo, setSelectedEntryInfo] = useState(null);
  const [resCatFilter, setResCatFilter]         = useState("Sub-Junior");
  const [resStatusFilter, setResStatusFilter]   = useState("all");
  const [resSearch, setResSearch]               = useState("");
  const [resSearchOpen, setResSearchOpen]       = useState(true);
  const [activeResultProg, setActiveResultProg] = useState(null);

  const isAnyModalOpen = progModal || stuModal || userModal || editUserModal || !!delConfirm || showMessages || importModal || progImportModal || !!selectedEntryInfo || !!activeResultProg;
  const closeAllModals = useCallback(() => {
    setProgModal(false);
    setEditProg(null);
    setStuModal(false);
    setUserModal(false);
    setEditUserModal(false);
    setEditingUser(null);
    setDelConfirm(null);
    setShowMessages(false);
    setImportModal(false);
    setProgImportModal(false);
    setSelectedEntryInfo(null);
    setActiveResultProg(null);
  }, []);

  useModalBackHandler(isAnyModalOpen, closeAllModals);

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.id === activeGroup)) setActiveGroup(groups[0].id);
    if (groups.length > 0 && regGroupFilter !== "all" && !groups.some(g => g.id === regGroupFilter)) {
      setRegGroupFilter("all");
    }
  }, [groups, activeGroup, regGroupFilter]);

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
    setStuModal(false); setStuForm({ name: "", category: stuCatFilter !== "All" ? stuCatFilter : "Senior" });
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
    updateStudent(gId, sId, { groupRole: role });
  };
  const handleImportStudents = (groupedStudents, mode, totalCount) => {
    setStudents(prev => {
      const next = { ...prev };
      for (const [gId, newStus] of Object.entries(groupedStudents)) {
        if (mode === "replace") {
          next[gId] = newStus;
        } else {
          next[gId] = [...(next[gId] || []), ...newStus];
        }
      }
      return next;
    });
    const groupCount = Object.keys(groupedStudents).length;
    logActivity(user.name, "Imported students from Excel", `${totalCount} student(s) imported across ${groupCount} group(s) (${mode} mode)`);
    setImportModal(false);
  };

  // ── Program ops ─────────────────────────────────────────────────────────
  const openAddProg  = () => { setEditProg(null); setProgForm({ name: "", type: progType, category: catFilter === "All" ? "General" : catFilter, maxParticipants: 1 }); setProgModal(true); };
  const openEditProg = (p) => { setEditProg(p.id); setProgForm({ ...p, type: p.type || p.session || "Stage" }); setProgModal(true); };
  const saveProg = () => {
    if (!progForm.name.trim()) return;
    const pData = { ...progForm, type: progForm.type || "Stage", session: progForm.type || "Stage" };
    if (editProg) {
      updateProgram(editProg, pData);
      logActivity(user.name, "Updated event", progForm.name);
    } else {
      const newProg = { id: "p-" + Math.random().toString(36).substr(2, 5), order: programs.length + 1, ...pData };
      addProgram(newProg);
      logActivity(user.name, "Added event", `${progForm.name} (${progForm.type})`);
    }
    setProgModal(false);
  };
  const deleteProg = (id, name) => {
    if (registrations.some(r => r.programId === id)) { setDelConfirm({ type: "blocked", label: "This event has active registrations and cannot be deleted." }); return; }
    setDelConfirm({ type: "program", id, label: name });
  };
  const confirmDeleteProg = () => { deleteProgram(delConfirm.id); logActivity(user.name, "Deleted event", delConfirm.label); setDelConfirm(null); };
  const handleImportPrograms = (newPrograms, mode, mappedCategories, totalCount) => {
    setPrograms(prev => {
      if (mode === "replace") {
        const catSet = new Set(mappedCategories);
        const kept = prev.filter(p => !catSet.has(p.category));
        return [...kept, ...newPrograms];
      } else {
        return [...prev, ...newPrograms];
      }
    });
    logActivity(user.name, "Imported events from Excel", `${totalCount} event(s) imported across ${mappedCategories.length} category(s) (${mode} mode)`);
    setProgImportModal(false);
  };

  // ── Group ops ────────────────────────────────────────────────────────────
  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.pin.trim()) return;
    const id = "u-" + Math.random().toString(36).substr(2, 5);
    addUser({ id, name: userForm.name.trim(), pin: userForm.pin.trim(), role: "group", groupId: id });
    logActivity(user.name, "Added group", userForm.name);
    setUserModal(false); setUserForm({ name: "", pin: "" });
  };
  const openEditUser  = (u) => { setEditingUser(u); setEditUserForm({ name: u.name, pin: u.pin }); setEditUserModal(true); };
  const saveEditUser  = () => {
    if (!editUserForm.name.trim() || !editUserForm.pin.trim()) return;
    updateUser(editingUser.id, { name: editUserForm.name.trim(), pin: editUserForm.pin.trim() });
    logActivity(user.name, "Edited group", editUserForm.name);
    setEditUserModal(false); setEditingUser(null);
  };
  const deleteUserConfirm = (id, name) => {
    if (id === user.id) { setDelConfirm({ type: "blocked", label: "You cannot delete your own account." }); return; }
    setDelConfirm({ type: "user", id, label: name });
  };
  const confirmDeleteUser  = () => { deleteUser(delConfirm.id); logActivity(user.name, "Deleted group", delConfirm.label); setDelConfirm(null); };
  const confirmClearLogs   = () => { clearLogs(); setDelConfirm(null); };

  useEffect(() => {
    if (!delConfirm) return;
    const handleKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (delConfirm.type === "blocked") {
          setDelConfirm(null);
        } else if (delConfirm.type === "student") {
          confirmDeleteStudent();
        } else if (delConfirm.type === "program") {
          confirmDeleteProg();
        } else if (delConfirm.type === "logs") {
          confirmClearLogs();
        } else {
          confirmDeleteUser();
        }
      } else if (e.key === "Escape") {
        setDelConfirm(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [delConfirm]);

  // ── RENDER: Dashboard ─────────────────────────────────────────────────────
  const renderDashboard = () => {
    const totalTeams = groups.length;
    const allStudents = Object.values(students || {}).flat();
    const totalStudents = allStudents.length;
    const totalEntries = registrations.length;

    // Team-by-team computed data
    const teamStats = groups.map(group => {
      const gStudents = students[group.id] || [];
      const gRegs = registrations.filter(r => r.groupId === group.id).length;
      const gDue = Math.max(0, programs.length - gRegs);

      return {
        ...group,
        total: gStudents.length,
        regs: gRegs,
        due: gDue,
      };
    });

    const totalDue = teamStats.reduce((sum, t) => sum + t.due, 0);
    const primaryHeadingColor = dark ? "#f8fafc" : "#0f172a";

    return (
      <div className="anim-fadeIn">
        {/* Top Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.5px",
            color: primaryHeadingColor
          }}>
            Dashboard
          </div>
        </div>

        {/* Top Summary KPI Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32
        }}>
          {/* Card 1: Total Teams */}
          <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: mutedTx }}>
                Teams
              </span>
              <span style={{
                width: 32, height: 32, borderRadius: 9,
                background: dark ? "rgba(241, 77, 77, 0.12)" : "rgba(241, 77, 77, 0.08)",
                color: "#f14d4d", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Ic name="shield" size={16} />
              </span>
            </div>
            <div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 900,
                fontSize: 32,
                lineHeight: 1,
                color: primaryHeadingColor
              }}>
                {totalTeams}
              </div>
              <div style={{ fontSize: 12, color: mutedTx, marginTop: 6 }}>
                Active teams
              </div>
            </div>
          </div>

          {/* Card 2: Total Students */}
          <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: mutedTx }}>
                Students
              </span>
              <span style={{
                width: 32, height: 32, borderRadius: 9,
                background: dark ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.08)",
                color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Ic name="users" size={16} />
              </span>
            </div>
            <div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 900,
                fontSize: 32,
                lineHeight: 1,
                color: primaryHeadingColor
              }}>
                {totalStudents}
              </div>
              <div style={{ fontSize: 12, color: mutedTx, marginTop: 6 }}>
                Enrolled students
              </div>
            </div>
          </div>

          {/* Card 3: Program Entries */}
          <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: mutedTx }}>
                Program Entries
              </span>
              <span style={{
                width: 32, height: 32, borderRadius: 9,
                background: dark ? "rgba(29, 209, 131, 0.12)" : "rgba(29, 209, 131, 0.08)",
                color: "#1dd183", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Ic name="list" size={16} />
              </span>
            </div>
            <div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 900,
                fontSize: 32,
                lineHeight: 1,
                color: primaryHeadingColor
              }}>
                {totalEntries}
              </div>
              <div style={{ fontSize: 12, color: mutedTx, marginTop: 6 }}>
                Submitted entries
              </div>
            </div>
          </div>

          {/* Card 4: Due Entries */}
          <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: mutedTx }}>
                Due Entries
              </span>
              <span style={{
                width: 32, height: 32, borderRadius: 9,
                background: dark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)",
                color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Ic name="info" size={16} />
              </span>
            </div>
            <div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 900,
                fontSize: 32,
                lineHeight: 1,
                color: totalDue > 0 ? (dark ? "#fbbf24" : "#d97706") : "#1dd183"
              }}>
                {totalDue}
              </div>
              <div style={{ fontSize: 12, color: mutedTx, marginTop: 6 }}>
                Pending event entries
              </div>
            </div>
          </div>
        </div>

        {/* Section Header: Team Details */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "-0.3px",
            color: primaryHeadingColor
          }}>
            Team Details
          </div>
        </div>

        {/* Team-by-team Responsive Card Grid */}
        {teamStats.length === 0 ? (
          <div className="card" style={{ padding: "48px 20px", textAlign: "center", color: mutedTx }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: primaryHeadingColor }}>No teams found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add a group from the Groups tab to view team statistics.</div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16
          }}>
            {teamStats.map((team, idx) => {
              const teamColor = team.color || ACCENT;

              return (
                <div
                  key={team.id || idx}
                  className="card"
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {/* Team Header: Avatar & Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: teamColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 900,
                      fontSize: 15,
                      color: "#ffffff",
                      flexShrink: 0
                    }}>
                      {team.name ? team.name.charAt(0).toUpperCase() : "T"}
                    </div>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 800,
                      fontSize: 16,
                      color: primaryHeadingColor,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {team.name}
                    </div>
                  </div>

                  {/* Metric Counters (Students & Program Entries) */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10
                  }}>
                    <div style={{
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: mutedTx }}>
                        Students
                      </div>
                      <div style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        fontWeight: 900,
                        fontSize: 24,
                        color: primaryHeadingColor,
                        marginTop: 4
                      }}>
                        {team.total}
                      </div>
                    </div>

                    <div style={{
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: mutedTx }}>
                        Program Entries
                      </div>
                      <div style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        fontWeight: 900,
                        fontSize: 24,
                        color: primaryHeadingColor,
                        marginTop: 4
                      }}>
                        {team.regs}
                      </div>
                    </div>
                  </div>

                  {/* Due Entries Area */}
                  <div style={{
                    background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: mutedTx }}>
                        Due Entries
                      </div>
                      <div style={{ fontSize: 12, color: mutedTx, marginTop: 2 }}>
                        {team.due === 0 ? "All programs registered" : `${team.due} pending of ${programs.length}`}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 900,
                      fontSize: 24,
                      color: team.due > 0 ? (dark ? "#fbbf24" : "#d97706") : "#1dd183"
                    }}>
                      {team.due}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  // ── RENDER: Students ─────────────────────────────────────────────────────
  const renderStudents = () => {
    const rawStudents = [...(students[activeGroup] || [])];
    const currentGroup = groups.find(g => g.id === activeGroup) || groups[0];
    const currentGroupName = currentGroup?.name || "Team Roster";

    const groupStudents = rawStudents
      .filter(s => stuCatFilter === "All" || s.category === stuCatFilter)
      .filter(s => {
        if (!stuSearch.trim()) return true;
        const q = stuSearch.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || (s.chestNo && s.chestNo.toLowerCase().includes(q));
      })
      .sort((a, b) => { const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 }; return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2); });

    return (
      <div className="anim-fadeIn">
        {/* Top bar: Team Name Heading on Left, Action Buttons on Right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: dark ? "#e8e8f5" : "#0f172a" }}>
              {currentGroupName}
            </div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 3 }}>
              {stuCatFilter === "All"
                ? `${rawStudents.length} students enrolled`
                : `${groupStudents.length} of ${rawStudents.length} students (${stuCatFilter})`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost btn-icon" onClick={() => { setStuSearchOpen(o => !o); setStuSearch(""); }} style={{ color: stuSearchOpen ? ACCENT : mutedTx }} title="Search students">
              <Ic name="search" size={15} />
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setImportModal(true)}
              style={{
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                fontSize: 13,
                height: 38,
                padding: "0 14px",
                color: dark ? "#e8e8f5" : "#12121e",
              }}
            >
              <Ic name="upload" size={14} /> Import Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStuForm({ name: "", category: stuCatFilter !== "All" ? stuCatFilter : "Senior" });
                setStuModal(true);
              }}
            >
              <Ic name="plus" size={13} /> Add Student
            </button>
          </div>
        </div>

        {/* Toolbar: Category filter pills on left, Team Dropdown aligned on the right under the buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {["All", ...STUDENT_CATS].map(cat => {
              const active = stuCatFilter === cat;
              const count = cat === "All"
                ? rawStudents.length
                : rawStudents.filter(s => s.category === cat).length;
              const pillColor = cat === "All" ? ACCENT : (catColor[cat] || ACCENT);
              return (
                <button
                  key={cat}
                  onClick={() => setStuCatFilter(cat)}
                  className="btn btn-sm"
                  style={{
                    fontWeight: 700,
                    fontSize: 12.5,
                    padding: "6px 13px",
                    borderRadius: 9,
                    background: active
                      ? (dark ? `${pillColor}24` : `${pillColor}15`)
                      : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                    color: active ? pillColor : mutedTx,
                    border: `1px solid ${active ? pillColor : border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cat}</span>
                  <span style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : mutedTx,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {stuCatFilter !== "All" && (
              <button
                onClick={() => setStuCatFilter("All")}
                style={{
                  background: "none", border: "none", color: mutedTx, fontSize: 12,
                  cursor: "pointer", textDecoration: "underline", padding: "4px 8px", fontFamily: "inherit"
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Team Dropdown Selector (right-aligned under Add Student & Import buttons) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Team:
            </span>
            <div style={{ position: "relative", minWidth: 190 }}>
              <select
                value={activeGroup}
                onChange={e => setActiveGroup(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 34px 0 12px",
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  color: dark ? "#e8e8f5" : "#12121e",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = border}
              >
                {groups.map(g => (
                  <option
                    key={g.id}
                    value={g.id}
                    style={{
                      background: dark ? "#171923" : "#ffffff",
                      color: dark ? "#e8e8f5" : "#12121e",
                      padding: "8px"
                    }}
                  >
                    {g.name}
                  </option>
                ))}
              </select>
              <div style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: mutedTx,
                display: "flex",
                alignItems: "center"
              }}>
                <Ic name="chevronDown" size={13} />
              </div>
            </div>
          </div>
        </div>

        {stuSearchOpen && (
          <div style={{ marginBottom: 14 }}>
            <input
              className="input"
              type="text"
              placeholder="Search by name or chest no…"
              value={stuSearch}
              onChange={e => setStuSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setStuSearch("");
                  setStuSearchOpen(false);
                }
              }}
              style={{ fontSize: 13 }}
              autoFocus
            />
          </div>
        )}

        {groupStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {rawStudents.length === 0 ? "No students yet" : `No ${stuCatFilter} students found`}
            </div>
            <div style={{ fontSize: 13 }}>
              {rawStudents.length === 0
                ? 'Click "Add Student" to get started'
                : (stuSearch.trim() ? `No matching students for "${stuSearch}" in ${stuCatFilter}` : `There are no ${stuCatFilter} students in this group.`)}
            </div>
            {stuCatFilter !== "All" && rawStudents.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 14, border: `1px solid ${border}` }}
                onClick={() => setStuCatFilter("All")}
              >
                Show all categories ({rawStudents.length})
              </button>
            )}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                  {(() => {
                    const q = getStudentQuotaUsage ? getStudentQuotaUsage(s.id) : null;
                    if (!q) return null;
                    const isExceeded = q.stage > (programLimits?.maxStage || 3) || q.offStage > (programLimits?.maxOffStage || 3);
                    if (!isExceeded) return null;
                    return (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#f59e0b",
                        background: dark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        padding: "1px 6px",
                        borderRadius: 6,
                        letterSpacing: 0.3,
                      }}>
                        ⚠️ OVER LIMIT (Stage: {q.stage}/{programLimits?.maxStage || 3}, Off: {q.offStage}/{programLimits?.maxOffStage || 3})
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: `${catColor[s.category] || "#f14d4d"}15`,
                    color: catColor[s.category] || mutedTx,
                    border: `1px solid ${catColor[s.category] || "#f14d4d"}30`,
                    width: "fit-content",
                  }}>
                    {s.category}
                  </span>
                </div>
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

  // ── RENDER: Events ───────────────────────────────────────────────────────
  const renderEvents = () => {
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
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22 }}>Events</div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>{filtered.length} {progType} events</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setProgImportModal(true)}
              style={{
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                fontSize: 13,
                height: 38,
                padding: "0 14px",
                color: dark ? "#e8e8f5" : "#12121e",
              }}
            >
              <Ic name="upload" size={14} /> Import Events
            </button>
            <button className="btn btn-primary" onClick={openAddProg}><Ic name="plus" size={13} /> Add Event</button>
          </div>
        </div>

        {/* Minimal Participation Limits widget */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 14px",
          borderRadius: 12,
          background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${border}`,
          marginBottom: 16,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span style={{ fontSize: 13 }}>⚙️</span>
            <span>Student Limits (Solo):</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Stage:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: 26, height: 26, padding: 0, borderRadius: 6, minWidth: 26 }}
                onClick={() => updateProgramLimits({ maxStage: Math.max(1, (programLimits?.maxStage || 3) - 1), maxOffStage: programLimits?.maxOffStage || 3 })}
              >-</button>
              <span style={{ fontWeight: 800, fontSize: 13, minWidth: 18, textAlign: "center", color: ACCENT }}>
                {programLimits?.maxStage || 3}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: 26, height: 26, padding: 0, borderRadius: 6, minWidth: 26 }}
                onClick={() => updateProgramLimits({ maxStage: (programLimits?.maxStage || 3) + 1, maxOffStage: programLimits?.maxOffStage || 3 })}
              >+</button>
            </div>
          </div>

          <div style={{ width: 1, height: 16, background: border }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Off-Stage:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: 26, height: 26, padding: 0, borderRadius: 6, minWidth: 26 }}
                onClick={() => updateProgramLimits({ maxStage: programLimits?.maxStage || 3, maxOffStage: Math.max(1, (programLimits?.maxOffStage || 3) - 1) })}
              >-</button>
              <span style={{ fontWeight: 800, fontSize: 13, minWidth: 18, textAlign: "center", color: "#3b82f6" }}>
                {programLimits?.maxOffStage || 3}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: 26, height: 26, padding: 0, borderRadius: 6, minWidth: 26 }}
                onClick={() => updateProgramLimits({ maxStage: programLimits?.maxStage || 3, maxOffStage: (programLimits?.maxOffStage || 3) + 1 })}
              >+</button>
            </div>
          </div>

          <span style={{ fontSize: 11, color: mutedTx, marginLeft: "auto" }}>
            Max solo events per student · Auto-saved
          </span>
        </div>

        {/* Event Type + Category + Search in one toolbar */}
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

        {showSearch && (
          <div style={{ marginBottom: 14 }}>
            <input
              ref={searchRef}
              type="text"
              className="input"
              placeholder="Search events…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setSearch("");
                  setShowSearch(false);
                }
              }}
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No {progType} events</div>
            <div style={{ fontSize: 13 }}>Click "Add Event" to create one</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto auto", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
              {["#", "Event", "Details", ""].map((h, i) => (
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
                  const locked = isLocked(u.id, t);
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
    const isAllTeams = regGroupFilter === "all";
    const activeGroupId = !isAllTeams && groups.some(g => g.id === regGroupFilter)
      ? regGroupFilter
      : (isAllTeams ? "all" : (groups[0]?.id || ""));
    const currentGroup = isAllTeams ? null : (groups.find(g => g.id === activeGroupId) || groups[0]);
    const currentGroupName = isAllTeams ? "All Teams" : (currentGroup?.name || "Team Entries");

    // Single team calculations
    const rawRegs = isAllTeams ? [] : registrations.filter(r => r.groupId === activeGroupId);

    const filteredRegs = isAllTeams
      ? []
      : rawRegs
          .filter(r => {
            if (regCatFilter === "All") return true;
            const p = programs.find(pg => pg.id === r.programId);
            return p?.category === regCatFilter;
          })
          .filter(r => {
            if (!regSearch.trim()) return true;
            const q = regSearch.toLowerCase().trim();
            const p = programs.find(pg => pg.id === r.programId);
            const progMatch = p?.name?.toLowerCase().includes(q) || (p?.order && String(p.order).includes(q));
            const parts = (r.participantIds || []).map(id => (students[activeGroupId] || []).find(s => s.id === id)).filter(Boolean);
            const partMatch = parts.some(s => s.name?.toLowerCase().includes(q) || (s.chestNo && String(s.chestNo).toLowerCase().includes(q)));
            return progMatch || partMatch;
          });

    // Cross-group (All Teams) calculations
    const progRegMap = new Map();
    if (isAllTeams) {
      for (const r of registrations) {
        if (!progRegMap.has(r.programId)) {
          progRegMap.set(r.programId, []);
        }
        progRegMap.get(r.programId).push(r);
      }
    }

    const registeredProgramList = isAllTeams
      ? programs
          .filter(p => progRegMap.has(p.id))
          .sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999))
      : [];

    if (isAllTeams) {
      for (const [progId] of progRegMap.entries()) {
        if (!programs.some(p => p.id === progId)) {
          registeredProgramList.push({
            id: progId,
            name: "Unknown Program",
            category: "General",
            session: "Stage",
            order: "",
          });
        }
      }
    }

    const progEntries = isAllTeams
      ? registeredProgramList.map(p => {
          const progRegs = progRegMap.get(p.id) || [];
          const teamEntries = progRegs.map(r => {
            const grp = groups.find(g => g.id === r.groupId) || { id: r.groupId, name: "Team", color: ACCENT };
            const grpStudents = students[r.groupId] || [];
            const parts = (r.participantIds || []).map(id => grpStudents.find(s => s.id === id)).filter(Boolean);
            return {
              registration: r,
              group: grp,
              participants: parts,
            };
          });

          const allParticipants = [];
          for (const te of teamEntries) {
            for (const st of te.participants) {
              allParticipants.push({
                ...st,
                groupId: te.group.id,
                groupName: te.group.name,
                groupColor: te.group.color,
              });
            }
          }

          allParticipants.sort((a, b) => {
            const gComp = (a.groupName || "").localeCompare(b.groupName || "");
            if (gComp !== 0) return gComp;
            return (Number(a.chestNo) || 0) - (Number(b.chestNo) || 0);
          });

          return {
            program: p,
            teamEntries,
            allParticipants,
            progRegs,
          };
        })
      : [];

    const filteredAllEntries = isAllTeams
      ? progEntries
          .filter(entry => {
            if (regCatFilter === "All") return true;
            return entry.program.category === regCatFilter;
          })
          .filter(entry => {
            if (!regSearch.trim()) return true;
            const q = regSearch.toLowerCase().trim();
            const p = entry.program;
            const progMatch = p.name?.toLowerCase().includes(q) || (p.order && String(p.order).includes(q)) || p.category?.toLowerCase().includes(q) || p.session?.toLowerCase().includes(q);
            const teamMatch = entry.teamEntries.some(te => te.group.name?.toLowerCase().includes(q));
            const partMatch = entry.allParticipants.some(s => s.name?.toLowerCase().includes(q) || (s.chestNo && String(s.chestNo).toLowerCase().includes(q)));
            return progMatch || teamMatch || partMatch;
          })
      : [];

    const catRegsCount = isAllTeams
      ? (regCatFilter === "All"
          ? registrations.length
          : registrations.filter(r => {
              const p = programs.find(pg => pg.id === r.programId);
              return p?.category === regCatFilter;
            }).length)
      : 0;

    return (
      <div className="anim-fadeIn">
        {/* Top bar: Team Name Heading on Left, Action Buttons on Right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: dark ? "#e8e8f5" : "#0f172a" }}>
              {currentGroupName}
            </div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 3 }}>
              {isAllTeams ? (
                regCatFilter === "All"
                  ? `${registrations.length} entries registered`
                  : `${catRegsCount} of ${registrations.length} entries (${regCatFilter})`
              ) : (
                regCatFilter === "All"
                  ? `${rawRegs.length} entries registered`
                  : `${filteredRegs.length} of ${rawRegs.length} entries (${regCatFilter})`
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost btn-icon" onClick={() => { setRegSearchOpen(o => !o); setRegSearch(""); }} style={{ color: regSearchOpen ? ACCENT : mutedTx }} title="Search entries">
              <Ic name="search" size={15} />
            </button>
          </div>
        </div>

        {/* Toolbar: Category filter pills on left, Team Dropdown aligned on the right under buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {["All", ...CATS].map(cat => {
              const active = regCatFilter === cat;
              const count = isAllTeams
                ? (cat === "All"
                    ? registrations.length
                    : registrations.filter(r => {
                        const p = programs.find(pg => pg.id === r.programId);
                        return p?.category === cat;
                      }).length)
                : (cat === "All"
                    ? rawRegs.length
                    : rawRegs.filter(r => {
                        const p = programs.find(pg => pg.id === r.programId);
                        return p?.category === cat;
                      }).length);
              const pillColor = cat === "All" ? ACCENT : (catColor[cat] || ACCENT);
              return (
                <button
                  key={cat}
                  onClick={() => setRegCatFilter(cat)}
                  className="btn btn-sm"
                  style={{
                    fontWeight: 700,
                    fontSize: 12.5,
                    padding: "6px 13px",
                    borderRadius: 9,
                    background: active
                      ? (dark ? `${pillColor}24` : `${pillColor}15`)
                      : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                    color: active ? pillColor : mutedTx,
                    border: `1px solid ${active ? pillColor : border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cat}</span>
                  <span style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : mutedTx,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {regCatFilter !== "All" && (
              <button
                onClick={() => setRegCatFilter("All")}
                style={{
                  background: "none", border: "none", color: mutedTx, fontSize: 12,
                  cursor: "pointer", textDecoration: "underline", padding: "4px 8px", fontFamily: "inherit"
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Team Dropdown Selector (right-aligned under buttons) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Team:
            </span>
            <div style={{ position: "relative", minWidth: 190 }}>
              <select
                value={regGroupFilter}
                onChange={e => setRegGroupFilter(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 34px 0 12px",
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  color: dark ? "#e8e8f5" : "#12121e",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = border}
              >
                <option
                  value="all"
                  style={{
                    background: dark ? "#171923" : "#ffffff",
                    color: dark ? "#e8e8f5" : "#12121e",
                    padding: "8px"
                  }}
                >
                  All Teams
                </option>
                {groups.map(g => (
                  <option
                    key={g.id}
                    value={g.id}
                    style={{
                      background: dark ? "#171923" : "#ffffff",
                      color: dark ? "#e8e8f5" : "#12121e",
                      padding: "8px"
                    }}
                  >
                    {g.name}
                  </option>
                ))}
              </select>
              <div style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: mutedTx,
                display: "flex",
                alignItems: "center"
              }}>
                <Ic name="chevronDown" size={13} />
              </div>
            </div>
          </div>
        </div>

        {regSearchOpen && (
          <div style={{ marginBottom: 14 }}>
            <input
              className="input"
              type="text"
              placeholder="Search by event or participant…"
              value={regSearch}
              onChange={e => setRegSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setRegSearch("");
                  setRegSearchOpen(false);
                }
              }}
              style={{ fontSize: 13 }}
              autoFocus
            />
          </div>
        )}

        {isAllTeams ? (
          filteredAllEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No registrations found</div>
              <div style={{ fontSize: 13 }}>
                {regSearch.trim()
                  ? `No entries match "${regSearch}"`
                  : `All Teams have no entries registered${regCatFilter !== "All" ? ` in ${regCatFilter}` : ""}`}
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "48px 1.2fr 100px 1.6fr 40px",
                gap: 12,
                alignItems: "center",
                padding: "10px 16px",
                background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                borderBottom: `1px solid ${border}`
              }}>
                {["#", "Event", "Session", "Registered Teams & Chest Nos.", ""].map((h, i) => (
                  <div key={i} style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: mutedTx,
                    textAlign: i === 4 ? "right" : "left"
                  }}>
                    {h}
                  </div>
                ))}
              </div>
              {filteredAllEntries.map((entry, i) => {
                const p = entry.program;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1.2fr 100px 1.6fr 40px",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 16px",
                      borderTop: i > 0 ? `1px solid ${border}` : "none",
                      background: i % 2 === 0 ? cardBg : "transparent",
                    }}
                  >
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>
                      {p?.order ? `#${p.order}` : ""}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p?.name}</div>
                      {p?.category && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: catColor[p.category] || mutedTx, marginTop: 2 }}>
                          {p.category}
                        </div>
                      )}
                    </div>
                    <div>
                      <Tag label={p?.session} dark={dark} />
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {entry.teamEntries.map(te => (
                          <div
                            key={te.group.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                              padding: "3px 8px",
                              borderRadius: 8,
                              border: `1px solid ${border}`,
                              fontSize: 12,
                            }}
                          >
                            <span style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: te.group.color || ACCENT,
                              display: "inline-block",
                              flexShrink: 0
                            }} />
                            <span style={{ fontWeight: 700, color: dark ? "#e8e8f5" : "#1f2937", marginRight: 2 }}>
                              {te.group.name}:
                            </span>
                            {te.participants.length === 0 ? (
                              <span style={{ color: mutedTx, fontSize: 11 }}>—</span>
                            ) : (
                              te.participants.map(s => (
                                <span
                                  key={s.id}
                                  style={{
                                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                                    fontWeight: 800,
                                    color: ACCENT,
                                    fontSize: 11.5,
                                    background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                                    padding: "1px 5px",
                                    borderRadius: 5,
                                    display: "inline-block",
                                  }}
                                >
                                  {s.chestNo}
                                </span>
                              ))
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setSelectedEntryInfo({
                          isCrossGroup: true,
                          program: p,
                          allParticipants: entry.allParticipants,
                          teamEntries: entry.teamEntries,
                          groupCount: entry.teamEntries.length,
                        })}
                        style={{
                          color: mutedTx,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          width: 30,
                          height: 30,
                          padding: 0,
                        }}
                        title="View all team participants"
                      >
                        <Ic name="info" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredRegs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No registrations</div>
              <div style={{ fontSize: 13 }}>{currentGroupName} has no entries{regCatFilter !== "All" ? ` in ${regCatFilter}` : ""}</div>
            </div>
          ) : (
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 110px 1fr 40px", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
                {["#", "Event", "Session", "Chest No.", ""].map((h, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: mutedTx }}>{h}</div>
                ))}
              </div>
              {filteredRegs.map((r, i) => {
                const p = programs.find(pg => pg.id === r.programId);
                const parts = (r.participantIds || []).map(id => (students[activeGroupId] || []).find(s => s.id === id)).filter(Boolean);
                return (
                  <div key={r.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr 110px 1fr 40px", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent" }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>{p?.order ? `#${p.order}` : ""}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p?.name}</span>
                    <Tag label={p?.session} dark={dark} />
                    <div>
                      {parts.length === 0 ? (
                        <span style={{ fontSize: 12, color: mutedTx }}>—</span>
                      ) : (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                          {parts.map(s => (
                            <span
                              key={s.id}
                              style={{
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                                fontWeight: 800,
                                color: ACCENT,
                                fontSize: 12,
                                background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                                padding: "2px 7px",
                                borderRadius: 6,
                                display: "inline-block",
                              }}
                            >
                              {s.chestNo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setSelectedEntryInfo({ isCrossGroup: false, reg: r, program: p, participants: parts, group: currentGroup })}
                        style={{
                          color: mutedTx,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          width: 30,
                          height: 30,
                          padding: 0,
                        }}
                        title="View participant details"
                      >
                        <Ic name="info" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    );
  };

  // ── Results ops ─────────────────────────────────────────────────────────
  const currentProgramCandidates = useMemo(() => {
    if (!activeResultProg) return [];
    const progRegs = registrations.filter(r => r.programId === activeResultProg.id);
    const list = [];
    const seenIds = new Set();

    // 1. Contestants registered for this exact event
    progRegs.forEach(reg => {
      const grp = groups.find(g => g.id === reg.groupId);
      const grpStudents = students[reg.groupId] || [];
      const parts = (reg.participantIds || []).map(pId => grpStudents.find(s => s.id === pId)).filter(Boolean);

      parts.forEach(st => {
        if (!seenIds.has(String(st.id))) {
          seenIds.add(String(st.id));
          list.push({
            id: String(st.id),
            name: `${st.chestNo ? `#${st.chestNo} ` : ""}${st.name}${grp ? ` (${grp.name})` : ""}`,
            chestNo: st.chestNo,
            rawName: st.name,
          });
        }
      });
    });

    // 2. Fallback contestants in this category
    const allInCat = Object.values(students).flat().filter(s => s.category === activeResultProg.category);
    allInCat.forEach(st => {
      if (!seenIds.has(String(st.id))) {
        seenIds.add(String(st.id));
        const grp = groups.find(g => g.id === st.groupId);
        list.push({
          id: String(st.id),
          name: `${st.chestNo ? `#${st.chestNo} ` : ""}${st.name}${grp ? ` (${grp.name})` : ""}`,
          chestNo: st.chestNo,
          rawName: st.name,
        });
      }
    });

    list.sort((a, b) => {
      const numA = parseInt(a.chestNo) || 999999;
      const numB = parseInt(b.chestNo) || 999999;
      if (numA !== numB) return numA - numB;
      return a.rawName.localeCompare(b.rawName);
    });

    return list;
  }, [activeResultProg, registrations, students, groups]);

  const handlePublishFromModal = ({ event, results, otherGrades }) => {
    const progId = event.id;
    const prog = programs.find(p => p.id === progId);

    const lookupStudentDetails = (studentId) => {
      const sId = String(studentId);
      for (const [gId, stuList] of Object.entries(students || {})) {
        const st = (stuList || []).find(s => String(s.id) === sId);
        if (st) {
          const grp = groups.find(g => g.id === gId || g.id === st.groupId);
          return {
            studentName: st.name,
            chestNo: st.chestNo || "",
            groupId: st.groupId || gId,
            groupName: grp?.name || "",
            groupColor: grp?.color || "",
          };
        }
      }
      const cand = currentProgramCandidates.find(c => String(c.id) === sId);
      if (cand) {
        return {
          studentName: cand.rawName || cand.name,
          chestNo: cand.chestNo || "",
          groupId: "",
          groupName: "",
          groupColor: "",
        };
      }
      return {
        studentName: "",
        chestNo: "",
        groupId: "",
        groupName: "",
        groupColor: "",
      };
    };

    const enrichedEntries = (results || []).map(r => {
      const details = lookupStudentDetails(r.studentId);
      return {
        ...r,
        studentName: details.studentName || r.studentName || "",
        chestNo: details.chestNo || r.chestNo || "",
        groupId: details.groupId || r.groupId || "",
        groupName: details.groupName || r.groupName || "",
        groupColor: details.groupColor || r.groupColor || "",
        points: r.points !== undefined && r.points !== "" ? Number(r.points) : 0,
      };
    });

    const enrichedOtherGrades = (otherGrades || []).map(o => {
      const details = lookupStudentDetails(o.studentId);
      return {
        ...o,
        studentName: details.studentName || o.studentName || "",
        chestNo: details.chestNo || o.chestNo || "",
        groupId: details.groupId || o.groupId || "",
        groupName: details.groupName || o.groupName || "",
        groupColor: details.groupColor || o.groupColor || "",
      };
    });

    const savedResults = {
      entries: enrichedEntries,
      otherGrades: enrichedOtherGrades,
      publishedAt: Date.now(),
    };

    updateProgram(progId, {
      status: "published",
      results: savedResults,
    });

    setActiveResultProg(null);

    logActivity(
      user.name,
      "Published results",
      `${prog?.name || event.name} (#${event.code ?? prog?.order ?? ""})`
    );
  };

  const renderResults = () => {
    // 1. Filter by the selected category among the three: Sub-Junior, Junior, Senior
    const catPrograms = programs.filter(p => p.category === resCatFilter);

    // 2. Filter by publication status
    const statusFiltered = catPrograms.filter(p => {
      if (resStatusFilter === "published") return p.status === "published";
      if (resStatusFilter === "unpublished") return p.status !== "published";
      return true; // "all"
    });

    // 3. Filter by search query (program code or program name)
    const filteredResults = statusFiltered.filter(p => {
      if (!resSearch.trim()) return true;
      const q = resSearch.toLowerCase().trim();
      const codeMatch = p.order && String(p.order).includes(q);
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      return codeMatch || nameMatch;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    // Category counters
    const pubCount = catPrograms.filter(p => p.status === "published").length;
    const unpubCount = catPrograms.length - pubCount;

    return (
      <div className="anim-fadeIn">
        {/* Top bar: Heading on Left, Action / Search on Right (Layout identical to Students page) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: dark ? "#e8e8f5" : "#0f172a" }}>
              Results
            </div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 3 }}>
              {resCatFilter} · {filteredResults.length} {filteredResults.length === 1 ? "program" : "programs"} ({pubCount} published)
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => { setResSearchOpen(o => !o); if (resSearchOpen) setResSearch(""); }}
              style={{ color: resSearchOpen ? ACCENT : mutedTx }}
              title="Toggle search"
            >
              <Ic name="search" size={15} />
            </button>
          </div>
        </div>

        {/* Toolbar: Exactly the three category fields (Sub-Junior, Junior, Senior) on left, Status Dropdown aligned on the right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {STUDENT_CATS.map(cat => {
              const active = resCatFilter === cat;
              const count = programs.filter(p => p.category === cat).length;
              const pillColor = catColor[cat] || ACCENT;
              return (
                <button
                  key={cat}
                  onClick={() => setResCatFilter(cat)}
                  className="btn btn-sm"
                  style={{
                    fontWeight: 700,
                    fontSize: 12.5,
                    padding: "6px 13px",
                    borderRadius: 9,
                    background: active
                      ? (dark ? `${pillColor}24` : `${pillColor}15`)
                      : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                    color: active ? pillColor : mutedTx,
                    border: `1px solid ${active ? pillColor : border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cat}</span>
                  <span style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : mutedTx,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Dropdown Selector (Right aligned matching the team dropdown in students page) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Status:
            </span>
            <div style={{ position: "relative", minWidth: 190 }}>
              <select
                value={resStatusFilter}
                onChange={e => setResStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 34px 0 12px",
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  color: dark ? "#e8e8f5" : "#12121e",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = border}
              >
                <option value="all" style={{ background: dark ? "#171923" : "#ffffff", color: dark ? "#e8e8f5" : "#12121e" }}>
                  All ({catPrograms.length})
                </option>
                <option value="published" style={{ background: dark ? "#171923" : "#ffffff", color: dark ? "#e8e8f5" : "#12121e" }}>
                  Published ({pubCount})
                </option>
                <option value="unpublished" style={{ background: dark ? "#171923" : "#ffffff", color: dark ? "#e8e8f5" : "#12121e" }}>
                  Unpublished ({unpubCount})
                </option>
              </select>
              <div style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: mutedTx,
                display: "flex",
                alignItems: "center"
              }}>
                <Ic name="chevronDown" size={13} />
              </div>
            </div>
          </div>
        </div>

        {/* Search bar */}
        {resSearchOpen && (
          <div style={{ marginBottom: 14 }}>
            <input
              className="input"
              type="text"
              placeholder="Search by program code or name…"
              value={resSearch}
              onChange={e => setResSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setResSearch("");
                  setResSearchOpen(false);
                } else if (e.key === "Enter" && filteredResults.length > 0) {
                  setActiveResultProg(filteredResults[0]);
                }
              }}
              style={{ fontSize: 13 }}
              autoFocus
            />
          </div>
        )}

        {/* Programs List */}
        {filteredResults.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {catPrograms.length === 0
                ? `No programs in ${resCatFilter}`
                : `No ${resStatusFilter !== "all" ? resStatusFilter : ""} programs found`}
            </div>
            <div style={{ fontSize: 13 }}>
              {resSearch.trim()
                ? `No programs matching "${resSearch}"`
                : `There are no ${resCatFilter} programs matching the current filters.`}
            </div>
            {resStatusFilter !== "all" && catPrograms.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 14, border: `1px solid ${border}` }}
                onClick={() => setResStatusFilter("all")}
              >
                Show all statuses ({catPrograms.length})
              </button>
            )}
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            {/* Table Header: Only Code, Program Name, and Category */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 130px",
              gap: 16,
              padding: "11px 18px",
              background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
              borderBottom: `1px solid ${border}`
            }}>
              {["#", "Program Name", "Category"].map((h, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: mutedTx,
                  textAlign: i === 2 ? "right" : "left",
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Program rows: clicking the program opens the results modal */}
            {filteredResults.map((p, i) => (
              <div
                key={p.id}
                tabIndex={0}
                role="button"
                onClick={() => setActiveResultProg(p)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveResultProg(p);
                  }
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr 130px",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 18px",
                  borderTop: i > 0 ? `1px solid ${border}` : "none",
                  background: i % 2 === 0 ? cardBg : "transparent",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  outline: "none",
                }}
                onFocus={e => {
                  e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(241,77,77,0.05)";
                  e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${ACCENT}`;
                }}
                onBlur={e => {
                  e.currentTarget.style.background = i % 2 === 0 ? cardBg : "transparent";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(241,77,77,0.04)";
                }}
                onMouseLeave={e => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.background = i % 2 === 0 ? cardBg : "transparent";
                  }
                }}
                title="Click or press Enter to view / publish results"
              >
                {/* 1. Program Number / Code */}
                <div>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontWeight: 800,
                    color: ACCENT,
                    fontSize: 13.5,
                    background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                    padding: "3px 8px",
                    borderRadius: 7,
                    display: "inline-block",
                  }}>
                    #{p.order || (i + 1)}
                  </span>
                </div>

                {/* 2. Program Name */}
                <div style={{ fontWeight: 700, fontSize: 14.5, color: dark ? "#e8e8f5" : "#12121e" }}>
                  {p.name}
                </div>

                {/* 3. Category */}
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 9px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: `${catColor[p.category] || ACCENT}15`,
                    color: catColor[p.category] || ACCENT,
                    border: `1px solid ${catColor[p.category] || ACCENT}30`,
                  }}>
                    {p.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderViews = { dashboard: renderDashboard, students: renderStudents, events: renderEvents, programs: renderEvents, users: renderGroups, registrations: renderRegistrations, results: renderResults };

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
          <form onSubmit={e => { e.preventDefault(); if (stuForm.name.trim()) saveStudent(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="label">Group</label><select className="input select" value={activeGroup} onChange={e => setActiveGroup(e.target.value)}>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
            <div><label className="label">Name</label><input type="text" className="input" placeholder="Full name" value={stuForm.name} onChange={e => setStuForm({ ...stuForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">Category</label><select className="input select" value={stuForm.category} onChange={e => setStuForm({ ...stuForm, category: e.target.value })}>{STUDENT_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setStuModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!stuForm.name.trim()}>Add Student</button>
            </div>
          </form>
        </Modal>
      )}

      {progModal && (
        <Modal title={editProg ? "Edit Event" : "Add Event"} onClose={() => setProgModal(false)} wide>
          <form onSubmit={e => { e.preventDefault(); if (progForm.name.trim()) saveProg(); }} style={{ display: "grid", gap: 16 }}>
            <div className="form-row">
              <div><label className="label">Name</label><input type="text" className="input" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} placeholder="Event name" autoFocus /></div>
              <div><label className="label">Type</label><select className="input select" value={progForm.type || progForm.session || "Stage"} onChange={e => setProgForm({ ...progForm, type: e.target.value, session: e.target.value })}><option value="Stage">Stage</option><option value="Off-Stage">Off-Stage</option></select></div>
            </div>
            <div className="form-row">
              <div><label className="label">Category</label><select className="input select" value={progForm.category} onChange={e => setProgForm({ ...progForm, category: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="label">Max Participants</label><input type="number" className="input" min={1} value={progForm.maxParticipants} onChange={e => setProgForm({ ...progForm, maxParticipants: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setProgModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!progForm.name.trim()}>{editProg ? "Save Changes" : "Add Event"}</button>
            </div>
          </form>
        </Modal>
      )}

      {userModal && (
        <Modal title="Add Group" onClose={() => setUserModal(false)}>
          <form onSubmit={e => { e.preventDefault(); if (userForm.name.trim() && userForm.pin.trim()) saveUser(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="label">Group Name</label><input type="text" className="input" placeholder="e.g. Team Alpha" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">PIN / Password</label><input type="text" className="input" placeholder="e.g. 1234" value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value })} autoComplete="new-password" /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setUserModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!userForm.name.trim() || !userForm.pin.trim()}>Add Group</button>
            </div>
          </form>
        </Modal>
      )}

      {editUserModal && editingUser && (
        <Modal title="Edit Group" onClose={() => { setEditUserModal(false); setEditingUser(null); }}>
          <form onSubmit={e => { e.preventDefault(); if (editUserForm.name.trim() && editUserForm.pin.trim()) saveEditUser(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="label">Group Name</label><input type="text" className="input" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">PIN / Password</label><input type="text" className="input" value={editUserForm.pin} onChange={e => setEditUserForm({ ...editUserForm, pin: e.target.value })} autoComplete="new-password" /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => { setEditUserModal(false); setEditingUser(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!editUserForm.name.trim() || !editUserForm.pin.trim()}>Save Changes</button>
            </div>
          </form>
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

      {importModal && (
        <ImportStudentsModal
          isOpen={importModal}
          onClose={() => setImportModal(false)}
          groups={groups}
          students={students}
          onImport={handleImportStudents}
          dark={dark}
        />
      )}

      {progImportModal && (
        <ImportProgramsModal
          isOpen={progImportModal}
          onClose={() => setProgImportModal(false)}
          programs={programs}
          registrations={registrations}
          onImport={handleImportPrograms}
          dark={dark}
        />
      )}

      {selectedEntryInfo && (
        <Modal
          title={selectedEntryInfo.isCrossGroup ? "Program Entry Details (All Teams)" : "Program Entry Details"}
          onClose={() => setSelectedEntryInfo(null)}
          wide
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Header info card */}
            <div style={{
              padding: "16px",
              borderRadius: 12,
              background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>
                    {selectedEntryInfo.program?.order ? `#${selectedEntryInfo.program.order}` : ""}
                  </span>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 18, color: dark ? "#e8e8f5" : "#0f172a" }}>
                    {selectedEntryInfo.program?.name || "Program Details"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                  {selectedEntryInfo.program?.category && (
                    <Tag label={selectedEntryInfo.program.category} dark={dark} />
                  )}
                  {selectedEntryInfo.program?.session && (
                    <Tag label={selectedEntryInfo.program.session} dark={dark} />
                  )}
                  <span style={{ fontSize: 12, color: mutedTx, marginLeft: 4 }}>
                    {selectedEntryInfo.isCrossGroup ? (
                      <>Teams: <strong style={{ color: dark ? "#e8e8f5" : "#0f172a" }}>All Teams ({selectedEntryInfo.groupCount || 0} teams registered)</strong></>
                    ) : (
                      <>Team: <strong style={{ color: dark ? "#e8e8f5" : "#0f172a" }}>{selectedEntryInfo.group?.name}</strong></>
                    )}
                  </span>
                </div>
              </div>

              <div style={{
                textAlign: "right",
                fontSize: 12,
                color: mutedTx,
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                padding: "8px 12px",
                borderRadius: 8,
              }}>
                {selectedEntryInfo.isCrossGroup ? (
                  <>
                    <div style={{ fontWeight: 700, color: ACCENT, fontSize: 14 }}>
                      {(selectedEntryInfo.allParticipants || []).length} Enrolled
                    </div>
                    <div>Across {selectedEntryInfo.groupCount || 0} Teams</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, color: ACCENT, fontSize: 14 }}>
                      {(selectedEntryInfo.participants || []).length} / {selectedEntryInfo.program?.maxParticipants || 1}
                    </div>
                    <div>Participants Enrolled</div>
                  </>
                )}
              </div>
            </div>

            {/* Participants list */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  Registered Participants (
                  {selectedEntryInfo.isCrossGroup
                    ? (selectedEntryInfo.allParticipants || []).length
                    : (selectedEntryInfo.participants || []).length}
                  )
                </span>
              </div>

              {((selectedEntryInfo.isCrossGroup ? selectedEntryInfo.allParticipants : selectedEntryInfo.participants) || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: mutedTx, fontSize: 13 }}>
                  No participants registered for this program.
                </div>
              ) : (
                <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${border}` }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: selectedEntryInfo.isCrossGroup ? "130px 80px 1fr 110px 100px" : "80px 1fr 110px 100px",
                    gap: 0,
                    padding: "10px 16px",
                    background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    borderBottom: `1px solid ${border}`,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: mutedTx,
                  }}>
                    {selectedEntryInfo.isCrossGroup && <div>Team</div>}
                    <div>Chest #</div>
                    <div>Student Name</div>
                    <div>Category</div>
                    <div>Role</div>
                  </div>

                  {((selectedEntryInfo.isCrossGroup ? selectedEntryInfo.allParticipants : selectedEntryInfo.participants) || []).map((s, idx) => (
                    <div
                      key={s.id || idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: selectedEntryInfo.isCrossGroup ? "130px 80px 1fr 110px 100px" : "80px 1fr 110px 100px",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderTop: idx > 0 ? `1px solid ${border}` : "none",
                        background: idx % 2 === 0 ? cardBg : "transparent",
                      }}
                    >
                      {selectedEntryInfo.isCrossGroup && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: s.groupColor || ACCENT,
                            display: "inline-block",
                            flexShrink: 0
                          }} />
                          <span style={{ fontWeight: 700, fontSize: 13, color: dark ? "#e8e8f5" : "#1f2937" }}>
                            {s.groupName}
                          </span>
                        </div>
                      )}
                      <div>
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontWeight: 800,
                          color: ACCENT,
                          fontSize: 13,
                          background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                          padding: "2px 7px",
                          borderRadius: 6,
                          display: "inline-block",
                        }}>
                          {s.chestNo}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {s.name}
                      </div>
                      <div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: catColor[s.category] || mutedTx,
                          background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                          padding: "2px 7px",
                          borderRadius: 6,
                        }}>
                          {s.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: s.groupRole === "Leader" ? ACCENT : mutedTx, fontWeight: s.groupRole === "Leader" ? 700 : 500 }}>
                        {s.groupRole || "Member"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal close action */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                className="btn btn-primary"
                style={{ height: 42, padding: "0 24px" }}
                onClick={() => setSelectedEntryInfo(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeResultProg && (
        <PublishResultsModal
          open={!!activeResultProg}
          onClose={() => setActiveResultProg(null)}
          event={{
            id: activeResultProg.id,
            code: activeResultProg.order || 1,
            name: activeResultProg.name,
            category: activeResultProg.category,
            results: activeResultProg.results,
            status: activeResultProg.status,
          }}
          students={currentProgramCandidates}
          onPublish={handlePublishFromModal}
          dark={dark}
        />
      )}
    </div>
  );
};

export default AdminPortal;
