import { createContext, useContext, useState, useEffect } from "react";

export const INITIAL_USERS         = [{ id: "u-admin", name: "System Admin", role: "admin", pin: "admin" }];
export const INITIAL_PROGRAMS      = [];
export const INITIAL_STUDENTS      = {};
export const INITIAL_REGISTRATIONS = [];

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

  const [programs, setPrograms] = useState(() => {
    try {
      const s = localStorage.getItem("ff_programs");
      const parsed = s ? JSON.parse(s) : INITIAL_PROGRAMS;
      return parsed.map((p, i) => p.order ? p : { ...p, order: i + 1 });
    } catch { return INITIAL_PROGRAMS; }
  });

  const [students, setStudents] = useState(() => {
    try { const s = localStorage.getItem("ff_students"); return s ? JSON.parse(s) : INITIAL_STUDENTS; } catch { return INITIAL_STUDENTS; }
  });

  const [registrations, setRegistrations] = useState(() => {
    try { const s = localStorage.getItem("ff_registrations"); return s ? JSON.parse(s) : INITIAL_REGISTRATIONS; } catch { return INITIAL_REGISTRATIONS; }
  });

  const [users, setUsers] = useState(() => {
    try {
      const s      = localStorage.getItem("ff_users");
      const parsed = s ? JSON.parse(s) : INITIAL_USERS;
      const hasAdmin = parsed.some(u => u.role === "admin");
      if (!hasAdmin) return [INITIAL_USERS[0], ...parsed];
      return parsed;
    } catch { return INITIAL_USERS; }
  });

  const [activityLogs, setActivityLogs] = useState(() => {
    try { const s = localStorage.getItem("ff_logs"); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [locks, setLocks] = useState(() => {
    try { const s = localStorage.getItem("ff_locks"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  const [messages, setMessages] = useState(() => {
    try { const s = localStorage.getItem("ff_messages"); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const GROUP_COLORS = ["#6c63ff","#22d3ee","#f472b6","#34d399","#fb923c","#60a5fa","#a78bfa","#fbbf24","#f87171","#2dd4bf"];

  const groups = users
    .filter(u => u.role === "group")
    .map((u, i) => ({ id: u.id, name: u.name, color: u.color || GROUP_COLORS[i % GROUP_COLORS.length] }));

  useEffect(() => { localStorage.setItem("ff_programs",      JSON.stringify(programs));      }, [programs]);
  useEffect(() => { localStorage.setItem("ff_students",      JSON.stringify(students));      }, [students]);
  useEffect(() => { localStorage.setItem("ff_registrations", JSON.stringify(registrations)); }, [registrations]);
  useEffect(() => { localStorage.setItem("ff_users",         JSON.stringify(users));         }, [users]);
  useEffect(() => { localStorage.setItem("ff_logs",          JSON.stringify(activityLogs));  }, [activityLogs]);
  useEffect(() => { localStorage.setItem("ff_locks",         JSON.stringify(locks));         }, [locks]);
  useEffect(() => { localStorage.setItem("ff_messages",      JSON.stringify(messages));      }, [messages]);

  const logActivity = (userName, action, details) => {
    const newLog = { id: "log-" + Date.now() + Math.random().toString(36).substr(2, 4), timestamp: new Date().toISOString(), userName, action, details };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 500));
  };

  const clearLogs = () => setActivityLogs([]);

  const toggleLock = (groupId, session) => {
    setLocks(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || {}), [session]: !(prev[groupId]?.[session]) } }));
  };
  const isLocked = (groupId, session) => !!(locks[groupId]?.[session]);

  const sendMessage = (from, fromName, to, text) => {
    const msg = { id: "msg-" + Date.now() + Math.random().toString(36).substr(2, 4), from, fromName, to, text, timestamp: new Date().toISOString(), read: false, deletedFor: [] };
    setMessages(prev => [...prev, msg]);
  };

  const deleteMessage = (id, mode, userId) => {
    setMessages(prev => prev
      .map(m => { if (m.id !== id) return m; if (mode === "everyone") return null; return { ...m, deletedFor: [...(m.deletedFor || []), userId] }; })
      .filter(Boolean)
    );
  };

  const markRead = (toId) => {
    setMessages(prev => prev.map(m => m.to === toId && !m.read ? { ...m, read: true } : m));
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
      activityLogs, setActivityLogs, logActivity, clearLogs,
      messages, setMessages, sendMessage, markRead, deleteMessage,
      locks, toggleLock, isLocked,
      nextChestNo,
    }}>
      {children}
    </AppContext.Provider>
  );
};
