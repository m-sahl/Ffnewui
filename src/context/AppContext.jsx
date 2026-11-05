import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export const INITIAL_USERS         = [{ id: "u-admin", name: "System Admin", role: "admin", pin: "admin" }];
export const INITIAL_PROGRAMS      = [];
export const INITIAL_STUDENTS      = {};
export const INITIAL_REGISTRATIONS = [];

export const normalizeCategoryName = (c) => {
  if (!c) return c;
  const s = String(c).trim();
  const lower = s.toLowerCase();
  if (lower === "sub-junior" || lower === "sub junior" || lower === "subjunior" || lower === "sj") return "Low";
  if (lower === "junior" || lower === "jr") return "Mid";
  if (lower === "senior" || lower === "seniors" || lower === "sr") return "High";
  return s;
};

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // Convex Live Queries
  const convexPrograms      = useQuery(api.programs.get);
  const convexStudents      = useQuery(api.students.get);
  const convexRegistrations = useQuery(api.registrations.get);
  const convexUsers         = useQuery(api.users.get);
  const convexLocks         = useQuery(api.locks.get);
  const convexMessages      = useQuery(api.messages.get);
  const convexLogs          = useQuery(api.logs.get);
  const convexSettings      = useQuery(api.settings.getLimits);

  // Convex Live Mutations
  const setAllConvexPrograms      = useMutation(api.programs.setAll);
  const addConvexProgram          = useMutation(api.programs.add);
  const updateConvexProgram       = useMutation(api.programs.update);
  const removeConvexProgram       = useMutation(api.programs.remove);

  const setGroupConvexStudents    = useMutation(api.students.setGroupStudents);
  const addConvexStudent          = useMutation(api.students.add);
  const updateConvexStudent       = useMutation(api.students.update);
  const removeConvexStudent       = useMutation(api.students.remove);

  const addConvexRegistration     = useMutation(api.registrations.addRegistration);
  const updateConvexRegistration  = useMutation(api.registrations.update);
  const removeConvexRegistration  = useMutation(api.registrations.remove);
  const setAllConvexRegistrations = useMutation(api.registrations.setAll);

  const setAllConvexUsers         = useMutation(api.users.setAll);
  const addConvexUser             = useMutation(api.users.add);
  const updateConvexUser          = useMutation(api.users.update);
  const removeConvexUser          = useMutation(api.users.remove);

  const setConvexLock             = useMutation(api.locks.setLock);
  const sendConvexMessage         = useMutation(api.messages.send);
  const markConvexMessageRead     = useMutation(api.messages.markRead);
  const deleteConvexMessage       = useMutation(api.messages.deleteMsg);
  const addConvexLog              = useMutation(api.logs.add);
  const clearConvexLogs           = useMutation(api.logs.clear);
  const updateConvexLimits        = useMutation(api.settings.updateLimits);

  // Local State
  const [programs, setProgramsState] = useState(() => {
    try {
      const s = localStorage.getItem("ff_programs");
      const parsed = s ? JSON.parse(s) : INITIAL_PROGRAMS;
      return parsed.map((p, i) => ({
        ...p,
        category: normalizeCategoryName(p.category),
        order: (p.order !== undefined && p.order !== null) ? p.order : i + 1,
      }));
    } catch { return INITIAL_PROGRAMS; }
  });

  const [students, setStudentsState] = useState(() => {
    try {
      const s = localStorage.getItem("ff_students");
      if (!s) return INITIAL_STUDENTS;
      const parsed = JSON.parse(s);
      const normalized = {};
      for (const [gid, list] of Object.entries(parsed)) {
        normalized[gid] = Array.isArray(list)
          ? list.map(st => ({ ...st, category: normalizeCategoryName(st.category) }))
          : list;
      }
      return normalized;
    } catch { return INITIAL_STUDENTS; }
  });

  const [registrations, setRegistrationsState] = useState(() => {
    try { const s = localStorage.getItem("ff_registrations"); return s ? JSON.parse(s) : INITIAL_REGISTRATIONS; } catch { return INITIAL_REGISTRATIONS; }
  });

  const [users, setUsersState] = useState(() => {
    try {
      const s      = localStorage.getItem("ff_users");
      const parsed = s ? JSON.parse(s) : INITIAL_USERS;
      const hasAdmin = parsed.some(u => u.role === "admin");
      if (!hasAdmin) return [INITIAL_USERS[0], ...parsed];
      return parsed;
    } catch { return INITIAL_USERS; }
  });

  const [activityLogs, setActivityLogsState] = useState(() => {
    try { const s = localStorage.getItem("ff_logs"); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [optimisticLocks, setOptimisticLocks] = useState({});

  const [messages, setMessagesState] = useState(() => {
    try { const s = localStorage.getItem("ff_messages"); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [programLimits, setProgramLimitsState] = useState(() => {
    try {
      const s = localStorage.getItem("ff_program_limits");
      return s ? JSON.parse(s) : { maxStage: 3, maxOffStage: 3 };
    } catch { return { maxStage: 3, maxOffStage: 3 }; }
  });

  const initialSynced = useRef(false);

  // Sync Convex Real-Time Queries into Local State when available
  useEffect(() => {
    if (convexPrograms !== undefined && Array.isArray(convexPrograms)) {
      setProgramsState(convexPrograms.map((p, i) => ({
        ...p,
        category: normalizeCategoryName(p.category),
        order: (p.order !== undefined && p.order !== null) ? p.order : i + 1,
      })));
    }
  }, [convexPrograms]);

  useEffect(() => {
    if (convexStudents !== undefined && Array.isArray(convexStudents)) {
      const grouped = {};
      for (const st of convexStudents) {
        if (!grouped[st.groupId]) grouped[st.groupId] = [];
        grouped[st.groupId].push({
          ...st,
          category: normalizeCategoryName(st.category),
        });
      }
      setStudentsState(grouped);
    }
  }, [convexStudents]);

  useEffect(() => {
    if (convexRegistrations !== undefined && Array.isArray(convexRegistrations)) {
      setRegistrationsState(convexRegistrations);
    }
  }, [convexRegistrations]);

  useEffect(() => {
    if (convexUsers !== undefined && Array.isArray(convexUsers)) {
      const hasAdmin = convexUsers.some(u => u.role === "admin");
      setUsersState(hasAdmin ? convexUsers : [INITIAL_USERS[0], ...convexUsers]);
    }
  }, [convexUsers]);

  const locks = useMemo(() => {
    const lockMap = {};
    if (convexLocks !== undefined && Array.isArray(convexLocks)) {
      for (const l of convexLocks) {
        if (!l) continue;
        const sess = (l.session || "").toLowerCase().includes("off") ? "off-stage" : "stage";
        const val = !!l.locked;
        if (l.type) lockMap[l.type.toLowerCase()] = val;
        if (l.groupId) {
          const gid = l.groupId.toLowerCase();
          lockMap[`${gid}_${sess}`] = val;
          const matchingUser = (users || []).find(u =>
            (u.id && u.id.toLowerCase() === gid) ||
            (u.groupId && u.groupId.toLowerCase() === gid) ||
            (u.name && u.name.trim().toLowerCase() === gid)
          );
          if (matchingUser) {
            if (matchingUser.id) lockMap[`${matchingUser.id.toLowerCase()}_${sess}`] = val;
            if (matchingUser.groupId) lockMap[`${matchingUser.groupId.toLowerCase()}_${sess}`] = val;
            if (matchingUser.name) lockMap[`${matchingUser.name.trim().toLowerCase()}_${sess}`] = val;
          }
        }
      }
    } else {
      try {
        const s = localStorage.getItem("ff_locks");
        if (s) Object.assign(lockMap, JSON.parse(s));
      } catch (e) {}
    }
    return { ...lockMap, ...optimisticLocks };
  }, [convexLocks, users, optimisticLocks]);

  useEffect(() => {
    if (convexLocks !== undefined && Array.isArray(convexLocks)) {
      setOptimisticLocks({});
    }
  }, [convexLocks]);

  useEffect(() => {
    if (convexMessages !== undefined && Array.isArray(convexMessages)) {
      setMessagesState(convexMessages);
    }
  }, [convexMessages]);

  useEffect(() => {
    if (convexLogs !== undefined && Array.isArray(convexLogs)) {
      setActivityLogsState(convexLogs);
    }
  }, [convexLogs]);

  useEffect(() => {
    if (convexSettings && typeof convexSettings.maxStage === "number" && typeof convexSettings.maxOffStage === "number") {
      setProgramLimitsState(convexSettings);
    }
  }, [convexSettings]);

  useEffect(() => {
    if (convexPrograms !== undefined && convexStudents !== undefined && convexUsers !== undefined) {
      initialSynced.current = true;
    }
  }, [convexPrograms, convexStudents, convexUsers]);

  // Persist Local Storage Cache
  useEffect(() => { localStorage.setItem("ff_programs",       JSON.stringify(programs));      }, [programs]);
  useEffect(() => { localStorage.setItem("ff_students",       JSON.stringify(students));      }, [students]);
  useEffect(() => { localStorage.setItem("ff_registrations",  JSON.stringify(registrations)); }, [registrations]);
  useEffect(() => { localStorage.setItem("ff_users",          JSON.stringify(users));         }, [users]);
  useEffect(() => { localStorage.setItem("ff_logs",           JSON.stringify(activityLogs));  }, [activityLogs]);
  useEffect(() => { localStorage.setItem("ff_locks",          JSON.stringify(locks));         }, [locks]);
  useEffect(() => { localStorage.setItem("ff_messages",       JSON.stringify(messages));      }, [messages]);
  useEffect(() => { localStorage.setItem("ff_program_limits", JSON.stringify(programLimits)); }, [programLimits]);

  const GROUP_COLORS = ["#f14d4d", "#3b82f6", "#f59e0b", "#1dd183", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

  const groups = users
    .filter(u => u.role === "group")
    .map((u, i) => ({ id: u.id, name: u.name, color: u.color || GROUP_COLORS[i % GROUP_COLORS.length] }));

  // Helper Setters (Updates both Local State & Convex Cloud)
  const setPrograms = (action) => {
    setProgramsState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      if (next) {
        setAllConvexPrograms({ programs: next }).catch(err => console.error("Convex setPrograms error:", err));
      }
      return next;
    });
  };

  const addProgram = (newProg) => {
    setProgramsState(prev => [...prev, newProg]);
    addConvexProgram({ program: newProg }).catch(err => console.error("Convex addProgram error:", err));
  };

  const updateProgram = (id, updatedProg) => {
    setProgramsState(prev => prev.map(p => p.id === id ? { ...p, ...updatedProg } : p));
    updateConvexProgram({ id, program: updatedProg }).catch(err => console.error("Convex updateProgram error:", err));
  };

  const deleteProgram = (id) => {
    setProgramsState(prev => prev.filter(p => p.id !== id));
    removeConvexProgram({ id }).catch(err => console.error("Convex deleteProgram error:", err));
  };

  const setStudents = (action) => {
    setStudentsState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      if (next) {
        // next is an object { [groupId]: student[] }
        const flatList = Object.values(next).flat();
        setGroupConvexStudents({ students: flatList }).catch(err => console.error("Convex setStudents error:", err));
      }
      return next;
    });
  };

  const updateStudent = (idOrGid, updatedDataOrId, maybeData) => {
    const id = maybeData !== undefined ? updatedDataOrId : idOrGid;
    const updatedData = maybeData !== undefined ? maybeData : updatedDataOrId;
    setStudentsState(prev => {
      const next = { ...prev };
      for (const [gid, list] of Object.entries(next)) {
        const idx = list.findIndex(s => s.id === id);
        if (idx !== -1) {
          next[gid] = [...list];
          next[gid][idx] = { ...next[gid][idx], ...updatedData };
          break;
        }
      }
      return next;
    });
    updateConvexStudent({ id, student: updatedData }).catch(err => console.error("Convex updateStudent error:", err));
  };

  const setRegistrations = (action) => {
    setRegistrationsState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      if (next) {
        // Smart sync: detect if it's a single add (length increased by 1)
        if (Array.isArray(next) && Array.isArray(prev) && next.length === prev.length + 1) {
          // Single add: find the new item and use atomic mutation
          const newItem = next.find(item => !prev.some(p => p.id === item.id));
          if (newItem && newItem.id) {
            addConvexRegistration({ registration: newItem }).catch(err => {
              console.error("Convex addRegistration error:", err);
              // Rollback on error
              setRegistrationsState(prev);
            });
          }
        } else if (Array.isArray(next) && Array.isArray(prev) && next.length === prev.length - 1) {
          // Single remove: find removed item
          const removedItem = prev.find(item => !next.some(p => p.id === item.id));
          if (removedItem && removedItem.id) {
            removeConvexRegistration({ id: removedItem.id }).catch(err => {
              console.error("Convex removeRegistration error:", err);
              setRegistrationsState(prev);
            });
          }
        } else {
          // Bulk replace - use setAll
          setAllConvexRegistrations({ registrations: next }).catch(err => {
            console.error("Convex setRegistrations error:", err);
            setRegistrationsState(prev);
          });
        }
      }
      return next;
    });
  };

  // Atomic add function with lock validation
  const addRegistration = async (newReg) => {
    const p = (programs || []).find(pg => pg.id === newReg.programId);
    const pSess = (p?.type || p?.session || "Stage") === "Off-Stage" ? "Off-Stage" : "Stage";
    if (newReg.adminOverride !== true && isLocked(newReg.groupId, pSess)) {
      throw new Error(`Registration is locked for ${pSess} session. Please meet the admin to unlock.`);
    }
    setRegistrationsState(prev => [...prev, newReg]);
    try {
      return await addConvexRegistration({ registration: newReg });
    } catch (err) {
      console.error("Convex addRegistration error:", err);
      // Rollback on error
      setRegistrationsState(prev => prev.filter(r => r.id !== newReg.id));
      throw err;
    }
  };

  // Atomic update function with lock validation
  const updateRegistration = async (id, updatedReg) => {
    const p = (programs || []).find(pg => pg.id === updatedReg.programId);
    const pSess = (p?.type || p?.session || "Stage") === "Off-Stage" ? "Off-Stage" : "Stage";
    if (updatedReg.adminOverride !== true && isLocked(updatedReg.groupId, pSess)) {
      throw new Error(`Registration is locked for ${pSess} session. Please meet the admin to unlock.`);
    }
    const prevRegs = registrations;
    setRegistrationsState(prev => prev.map(r => r.id === id ? { ...r, ...updatedReg } : r));
    try {
      return await updateConvexRegistration({ id, registration: updatedReg });
    } catch (err) {
      console.error("Convex updateRegistration error:", err);
      // Rollback on error
      setRegistrationsState(prevRegs);
      throw err;
    }
  };

  // Atomic remove function with lock validation
  const removeRegistration = (id, adminOverride = false) => {
    const reg = (registrations || []).find(r => r.id === id);
    if (reg && !adminOverride) {
      const p = (programs || []).find(pg => pg.id === reg.programId);
      const pSess = (p?.type || p?.session || "Stage") === "Off-Stage" ? "Off-Stage" : "Stage";
      if (isLocked(reg.groupId, pSess)) {
        console.error("Cannot delete locked registration");
        throw new Error(`Registration is locked for ${pSess} session. Please meet the admin to unlock.`);
      }
    }
    setRegistrationsState(prev => prev.filter(r => r.id !== id));
    removeConvexRegistration({ id, adminOverride }).catch(err => {
      console.error("Convex removeRegistration error:", err);
      // On error, refresh from Convex
      setRegistrationsState(prev => prev);
    });
  };

  const setUsers = (action) => {
    setUsersState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      if (next) {
        setAllConvexUsers({ users: next }).catch(err => console.error("Convex setUsers error:", err));
      }
      return next;
    });
  };

  const addUser = (newUser) => {
    setUsersState(prev => [...prev, newUser]);
    addConvexUser({ user: newUser }).catch(err => console.error("Convex addUser error:", err));
  };

  const updateUser = (id, updatedUser) => {
    setUsersState(prev => prev.map(u => u.id === id ? { ...u, ...updatedUser } : u));
    updateConvexUser({ id, user: updatedUser }).catch(err => console.error("Convex updateUser error:", err));
  };

  const deleteUser = (id) => {
    setUsersState(prev => prev.filter(u => u.id !== id));
    removeConvexUser({ id }).catch(err => console.error("Convex deleteUser error:", err));
  };

  const logActivity = (userName, action, details) => {
    const newLog = { id: "log-" + Date.now() + Math.random().toString(36).substr(2, 4), timestamp: Date.now(), user: userName, action, details };
    setActivityLogsState(prev => [newLog, ...prev].slice(0, 500));
    addConvexLog(newLog).catch(err => console.error("Convex log error:", err));
  };

  const clearLogs = () => {
    setActivityLogsState([]);
    clearConvexLogs().catch(err => console.error("Convex clearLogs error:", err));
  };

  const isLocked = useCallback((groupId, session) => {
    if (!groupId || !session) return false;
    const normSession = String(session).toLowerCase().includes("off") ? "off-stage" : "stage";
    const normGid = String(groupId).trim().toLowerCase();

    const matchingUser = (users || []).find(u =>
      (u.id && u.id.toLowerCase() === normGid) ||
      (u.groupId && u.groupId.toLowerCase() === normGid) ||
      (u.name && u.name.trim().toLowerCase() === normGid)
    );

    const candidateKeys = [
      `${normGid}_${normSession}`,
      `all_${normSession}`,
      `global_${normSession}`,
      normSession,
    ];

    if (matchingUser) {
      if (matchingUser.id) candidateKeys.push(`${matchingUser.id.toLowerCase()}_${normSession}`);
      if (matchingUser.groupId) candidateKeys.push(`${matchingUser.groupId.toLowerCase()}_${normSession}`);
      if (matchingUser.name) candidateKeys.push(`${matchingUser.name.trim().toLowerCase()}_${normSession}`);
    }

    return candidateKeys.some(k => !!locks[k]);
  }, [locks, users]);

  const toggleLock = (groupId, session) => {
    if (!groupId || !session) return;
    const normSession = String(session).toLowerCase().includes("off") ? "off-stage" : "stage";
    const displaySession = normSession === "off-stage" ? "Off-Stage" : "Stage";
    const current = isLocked(groupId, normSession);
    const newLocked = !current;

    const matchingUser = (users || []).find(u =>
      u.id === groupId || u.groupId === groupId || (u.name && u.name.trim().toLowerCase() === String(groupId).trim().toLowerCase())
    );
    const targetId = matchingUser?.id || groupId;
    const key = `${targetId}_${normSession}`.toLowerCase();

    setOptimisticLocks(prev => {
      const next = { ...prev, [key]: newLocked, [`${groupId}_${normSession}`.toLowerCase()]: newLocked };
      if (matchingUser?.groupId) {
        next[`${matchingUser.groupId.toLowerCase()}_${normSession}`] = newLocked;
      }
      if (matchingUser?.name) {
        next[`${matchingUser.name.trim().toLowerCase()}_${normSession}`] = newLocked;
      }
      return next;
    });

    setConvexLock({ groupId: targetId, session: displaySession, locked: newLocked, type: key })
      .catch(err => {
        console.error("Convex toggleLock error:", err);
        setOptimisticLocks({});
      });
  };

  const sendMessage = (from, fromName, to, text, extra = {}) => {
    const msg = { id: "msg-" + Date.now() + Math.random().toString(36).substr(2, 4), groupId: to || from, from, fromName: fromName || from, to: to || "", text, timestamp: Date.now(), read: false, ...extra };
    setMessagesState(prev => [...prev, msg]);
    sendConvexMessage(msg).catch(err => console.error("Convex sendMessage error:", err));
  };

  const deleteMessage = (id, mode, userId) => {
    setMessagesState(prev => prev
      .map(m => { if (m.id !== id) return m; if (mode === "everyone") return null; return { ...m, deletedFor: [...(m.deletedFor || []), userId] }; })
      .filter(Boolean)
    );
    if (mode === "everyone") {
      deleteConvexMessage({ id }).catch(err => console.error("Convex deleteMessage error:", err));
    }
  };

  const markRead = (toId) => {
    setMessagesState(prev => prev.map(m => (m.groupId === toId || m.to === toId || (toId === "admin" && m.to === "admin")) && !m.read ? { ...m, read: true } : m));
    markConvexMessageRead({ groupId: toId }).catch(err => console.error("Convex markRead error:", err));
  };

  const nextChestNo = (category) => {
    const base = {
      "Low": 100, "Mid": 200, "High": 300,
      "Sub-Junior": 100, "Junior": 200, "Senior": 300,
    };
    const normTarget = normalizeCategoryName(category);
    const allInCat = Object.values(students).flat().filter(s => normalizeCategoryName(s.category) === normTarget);
    const maxUsed  = allInCat.reduce((max, s) => Math.max(max, parseInt(s.chestNo) || 0), base[category] || base[normTarget] || 100);
    return (maxUsed + 1).toString();
  };

  const updateProgramLimits = ({ maxStage, maxOffStage }) => {
    const next = {
      maxStage: Math.max(1, Number(maxStage) || 1),
      maxOffStage: Math.max(1, Number(maxOffStage) || 1),
    };
    setProgramLimitsState(next);
    updateConvexLimits(next).catch(err => console.error("Convex updateLimits error:", err));
  };

  const getStudentQuotaUsage = (studentId, excludeRegId = null) => {
    if (!studentId) return { stage: 0, offStage: 0, maxStage: programLimits.maxStage, maxOffStage: programLimits.maxOffStage, stageFull: false, offStageFull: false };
    const sId = String(studentId);

    let stageCount = 0;
    let offStageCount = 0;

    const programMap = new Map();
    for (const p of programs) {
      programMap.set(p.id, p);
    }

    for (const r of registrations) {
      if (excludeRegId && r.id === excludeRegId) continue;
      if (!Array.isArray(r.participantIds) || !r.participantIds.map(String).includes(sId)) continue;

      const p = programMap.get(r.programId);
      if (!p) continue;
      const maxP = p.maxParticipants !== undefined ? Number(p.maxParticipants) : 1;
      if (maxP !== 1) continue; // Solo items only count against personal limit

      const sessionType = (p.type || p.session || "Stage") === "Off-Stage" ? "Off-Stage" : "Stage";
      if (sessionType === "Off-Stage") {
        offStageCount++;
      } else {
        stageCount++;
      }
    }

    const maxStage = programLimits?.maxStage ?? 3;
    const maxOffStage = programLimits?.maxOffStage ?? 3;

    return {
      stage: stageCount,
      offStage: offStageCount,
      maxStage,
      maxOffStage,
      stageFull: stageCount >= maxStage,
      offStageFull: offStageCount >= maxOffStage,
    };
  };

  return (
    <AppContext.Provider value={{
      groups, programs, setPrograms, addProgram, updateProgram, deleteProgram,
      students, setStudents, updateStudent,
      registrations, setRegistrations, addRegistration, updateRegistration, removeRegistration,
      users, setUsers, addUser, updateUser, deleteUser,
      activityLogs, setActivityLogs: setActivityLogsState, logActivity, clearLogs,
      messages, setMessages: setMessagesState, sendMessage, markRead, deleteMessage,
      locks, toggleLock, isLocked,
      nextChestNo,
      programLimits, updateProgramLimits, getStudentQuotaUsage,
    }}>
      {children}
    </AppContext.Provider>
  );
};
