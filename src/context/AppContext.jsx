import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export const INITIAL_USERS         = [{ id: "u-admin", name: "System Admin", role: "admin", pin: "admin" }];
export const INITIAL_PROGRAMS      = [];
export const INITIAL_STUDENTS      = {};
export const INITIAL_REGISTRATIONS = [];

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

  // Convex Live Mutations
  const setAllConvexPrograms      = useMutation(api.programs.setAll);
  const addConvexProgram          = useMutation(api.programs.add);
  const updateConvexProgram       = useMutation(api.programs.update);
  const removeConvexProgram       = useMutation(api.programs.remove);

  const setGroupConvexStudents    = useMutation(api.students.setGroupStudents);
  const setAllConvexRegistrations = useMutation(api.registrations.setAll);
  const setAllConvexUsers         = useMutation(api.users.setAll);
  const setConvexLock             = useMutation(api.locks.setLock);
  const sendConvexMessage         = useMutation(api.messages.send);
  const markConvexMessageRead     = useMutation(api.messages.markRead);
  const deleteConvexMessage       = useMutation(api.messages.deleteMsg);
  const addConvexLog              = useMutation(api.logs.add);
  const clearConvexLogs           = useMutation(api.logs.clear);

  // Local State
  const [programs, setProgramsState] = useState(() => {
    try {
      const s = localStorage.getItem("ff_programs");
      const parsed = s ? JSON.parse(s) : INITIAL_PROGRAMS;
      return parsed.map((p, i) => p.order ? p : { ...p, order: i + 1 });
    } catch { return INITIAL_PROGRAMS; }
  });

  const [students, setStudentsState] = useState(() => {
    try { const s = localStorage.getItem("ff_students"); return s ? JSON.parse(s) : INITIAL_STUDENTS; } catch { return INITIAL_STUDENTS; }
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

  const [locks, setLocksState] = useState(() => {
    try { const s = localStorage.getItem("ff_locks"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  const [messages, setMessagesState] = useState(() => {
    try { const s = localStorage.getItem("ff_messages"); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const initialSynced = useRef(false);

  // Sync Convex Real-Time Queries into Local State when available
  useEffect(() => {
    if (convexPrograms !== undefined && Array.isArray(convexPrograms)) {
      setProgramsState(convexPrograms.map((p, i) => p.order ? p : { ...p, order: i + 1 }));
    }
  }, [convexPrograms]);

  useEffect(() => {
    if (convexStudents !== undefined && Array.isArray(convexStudents)) {
      const grouped = {};
      for (const st of convexStudents) {
        if (!grouped[st.groupId]) grouped[st.groupId] = [];
        grouped[st.groupId].push(st);
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

  useEffect(() => {
    if (convexLocks !== undefined && Array.isArray(convexLocks)) {
      const lockMap = {};
      for (const l of convexLocks) {
        if (!lockMap[l.type]) lockMap[l.type] = true;
      }
      setLocksState(lockMap);
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
    if (convexPrograms !== undefined && convexStudents !== undefined && convexUsers !== undefined) {
      initialSynced.current = true;
    }
  }, [convexPrograms, convexStudents, convexUsers]);

  // Persist Local Storage Cache
  useEffect(() => { localStorage.setItem("ff_programs",      JSON.stringify(programs));      }, [programs]);
  useEffect(() => { localStorage.setItem("ff_students",      JSON.stringify(students));      }, [students]);
  useEffect(() => { localStorage.setItem("ff_registrations", JSON.stringify(registrations)); }, [registrations]);
  useEffect(() => { localStorage.setItem("ff_users",         JSON.stringify(users));         }, [users]);
  useEffect(() => { localStorage.setItem("ff_logs",          JSON.stringify(activityLogs));  }, [activityLogs]);
  useEffect(() => { localStorage.setItem("ff_locks",         JSON.stringify(locks));         }, [locks]);
  useEffect(() => { localStorage.setItem("ff_messages",      JSON.stringify(messages));      }, [messages]);

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
        for (const [gId, stList] of Object.entries(next)) {
          const cleanList = (stList || []).map(s => ({ ...s, groupId: s.groupId || gId }));
          setGroupConvexStudents({ groupId: gId, students: cleanList }).catch(err => console.error("Convex setStudents error:", err));
        }
      }
      return next;
    });
  };

  const setRegistrations = (action) => {
    setRegistrationsState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      if (next) {
        setAllConvexRegistrations({ registrations: next }).catch(err => console.error("Convex setRegistrations error:", err));
      }
      return next;
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

  const logActivity = (userName, action, details) => {
    const newLog = { id: "log-" + Date.now() + Math.random().toString(36).substr(2, 4), timestamp: Date.now(), user: userName, action, details };
    setActivityLogsState(prev => [newLog, ...prev].slice(0, 500));
    addConvexLog(newLog).catch(err => console.error("Convex log error:", err));
  };

  const clearLogs = () => {
    setActivityLogsState([]);
    clearConvexLogs().catch(err => console.error("Convex clearLogs error:", err));
  };

  const toggleLock = (groupId, session) => {
    let newLocked = false;
    setLocksState(prev => {
      newLocked = !(prev[groupId]?.[session]);
      return { ...prev, [groupId]: { ...(prev[groupId] || {}), [session]: newLocked } };
    });
    setConvexLock({ type: `${groupId}_${session}`, locked: newLocked }).catch(err => console.error("Convex toggleLock error:", err));
  };

  const isLocked = (groupId, session) => !!(locks[groupId]?.[session]);

  const sendMessage = (from, fromName, to, text) => {
    const msg = { id: "msg-" + Date.now() + Math.random().toString(36).substr(2, 4), groupId: to || from, from, fromName: fromName || from, to: to || "", text, timestamp: Date.now(), read: false };
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
    setMessagesState(prev => prev.map(m => m.to === toId && !m.read ? { ...m, read: true } : m));
    markConvexMessageRead({ groupId: toId }).catch(err => console.error("Convex markRead error:", err));
  };

  const nextChestNo = (category) => {
    const base    = { "Sub-Junior": 100, "Junior": 200, "Senior": 300 };
    const allInCat = Object.values(students).flat().filter(s => s.category === category);
    const maxUsed  = allInCat.reduce((max, s) => Math.max(max, parseInt(s.chestNo) || 0), base[category] || 100);
    return (maxUsed + 1).toString();
  };

  return (
    <AppContext.Provider value={{
      groups, programs, setPrograms, addProgram, updateProgram, deleteProgram,
      students, setStudents,
      registrations, setRegistrations,
      users, setUsers,
      activityLogs, setActivityLogs: setActivityLogsState, logActivity, clearLogs,
      messages, setMessages: setMessagesState, sendMessage, markRead, deleteMessage,
      locks, toggleLock, isLocked,
      nextChestNo,
    }}>
      {children}
    </AppContext.Provider>
  );
};
