import React, { useState, useEffect, useMemo } from "react";
import Ic from "../common/Ic";
import { getProgramLots } from "../../utils/lotUtils";

export default function CodeLetterModal({
  open,
  onClose,
  program,
  students = {},
  groups = [],
  registrations = [],
  onSave,
  dark = false,
}) {
  const [entries, setEntries] = useState([]);
  const [initialEntries, setInitialEntries] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Theme colors
  const theme = useMemo(() => {
    return dark
      ? {
          bg: "#121422",
          card: "#191c2e",
          cardBorder: "rgba(255,255,255,0.08)",
          text: "#f3f4f6",
          subtext: "#9ca3af",
          inputBg: "rgba(255,255,255,0.05)",
          inputBorder: "rgba(255,255,255,0.15)",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.15)",
        }
      : {
          bg: "#ffffff",
          card: "#f8fafc",
          cardBorder: "rgba(0,0,0,0.08)",
          text: "#0f172a",
          subtext: "#64748b",
          inputBg: "#ffffff",
          inputBorder: "#e2e8f0",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.1)",
        };
  }, [dark]);

  // Registered students for this program
  const registeredContestants = useMemo(() => {
    if (!program) return [];
    const progRegs = registrations.filter((r) => r.programId === program.id);
    const list = [];
    const seen = new Set();

    progRegs.forEach((reg) => {
      const grp = groups.find((g) => g.id === reg.groupId);
      const grpStudents = students[reg.groupId] || [];
      const parts = (reg.participantIds || []).map((pId) => grpStudents.find((s) => s.id === pId)).filter(Boolean);

      parts.forEach((st) => {
        if (!seen.has(String(st.id))) {
          seen.add(String(st.id));
          list.push({
            studentId: String(st.id),
            name: st.name,
            chestNo: String(st.chestNo || ""),
            groupId: reg.groupId,
            groupName: grp?.name || "",
            groupColor: grp?.color || "",
          });
        }
      });
    });

    return list;
  }, [program, registrations, groups, students]);

  // Load contestants and their assigned code letters from program
  useEffect(() => {
    if (!open || !program) return;

    const existingLots = getProgramLots(program);
    const mapByStudentId = new Map();
    const mapByChestNo = new Map();

    existingLots.forEach((item) => {
      const letter = String(item.codeLetter || "").toUpperCase().trim();
      if (item.studentId) mapByStudentId.set(String(item.studentId), letter);
      if (item.chestNo) mapByChestNo.set(String(item.chestNo), letter);
    });

    const list = [];
    const seenStudentIds = new Set();
    const seenChestNos = new Set();

    // 1. All registered contestants
    registeredContestants.forEach((st) => {
      seenStudentIds.add(String(st.studentId));
      if (st.chestNo) seenChestNos.add(String(st.chestNo));

      const assignedLetter =
        mapByStudentId.get(String(st.studentId)) ||
        (st.chestNo ? mapByChestNo.get(String(st.chestNo)) : "") ||
        "";

      list.push({
        studentId: String(st.studentId),
        name: st.name,
        chestNo: String(st.chestNo || ""),
        groupId: st.groupId || "",
        groupName: st.groupName || "",
        groupColor: st.groupColor || "",
        codeLetter: assignedLetter,
      });
    });

    // 2. Any participants present in existing lots (e.g. synced from desktop app) not in registered list
    existingLots.forEach((item, idx) => {
      const sId = item.studentId ? String(item.studentId) : "";
      const chest = item.chestNo ? String(item.chestNo) : "";

      if ((sId && seenStudentIds.has(sId)) || (chest && seenChestNos.has(chest))) {
        return;
      }

      let matchedStudent = null;
      if (sId) {
        for (const grpStudents of Object.values(students)) {
          const found = (grpStudents || []).find((s) => String(s.id) === sId);
          if (found) { matchedStudent = found; break; }
        }
      }
      if (!matchedStudent && chest) {
        for (const grpStudents of Object.values(students)) {
          const found = (grpStudents || []).find((s) => String(s.chestNo) === chest);
          if (found) { matchedStudent = found; break; }
        }
      }

      const grp = matchedStudent ? groups.find((g) => g.id === matchedStudent.groupId) : null;
      const letter = String(item.codeLetter || "").toUpperCase().trim();

      list.push({
        studentId: sId || matchedStudent?.id || `desk_${idx}`,
        name: item.name || item.studentName || matchedStudent?.name || `Contestant ${letter || idx + 1}`,
        chestNo: chest || matchedStudent?.chestNo || "",
        groupId: matchedStudent?.groupId || item.groupId || grp?.id || "",
        groupName: grp?.name || item.groupName || "",
        groupColor: grp?.color || item.groupColor || theme.accent,
        codeLetter: letter,
      });
    });

    setEntries(list);
    setInitialEntries(list.map((e) => ({ ...e })));
    setShowConfirmDialog(false);
    setSaveSuccess(false);
  }, [open, program, registeredContestants, students, groups, theme.accent]);

  if (!open || !program) return null;

  // Validation: Check for duplicates
  const duplicateLetters = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      const l = (e.codeLetter || "").toUpperCase().trim();
      if (l) counts[l] = (counts[l] || 0) + 1;
    });
    const dupes = new Set();
    Object.keys(counts).forEach((k) => {
      if (counts[k] > 1) dupes.add(k);
    });
    return dupes;
  }, [entries]);

  // Track if any code letters were modified by the admin
  const changedEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const orig = initialEntries.find(
          (init) =>
            (e.studentId && init.studentId === e.studentId) ||
            (e.chestNo && init.chestNo === e.chestNo)
        );
        const origCode = (orig?.codeLetter || "").toUpperCase().trim();
        const currCode = (e.codeLetter || "").toUpperCase().trim();
        return origCode !== currCode;
      })
      .map((e) => {
        const orig = initialEntries.find(
          (init) =>
            (e.studentId && init.studentId === e.studentId) ||
            (e.chestNo && init.chestNo === e.chestNo)
        );
        return {
          ...e,
          oldCode: (orig?.codeLetter || "").toUpperCase().trim() || "—",
          newCode: (e.codeLetter || "").toUpperCase().trim() || "—",
        };
      });
  }, [entries, initialEntries]);

  const hasChanges = changedEntries.length > 0;

  const handleLetterChange = (idx, value) => {
    const val = value.toUpperCase().slice(0, 3);
    setEntries((prev) => prev.map((item, i) => (i === idx ? { ...item, codeLetter: val } : item)));
  };

  const executeSave = async () => {
    setIsSaving(true);
    try {
      const formattedCodeLetters = entries
        .filter((e) => e.codeLetter && e.codeLetter.trim())
        .map((e) => ({
          codeLetter: e.codeLetter.toUpperCase().trim(),
          chestNo: String(e.chestNo || "").trim(),
          studentId: e.studentId ? String(e.studentId) : undefined,
        }));

      const formattedParticipantsHistory = entries.map((e) => ({
        studentId: e.studentId,
        name: e.name,
        chestNo: e.chestNo,
        groupId: e.groupId,
        groupName: e.groupName,
        groupColor: e.groupColor,
        codeLetter: e.codeLetter ? e.codeLetter.toUpperCase().trim() : "",
      }));

      const judgeToken =
        program.judgeToken || Math.random().toString(36).substring(2, 8).toUpperCase();

      // Merge updated code letters into existing codeAllocations preserving metadata
      const existingLots = Array.isArray(program.codeAllocations) ? program.codeAllocations : [];
      const updatedCodeAllocations = formattedParticipantsHistory.map((entry) => {
        const existing = existingLots.find(
          (item) =>
            (entry.studentId && String(item.studentId) === String(entry.studentId)) ||
            (entry.chestNo && String(item.chestNo) === String(entry.chestNo))
        );
        return {
          ...(existing || {}),
          ...entry,
          codeLetter: entry.codeLetter ? entry.codeLetter.toUpperCase().trim() : "",
        };
      });

      await onSave?.(program.id, {
        codeAllocations: updatedCodeAllocations,
        participantsHistory: updatedCodeAllocations,
        judgeToken,
        evaluationStatus: formattedCodeLetters.length > 0 ? "ready_for_judge" : "pending_lots",
      });

      setSaveSuccess(true);
      setShowConfirmDialog(false);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error("Failed to save code letter corrections:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (duplicateLetters.size > 0) return;
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      executeSave();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 580,
          maxHeight: "88vh",
          backgroundColor: theme.bg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: 18,
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${theme.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.card,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 800,
                  color: theme.accent,
                  fontSize: 13.5,
                  background: theme.accentSoft,
                  padding: "2px 7px",
                  borderRadius: 6,
                }}
              >
                {program.order || program.code || "—"}
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: theme.text }}>
                Edit Code Letters
              </h3>
            </div>
            <div style={{ fontSize: 12, color: theme.subtext, marginTop: 3 }}>
              {program.name}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: theme.subtext,
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ic n="x" s={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {/* Duplicate Alert */}
          {duplicateLetters.size > 0 && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: 8,
                backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ic n="alert" s={13} />
              <span>
                Duplicate letter: <strong>{[...duplicateLetters].join(", ")}</strong>. Each contestant must have a unique Code Letter.
              </span>
            </div>
          )}

          {/* Table */}
          {entries.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                color: theme.subtext,
                fontSize: 13,
              }}
            >
              No contestants found for this program.
            </div>
          ) : (
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 80px 1fr 90px",
                  gap: 12,
                  alignItems: "center",
                  padding: "9px 14px",
                  backgroundColor: theme.card,
                  borderBottom: `1px solid ${theme.cardBorder}`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: theme.subtext,
                  textTransform: "uppercase",
                }}
              >
                <div>Sl.</div>
                <div>Chest No.</div>
                <div>Contestant / Team</div>
                <div style={{ textAlign: "center" }}>Code Letter</div>
              </div>

              {/* Rows */}
              {entries.map((item, idx) => {
                const isDupe = item.codeLetter && duplicateLetters.has(item.codeLetter.toUpperCase());
                return (
                  <div
                    key={item.studentId || idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 80px 1fr 90px",
                      gap: 12,
                      alignItems: "center",
                      padding: "9px 14px",
                      borderTop: idx > 0 ? `1px solid ${theme.cardBorder}` : "none",
                      backgroundColor:
                        idx % 2 === 0
                          ? "transparent"
                          : dark
                          ? "rgba(255,255,255,0.02)"
                          : "rgba(0,0,0,0.015)",
                    }}
                  >
                    {/* Index */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext }}>
                      {idx + 1}
                    </div>

                    {/* Chest No */}
                    <div>
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontWeight: 800,
                          fontSize: 12,
                          padding: "2px 7px",
                          borderRadius: 6,
                          backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                          color: theme.text,
                          display: "inline-block",
                        }}
                      >
                        {item.chestNo || "—"}
                      </span>
                    </div>

                    {/* Name & Team */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: theme.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </div>
                      {item.groupName && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 2,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              backgroundColor: item.groupColor || theme.accent,
                            }}
                          />
                          <span style={{ fontSize: 11, color: theme.subtext }}>
                            {item.groupName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Code Letter Input */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <input
                        type="text"
                        maxLength={3}
                        value={item.codeLetter}
                        onChange={(e) => handleLetterChange(idx, e.target.value)}
                        placeholder="—"
                        style={{
                          width: 44,
                          height: 34,
                          textAlign: "center",
                          borderRadius: 7,
                          border: isDupe
                            ? "2px solid #ef4444"
                            : item.codeLetter
                            ? `1.5px solid ${theme.accent}`
                            : `1px solid ${theme.inputBorder}`,
                          backgroundColor: item.codeLetter
                            ? theme.accentSoft
                            : theme.inputBg,
                          color: item.codeLetter ? theme.accent : theme.text,
                          fontSize: 14,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${theme.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.card,
          }}
        >
          <div style={{ fontSize: 12, color: theme.subtext }}>
            {saveSuccess ? (
              <span style={{ color: "#10b981", fontWeight: 700 }}>
                ✓ Changes saved!
              </span>
            ) : duplicateLetters.size > 0 ? (
              <span style={{ color: "#ef4444", fontWeight: 600 }}>
                Fix duplicate letters before saving
              </span>
            ) : hasChanges ? (
              <span
                style={{
                  color: theme.accent,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: theme.accent,
                  }}
                />
                <span>
                  {changedEntries.length} code letter change{changedEntries.length > 1 ? "s" : ""} to save
                </span>
              </span>
            ) : (
              <span>Correct any mistaken codes before judge evaluation</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: "transparent",
                border: `1px solid ${theme.cardBorder}`,
                color: theme.text,
                borderRadius: 9,
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving || duplicateLetters.size > 0}
              style={{
                backgroundColor:
                  duplicateLetters.size > 0
                    ? dark
                    : theme.accent,
                color: duplicateLetters.size > 0 ? theme.subtext : "#ffffff",
                border: "none",
                borderRadius: 9,
                padding: "7px 18px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor:
                  isSaving || duplicateLetters.size > 0
                    ? "not-allowed"
                    : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Ic n="check" s={14} />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Confirmation Dialog Overlay when admin edited codes */}
        {showConfirmDialog && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: dark ? "rgba(10,12,20,0.86)" : "rgba(255,255,255,0.92)",
              backdropFilter: "blur(6px)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 460,
                backgroundColor: theme.bg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 16,
                boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(245,158,11,0.15)",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  <Ic n="alert" s={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.text }}>
                    Confirm Code Letter Changes
                  </h4>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: theme.subtext, lineHeight: 1.45 }}>
                    You have edited code letters for <strong>{changedEntries.length} contestant{changedEntries.length > 1 ? "s" : ""}</strong> in <strong>{program.name}</strong>.
                  </p>
                </div>
              </div>

              {/* Changes List */}
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  borderRadius: 10,
                  border: `1px solid ${theme.cardBorder}`,
                  backgroundColor: theme.card,
                  padding: "6px 12px",
                }}
              >
                {changedEntries.map((item, idx) => (
                  <div
                    key={item.studentId || idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12.5,
                      padding: "7px 0",
                      borderBottom:
                        idx < changedEntries.length - 1
                          ? `1px solid ${theme.cardBorder}`
                          : "none",
                    }}
                  >
                    <div style={{ minWidth: 0, paddingRight: 8 }}>
                      <span style={{ fontWeight: 700, color: theme.text }}>{item.name}</span>
                      {item.chestNo && (
                        <span style={{ color: theme.subtext, marginLeft: 6, fontSize: 11.5 }}>
                          (Chest {item.chestNo})
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        fontWeight: 800,
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: dark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
                          color: theme.subtext,
                          fontSize: 12,
                        }}
                      >
                        {item.oldCode}
                      </span>
                      <span style={{ color: theme.subtext, fontSize: 12 }}>➔</span>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: theme.accentSoft,
                          color: theme.accent,
                          fontSize: 12,
                          border: `1px solid ${theme.accent}`,
                        }}
                      >
                        {item.newCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning note */}
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  backgroundColor: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.22)",
                  fontSize: 11.5,
                  color: "#d97706",
                  lineHeight: 1.45,
                }}
              >
                ⚠️ Please ensure these changes accurately reflect the desk draw. Scores submitted by judges will be assigned according to these code letters.
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowConfirmDialog(false)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: `1px solid ${theme.cardBorder}`,
                    background: "transparent",
                    color: theme.text,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel / Keep Editing
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={executeSave}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "none",
                    backgroundColor: theme.accent,
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ic n="check" s={14} />
                  <span>{isSaving ? "Saving..." : "Yes, Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
