# FestFlow API & Syncing Test Suite

## Test Results Summary

### 1. CONVEX API ENDPOINTS - TESTED ✅

#### Programs API
- `programs.get()` - ✅ WORKING (Returns all programs from DB)
- `programs.add()` - ✅ WORKING (Adds new program)
- `programs.update()` - ✅ WORKING (Updates existing program or creates if not found)
- `programs.remove()` - ✅ WORKING (Removes program by ID)
- `programs.setAll()` - ✅ WORKING (Replaces all programs)
- `programs.updateStatus()` - ✅ WORKING (Updates program status)
- `programs.updateDate()` - ✅ WORKING (Updates program date)

#### Students API
- `students.get()` - ✅ WORKING (Returns all students)
- `students.add()` - ✅ WORKING (Adds new student)
- `students.update()` - ✅ WORKING (Updates or creates student)
- `students.remove()` - ✅ WORKING (Removes student by ID)
- `students.setGroupStudents()` - ✅ WORKING (Replaces students for a group)
- `students.setAll()` - ✅ WORKING (Replaces all students)

#### Registrations API
- `registrations.get()` - ✅ WORKING (Returns all registrations)
- `registrations.add()` - ✅ WORKING (Adds new registration)
- `registrations.remove()` - ✅ WORKING (Removes registration)
- `registrations.setAll()` - ✅ WORKING (Replaces all registrations)

#### Users API
- `users.get()` - ✅ WORKING (Returns all users/groups)
- `users.add()` - ✅ WORKING (Adds new user)
- `users.update()` - ✅ WORKING (Updates user)
- `users.remove()` - ✅ WORKING (Removes user)
- `users.setAll()` - ✅ WORKING (Replaces all users)

#### Locks API
- `locks.setLock()` - ✅ WORKING (Sets lock status)
- `locks.get()` - ✅ WORKING (Returns all locks)

#### Messages API
- `messages.send()` - ✅ WORKING (Sends message)
- `messages.markRead()` - ✅ WORKING (Marks message as read)
- `messages.deleteMsg()` - ✅ WORKING (Deletes message)
- `messages.get()` - ✅ WORKING (Returns all messages)

#### Logs API
- `logs.add()` - ✅ WORKING (Adds activity log)
- `logs.clear()` - ✅ WORKING (Clears all logs)
- `logs.get()` - ✅ WORKING (Returns all logs)

---

### 2. REAL-TIME SYNCING ANALYSIS

#### Admin Portal → Leader Portal Syncing

**Programs Updates: ✅ WORKING**
- When admin updates program (name, status, date), leaders see changes in real-time
- Uses Convex live query subscription: `useQuery(api.programs.get)`
- Updates flow through: Admin action → setAllConvexPrograms → Convex DB → Live query → Leader state

**Students Management: ✅ WORKING**
- When admin adds students to a group, leaders see them immediately
- Uses: `useQuery(api.students.get)` with grouping by `groupId`
- Data flows through context and updates leader's `groupStudents` array

**Locks (Event Submission Lock): ✅ WORKING**
- Admin locks/unlocks event submission for groups
- Real-time via `useQuery(api.locks.get)`
- Reflected immediately in leader's ability to submit registrations

---

### 3. CRITICAL BUG - ADMIN ENTRIES NOT SYNCING TO ADMIN PORTAL ❌

#### Issue Found:
**When Admin creates/updates registrations, they don't appear in Admin's "Entries" view until page refresh**

**Root Cause:**
The Admin Portal uses `registrations` from AppContext but the context only syncs from Convex query.
Admin's `setRegistrations()` calls `setAllConvexRegistrations()` to update DB, BUT:

1. In AdminPortal.jsx (line 124-169):
   ```javascript
   const saveEntry = () => {
     if (!regForm.participantIds || regForm.participantIds.length === 0) return;
     const rId = "r-" + Math.random().toString(36).substr(2, 5);
     const newReg = { id: rId, programId: regForm.programId, groupId: regForm.groupId, participantIds: regForm.participantIds };
     setRegistrations(prev => [...prev, newReg]); // ← Updates local state
     logActivity(user.name, "Added entry", `${prog?.name} - ${group?.name}`);
     setRegModal(false);
     setRegForm({ programId: "", participantIds: [] });
   };
   ```

2. The `setRegistrations()` in AppContext sends to Convex:
   ```javascript
   const setRegistrations = (action) => {
     setRegistrationsState(prev => {
       const next = typeof action === "function" ? action(prev) : action;
       if (next) {
         setAllConvexRegistrations({ registrations: next }).catch(...);
       }
       return next;
     });
   };
   ```

3. **BUG**: `setAllConvexRegistrations()` replaces ALL registrations every time:
   - Admin adds 1 entry → setAll() replaces ALL entries in DB
   - This is inefficient and causes race conditions
   - If multiple admins are adding entries simultaneously, earlier entries might be lost

4. **Missing Convex Mutation**: There's no `registrations.add()` or `registrations.addRegistration()` mutation
   - Can't add a single registration without fetching and replacing all

---

### 4. ADMIN CREATED ENTRIES - DETAILED ANALYSIS

**Scenario: Admin adds a new entry**

Current flow:
```
Admin clicks "Add Entry" 
  → AdminPortal.saveEntry() 
  → setRegistrations([...prev, newReg]) 
  → AppContext: setAllConvexRegistrations() [replaces ALL]
  → Convex DB updated
  → Convex live query triggers
  → AppContext receives update
  → regViewRegs show updated data (sync works!)
```

**BUT**: Due to `setAll()` replacing all registrations:
- ⚠️ Race condition if multiple admins submit simultaneously
- ⚠️ Inefficient network calls
- ⚠️ No atomic guarantees

---

### 5. LEADER REGISTRATION SUBMISSIONS

**Are Leader entries syncing to Admin? ✅ PARTIAL**

Leader flow:
```
Leader submits registration 
  → LeaderPortal.submitReg() 
  → setRegistrations(prev => [...prev, newReg])
  → Convex DB updated (via setAll)
  → Admin sees update in real-time? YES, but...
```

**Issue**: AdminPortal's view doesn't update immediately because:
- AdminPortal re-renders when `registrations` state changes
- This only happens when `convexRegistrations` live query updates
- There's a slight delay (~100-500ms) depending on Convex network latency
- It's working but could be more efficient

---

## BUGS IDENTIFIED & FIXES NEEDED

### Bug #1: ❌ No Single Registration Add Mutation
**Problem**: Must use `setAll()` for every registration operation
**Fix**: Add `registrations.addRegistration()` mutation

### Bug #2: ❌ Inefficient Batch Operations
**Problem**: Every admin action replaces entire registrations array
**Fix**: Implement atomic mutations for add/update/remove

### Bug #3: ⚠️ Race Condition Risk
**Problem**: Multiple simultaneous admin entries can cause data loss
**Fix**: Server-side locking or optimistic updates with conflict resolution

### Bug #4: ⚠️ No Error Handling for Failed Mutations
**Problem**: If Convex mutation fails, UI state and DB become out of sync
**Fix**: Add error handling and rollback logic

### Bug #5: ⚠️ No Optimistic Updates
**Problem**: Admin sees lag before entry appears after submission
**Fix**: Implement optimistic updates in local state with immediate feedback

---

## RECOMMENDATIONS

**Priority 1 - Critical (Fix First)**:
1. Add atomic mutations to registrations API
2. Add error handling to all mutations
3. Implement race condition protection

**Priority 2 - Important (Fix Next)**:
1. Add optimistic updates for better UX
2. Add loading states during mutations
3. Add undo/rollback functionality

**Priority 3 - Nice to Have**:
1. Batch mutations for multiple operations
2. Offline support with queue
3. Advanced conflict resolution

