import React, { useState, useEffect, useMemo } from "react";
import Ic from "../common/Ic";
import { calculateGrade } from "../judge/JudgePortal";
import { buildJudgeMessage } from "../../utils/formatMessage";
import { calculateFestivalRanks } from "../../utils/ranking";
import { getProgramLots } from "../../utils/lotUtils";

export default function EvaluationReviewModal({
  open,
  onClose,
  program,
  students = {},
  groups = [],
  registrations = [],
  onConfirm,
  onUpdateProgram,
  onOpenCodeLetterModal,
  onOpenCallLetterModal,
  dark = false,
}) {
  const handleOpenCodeModal = onOpenCodeLetterModal || onOpenCallLetterModal;
  const [editedScores, setEditedScores] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [showMsgPreview, setShowMsgPreview] = useState(false);
  const [showJudgeTools, setShowJudgeTools] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEditingCodes, setIsEditingCodes] = useState(false);

  const isSubmitted = program?.evaluationStatus === "submitted" || !!program?.judgeSubmission;
  const isConfirmed = program?.evaluationStatus === "confirmed" || !!program?.confirmedResults;
  const isPublished = program?.status === "published";
  const isCompleted = isSubmitted || isConfirmed || isPublished;
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const [customBaseUrl, setCustomBaseUrl] = useState(() => {
    try {
      const saved = localStorage.getItem("ff_public_app_url") || "";
      if (isLocalhost && saved.includes("vercel.app")) {
        localStorage.removeItem("ff_public_app_url");
        return "";
      }
      return saved;
    } catch { return ""; }
  });
  const [showUrlEdit, setShowUrlEdit] = useState(false);

  const getEffectiveOrigin = () => {
    if (isLocalhost) {
      if (customBaseUrl && customBaseUrl.trim() && !customBaseUrl.includes("vercel.app")) {
        return customBaseUrl.trim().replace(/\/+$/, "");
      }
      return window.location.origin.replace(/\/+$/, "");
    }
    if (customBaseUrl && customBaseUrl.trim()) {
      return customBaseUrl.trim().replace(/\/+$/, "");
    }
    if (typeof window !== "undefined") {
      return window.location.origin.replace(/\/+$/, "");
    }
    return "";
  };

  const judgeToken = program?.judgeToken || program?.id || "";
  const judgeUrl = `${getEffectiveOrigin()}/#/judge/${judgeToken}`;

  const handleSaveCustomUrl = (val) => {
    setCustomBaseUrl(val);
    try {
      if (val.trim()) localStorage.setItem("ff_public_app_url", val.trim());
      else localStorage.removeItem("ff_public_app_url");
    } catch {}
  };

  // Cognizance Theme tokens — Clean Coral Crimson & Slate (Zero Harsh Orange)
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
          accentSoft: "rgba(241,77,77,0.14)",
          goldMedal: "#fbbf24",
          goldBg: "rgba(251,191,36,0.12)",
          silverMedal: "#94a3b8",
          silverBg: "rgba(148,163,184,0.12)",
          bronzeMedal: "#d97706",
          bronzeBg: "rgba(217,119,6,0.12)",
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
          goldMedal: "#d97706",
          goldBg: "rgba(245,158,11,0.1)",
          silverMedal: "#64748b",
          silverBg: "rgba(100,116,139,0.1)",
          bronzeMedal: "#b45309",
          bronzeBg: "rgba(180,83,9,0.08)",
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

  // Code letters list (from program.codeLetters or participantsHistory or codeAllocations)
  const lots = useMemo(() => {
    if (!program) return [];
    const existing = getProgramLots(program);
    if (!existing.length) return [];

    return existing.map((item, idx) => {
      let matched = registeredContestants.find(
        (c) => (item.studentId && c.studentId === String(item.studentId)) ||
               (item.chestNo && c.chestNo === String(item.chestNo))
      );

      if (!matched && item.studentId) {
        for (const grpStudents of Object.values(students)) {
          const found = (grpStudents || []).find((s) => String(s.id) === String(item.studentId));
          if (found) {
            const grp = groups.find((g) => g.id === found.groupId);
            matched = {
              studentId: String(found.id),
              name: found.name,
              chestNo: String(found.chestNo || ""),
              groupId: found.groupId,
              groupName: grp?.name || "",
              groupColor: grp?.color || "",
            };
            break;
          }
        }
      }

      const letter = String(item.codeLetter || "").toUpperCase().trim();
      return {
        codeLetter: letter,
        studentId: matched?.studentId || item.studentId || `unknown_${idx}`,
        studentName: item.studentName || item.name || matched?.name || `Contestant ${letter || idx + 1}`,
        chestNo: item.chestNo || matched?.chestNo || "",
        groupId: matched?.groupId || item.groupId || "",
        groupName: matched?.groupName || item.groupName || "",
        groupColor: matched?.groupColor || item.groupColor || "#f14d4d",
      };
    });
  }, [program, registeredContestants, students, groups]);

  // Initialize scores
  useEffect(() => {
    if (!open || !program) return;
    const initial = {};

    if (program.confirmedResults?.allScores) {
      program.confirmedResults.allScores.forEach((s) => {
        if (s.codeLetter) initial[s.codeLetter] = s.score !== undefined && s.score !== null ? String(s.score) : "";
      });
    } else if (program.confirmedResults?.entries) {
      program.confirmedResults.entries.forEach((e) => {
        if (e.codeLetter) initial[e.codeLetter] = e.score !== undefined && e.score !== null ? String(e.score) : "";
      });
      (program.confirmedResults.otherGrades || []).forEach((o) => {
        if (o.codeLetter) initial[o.codeLetter] = o.score !== undefined && o.score !== null ? String(o.score) : "";
      });
    } else if (program.judgeSubmission?.scores) {
      program.judgeSubmission.scores.forEach((s) => {
        if (s.codeLetter) initial[s.codeLetter] = s.score !== undefined && s.score !== null ? String(s.score) : "";
      });
    } else if (program.results?.entries) {
      program.results.entries.forEach((e) => {
        if (e.codeLetter) initial[e.codeLetter] = e.points !== undefined && e.points !== null ? String(e.points) : "";
      });
      (program.results.otherGrades || []).forEach((o) => {
        if (o.codeLetter) initial[o.codeLetter] = o.points !== undefined && o.points !== null ? String(o.points) : "";
      });
    }

    setEditedScores(initial);
    setShowConfirmDialog(false);
    // Expand judge tools if there are no scores yet so admin can copy link easily
    const hasAnyScores = Object.values(initial).some((v) => v !== "" && v !== undefined);
    setShowJudgeTools(!hasAnyScores && !isSubmitted && !isConfirmed);
  }, [open, program, isSubmitted, isConfirmed]);

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(judgeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyMessage = () => {
    const text = buildJudgeMessage({
      festName: "Cognizance",
      programName: program.name,
      category: program.category,
      judgeToken,
      judgeUrl,
    });
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const text = buildJudgeMessage({
      festName: "Cognizance",
      programName: program.name,
      category: program.category,
      judgeToken,
      judgeUrl,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleScoreChange = (letter, val) => {
    const clean = val.replace(/[^0-9.]/g, "");
    setEditedScores((prev) => ({ ...prev, [letter]: clean }));
  };

  const handleUpdateCodeLetter = (idx, newLetter) => {
    const uppercase = newLetter.toUpperCase().slice(0, 3);
    const updated = lots.map((l, i) => (i === idx ? { ...l, codeLetter: uppercase } : l));

    const codeLettersToSave = updated
      .filter((u) => u.codeLetter && u.codeLetter.trim())
      .map((u) => ({
        codeLetter: u.codeLetter.toUpperCase().trim(),
        chestNo: String(u.chestNo || "").trim(),
        studentId: u.studentId ? String(u.studentId) : undefined,
      }));

    const fullHistory = updated.map((u) => ({
      studentId: u.studentId,
      name: u.studentName,
      chestNo: u.chestNo,
      groupId: u.groupId,
      groupName: u.groupName,
      groupColor: u.groupColor,
      codeLetter: u.codeLetter ? u.codeLetter.toUpperCase().trim() : "",
    }));

    onUpdateProgram?.(program.id, {
      codeAllocations: fullHistory,
      participantsHistory: fullHistory,
    });
  };

  // Rank contestants by score
  const rankedEntries = [...lots]
    .map((lot) => {
      const rawScore = editedScores[lot.codeLetter];
      const numScore = rawScore !== "" && rawScore !== undefined ? parseFloat(rawScore) : null;
      const gradeObj = calculateGrade(rawScore);
      return {
        ...lot,
        score: numScore,
        rawScore: rawScore ?? "",
        grade: gradeObj.grade,
        gradeColor: gradeObj.color,
        gradeBg: gradeObj.bg,
      };
    })
    .sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

  const validScoredCount = lots.filter((l) => {
    const s = editedScores[l.codeLetter];
    return s !== "" && s !== undefined && !isNaN(parseFloat(s));
  }).length;

  // Calculate ranks and prize winners with Dense Festival ranking (ties awarded joint places)
  const festivalRanking = useMemo(() => {
    return calculateFestivalRanks(rankedEntries, "dense");
  }, [rankedEntries]);

  const topWinners = festivalRanking.entries;
  const otherRanked = festivalRanking.otherGrades;
  const hasTies = festivalRanking.hasTies;
  const tiedPlaces = festivalRanking.tiedPlaces;

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    try {
      const confirmedData = {
        confirmedAt: Date.now(),
        hasTies,
        entries: topWinners.map((e) => ({
          place: e.place,
          placeLabel: e.placeLabel,
          isShared: !!e.isShared,
          codeLetter: e.codeLetter,
          studentId: e.studentId,
          studentName: e.studentName,
          chestNo: e.chestNo,
          groupId: e.groupId,
          groupName: e.groupName,
          groupColor: e.groupColor,
          score: e.score,
          points: e.score,
          grade: e.grade,
        })),
        otherGrades: otherRanked.map((o) => ({
          place: o.place || null,
          placeLabel: o.placeLabel || "—",
          isShared: false,
          codeLetter: o.codeLetter,
          studentId: o.studentId,
          studentName: o.studentName,
          chestNo: o.chestNo,
          groupId: o.groupId,
          groupName: o.groupName,
          groupColor: o.groupColor,
          score: o.score,
          points: o.score,
          grade: o.grade,
        })),
        allScores: festivalRanking.allRanked.map((r) => ({
          codeLetter: r.codeLetter,
          chestNo: r.chestNo,
          studentName: r.studentName,
          score: r.score,
          grade: r.grade,
          place: r.place,
          placeLabel: r.placeLabel,
          isShared: !!r.isShared,
        })),
      };

      await onConfirm?.({
        programId: program.id,
        confirmedResults: confirmedData,
      });

      setShowConfirmDialog(false);
      onClose();
    } catch (err) {
      console.error("Confirm evaluation error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !program) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.68)",
        backdropFilter: "blur(6px)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          position: "relative",
          maxWidth: 740,
          width: "100%",
          maxHeight: "92vh",
          backgroundColor: theme.bg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: 22,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${theme.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.card,
            gap: 16,
          }}
        >
          {/* Left: Program Number badge on the left side of Program Name & Category */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 18,
                fontWeight: 800,
                color: theme.accent,
                backgroundColor: theme.accentSoft,
                border: `1.5px solid rgba(241,77,77,0.25)`,
                padding: "8px 14px",
                borderRadius: 12,
                letterSpacing: "-0.4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title="Program Number"
            >
              #{program.order || program.code || "–"}
            </span>

            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                  color: theme.text,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {program.name}
              </h2>

              <div
                style={{
                  fontSize: 13,
                  color: theme.subtext,
                  marginTop: 3,
                  fontWeight: 500,
                }}
              >
                {program.category || "General"}
              </div>
            </div>
          </div>

          {/* Right: Status badge & Close */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {isPublished ? (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: "4px 9px",
                  borderRadius: 7,
                  backgroundColor: "rgba(16,185,129,0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                🏆 Published
              </span>
            ) : isConfirmed ? (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: "4px 9px",
                  borderRadius: 7,
                  backgroundColor: "rgba(59,130,246,0.15)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                ✓ Confirmed
              </span>
            ) : isSubmitted ? (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: "4px 9px",
                  borderRadius: 7,
                  backgroundColor: "rgba(16,185,129,0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                ✓ Judge Submitted
              </span>
            ) : null}

            <button
              onClick={onClose}
              type="button"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${theme.cardBorder}`,
                background: "transparent",
                color: theme.subtext,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Ic n="x" s={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* 1. HERO PODIUM STANDINGS (At the very top) */}
          {validScoredCount > 0 ? (
            <div
              style={{
                marginBottom: 20,
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 18,
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: theme.text,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Ic n="award" s={16} />
                  <span>
                    Podium Standings ({topWinners.length} {topWinners.length === 1 ? "Winner" : "Winners"}{hasTies ? " · Shared Prizes" : ""})
                  </span>
                </div>
                <span style={{ fontSize: 11.5, color: "#10b981", fontWeight: 700 }}>
                  ✓ Live Ranked from Judge Marks
                </span>
              </div>

              {/* Tie Alert Banner if any ties in top 3 */}
              {hasTies && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 14px",
                    borderRadius: 12,
                    backgroundColor: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#f59e0b", display: "inline-flex" }}>
                      <Ic n="alert" s={16} />
                    </span>
                    <div style={{ fontSize: 12.5, color: "#d97706", fontWeight: 700 }}>
                      <span>Tie Detected: </span>
                      {tiedPlaces.map((tp, idx) => (
                        <span key={tp.place}>
                          {idx > 0 ? " · " : ""}
                          <strong>{tp.count} contestants</strong> tied for <strong>{tp.placeLabel}</strong> with <strong>{tp.score} marks</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      backgroundColor: "rgba(245,158,11,0.18)",
                      color: "#b45309",
                      padding: "3px 9px",
                      borderRadius: 20,
                    }}
                  >
                    Dense Festival Ranking (All Awarded)
                  </span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {topWinners.map((r) => {
                  const place = Number(r.place || 1);
                  const placeConfigs = {
                    1: { label: r.isShared ? "1st (Shared)" : "1st Place", medal: "🥇", color: theme.goldMedal, bg: theme.goldBg },
                    2: { label: r.isShared ? "2nd (Shared)" : "2nd Place", medal: "🥈", color: theme.silverMedal, bg: theme.silverBg },
                    3: { label: r.isShared ? "3rd (Shared)" : "3rd Place", medal: "🥉", color: theme.bronzeMedal, bg: theme.bronzeBg },
                  };
                  const cfg = placeConfigs[place] || {
                    label: r.placeLabel || `${place}th Place`,
                    medal: "🎖️",
                    color: theme.accent,
                    bg: theme.accentSoft,
                  };
                  if (r.score === null) return null;

                  return (
                    <div
                      key={r.codeLetter}
                      style={{
                        backgroundColor: theme.inputBg,
                        border: `1px solid ${theme.cardBorder}`,
                        borderRadius: 14,
                        padding: "12px 14px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: cfg.color,
                            backgroundColor: cfg.bg,
                            padding: "2px 8px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>{cfg.medal}</span>
                          <span>{cfg.label}</span>
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 5,
                            backgroundColor: theme.accentSoft,
                            color: theme.accent,
                          }}
                        >
                          Code {r.codeLetter}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          marginTop: 8,
                          color: theme.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.studentName}
                        {r.chestNo && (
                          <span style={{ fontSize: 11.5, color: theme.subtext, marginLeft: 5 }}>
                            ({r.chestNo})
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 6,
                          fontSize: 11.5,
                          color: theme.subtext,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {r.groupColor && (
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                backgroundColor: r.groupColor,
                              }}
                            />
                          )}
                          <span>{r.groupName || "Individual"}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: theme.text }}>
                          {r.score} pts · {r.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* 2. COLLAPSED JUDGE SCORING LINK & DISPATCH BAR */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setShowJudgeTools(!showJudgeTools)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                color: theme.text,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: theme.accent, display: "flex" }}>
                  <Ic n="externalLink" s={14} />
                </span>
                <span style={{ fontWeight: 700 }}>Judge Scoring Link & WhatsApp Dispatch</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 5,
                    backgroundColor: theme.accentSoft,
                    color: theme.accent,
                  }}
                >
                  Code: {judgeToken}
                </span>
              </div>

              <span style={{ fontSize: 11.5, color: theme.subtext }}>
                {showJudgeTools ? "Hide Tools ▲" : "Show Dispatch Tools ▼"}
              </span>
            </button>

            {/* Expanded Drawer Tools */}
            {showJudgeTools && (
              <div
                style={{
                  marginTop: 8,
                  padding: "14px 16px",
                  borderRadius: 14,
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  animation: "ff-fade 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontSize: 12, color: theme.subtext }}>
                    Direct judge scoring URL and WhatsApp communication tools
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setShowMsgPreview((v) => !v)}
                      style={{
                        padding: "6px 11px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1px solid ${showMsgPreview ? theme.accent : theme.cardBorder}`,
                        background: showMsgPreview ? theme.accentSoft : theme.inputBg,
                        color: showMsgPreview ? theme.accent : theme.text,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        cursor: "pointer",
                      }}
                    >
                      <Ic n="message" s={13} />
                      <span>{showMsgPreview ? "Hide Message" : "Preview Message"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      style={{
                        padding: "6px 11px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1px solid ${copiedLink ? "#10b981" : theme.cardBorder}`,
                        background: copiedLink ? "rgba(16,185,129,0.15)" : theme.inputBg,
                        color: copiedLink ? "#10b981" : theme.text,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        cursor: "pointer",
                      }}
                    >
                      <Ic n={copiedLink ? "check" : "copy"} s={13} />
                      <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      style={{
                        padding: "6px 11px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1px solid ${copiedMsg ? "#10b981" : theme.cardBorder}`,
                        background: copiedMsg ? "rgba(16,185,129,0.15)" : theme.inputBg,
                        color: copiedMsg ? "#10b981" : theme.text,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        cursor: "pointer",
                      }}
                    >
                      <Ic n={copiedMsg ? "check" : "copy"} s={13} />
                      <span>{copiedMsg ? "Copied Text!" : "Copy Text"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsApp}
                      style={{
                        padding: "6px 13px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: "none",
                        backgroundColor: "#25D366",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        cursor: "pointer",
                      }}
                    >
                      <Ic n="whatsapp" s={14} />
                      <span>Send WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Direct Link Line */}
                <div
                  style={{
                    padding: "7px 11px",
                    borderRadius: 9,
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <a
                    href={judgeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: theme.accent,
                      textDecoration: "underline",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {judgeUrl}
                  </a>

                  <button
                    type="button"
                    onClick={() => window.open(judgeUrl, "_blank")}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.subtext,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <span>Open Link</span>
                    <Ic n="externalLink" s={12} />
                  </button>
                </div>

                {/* Message preview */}
                {showMsgPreview && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      backgroundColor: dark ? "rgba(0,0,0,0.3)" : "#f1f5f9",
                      border: `1px solid ${theme.cardBorder}`,
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: theme.text,
                    }}
                  >
                    <div>🏆 <strong>COGNIZANCE</strong> — <em>Official Scoring Sheet</em></div>
                    <div style={{ marginTop: 4 }}>📋 <strong>Program:</strong> {program.name} ({program.category || "General"})</div>
                    <div>🔑 <strong>Judge Code:</strong> <code>{judgeToken}</code></div>
                    <div style={{ marginTop: 4 }}>👉 <strong>Scoring Link:</strong> {judgeUrl}</div>
                  </div>
                )}

                {/* Tunnel configuration */}
                {isLocalhost && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                    <span style={{ fontSize: 11, color: theme.subtext }}>
                      Localhost mode active
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUrlEdit(!showUrlEdit)}
                      style={{
                        background: "none",
                        border: "none",
                        color: theme.accent,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {showUrlEdit ? "Hide URL Settings" : "Configure Custom Tunnel URL"}
                    </button>
                  </div>
                )}

                {showUrlEdit && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="http://192.168.x.x:5173 or https://your-tunnel.ngrok.app"
                      value={customBaseUrl}
                      onChange={(e) => handleSaveCustomUrl(e.target.value)}
                      style={{
                        flex: 1,
                        height: 34,
                        fontSize: 12,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.cardBorder}`,
                        background: theme.inputBg,
                        color: theme.text,
                        outline: "none",
                      }}
                    />
                    {customBaseUrl && (
                      <button
                        type="button"
                        onClick={() => handleSaveCustomUrl("")}
                        style={{
                          padding: "0 10px",
                          borderRadius: 8,
                          border: `1px solid ${theme.cardBorder}`,
                          background: "transparent",
                          color: theme.subtext,
                          fontSize: 11.5,
                          cursor: "pointer",
                        }}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowUrlEdit(false)}
                      style={{
                        padding: "0 12px",
                        borderRadius: 8,
                        border: "none",
                        backgroundColor: theme.accent,
                        color: "#ffffff",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. CONTESTANT MARKS TABLE */}
          {lots.length > 0 ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>
                    Contestant Marks & Evaluation ({validScoredCount} of {lots.length} Scored)
                  </span>

                  {!isCompleted && handleOpenCodeModal && (
                    <button
                      type="button"
                      onClick={() => handleOpenCodeModal(program)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: 6,
                        border: `1px solid ${theme.cardBorder}`,
                        background: "transparent",
                        color: theme.subtext,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Edit code letters before judge evaluation"
                    >
                      <Ic n="edit" s={12} />
                      <span>✏️ Edit Code Letters</span>
                    </button>
                  )}

                  {!isCompleted && !handleOpenCodeModal && (
                    <button
                      type="button"
                      onClick={() => setIsEditingCodes(!isEditingCodes)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: 6,
                        border: `1px solid ${isEditingCodes ? theme.accent : theme.cardBorder}`,
                        background: isEditingCodes ? theme.accentSoft : "transparent",
                        color: isEditingCodes ? theme.accent : theme.text,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Ic n="edit" s={12} />
                      <span>{isEditingCodes ? "✓ Done Editing" : "✏️ Edit Code Letters"}</span>
                    </button>
                  )}

                  {isCompleted && (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: theme.subtext,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Ic n="lock" s={12} />
                      <span>Evaluation Finalized</span>
                    </span>
                  )}
                </div>

                <span style={{ fontSize: 11.5, color: theme.subtext }}>
                  90-100: A+ | 70-89: A | 60-69: B | 50-59: C
                </span>
              </div>

              <div
                style={{
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 1fr 110px 90px",
                    gap: 12,
                    padding: "10px 16px",
                    backgroundColor: theme.card,
                    borderBottom: `1px solid ${theme.cardBorder}`,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: theme.subtext,
                  }}
                >
                  <div>Code</div>
                  <div>Contestant / Team</div>
                  <div style={{ textAlign: "center" }}>Score (0-100)</div>
                  <div style={{ textAlign: "right" }}>Grade</div>
                </div>

                {/* Rows */}
                {lots.map((lot, idx) => {
                  const currentScore = editedScores[lot.codeLetter] ?? "";
                  const gradeObj = calculateGrade(currentScore);

                  return (
                    <div
                      key={lot.codeLetter || idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr 110px 90px",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 16px",
                        borderTop: idx > 0 ? `1px solid ${theme.cardBorder}` : "none",
                        backgroundColor:
                          idx % 2 === 0
                            ? "transparent"
                            : dark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.015)",
                      }}
                    >
                      {/* Code Letter Badge or Input */}
                      <div>
                        {!isCompleted && isEditingCodes ? (
                          <input
                            type="text"
                            maxLength={3}
                            value={lot.codeLetter}
                            onChange={(e) => handleUpdateCodeLetter(idx, e.target.value)}
                            style={{
                              width: 36,
                              height: 34,
                              textAlign: "center",
                              borderRadius: 8,
                              border: `1.5px solid ${theme.accent}`,
                              backgroundColor: theme.inputBg,
                              color: theme.accent,
                              fontSize: 14,
                              fontWeight: 800,
                              outline: "none",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              backgroundColor: theme.accentSoft,
                              color: theme.accent,
                              fontSize: 14,
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `1px solid ${theme.accentSoft}`,
                            }}
                          >
                            {lot.codeLetter || "—"}
                          </span>
                        )}
                      </div>

                      {/* Contestant Identity */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {lot.chestNo && (
                            <span
                              style={{
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 5,
                                backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                                color: theme.text,
                              }}
                            >
                              {lot.chestNo}
                            </span>
                          )}
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: theme.text }}>
                            {lot.studentName}
                          </span>
                        </div>
                        {lot.groupName && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                backgroundColor: lot.groupColor || theme.accent,
                              }}
                            />
                            <span style={{ fontSize: 11.5, color: theme.subtext }}>
                              {lot.groupName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Score Input */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0-100"
                          value={currentScore}
                          onChange={(e) => handleScoreChange(lot.codeLetter, e.target.value)}
                          style={{
                            width: 76,
                            height: 36,
                            textAlign: "center",
                            fontSize: 14.5,
                            fontWeight: 700,
                            backgroundColor: theme.inputBg,
                            border: `1.5px solid ${currentScore !== "" ? theme.accent : theme.inputBorder}`,
                            borderRadius: 9,
                            color: theme.text,
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* Grade Badge */}
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            padding: "4px 9px",
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 800,
                            backgroundColor: gradeObj.bg,
                            color: gradeObj.color,
                            display: "inline-block",
                          }}
                        >
                          {gradeObj.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: theme.card,
                border: `1px dashed ${theme.cardBorder}`,
                borderRadius: 16,
                padding: 32,
                textAlign: "center",
              }}
            >
              <Ic n="list" s={36} />
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 6px", color: theme.text }}>
                Pending Code Letters from Desk App
              </h4>
              <p style={{ fontSize: 13, color: theme.subtext, margin: "0 auto 16px", maxWidth: 440 }}>
                Code letters are assigned via the external desk app before the program is conducted. Once assigned, they will appear here ready for evaluation.
              </p>
              {handleOpenCodeModal && registeredContestants.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenCodeModal(program)}
                    style={{
                      backgroundColor: "transparent",
                      color: theme.subtext,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: 10,
                      padding: "8px 16px",
                      fontWeight: 600,
                      fontSize: 12.5,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ic n="edit" s={13} />
                    <span>Edit Code Letters</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid ${theme.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.card,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isPublished ? (
              <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
                <span>🏆 Published to Official Leaderboards</span>
              </span>
            ) : isConfirmed ? (
              <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6" }} />
                <span>✓ Confirmed (Ready for Publishing)</span>
              </span>
            ) : validScoredCount === lots.length && lots.length > 0 ? (
              <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
                <span>✓ All {lots.length} contestants scored and ready</span>
              </span>
            ) : (
              <span style={{ fontSize: 12.5, color: theme.subtext }}>
                {validScoredCount} of {lots.length} contestants scored
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: "transparent",
                border: `1px solid ${theme.cardBorder}`,
                color: theme.text,
                borderRadius: 11,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                if (validScoredCount === 0 || isSaving) return;
                setShowConfirmDialog(true);
              }}
              disabled={validScoredCount === 0 || isSaving}
              style={{
                backgroundColor: validScoredCount > 0 ? theme.accent : dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                color: validScoredCount > 0 ? "#ffffff" : theme.subtext,
                border: "none",
                borderRadius: 11,
                padding: "9px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: validScoredCount > 0 && !isSaving ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: validScoredCount > 0 ? "0 4px 14px rgba(241,77,77,0.3)" : "none",
              }}
            >
              <Ic n="check" s={15} />
              <span>
                {isSaving
                  ? "Saving..."
                  : isConfirmed
                  ? "Update & Re-confirm"
                  : "Confirm & Move to Publishing"}
              </span>
            </button>
          </div>
        </div>

        {/* 4. EXPLICIT CONFIRMATION SUMMARY DIALOG (Modal Overlay) */}
        {showConfirmDialog && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: dark ? "rgba(10,12,20,0.88)" : "rgba(255,255,255,0.92)",
              backdropFilter: "blur(6px)",
              zIndex: 1000,
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
                maxWidth: 480,
                backgroundColor: theme.bg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 18,
                boxShadow: "0 24px 50px rgba(0,0,0,0.4)",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: theme.accentSoft,
                    color: theme.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: `1px solid rgba(241,77,77,0.25)`,
                  }}
                >
                  <Ic n="award" s={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.text }}>
                    Confirm Evaluation Results
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: theme.subtext, lineHeight: 1.45 }}>
                    Verify final rankings for <strong>{program.order || program.code} · {program.name}</strong> before sending to Publishing.
                  </p>
                </div>
              </div>

              {/* Winners Review List */}
              <div
                style={{
                  borderRadius: 12,
                  border: `1px solid ${theme.cardBorder}`,
                  backgroundColor: theme.card,
                  padding: "6px 14px",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {topWinners.map((item, idx) => {
                  const place = Number(item.place || 1);
                  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : "🎖️";
                  const label = item.placeLabel || (place === 1 ? "1st Place" : place === 2 ? "2nd Place" : "3rd Place");
                  return (
                    <div
                      key={item.codeLetter || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        fontSize: 12.5,
                        borderBottom: idx < topWinners.length - 1 ? `1px solid ${theme.cardBorder}` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, paddingRight: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 12, minWidth: 84 }}>
                          {medal} {label}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: theme.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.studentName}
                          {item.chestNo && ` (${item.chestNo})`}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 5,
                            backgroundColor: theme.accentSoft,
                            color: theme.accent,
                          }}
                        >
                          Code {item.codeLetter}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 12, color: theme.text }}>
                          {item.score} pts
                        </span>
                      </div>
                    </div>
                  );
                })}

                {otherRanked.length > 0 && (
                  <div style={{ padding: "7px 0 3px", fontSize: 11.5, color: theme.subtext, textAlign: "center" }}>
                    + {otherRanked.length} other contestant{otherRanked.length > 1 ? "s" : ""} evaluated with grades
                  </div>
                )}
              </div>

              {/* Clean Advisory note (Zero Orange) */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  backgroundColor: dark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.06)",
                  border: `1px solid rgba(59,130,246,0.22)`,
                  fontSize: 12,
                  color: dark ? "#93c5fd" : "#1d4ed8",
                  lineHeight: 1.45,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ic n="check" s={15} />
                <span>
                  These scores will be locked and transferred to the <strong>Publishing</strong> section for awards announcement.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowConfirmDialog(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 9,
                    border: `1px solid ${theme.cardBorder}`,
                    backgroundColor: "transparent",
                    color: theme.text,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel / Keep Reviewing
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmAndSave}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 9,
                    border: "none",
                    backgroundColor: theme.accent,
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 4px 14px rgba(241,77,77,0.3)",
                  }}
                >
                  <Ic n="check" s={15} />
                  <span>{isSaving ? "Confirming..." : "Confirm & Move to Publishing"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
