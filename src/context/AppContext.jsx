import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toUploadBlob } from "../utils/media";

export const INITIAL_PROGRAMS      = [];
export const INITIAL_STUDENTS      = {};
export const INITIAL_REGISTRATIONS = [];

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children, token }) => {
  // Every data query needs a valid session token; skipped until the user logs in.
  const auth = token ? { token } : "skip";
  const convexPrograms      = useQuery(api.programs.get, auth);
  const convexStudents      = useQuery(api.students.get, auth);
  const convexRegistrations = useQuery(api.registrations.get, auth);
  const convexLocks         = useQuery(api.locks.get, auth);
  const convexMessages      = useQuery(api.messages.get, auth);   // server scopes this to the caller
  const convexLogs          = useQuery(api.logs.get, auth);       // admin only
  const convexUsers         = useQuery(api.users.listPublic);     // public: groups only, never PINs

  // Attach the session token to every mutation call
  const authed = (m) => (args = {}) => m({ ...args, token });

  const setAllConvexPrograms      = authed(useMutation(api.programs.setAll));
  const addConvexProgram          = authed(useMutation(api.programs.add));
  const updateConvexProgram       = authed(useMutation(api.programs.update));
  const removeConvexProgram       = authed(useMutation(api.programs.remove));

  const setGroupConvexStudents    = authed(useMutation(api.students.setGroupStudents));
  const updateConvexStudent       = authed(useMutation(api.students.update));

  const addConvexRegistration     = authed(useMutation(api.registrations.addRegistration));
  const updateConvexRegistration  = authed(useMutation(api.registrations.update));
  const removeConvexRegistration  = authed(useMutation(api.registrations.remove));
  const setAllConvexRegistrations = authed(useMutation(api.registrations.setAll));

  const addConvexUser             = authed(useMutation(api.users.add));
  const updateConvexUser          = authed(useMutation(api.users.update));
  const removeConvexUser          = authed(useMutation(api.users.remove));
  const changeConvexPassword      = authed(useMutation(api.auth.changePassword));

  const setConvexLock             = authed(useMutation(api.locks.setLock));
  const sendConvexMessage         = authed(useMutation(api.messages.send));
  const getUploadUrl              = authed(useMutation(api.messages.generateUploadUrl));
  const markConvexMessageRead     = authed(useMutation(api.messages.markRead));
  const deleteConvexMessage       = authed(useMutation(api.messages.deleteMsg));
  const addConvexLog              = authed(useMutation(api.logs.add));
  const clearConvexLogs           = authed(useMutation(api.logs.clear));

  // Local state mirrors the live queries. No localStorage cache: private data
  // (messages, rosters) must not persist on the device after logout.
  const [programs, setProgramsState]           = useState(INITIAL_PROGRAMS);
  const [students, setStudentsState]           = useState(INITIAL_STUDENTS);
  const [registrations, setRegistrationsState] = useState(INITIAL_REGISTRATIONS);
  const [users, setUsersState]                 = useState([]);
  const [activityLogs, setActivityLogsState]   = useState([]);
  const [locks, setLocksState]                 = useState({});
  const [messages, setMessagesState]           = useState([]);

  // Sync Convex real-time queries into local state
  useEffect(() => {
    if (Array.isArray(convexPrograms)) {
      setProgramsState(convexPrograms.map((p, i) => (p.order !== undefined && p.order !== null) ? p : { ...p, order: i + 1 }));
    }
  }, [convexPrograms]);

  useEffect(() => {
    if (Array.isArray(convexStudents)) {
      const grouped = {};
      for (const st of convexStudents) {
        if (!grouped[st.groupId]) grouped[st.groupId] = [];
        grouped[st.groupId].push(st);
      }
      setStudentsState(grouped);
    }
  }, [convexStudents]);

  useEffect(() => {
    if (Array.isArray(convexRegistrations)) setRegistrationsState(convexRegistrations);
  }, [convexRegistrations]);

  useEffect(() => {
    if (Array.isArray(convexUsers)) setUsersState(convexUsers);
  }, [convexUsers]);

  useEffect(() => {
    if (Array.isArray(convexLocks)) {
      const lockMap = {};
      for (const l of convexLocks) {
        if (!l) continue;
        const key = (l.type || `${l.groupId}_${l.session}`).toLowerCase();
        if (key) lockMap[key] = !!l.locked;
      }
      setLocksState(lockMap);
    }
  }, [convexLocks]);

  useEffect(() => {
    if (Array.isArray(convexMessages)) setMessagesState(convexMessages);
  }, [convexMessages]);

  useEffect(() => {
    if (Array.isArray(convexLogs)) setActivityLogsState(convexLogs);
  }, [convexLogs]);

  const GROUP_COLORS = ["#f14d4d", "#3b82f6", "#f59e0b", "#1dd183", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

  const groups = useMemo(() => users
    .filter(u => u.role === "group")
    .map((u, i) => ({ id: u.id, name: u.name, color: u.color || GROUP_COLORS[i % GROUP_COLORS.length] })), [users]);

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

  const updateStudent = (groupId, studentId, patch) => {
    let targetStudent = null;
    let demotedStudent = null;

    setStudentsState(prev => {
      const list = prev[groupId] || [];
      const updatedList = list.map(s => {
        if (s.id === studentId) {
          targetStudent = { ...s, ...patch };
          return targetStudent;
        }
        if (patch.groupRole === "Leader" && s.groupRole === "Leader") {
          demotedStudent = { ...s, groupRole: "Member" };
          return demotedStudent;
        }
        if (patch.groupRole === "Asst. Leader" && s.groupRole === "Asst. Leader") {
          demotedStudent = { ...s, groupRole: "Member" };
          return demotedStudent;
        }
        return s;
      });
      return { ...prev, [groupId]: updatedList };
    });

    if (targetStudent) {
      updateConvexStudent({ id: studentId, student: { ...targetStudent, groupId } })
        .catch(err => console.error("Convex updateStudent error:", err));
    }
    if (demotedStudent) {
      updateConvexStudent({ id: demotedStudent.id, student: { ...demotedStudent, groupId } })
        .catch(err => console.error("Convex demotedStudent update error:", err));
    }
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

  // New atomic add function
  const addRegistration = (newReg) => {
    setRegistrationsState(prev => [...prev, newReg]);
    addConvexRegistration({ registration: newReg }).catch(err => {
      console.error("Convex addRegistration error:", err);
      // Rollback on error
      setRegistrationsState(prev => prev.filter(r => r.id !== newReg.id));
    });
  };

  // New atomic update function
  const updateRegistration = (id, updatedReg) => {
    setRegistrationsState(prev => prev.map(r => r.id === id ? { ...r, ...updatedReg } : r));
    updateConvexRegistration({ id, registration: updatedReg }).catch(err => {
      console.error("Convex updateRegistration error:", err);
      // Rollback - refresh from Convex
      setRegistrationsState(prev => prev); // Keep current, will sync from live query
    });
  };

  // New atomic remove function
  const removeRegistration = (id) => {
    setRegistrationsState(prev => prev.filter(r => r.id !== id));
    removeConvexRegistration({ id }).catch(err => {
      console.error("Convex removeRegistration error:", err);
      // On error, refresh from Convex
      setRegistrationsState(prev => prev);
    });
  };

  // PINs are sent once to the server (which hashes them) and never kept in client state
  const addUser = (newUser) => {
    const { pin, ...safe } = newUser;
    setUsersState(prev => [...prev, { ...safe, role: "group", groupId: newUser.id, pinLength: pin?.length }]);
    const user = { id: newUser.id, name: newUser.name, pin };
    if (newUser.color) user.color = newUser.color;
    addConvexUser({ user }).catch(err => console.error("Convex addUser error:", err));
  };

  const updateUser = (id, patch) => {
    const { pin, ...safe } = patch;
    setUsersState(prev => prev.map(u => u.id === id ? { ...u, ...safe, ...(pin ? { pinLength: pin.length } : {}) } : u));
    const user = {};
    if (patch.name !== undefined)  user.name = patch.name;
    if (patch.color !== undefined) user.color = patch.color;
    if (pin) user.pin = pin;
    updateConvexUser({ id, user }).catch(err => console.error("Convex updateUser error:", err));
  };

  const deleteUser = (id) => {
    setUsersState(prev => prev.filter(u => u.id !== id));
    removeConvexUser({ id }).catch(err => console.error("Convex deleteUser error:", err));
  };

  // Admin password change (rejects on failure so the UI can show an error)
  const changePassword = (newPassword) => changeConvexPassword({ newPassword });

  const logActivity = (userName, action, details) => {
    const newLog = { id: "log-" + Date.now() + Math.random().toString(36).substr(2, 4), timestamp: Date.now(), user: userName, action, details };
    setActivityLogsState(prev => [newLog, ...prev].slice(0, 500));
    addConvexLog({ id: newLog.id, action, details, timestamp: newLog.timestamp }).catch(err => console.error("Convex log error:", err));
  };

  const clearLogs = () => {
    setActivityLogsState([]);
    clearConvexLogs().catch(err => console.error("Convex clearLogs error:", err));
  };

  const toggleLock = (groupId, session) => {
    if (!groupId || !session) return;
    const key = `${groupId}_${session}`.toLowerCase();
    const current = !!locks[key];
    const newLocked = !current;

    setLocksState(prev => ({
      ...prev,
      [key]: newLocked
    }));

    setConvexLock({ groupId, session, locked: newLocked, type: key })
      .catch(err => console.error("Convex toggleLock error:", err));
  };

  const isLocked = (groupId, session) => {
    if (!groupId || !session) return false;
    const key = `${groupId}_${session}`.toLowerCase();
    return !!locks[key];
  };

  const sendMessage = (from, fromName, to, text, extra = {}) => {
    const msg = { id: "msg-" + Date.now() + Math.random().toString(36).substr(2, 4), groupId: to || from, from, fromName: fromName || from, to: to || "", text, timestamp: Date.now(), read: false, ...extra };
    setMessagesState(prev => [...prev, msg]); // optimistic: shows the local data URL instantly
    (async () => {
      const payload = { ...msg };
      if (msg.mediaUrl?.startsWith("data:")) {
        // Upload the file to Convex storage; the message then carries only a storage id
        const blob = await toUploadBlob(msg.mediaUrl, msg.mediaType);
        const res = await fetch(await getUploadUrl(), { method: "POST", headers: { "Content-Type": blob.type || (msg.mediaType === "image" ? "image/jpeg" : "audio/webm") }, body: blob });
        if (!res.ok) throw new Error("Upload failed");
        const { storageId } = await res.json();
        payload.mediaStorageId = storageId;
        delete payload.mediaUrl;
      }
      await sendConvexMessage(payload);
    })().catch(err => {
      console.error("Convex sendMessage error:", err);
      setMessagesState(prev => prev.filter(m => m.id !== msg.id)); // roll back the optimistic message
    });
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
    const base    = { "Sub-Junior": 100, "Junior": 200, "Senior": 300 };
    const allInCat = Object.values(students).flat().filter(s => s.category === category);
    const maxUsed  = allInCat.reduce((max, s) => Math.max(max, parseInt(s.chestNo) || 0), base[category] || 100);
    return (maxUsed + 1).toString();
  };

  // Consumers re-render only when data (or the session) actually changes. Every function in here either
  // uses functional setState or reads one of these deps, so no stale closures.
  const value = useMemo(() => ({
      groups, programs, setPrograms, addProgram, updateProgram, deleteProgram,
      students, setStudents, updateStudent,
      registrations, setRegistrations, addRegistration, updateRegistration, removeRegistration,
      users, addUser, updateUser, deleteUser, changePassword,
      activityLogs, setActivityLogs: setActivityLogsState, logActivity, clearLogs,
      messages, setMessages: setMessagesState, sendMessage, markRead, deleteMessage,
      locks, toggleLock, isLocked,
      nextChestNo,
  }), [groups, programs, students, registrations, users, activityLogs, messages, locks, token]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
