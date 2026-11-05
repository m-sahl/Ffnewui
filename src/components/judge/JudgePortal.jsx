import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Ic from "../common/Ic";

// Grading scale specified:
// 90-100: A+
// 70-89: A
// 60-69: B
// 50-59: C
// <50: No Grade
export const calculateGrade = (score) => {
  if (score === "" || score === null || score === undefined || isNaN(score)) return { grade: "—", label: "No Grade", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
  const num = Number(score);
  if (num >= 90 && num <= 100) return { grade: "A+", label: "A+ Grade", color: "#10b981", bg: "rgba(16,185,129,0.15)" };
  if (num >= 70 && num < 90) return { grade: "A", label: "A Grade", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" };
  if (num >= 60 && num < 70) return { grade: "B", label: "B Grade", color: "#eab308", bg: "rgba(234,179,8,0.15)" };
  if (num >= 50 && num < 60) return { grade: "C", label: "C Grade", color: "#f97316", bg: "rgba(249,115,22,0.15)" };
  return { grade: "—", label: "No Grade", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
};

export default function JudgePortal({ token: initialToken, dark = false, setDark, onExit }) {
  const [currentToken, setCurrentToken] = useState(
    initialToken ? String(initialToken).trim().toUpperCase() : ""
  );
  const [inputCode, setInputCode] = useState("");

  useEffect(() => {
    if (initialToken) {
      setCurrentToken(String(initialToken).trim().toUpperCase());
    }
  }, [initialToken]);

  const program = useQuery(
    api.programs.getProgramByJudgeToken,
    currentToken ? { judgeToken: currentToken } : "skip"
  );
  const submitScores = useMutation(api.programs.submitJudgeScores);

  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const codeLetters = useMemo(() => {
    return program?.codeLetters || [];
  }, [program]);

  // Load existing submission if already submitted
  useEffect(() => {
    if (program?.judgeSubmission?.scores) {
      const initial = {};
      program.judgeSubmission.scores.forEach((s) => {
        initial[s.codeLetter] = s.score !== undefined ? String(s.score) : "";
      });
      setScores(initial);
      setSubmittedSuccess(true);
    } else {
      setSubmittedSuccess(false);
      setScores({});
    }
  }, [program]);

  const handleScoreChange = (codeLetter, value) => {
    if (value === "") {
      setScores((prev) => ({ ...prev, [codeLetter]: "" }));
      return;
    }
    const clean = value.replace(/[^0-9.]/g, "");
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 100) return;
    setScores((prev) => ({ ...prev, [codeLetter]: clean }));
  };

  const isComplete = useMemo(() => {
    if (!codeLetters.length) return false;
    return codeLetters.every((c) => {
      const val = scores[c.codeLetter];
      if (val === "" || val === undefined || val === null) return false;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    });
  }, [codeLetters, scores]);

  const filledCount = useMemo(() => {
    return codeLetters.filter((c) => {
      const val = scores[c.codeLetter];
      return val !== "" && val !== undefined && !isNaN(parseFloat(val));
    }).length;
  }, [codeLetters, scores]);

  const handleSubmit = async () => {
    if (!isComplete || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const formattedScores = codeLetters.map((c) => ({
        codeLetter: c.codeLetter,
        score: parseFloat(scores[c.codeLetter]) || 0,
      }));

      await submitScores({
        judgeToken: currentToken,
        scores: formattedScores,
      });

      setShowConfirm(false);
      setSubmittedSuccess(true);
    } catch (err) {
      setErrorMessage(err?.message || "Failed to submit scores. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = program?.isSubmitted || submittedSuccess;

  // Dynamic theme colors
  const theme = useMemo(() => {
    return dark
      ? {
          bg: "#090a10",
          card: "#131524",
          cardBorder: "rgba(255,255,255,0.08)",
          text: "#f3f4f6",
          subtext: "#9ca3af",
          inputBg: "rgba(255,255,255,0.05)",
          inputBorder: "rgba(255,255,255,0.15)",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.15)",
        }
      : {
          bg: "#f8fafc",
          card: "#ffffff",
          cardBorder: "rgba(0,0,0,0.08)",
          text: "#0f172a",
          subtext: "#64748b",
          inputBg: "#f8fafc",
          inputBorder: "#e2e8f0",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.1)",
        };
  }, [dark]);

  const handleApplyCode = (e) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    setCurrentToken(clean);
    if (typeof window !== "undefined") {
      window.location.hash = `#/judge/${clean}`;
    }
  };

  // Screen 1: Enter Judge Code screen (if no token entered or code was not found)
  if (!currentToken || (currentToken && program === null)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 24,
            padding: "36px 28px",
            textAlign: "center",
            boxShadow: "0 20px 48px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "linear-gradient(135deg, #f14d4d, #dc2626)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              boxShadow: "0 8px 24px rgba(241,77,77,0.35)",
            }}
          >
            <Ic n="award" s={30} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.4px" }}>
            Judge Scoring Portal
          </h2>
          <p style={{ fontSize: 13, color: theme.subtext, lineHeight: 1.5, margin: "0 0 24px" }}>
            Enter the 6-character Judge Code provided by your stage coordinator to open the scoring sheet.
          </p>

          {currentToken && program === null && (
            <div
              style={{
                backgroundColor: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444",
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 18,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ic n="alert" s={16} />
              <span>Code <strong>"{currentToken}"</strong> not found. Please re-enter.</span>
            </div>
          )}

          <form onSubmit={handleApplyCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              type="text"
              autoFocus
              placeholder="e.g. 7K9A2F"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              style={{
                height: 52,
                textAlign: "center",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "4px",
                textTransform: "uppercase",
                backgroundColor: theme.inputBg,
                border: `2px solid ${inputCode ? theme.accent : theme.inputBorder}`,
                borderRadius: 14,
                color: theme.text,
                outline: "none",
                fontFamily: "inherit",
              }}
            />

            <button
              type="submit"
              disabled={!inputCode.trim()}
              style={{
                height: 50,
                backgroundColor: inputCode.trim() ? theme.accent : (dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
                color: inputCode.trim() ? "#ffffff" : theme.subtext,
                border: "none",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 15,
                cursor: inputCode.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: inputCode.trim() ? "0 4px 16px rgba(241,77,77,0.3)" : "none",
              }}
            >
              <span>Open Score Sheet</span>
              <Ic n="chevronRight" s={18} />
            </button>
          </form>

          {onExit && (
            <button
              onClick={onExit}
              style={{
                marginTop: 20,
                background: "transparent",
                border: "none",
                color: theme.subtext,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ← Back to Main Menu
            </button>
          )}
        </div>
      </div>
    );
  }

  // Screen 2: Loading State
  if (program === undefined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: `3px solid ${theme.accentSoft}`,
              borderTopColor: theme.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ fontWeight: 600, fontSize: 16 }}>Loading Score Sheet...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Screen 3: Program Score Sheet
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        paddingBottom: 100,
      }}
    >
      {/* Top App Header */}
      <header
        style={{
          backgroundColor: theme.card,
          borderBottom: `1px solid ${theme.cardBorder}`,
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #f14d4d, #dc2626)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(241,77,77,0.3)",
              }}
            >
              <Ic n="award" s={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: theme.accent }}>
                FestFlow Evaluation
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Judge Scoring Sheet</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                setCurrentToken("");
                if (typeof window !== "undefined") window.location.hash = "#/judge";
              }}
              style={{
                background: theme.inputBg,
                border: `1px solid ${theme.cardBorder}`,
                color: theme.subtext,
                padding: "6px 12px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Enter different judge code"
            >
              Switch Code
            </button>

            {setDark && (
              <button
                onClick={() => setDark(!dark)}
                style={{
                  background: theme.inputBg,
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.text,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Toggle Theme"
              >
                <Ic n={dark ? "sun" : "moon"} s={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>
        {/* Program Info Card */}
        <div
          style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 20,
            padding: "20px 24px",
            marginBottom: 20,
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {program.category && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "4px 10px",
                  borderRadius: 20,
                  backgroundColor: theme.accentSoft,
                  color: theme.accent,
                }}
              >
                {program.category}
              </span>
            )}
            {program.session && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 20,
                  backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                  color: theme.subtext,
                }}
              >
                {program.session}
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 20,
                backgroundColor: isLocked ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                color: isLocked ? "#10b981" : "#3b82f6",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ic n={isLocked ? "check" : "edit"} s={12} />
              {isLocked ? "Submitted & Locked" : "Scoring Open"}
            </span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.4px" }}>
            {program.name}
          </h1>

          <div style={{ fontSize: 13, color: theme.subtext, display: "flex", alignItems: "center", gap: 16 }}>
            <span>Contestants: <strong>{codeLetters.length}</strong></span>
            <span>Scale: <strong>0 – 100 Marks</strong></span>
            <span>Code: <strong>{currentToken}</strong></span>
          </div>

          {/* Blind Evaluation Notice */}
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 12,
              backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              border: `1px dashed ${theme.cardBorder}`,
              fontSize: 12,
              color: theme.subtext,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ic n="shield" s={16} />
            <span><strong>Blind Evaluation:</strong> Student identities are masked with Code Letters to ensure fairness.</span>
          </div>
        </div>

        {/* Lock Banner if already submitted */}
        {isLocked && (
          <div
            style={{
              backgroundColor: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 16,
              padding: "16px 20px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ic n="check" s={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#10b981" }}>Evaluation Submitted</div>
              <div style={{ fontSize: 13, color: theme.subtext, marginTop: 2 }}>
                Your scores have been safely recorded and forwarded to the festival control room.
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444",
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ic n="alert" s={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Code Letters Scoring List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {codeLetters.map((item, idx) => {
            const letter = item.codeLetter;
            const currentScore = scores[letter] || "";
            const gradeInfo = calculateGrade(currentScore);

            return (
              <div
                key={letter}
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${currentScore !== "" ? theme.accent : theme.cardBorder}`,
                  borderRadius: 18,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  transition: "all 0.2s ease",
                  boxShadow: currentScore !== "" ? "0 4px 16px rgba(241,77,77,0.08)" : "none",
                }}
              >
                {/* Code Letter Indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: theme.accentSoft,
                      color: theme.accent,
                      fontSize: 18,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1.5px solid ${theme.accent}`,
                      flexShrink: 0,
                    }}
                  >
                    {letter}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Code {letter}</div>
                    <div style={{ fontSize: 12, color: theme.subtext }}>Contestant #{idx + 1}</div>
                  </div>
                </div>

                {/* Score Input & Grade Preview */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Grade Badge */}
                  {currentScore !== "" && (
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 12,
                        backgroundColor: gradeInfo.bg,
                        color: gradeInfo.color,
                        fontWeight: 700,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>{gradeInfo.grade}</span>
                    </div>
                  )}

                  {/* Input Box */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={isLocked}
                      placeholder="0–100"
                      value={currentScore}
                      onChange={(e) => handleScoreChange(letter, e.target.value)}
                      style={{
                        width: 90,
                        height: 44,
                        textAlign: "center",
                        fontSize: 17,
                        fontWeight: 700,
                        backgroundColor: isLocked ? (dark ? "rgba(255,255,255,0.03)" : "#f1f5f9") : theme.inputBg,
                        border: `1.5px solid ${currentScore !== "" ? theme.accent : theme.inputBorder}`,
                        borderRadius: 12,
                        color: theme.text,
                        outline: "none",
                        cursor: isLocked ? "not-allowed" : "text",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {codeLetters.length === 0 && (
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 18,
              padding: 40,
              textAlign: "center",
              color: theme.subtext,
            }}
          >
            <Ic n="list" s={36} />
            <div style={{ marginTop: 12, fontWeight: 600, fontSize: 15 }}>No code letters assigned yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              The control room is finalizing the contestant lots. Please refresh in a moment.
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar */}
      {!isLocked && codeLetters.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.card,
            borderTop: `1px solid ${theme.cardBorder}`,
            padding: "14px 20px",
            zIndex: 30,
            boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {filledCount} of {codeLetters.length} Scored
              </div>
              <div style={{ fontSize: 11, color: isComplete ? "#10b981" : theme.subtext }}>
                {isComplete ? "All contestants scored" : "Enter all scores to submit"}
              </div>
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isComplete || submitting}
              style={{
                backgroundColor: isComplete ? theme.accent : (dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
                color: isComplete ? "#ffffff" : theme.subtext,
                border: "none",
                borderRadius: 14,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 700,
                cursor: isComplete && !submitting ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
                boxShadow: isComplete ? "0 4px 16px rgba(241,77,77,0.3)" : "none",
              }}
            >
              <Ic n="check" s={18} />
              <span>Submit Scores</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowConfirm(false)}
        >
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
              animation: "scaleIn 0.2s ease",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: theme.accentSoft,
                color: theme.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Ic n="check" s={26} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
              Confirm Submission?
            </h3>
            <p style={{ fontSize: 13, color: theme.subtext, textAlign: "center", lineHeight: 1.5, margin: "0 0 20px" }}>
              Please verify your scores. Once submitted, your scores will be locked and sent directly to the festival control room.
            </p>

            {/* Score Summary List */}
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                backgroundColor: theme.inputBg,
                borderRadius: 14,
                padding: "8px 14px",
                marginBottom: 20,
              }}
            >
              {codeLetters.map((c) => {
                const s = scores[c.codeLetter] || 0;
                const g = calculateGrade(s);
                return (
                  <div
                    key={c.codeLetter}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: `1px solid ${theme.cardBorder}`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>Code {c.codeLetter}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 800 }}>{s} Marks</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: g.color }}>({g.grade})</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                  color: theme.text,
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Back to Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1,
                  backgroundColor: theme.accent,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {submitting ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
