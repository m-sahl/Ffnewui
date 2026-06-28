import { createContext, useContext, useState, useEffect } from "react";

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
export const INITIAL_GROUPS = [
  { id: "g1", name: "Group 1", color: "#6c63ff" },
  { id: "g2", name: "Group 2", color: "#22d3ee" },
  { id: "g3", name: "Group 3", color: "#f472b6" },
];

export const INITIAL_USERS = [
  { id: "u-admin", name: "System Admin", role: "admin", pin: "admin" },
  { id: "u-g1", name: "Group 1", role: "group", pin: "123", groupId: "u-g1" },
  { id: "u-g2", name: "Group 2", role: "group", pin: "123", groupId: "u-g2" },
  { id: "u-g3", name: "Group 3", role: "group", pin: "123", groupId: "u-g3" },
];

const OLD_GROUP_NAMES = { g1: "Group 1", g2: "Group 2", g3: "Group 3" };

const migrateUsers = (saved) => saved.map(u => {
  if (u.role === "leader") {
    const name = OLD_GROUP_NAMES[u.groupId] || u.name;
    return { ...u, role: "group", name, groupId: u.id };
  }
  return u;
});

const migrateStudents = (saved) => {
  if (!saved || typeof saved !== "object") return saved;
  const migrated = {};
  Object.keys(saved).forEach(key => {
    const newKey = key === "g1" ? "u-g1" : key === "g2" ? "u-g2" : key === "g3" ? "u-g3" : key;
    migrated[newKey] = saved[key];
  });
  return migrated;
};

const migrateRegistrations = (saved) => {
  if (!Array.isArray(saved)) return saved;
  return saved.map(r => {
    if (r.groupId === "g1") return { ...r, groupId: "u-g1" };
    if (r.groupId === "g2") return { ...r, groupId: "u-g2" };
    if (r.groupId === "g3") return { ...r, groupId: "u-g3" };
    return r;
  });
};

export const INITIAL_PROGRAMS = [];
export const INITIAL_STUDENTS = {
  "u-g1": [
    { id: "s1", name: "Arjun Nair",    category: "Senior",    chestNo: "301", groupRole: "Leader" },
    { id: "s2", name: "Priya Menon",   category: "Junior",    chestNo: "201", groupRole: "Asst. Leader" },
  ],
  "u-g2": [
    { id: "s3", name: "Rohan Das",     category: "Senior",    chestNo: "302", groupRole: "Leader" },
    { id: "s4", name: "Sneha Pillai",  category: "Sub-Junior",chestNo: "101" },
  ],
  "u-g3": [
    { id: "s5", name: "Kavya Iyer",    category: "Junior",    chestNo: "202", groupRole: "Leader" },
  ],
};
export const INITIAL_REGISTRATIONS = [];

// ─── MESSAGE MODEL ─────────────────────────────────────────────────────────────
// { id, from: "admin"|groupId, fromName, to: "admin"|groupId, text, timestamp, read }

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [programs, setPrograms] = useState(() => {
    try { const s = localStorage.getItem("ff_programs"); return s ? JSON.parse(s) : INITIAL_PROGRAMS; } catch { return INITIAL_PROGRAMS; }
  });
  const [students, setStudents] = useState(() => {
    try { const s = localStorage.getItem("ff_students"); return s ? migrateStudents(JSON.parse(s)) : INITIAL_STUDENTS; } catch { return INITIAL_STUDENTS; }
  });
  const [registrations, setRegistrations] = useState(() => {
    try { const s = localStorage.getItem("ff_registrations"); return s ? migrateRegistrations(JSON.parse(s)) : INITIAL_REGISTRATIONS; } catch { return INITIAL_REGISTRATIONS; }
  });
  const [users, setUsers] = useState(() => {
    try {
      const s = localStorage.getItem("ff_users");
      const parsed = s ? migrateUsers(JSON.parse(s)) : INITIAL_USERS;
      // Always ensure admin exists with correct credentials
      const hasAdmin = parsed.some(u => u.role === "admin");
      if (!hasAdmin) return [INITIAL_USERS[0], ...parsed];
      return parsed;
    } catch { return INITIAL_USERS; }
  });
  const [activityLogs, setActivityLogs] = useState(() => {
    try { const s = localStorage.getItem("ff_logs"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [messages, setMessages] = useState(() => {
    try { const s = localStorage.getItem("ff_messages"); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const GROUP_COLORS = [
    "#6c63ff","#22d3ee","#f472b6","#34d399",
    "#fb923c","#60a5fa","#a78bfa","#fbbf24",
    "#f87171","#2dd4bf",
  ];

  const groups = users
    .filter(u => u.role === "group")
    .map((u, index) => ({ id: u.id, name: u.name, color: u.color || GROUP_COLORS[index % GROUP_COLORS.length] }));

  useEffect(() => { localStorage.setItem("ff_programs",      JSON.stringify(programs));      }, [programs]);
  useEffect(() => { localStorage.setItem("ff_students",      JSON.stringify(students));      }, [students]);
  useEffect(() => { localStorage.setItem("ff_registrations", JSON.stringify(registrations)); }, [registrations]);
  useEffect(() => { localStorage.setItem("ff_users",         JSON.stringify(users));         }, [users]);
  useEffect(() => { localStorage.setItem("ff_logs",          JSON.stringify(activityLogs));  }, [activityLogs]);
  useEffect(() => { localStorage.setItem("ff_messages",      JSON.stringify(messages));      }, [messages]);

  const logActivity = (userName, action, details) => {
    const newLog = { id: "log-" + Date.now() + Math.random().toString(36).substr(2,4), timestamp: new Date().toISOString(), userName, action, details };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 500));
  };

  const sendMessage = (from, fromName, to, text) => {
    const msg = { id: "msg-" + Date.now() + Math.random().toString(36).substr(2,4), from, fromName, to, text, timestamp: new Date().toISOString(), read: false, deletedFor: [] };
    setMessages(prev => [...prev, msg]);
  };

  // Delete for me: adds userId to deletedFor array (soft delete)
  // Delete for everyone: removes message entirely
  const deleteMessage = (id, mode, userId) => {
    setMessages(prev => prev
      .map(m => {
        if (m.id !== id) return m;
        if (mode === "everyone") return null;
        return { ...m, deletedFor: [...(m.deletedFor || []), userId] };
      })
      .filter(Boolean)
    );
  };

  const markRead = (toId) => {
    setMessages(prev => prev.map(m => m.to === toId && !m.read ? { ...m, read: true } : m));
  };

  return (
    <AppContext.Provider value={{
      groups, programs, setPrograms,
      students, setStudents,
      registrations, setRegistrations,
      users, setUsers,
      activityLogs, setActivityLogs,
      logActivity,
      messages, setMessages, sendMessage, markRead, deleteMessage,
    }}>
      {children}
    </AppContext.Provider>
  );
};
