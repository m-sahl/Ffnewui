import { createContext, useContext } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // ── Live queries (auto-update in realtime) ──────────────────────────────
  const groups        = useQuery(api.users.listGroups) ?? [];
  const users         = useQuery(api.users.list) ?? [];
  const students       = useQuery(api.students.listAll) ?? [];
  const programs       = useQuery(api.programs.list) ?? [];
  const registrations  = useQuery(api.registrations.list) ?? [];
  const locksList      = useQuery(api.locks.list) ?? [];
  const messages        = useQuery(api.messages.list) ?? [];
  const activityLogs    = useQuery(api.activityLogs.list) ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────
  const addGroupMut       = useMutation(api.users.addGroup);
  const editGroupMut      = useMutation(api.users.editGroup);
  const deleteGroupMut    = useMutation(api.users.deleteGroup);
  const changeAdminPinMut = useMutation(api.users.changeAdminPassword);

  const addStudentMut     = useMutation(api.students.add);
  const updateRoleMut     = useMutation(api.students.updateRole);
  const removeStudentMut  = useMutation(api.students.remove);

  const addProgramMut     = useMutation(api.programs.add);
  const editProgramMut    = useMutation(api.programs.edit);
  const removeProgramMut  = useMutation(api.programs.remove);

  const addRegMut         = useMutation(api.registrations.add);
  const editRegMut        = useMutation(api.registrations.edit);
  const removeRegMut      = useMutation(api.registrations.remove);

  const toggleLockMut     = useMutation(api.locks.toggle);

  const sendMessageMut    = useMutation(api.messages.send);
  const markReadMut       = useMutation(api.messages.markRead);
  const deleteMessageMut  = useMutation(api.messages.deleteMessage);
  const clearChatMut      = useMutation(api.messages.clearChat);

  const addLogMut         = useMutation(api.activityLogs.add);
  const clearLogsMut      = useMutation(api.activityLogs.clear);

  // ── Students grouped by groupId — same shape the old code expects: { [groupId]: [students] } ──
  const studentsByGroup = {};
  for (const s of students) {
    if (!studentsByGroup[s.groupId]) studentsByGroup[s.groupId] = [];
    studentsByGroup[s.groupId].push(s);
  }

  // ── Helpers that mirror the old API ─────────────────────────────────────
  const logActivity = (userName, action, details) => {
    addLogMut({ userName, action, details });
  };
  const clearLogs = () => clearLogsMut();

  const isLocked = (groupId, session) => {
    const entry = locksList.find(l => l.groupId === groupId && l.session === session);
    return !!entry?.locked;
  };
  const toggleLock = (groupId, session) => toggleLockMut({ groupId, session });

  const sendMessage = (from, fromName, to, text) => sendMessageMut({ from, fromName, to, text });
  const markRead     = (toId) => markReadMut({ toId });
  const deleteMessage = (id, mode, userId) => deleteMessageMut({ id, mode, userId });

  // ── Student CRUD wrapper to mirror old setStudents-style usage ─────────
  const addStudent    = (groupId, name, category) => addStudentMut({ groupId, name, category });
  const updateStudentRole = (id, groupRole) => updateRoleMut({ id, groupRole });
  const deleteStudent = (id) => removeStudentMut({ id });

  // ── Program CRUD ─────────────────────────────────────────────────────────
  const addProgram    = (data) => addProgramMut(data);
  const editProgram   = (id, data) => editProgramMut({ id, ...data });
  const deleteProgram = (id) => removeProgramMut({ id });

  // ── Registration CRUD ────────────────────────────────────────────────────
  const addRegistration    = (groupId, programId, participantIds) => addRegMut({ groupId, programId, participantIds });
  const editRegistration   = (id, participantIds) => editRegMut({ id, participantIds });
  const deleteRegistration = (id) => removeRegMut({ id });

  // ── Group CRUD ───────────────────────────────────────────────────────────
  const addGroup    = (name, pin) => addGroupMut({ name, pin });
  const editGroup   = (id, name, pin) => editGroupMut({ id, name, pin });
  const deleteGroup = (id) => deleteGroupMut({ id });
  const changeAdminPassword = (newPin) => changeAdminPinMut({ newPin });

  return (
    <AppContext.Provider value={{
      groups, users, students: studentsByGroup, studentsFlat: students,
      programs, registrations, messages, activityLogs,

      addStudent, updateStudentRole, deleteStudent,
      addProgram, editProgram, deleteProgram,
      addRegistration, editRegistration, deleteRegistration,
      addGroup, editGroup, deleteGroup, changeAdminPassword,

      logActivity, clearLogs,
      toggleLock, isLocked,
      sendMessage, markRead, deleteMessage, clearChat: clearChatMut,
    }}>
      {children}
    </AppContext.Provider>
  );
};
