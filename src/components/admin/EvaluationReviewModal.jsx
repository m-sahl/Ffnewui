import React, { useState, useEffect, useMemo } from "react";
import Ic from "../common/Ic";
import { calculateGrade } from "../judge/JudgePortal";

export default function EvaluationReviewModal({
  open,
  onClose,
  program,
  students = {},
  groups = [],
  registrations = [],
  onConfirm,
  onUpdateProgram,
  dark = false,
}) {
  const [editedScores, setEditedScores] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState(() => {
    try { return localStorage.getItem("ff_public_app_url") || ""; } catch { return ""; }
  });
  const [showUrlEdit, setShowUrlEdit] = useState(false);

  const getEffectiveOrigin = () => {
    if (customBaseUrl && customBaseUrl.trim()) {
      return customBaseUrl.trim().replace(/\/+$/, "");
    }
    if (typeof window !== "undefined") {
      return window.location.origin.replace(/\/+$/, "");
    }
    return "";
  };

  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const judgeToken = program?.judgeToken || program?.id || "";
  const judgeUrl = `${getEffectiveOrigin()}/#/judge/${judgeToken}`;

  const handleSaveCustomUrl = (val) => {
    setCustomBaseUrl(val);
    try {
      if (val.trim()) localStorage.setItem("ff_public_app_url", val.trim());
      else localStorage.removeItem("ff_public_app_url");
    } catch {}
  };

  // Theme tokens
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
            chestNo: st.chestNo,
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
    const raw = program.codeLetters || program.participantsHistory || program.codeAllocations || [];
    return raw.map((item, idx) => {
      const cLetter = String(item.codeLetter || String.fromCharCode(65 + idx)).toUpperCase();
      const chest = String(item.chestNo || "");
      const sId = item.studentId ? String(item.studentId) : "";

      // Lookup student details
      let matchedStudent = null;
      if (sId) {
        for (const list of Object.values(students)) {
          const found = (list || []).find((s) => String(s.id) === sId);
          if (found) { matchedStudent = found; break; }
        }
      }
      if (!matchedStudent && chest) {
        for (const list of Object.values(students)) {
          const found = (list || []).find((s) => String(s.chestNo) === chest);
          if (found) { matchedStudent = found; break; }
        }
      }
      if (!matchedStudent && registeredContestants[idx]) {
        matchedStudent = registeredContestants[idx];
      }

      const grp = matchedStudent ? groups.find((g) => g.id === matchedStudent.groupId) : null;

      return {
        codeLetter: cLetter,
        chestNo: chest || matchedStudent?.chestNo || "",
        studentId: sId || matchedStudent?.id || matchedStudent?.studentId || "",
        studentName: matchedStudent?.name || item.name || `Contestant ${cLetter}`,
        groupId: matchedStudent?.groupId || item.groupId || grp?.id || "",
        groupName: grp?.name || item.groupName || "",
        groupColor: grp?.color || item.groupColor || "#f14d4d",
      };
    });
  }, [program, students, groups, registeredContestants]);

  // Initialize edited scores from judgeSubmission or program
  useEffect(() => {
    if (!open || !program) return;
    const initial = {};
    if (program.judgeSubmission?.scores) {
      program.judgeSubmission.scores.forEach((s) => {
        initial[s.codeLetter] = s.score !== undefined ? String(s.score) : "";
      });
    } else if (program.confirmedResults?.entries) {
      program.confirmedResults.entries.forEach((e) => {
        if (e.codeLetter) initial[e.codeLetter] = String(e.score ?? e.points ?? "");
      });
    }
    setEditedScores(initial);
  }, [open, program]);

  if (!open || !program) return null;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(judgeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const text = `🏆 *FestFlow Evaluation Sheet*\n\nProgram: *${program.name}* (${program.category})\nJudge Code: *${judgeToken}*\n\nScoring Link:\n${judgeUrl}\n\n_(Note: If the link is not clickable, simply reply 'Hi' or open FestFlow and enter Judge Code: *${judgeToken}*)_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleScoreChange = (letter, val) => {
    const clean = val.replace(/[^0-9.]/g, "");
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 100) return;
    setEditedScores((prev) => ({ ...prev, [letter]: clean }));
  };

  // Quick auto-assign lots for testing if none exist
  const handleAutoAssignLots = () => {
    if (!registeredContestants.length) return;
    const generated = registeredContestants.map((st, i) => ({
      codeLetter: String.fromCharCode(65 + i),
      chestNo: st.chestNo || "",
      studentId: st.studentId || "",
    }));
    onUpdateProgram?.(program.id, {
      codeLetters: generated,
      evaluationStatus: "ready_for_judge",
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

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    try {
      // Determine 1st, 2nd, 3rd place from rankedEntries
      const top3 = rankedEntries.slice(0, 3).filter((e) => e.score !== null);
      const others = rankedEntries.slice(3).filter((e) => e.score !== null);

      const confirmedData = {
        confirmedAt: Date.now(),
        entries: top3.map((e, idx) => ({
          place: idx + 1,
          placeLabel: idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd",
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
        otherGrades: others.map((o) => ({
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
        allScores: rankedEntries.map((r) => ({
          codeLetter: r.codeLetter,
          chestNo: r.chestNo,
          studentName: r.studentName,
          score: r.score,
          grade: r.grade,
        })),
      };

      await onConfirm?.({
        programId: program.id,
        confirmedResults: confirmedData,
      });

      onClose();
    } catch (err) {
      console.error("Confirm evaluation error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
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
          maxWidth: 720,
          width: "100%",
          maxHeight: "92vh",
          backgroundColor: theme.bg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: 22,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${theme.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.card,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: 6,
                  backgroundColor: theme.accentSoft,
                  color: theme.accent,
                }}
              >
                {program.category || "General"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.subtext }}>
                #{program.order || "–"}
              </span>
              {program.evaluationStatus === "submitted" && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    backgroundColor: "rgba(16,185,129,0.15)",
                    color: "#10b981",
                  }}
                >
                  Judge Submitted
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: theme.text }}>
              {program.name}
            </h2>
          </div>

          <button
            onClick={onClose}
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

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Judge Link Bar */}
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 16,
              padding: "16px 18px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, display: "flex", alignItems: "center", gap: 8 }}>
                  <Ic n="whatsapp" s={16} />
                  <span>Judge Direct Scoring Link</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      backgroundColor: theme.accentSoft,
                      color: theme.accent,
                      padding: "2px 8px",
                      borderRadius: 6,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Code: {judgeToken}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: theme.subtext, marginTop: 4 }}>
                  Share via WhatsApp. The judge can tap the link or open FestFlow and enter Code <strong>{judgeToken}</strong>.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${theme.cardBorder}`,
                    background: copiedLink ? "rgba(16,185,129,0.15)" : theme.inputBg,
                    color: copiedLink ? "#10b981" : theme.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <Ic n={copiedLink ? "check" : "copy"} s={14} />
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </button>

                <button
                  onClick={handleWhatsApp}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(37,211,102,0.25)",
                  }}
                >
                  <Ic n="whatsapp" s={15} />
                  <span>Send WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Localhost notice and public URL override */}
            {isLocalhost && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: `1px dashed ${theme.cardBorder}`,
                  fontSize: 12,
                  color: theme.subtext,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span>
                  💡 <em>Running on localhost? Phones cannot open localhost links over the internet.</em>
                </span>
                <button
                  onClick={() => setShowUrlEdit(!showUrlEdit)}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.accent,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showUrlEdit ? "Hide URL Settings" : "Configure Public / Vercel Link"}
                </button>
              </div>
            )}

            {showUrlEdit && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="https://your-fest-app.vercel.app or http://192.168.x.x:5173"
                  value={customBaseUrl}
                  onChange={(e) => handleSaveCustomUrl(e.target.value)}
                  style={{
                    flex: 1,
                    height: 36,
                    fontSize: 12,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: `1px solid ${theme.cardBorder}`,
                    background: theme.inputBg,
                    color: theme.text,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => setShowUrlEdit(false)}
                  style={{
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "none",
                    backgroundColor: theme.accent,
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Code Letters Table */}
          {lots.length > 0 ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                  Contestant Marks & Evaluation ({validScoredCount} of {lots.length} Scored)
                </span>
                <span style={{ fontSize: 12, color: theme.subtext }}>
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
                    gridTemplateColumns: "70px 1fr 110px 100px",
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
                      key={lot.codeLetter}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr 110px 100px",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderTop: idx > 0 ? `1px solid ${theme.cardBorder}` : "none",
                        backgroundColor: idx % 2 === 0 ? "transparent" : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)"),
                      }}
                    >
                      {/* Code Letter Badge */}
                      <div>
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            backgroundColor: theme.accentSoft,
                            color: theme.accent,
                            fontSize: 15,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px solid ${theme.accent}`,
                          }}
                        >
                          {lot.codeLetter}
                        </span>
                      </div>

                      {/* Contestant Identity (Admin Reveal) */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {lot.chestNo && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 5,
                                backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                                color: theme.text,
                              }}
                            >
                              #{lot.chestNo}
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                            {lot.studentName}
                          </span>
                        </div>
                        {lot.groupName && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: lot.groupColor,
                              }}
                            />
                            <span style={{ fontSize: 12, color: theme.subtext }}>
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
                            width: 80,
                            height: 38,
                            textAlign: "center",
                            fontSize: 15,
                            fontWeight: 700,
                            backgroundColor: theme.inputBg,
                            border: `1.5px solid ${currentScore !== "" ? theme.accent : theme.inputBorder}`,
                            borderRadius: 10,
                            color: theme.text,
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* Calculated Grade */}
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
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
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 6px" }}>No Code Letters Assigned</h4>
              <p style={{ fontSize: 13, color: theme.subtext, margin: "0 0 16px" }}>
                Code letters will be pushed from your desktop app setup. For testing right now, you can quick-generate code letters for registered contestants.
              </p>
              {registeredContestants.length > 0 ? (
                <button
                  onClick={handleAutoAssignLots}
                  style={{
                    backgroundColor: theme.accent,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 20px",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Assign Lots (A, B, C...) to {registeredContestants.length} Registered Contestants
                </button>
              ) : (
                <div style={{ fontSize: 12, color: theme.subtext }}>
                  No participants are currently registered for this program.
                </div>
              )}
            </div>
          )}

          {/* Live Podium Preview */}
          {validScoredCount > 0 && (
            <div
              style={{
                marginTop: 20,
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 16,
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Ic n="award" s={16} />
                <span>Current Standings Preview</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {rankedEntries.slice(0, 3).map((r, i) => {
                  const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
                  if (r.score === null) return null;
                  return (
                    <div
                      key={r.codeLetter}
                      style={{
                        backgroundColor: theme.inputBg,
                        border: `1px solid ${theme.cardBorder}`,
                        borderRadius: 12,
                        padding: "10px 14px",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: theme.accent }}>
                        {medals[i]}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {r.studentName}
                      </div>
                      <div style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>
                        {r.score} marks · Grade {r.grade}
                      </div>
                    </div>
                  );
                })}
              </div>
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
          }}
        >
          <div style={{ fontSize: 13, color: theme.subtext }}>
            {validScoredCount === lots.length && lots.length > 0 ? (
              <span style={{ color: "#10b981", fontWeight: 600 }}>✓ All scores entered and ready</span>
            ) : (
              <span>Scores can be confirmed once entered</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "transparent",
                border: `1px solid ${theme.cardBorder}`,
                color: theme.text,
                borderRadius: 12,
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmAndSave}
              disabled={validScoredCount === 0 || isSaving}
              style={{
                backgroundColor: validScoredCount > 0 ? theme.accent : (dark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
                color: validScoredCount > 0 ? "#ffffff" : theme.subtext,
                border: "none",
                borderRadius: 12,
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 700,
                cursor: validScoredCount > 0 && !isSaving ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: validScoredCount > 0 ? "0 4px 14px rgba(241,77,77,0.3)" : "none",
              }}
            >
              <Ic n="check" s={16} />
              <span>{isSaving ? "Confirming..." : "Confirm & Move to Publishing"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
