import { createContext, useContext, useState, useEffect } from "react";
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
  const removeConvexProgram       = useMutation(api.programs.remove);

  const setGroupConvexStudents    = useMutation(api.students.setGroupStudents);
  const addConvexStudent          = useMutation(api.students.add);
  const removeConvexStudent       = useMutation(api.students.remove);

  const setAllConvexRegistrations = useMutation(api.registrations.setAll);
  const addConvexRegistration     = useMutation(api.registrations.add);
  const removeConvexRegistration  = useMutation(api.registrations.remove);

  const setAllConvexUsers         = useMutation(api.users.setAll);
  const setConvexLock             = useMutation(api.locks.setLock);

  const sendConvexMessage         = useMutation(api.messages.send);
  const markConvexMessageRead     = useMutation(api.messages.markRead);
  const deleteConvexMessage       = useMutation(api.messages.deleteMsg);

  const addConvexLog              = useMutation(api.logs.add);
  const clearConvexLogs           = useMutation(api.logs.clear);

  // Local State Fallback & Mirror
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

  // Sync Convex Real-Time Queries into Local State when available
  useEffect(() => {
    if (convexPrograms && Array.isArray(convexPrograms) && convexPrograms.length > 0) {
      setProgramsState(convexPrograms.map((p, i) => p.order ? p : { ...p, order: i + 1 }));
    }
  }, [convexPrograms]);

  useEffect(() => {
    if (convexStudents && Array.isArray(convexStudents) && convexStudents.length > 0) {
      const grouped = {};
      for (const st of convexStudents) {
        if (!grouped[st.groupId]) grouped[st.groupId] = [];
        grouped[st.groupId].push(st);
      }
      setStudentsState(grouped);
    }
  }, [convexStudents]);

  useEffect(() => {
    if (convexRegistrations && Array.isArray(convexRegistrations) && convexRegistrations.length > 0) {
      setRegistrationsState(convexRegistrations);
    }
  }, [convexRegistrations]);

  useEffect(() => {
    if (convexUsers && Array.isArray(convexUsers) && convexUsers.length > 0) {
      const hasAdmin = convexUsers.some(u => u.role === "admin");
      setUsersState(hasAdmin ? convexUsers : [INITIAL_USERS[0], ...convexUsers]);
    }
  }, [convexUsers]);

  useEffect(() => {
    if (convexLocks && Array.isArray(convexLocks) && convexLocks.length > 0) {
      const lockMap = {};
      for (const l of convexLocks) {
        if (!lockMap[l.type]) lockMap[l.type] = true;
      }
      setLocksState(lockMap);
    }
  }, [convexLocks]);

  useEffect(() => {
    if (convexMessages && Array.isArray(convexMessages) && convexMessages.length > 0) {
      setMessagesState(convexMessages);
    }
  }, [convexMessages]);

  useEffect(() => {
    if (convexLogs && Array.isArray(convexLogs) && convexLogs.length > 0) {
      setActivityLogsState(convexLogs);
    }
  }, [convexLogs]);

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

  // Wrapped Setters that update both Convex & Local State
  const setPrograms = (action) => {
    setProgramsState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      try { setAllConvexPrograms({ programs: next }); } catch {}
      return next;
    });
  };

  const setStudents = (action) => {
    setStudentsState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      try {
        for (const [gId, stList] of Object.entries(next)) {
          setGroupConvexStudents({ groupId: gId, students: stList });
        }
      } catch {}
      return next;
    });
  };

  const setRegistrations = (action) => {
    setRegistrationsState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      try { setAllConvexRegistrations({ registrations: next }); } catch {}
      return next;
    });
  };

  const setUsers = (action) => {
    setUsersState(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      try { setAllConvexUsers({ users: next }); } catch {}
      return next;
    });
  };

  const logActivity = (userName, action, details) => {
    const newLog = { id: "log-" + Date.now() + Math.random().toString(36).substr(2, 4), timestamp: Date.now(), userName, user: userName, action, details };
    setActivityLogsState(prev => [newLog, ...prev].slice(0, 500));
    try { addConvexLog(newLog); } catch {}
  };

  const clearLogs = () => {
    setActivityLogsState([]);
    try { clearConvexLogs(); } catch {}
  };

  const toggleLock = (groupId, session) => {
    setLocksState(prev => {
      const newLocked = !(prev[groupId]?.[session]);
      const next = { ...prev, [groupId]: { ...(prev[groupId] || {}), [session]: newLocked } };
      try { setConvexLock({ type: `${groupId}_${session}`, locked: newLocked }); } catch {}
      return next;
    });
  };

  const isLocked = (groupId, session) => !!(locks[groupId]?.[session]);

  const sendMessage = (from, fromName, to, text) => {
    const msg = { id: "msg-" + Date.now() + Math.random().toString(36).substr(2, 4), groupId: to || from, from, fromName, to, text, timestamp: Date.now(), read: false, deletedFor: [] };
    setMessagesState(prev => [...prev, msg]);
    try { sendConvexMessage(msg); } catch {}
  };

  const deleteMessage = (id, mode, userId) => {
    setMessagesState(prev => prev
      .map(m => { if (m.id !== id) return m; if (mode === "everyone") return null; return { ...m, deletedFor: [...(m.deletedFor || []), userId] }; })
      .filter(Boolean)
    );
    if (mode === "everyone") {
      try { deleteConvexMessage({ id }); } catch {}
    }
  };

  const markRead = (toId) => {
    setMessagesState(prev => prev.map(m => m.to === toId && !m.read ? { ...m, read: true } : m));
    try { markConvexMessageRead({ groupId: toId }); } catch {}
  };

  // Chest number: finds the max used in this category across ALL groups and increments
  const nextChestNo = (category) => {
    const base    = { "Sub-Junior": 100, "Junior": 200, "Senior": 300 };
    const allInCat = Object.values(students).flat().filter(s => s.category === category);
    const maxUsed  = allInCat.reduce((max, s) => Math.max(max, parseInt(s.chestNo) || 0), base[category] || 100);
    return (maxUsed + 1).toString();
  };

  return (
    <AppContext.Provider value={{
      groups, programs, setPrograms,
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
