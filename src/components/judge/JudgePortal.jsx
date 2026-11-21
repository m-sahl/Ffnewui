import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Ic from "../common/Ic";
import { getProgramLots } from "../../utils/lotUtils";

// Grading scale specified:
// 90-100: A+
// 70-89: A
// 60-69: B
// 50-59: C
// <50: No Grade
export const calculateGrade = (score) => {
  if (score === "" || score === null || score === undefined || isNaN(score)) {
    return { grade: "—", label: "No Grade", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
  }
  const num = Number(score);
  if (num >= 90 && num <= 100) return { grade: "A+", label: "A+ Grade", color: "#10b981", bg: "rgba(16,185,129,0.15)" };
  if (num >= 70 && num < 90) return { grade: "A", label: "A Grade", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" };
  if (num >= 60 && num < 70) return { grade: "B", label: "B Grade", color: "#eab308", bg: "rgba(234,179,8,0.15)" };
  if (num >= 50 && num < 60) return { grade: "C", label: "C Grade", color: "#f97316", bg: "rgba(249,115,22,0.15)" };
  return { grade: "—", label: "No Grade", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
};

export default function JudgePortal({ token: initialToken, dark = false, setDark, onExit }) {
  // Session authentication state (persisted on judge device)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem("ff_judge_authenticated") === "true";
    } catch {
      return false;
    }
  });

  const [currentToken, setCurrentToken] = useState(() => {
    return initialToken ? String(initialToken).trim().toUpperCase() : "";
  });

  // Login form state
  const [passcodeInput, setPasscodeInput] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showSingleCodeTab, setShowSingleCodeTab] = useState(false);
  const [singleCodeInput, setSingleCodeInput] = useState("");

  // Catalog filtering state
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("Stage");
  const [searchQuery, setSearchQuery] = useState("");

  // Convex live queries & mutations
  const serverPasscode = useQuery(api.settings.getJudgePasscode);
  const catalogPrograms = useQuery(api.programs.getJudgeCatalog);
  const submitScores = useMutation(api.programs.submitJudgeScores);

  // Sync token from URL hash prop
  useEffect(() => {
    if (initialToken) {
      setCurrentToken(String(initialToken).trim().toUpperCase());
    }
  }, [initialToken]);

  // Program details if a specific program token is active
  const program = useQuery(
    api.programs.getProgramByJudgeToken,
    currentToken ? { judgeToken: currentToken } : "skip"
  );

  // Scores state for active program
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Extract blind code letters
  const codeLetters = useMemo(() => {
    if (!program) return [];
    if (Array.isArray(program.codeLetters) && program.codeLetters.length > 0) {
      return program.codeLetters;
    }
    const raw = getProgramLots(program);
    if (raw.length > 0) {
      return raw
        .filter((c) => c && c.codeLetter)
        .map((c) => ({
          codeLetter: String(c.codeLetter).toUpperCase().trim(),
        }));
    }
    return [];
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
    setErrorMessage("");
  }, [program]);

  // Theme definition
  const theme = useMemo(() => {
    return dark
      ? {
          bg: "#090a10",
          card: "#131524",
          cardHover: "#181b2e",
          cardBorder: "rgba(255,255,255,0.08)",
          text: "#f3f4f6",
          subtext: "#9ca3af",
          inputBg: "rgba(255,255,255,0.05)",
          inputBorder: "rgba(255,255,255,0.15)",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.15)",
          success: "#10b981",
          successSoft: "rgba(16,185,129,0.15)",
          badgeBg: "rgba(255,255,255,0.06)",
        }
      : {
          bg: "#f8fafc",
          card: "#ffffff",
          cardHover: "#f1f5f9",
          cardBorder: "rgba(0,0,0,0.08)",
          text: "#0f172a",
          subtext: "#64748b",
          inputBg: "#f8fafc",
          inputBorder: "#e2e8f0",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.1)",
          success: "#10b981",
          successSoft: "rgba(16,185,129,0.12)",
          badgeBg: "rgba(0,0,0,0.05)",
        };
  }, [dark]);

  // Handle Passcode Login
  const handlePasscodeLogin = (e) => {
    if (e) e.preventDefault();
    setAuthError("");
    const entered = passcodeInput.trim();
    if (!entered) {
      setAuthError("Please enter the Judge Passcode");
      return;
    }

    const expected = (serverPasscode || "judge2026").trim();
    if (entered.toLowerCase() === expected.toLowerCase()) {
      try {
        localStorage.setItem("ff_judge_authenticated", "true");
      } catch {}
      setIsLoggedIn(true);
      setPasscodeInput("");
    } else {
      setAuthError("Incorrect Judge Passcode. Please check with festival control room.");
    }
  };

  // Handle Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem("ff_judge_authenticated");
    } catch {}
    setIsLoggedIn(false);
    setCurrentToken("");
    if (typeof window !== "undefined") {
      window.location.hash = "#/judge";
    }
  };

  // Handle Legacy Single Code Entry
  const handleSingleCodeSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = singleCodeInput.trim().toUpperCase();
    if (!clean) return;
    setCurrentToken(clean);
    if (typeof window !== "undefined") {
      window.location.hash = `#/judge/${clean}`;
    }
  };

  // Score Input Change
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

  // Submit Scores
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

  // Filter Catalog Programs
  const filteredCatalog = useMemo(() => {
    if (!catalogPrograms) return [];
    return catalogPrograms.filter((p) => {
      // Category filter
      if (categoryFilter !== "All") {
        const cat = (p.category || "").toLowerCase();
        const fCat = categoryFilter.toLowerCase();
        if (cat !== fCat) return false;
      }

      // Session filter (Strictly Stage or Off-Stage)
      const sess = (p.session || p.type || "").toLowerCase();
      if (sessionFilter === "Stage") {
        if (sess.includes("off")) return false;
      } else {
        if (!sess.includes("off")) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const orderMatch = String(p.order || "").includes(q);
        const catMatch = (p.category || "").toLowerCase().includes(q);
        if (!nameMatch && !orderMatch && !catMatch) return false;
      }

      return true;
    });
  }, [catalogPrograms, categoryFilter, sessionFilter, searchQuery]);

  // Stage and Off-Stage Counters
  const stageStats = useMemo(() => {
    const list = (catalogPrograms || []).filter((p) => {
      const sess = (p.session || p.type || "").toLowerCase();
      return !sess.includes("off");
    });
    const submitted = list.filter((p) => p.isSubmitted || p.isConfirmed || p.isPublished).length;
    const pending = list.length - submitted;
    return { total: list.length, submitted, pending };
  }, [catalogPrograms]);

  const offStageStats = useMemo(() => {
    const list = (catalogPrograms || []).filter((p) => {
      const sess = (p.session || p.type || "").toLowerCase();
      return sess.includes("off");
    });
    const submitted = list.filter((p) => p.isSubmitted || p.isConfirmed || p.isPublished).length;
    const pending = list.length - submitted;
    return { total: list.length, submitted, pending };
  }, [catalogPrograms]);

  const currentSessionStats = sessionFilter === "Stage" ? stageStats : offStageStats;

  // Mobile-first CSS injected once
  const mobileStyles = `
    .judge-mobile-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .judge-mobile-scroll::-webkit-scrollbar {
      display: none;
    }
    .judge-touch-card {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .judge-touch-card:active {
      transform: scale(0.985);
    }
    @keyframes pulseScore {
      0%, 100% { box-shadow: 0 4px 16px rgba(241,77,77,0.3); }
      50% { box-shadow: 0 4px 24px rgba(241,77,77,0.6); }
    }
  `;

  // =========================================================================
  // SCREEN 1: PASSCODE LOGIN SCREEN (Mobile-Optimized)
  // =========================================================================
  if (!isLoggedIn && !currentToken) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <style>{mobileStyles}</style>

        {/* Ambient background glow */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: dark
              ? "radial-gradient(rgba(241, 77, 77, 0.12) 1.5px, transparent 1.5px)"
              : "radial-gradient(rgba(241, 77, 77, 0.08) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            zIndex: 0,
          }}
        />

        <div
          style={{
            maxWidth: 420,
            width: "100%",
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 24,
            padding: "32px 22px",
            textAlign: "center",
            boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.5)" : "0 20px 48px rgba(0,0,0,0.08)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Festival Emblem */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: "linear-gradient(135deg, #f14d4d, #dc2626)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(241,77,77,0.35)",
            }}
          >
            <Ic n="award" s={28} />
          </div>

          <h2 style={{ fontSize: 21, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            Judges Scoring Portal
          </h2>
          <p style={{ fontSize: 13, color: theme.subtext, lineHeight: 1.5, margin: "0 0 22px" }}>
            Cognizance Arts & Cultural Fest · Official Evaluation
          </p>

          {authError && (
            <div
              style={{
                backgroundColor: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444",
                borderRadius: 14,
                padding: "10px 14px",
                marginBottom: 18,
                fontSize: 12.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
              }}
            >
              <Ic n="alert" s={18} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handlePasscodeLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  display: "block",
                  textAlign: "left",
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: theme.subtext,
                  marginBottom: 6,
                }}
              >
                Festival Judge Passcode
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPasscode ? "text" : "password"}
                  autoFocus
                  placeholder="Enter Passcode (e.g. judge2026)"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    if (authError) setAuthError("");
                  }}
                  style={{
                    width: "100%",
                    height: 50,
                    padding: "0 46px 0 16px",
                    fontSize: 16,
                    fontWeight: 600,
                    backgroundColor: theme.inputBg,
                    border: `1.5px solid ${passcodeInput ? theme.accent : theme.inputBorder}`,
                    borderRadius: 14,
                    color: theme.text,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: theme.subtext,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                  }}
                  title={showPasscode ? "Hide Passcode" : "Show Passcode"}
                >
                  <Ic n={showPasscode ? "eyeOff" : "eye"} s={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!passcodeInput.trim()}
              style={{
                height: 50,
                backgroundColor: passcodeInput.trim() ? theme.accent : dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                color: passcodeInput.trim() ? "#ffffff" : theme.subtext,
                border: "none",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 15,
                cursor: passcodeInput.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: passcodeInput.trim() ? "0 4px 16px rgba(241,77,77,0.3)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              <span>Unlock Scoring Dashboard</span>
              <Ic n="chevronRight" s={18} />
            </button>
          </form>

          {/* Accordion for single program code */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.cardBorder}` }}>
            <button
              onClick={() => setShowSingleCodeTab(!showSingleCodeTab)}
              style={{
                background: "none",
                border: "none",
                color: theme.subtext,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: 4,
              }}
            >
              <span>Have a single program 6-character code?</span>
              <Ic n={showSingleCodeTab ? "chevronDown" : "chevronRight"} s={14} />
            </button>

            {showSingleCodeTab && (
              <form onSubmit={handleSingleCodeSubmit} style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. 7K9A2F"
                  value={singleCodeInput}
                  onChange={(e) => setSingleCodeInput(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    height: 44,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    backgroundColor: theme.inputBg,
                    border: `1.5px solid ${theme.inputBorder}`,
                    borderRadius: 12,
                    color: theme.text,
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={!singleCodeInput.trim()}
                  style={{
                    height: 44,
                    padding: "0 16px",
                    backgroundColor: theme.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: 700,
                    cursor: singleCodeInput.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Open
                </button>
              </form>
            )}
          </div>

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
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
              }}
            >
              <span>← Back to Festival Home</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: PROGRAM CATALOG DASHBOARD (Mobile-First)
  // =========================================================================
  if (isLoggedIn && !currentToken) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <style>{mobileStyles}</style>

        {/* Compact Mobile-First Sticky Header */}
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
              maxWidth: 720,
              margin: "0 auto",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #f14d4d, #dc2626)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 3px 10px rgba(241,77,77,0.3)",
                  flexShrink: 0,
                }}
              >
                <Ic n="award" s={18} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: theme.accent, lineHeight: 1.1 }}>
                  Cognizance Fest
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>Judges Portal</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={handleLogout}
                style={{
                  background: dark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  height: 34,
                  padding: "0 10px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title="Log out"
              >
                <Ic n="logout" s={13} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Container */}
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "14px 14px" }}>
          {/* Active Session Page Title Banner */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: theme.accentSoft,
                  color: theme.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ic n={sessionFilter === "Stage" ? "mic" : "pen"} s={16} />
              </div>
              <div>
                <h2 style={{ fontSize: 16.5, fontWeight: 900, margin: 0, letterSpacing: "-0.2px", lineHeight: 1.2 }}>
                  {sessionFilter === "Stage" ? "Stage Sessions" : "Off-Stage Sessions"}
                </h2>
                <div style={{ fontSize: 11, color: theme.subtext, marginTop: 1 }}>
                  {sessionFilter === "Stage" ? "Live on-stage competitions" : "Off-stage events & arts"}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 20,
                backgroundColor: theme.badgeBg,
                color: theme.subtext,
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              {filteredCatalog.length} {filteredCatalog.length === 1 ? "Program" : "Programs"}
            </span>
          </div>

          {/* Mobile 3-Column Compact Stats Strip for Active Session */}
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 18,
              padding: "12px 14px",
              marginBottom: 14,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              textAlign: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                backgroundColor: theme.accentSoft,
                borderRadius: 12,
                padding: "8px 4px",
                border: `1px solid ${theme.accent}25`,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, color: theme.accent, lineHeight: 1.1 }}>{currentSessionStats.pending}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: theme.subtext, marginTop: 2 }}>
                Pending
              </div>
            </div>

            <div
              style={{
                backgroundColor: theme.successSoft,
                borderRadius: 12,
                padding: "8px 4px",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, color: theme.success, lineHeight: 1.1 }}>{currentSessionStats.submitted}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: theme.subtext, marginTop: 2 }}>
                Submitted
              </div>
            </div>

            <div
              style={{
                backgroundColor: theme.badgeBg,
                borderRadius: 12,
                padding: "8px 4px",
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{currentSessionStats.total}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: theme.subtext, marginTop: 2 }}>
                {sessionFilter === "Stage" ? "Stage Lots" : "Off-Stage Lots"}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: theme.subtext }}>
              <Ic n="search" s={16} />
            </span>
            <input
              type="text"
              placeholder={`Search ${sessionFilter.toLowerCase()} program by name or #...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                padding: "0 38px 0 40px",
                fontSize: 13.5,
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 14,
                color: theme.text,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: theme.subtext,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <Ic n="x" s={16} />
              </button>
            )}
          </div>

          {/* Category Pills Strip */}
          <div style={{ marginBottom: 14 }}>
            <div className="judge-mobile-scroll">
              {["All", "Low", "Mid", "High", "General"].map((cat) => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      backgroundColor: active ? theme.accent : theme.card,
                      color: active ? "#ffffff" : theme.subtext,
                      border: `1px solid ${active ? theme.accent : theme.cardBorder}`,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                      boxShadow: active ? "0 2px 8px rgba(241,77,77,0.3)" : "none",
                    }}
                  >
                    {cat === "All" ? "All Categories" : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Program Cards (Single Column, Thumb Friendly) */}
          {catalogPrograms === undefined ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: theme.subtext }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: `3px solid ${theme.accentSoft}`,
                  borderTopColor: theme.accent,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 14px",
                }}
              />
              <div style={{ fontWeight: 600, fontSize: 14 }}>Loading Programs...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 20,
                padding: "40px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px" }}>
                No {sessionFilter === "Stage" ? "Stage" : "Off-Stage"} Programs
              </h3>
              <p style={{ fontSize: 12.5, color: theme.subtext, margin: 0, lineHeight: 1.4 }}>
                {searchQuery || categoryFilter !== "All"
                  ? `No ${sessionFilter.toLowerCase()} programs matched your current search or category filter.`
                  : `${sessionFilter} programs will appear here as soon as contestant lots are drawn by the festival control room.`}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredCatalog.map((p) => {
                const isSub = p.isSubmitted || p.isConfirmed || p.isPublished;
                return (
                  <div
                    key={p.id}
                    className="judge-touch-card"
                    onClick={() => {
                      const token = p.judgeToken || p.id;
                      setCurrentToken(token);
                      if (typeof window !== "undefined") {
                        window.location.hash = `#/judge/${token}`;
                      }
                    }}
                    style={{
                      backgroundColor: theme.card,
                      border: `1.5px solid ${isSub ? "rgba(16,185,129,0.3)" : theme.cardBorder}`,
                      borderRadius: 18,
                      padding: "16px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    <div>
                      {/* Top Badges Row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: 6,
                              backgroundColor: theme.badgeBg,
                              color: theme.subtext,
                            }}
                          >
                            #{p.order}
                          </span>
                          {p.category && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "2px 8px",
                                borderRadius: 6,
                                backgroundColor: theme.accentSoft,
                                color: theme.accent,
                              }}
                            >
                              {p.category}
                            </span>
                          )}
                          {p.session && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 6,
                                backgroundColor: theme.badgeBg,
                                color: theme.subtext,
                              }}
                            >
                              {p.session}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 12,
                            backgroundColor: isSub ? theme.successSoft : theme.accentSoft,
                            color: isSub ? theme.success : theme.accent,
                          }}
                        >
                          <Ic n={isSub ? "checkCircle" : "edit"} s={12} />
                          <span>{isSub ? "Submitted" : "Ready"}</span>
                        </span>
                      </div>

                      {/* Program Title */}
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          margin: "0 0 6px",
                          letterSpacing: "-0.3px",
                          lineHeight: 1.3,
                        }}
                      >
                        {p.name}
                      </h3>

                      <div style={{ fontSize: 12, color: theme.subtext, display: "flex", alignItems: "center", gap: 5 }}>
                        <Ic n="users" s={13} />
                        <span>{p.contestantCount} Contestants</span>
                      </div>
                    </div>

                    {/* Touch Action Button */}
                    <div
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: isSub ? (dark ? "rgba(255,255,255,0.06)" : "#f1f5f9") : theme.accent,
                        color: isSub ? theme.text : "#ffffff",
                        fontSize: 13,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        boxShadow: isSub ? "none" : "0 3px 12px rgba(241,77,77,0.25)",
                      }}
                    >
                      <span>{isSub ? "View Submitted Scores" : "Start Evaluation"}</span>
                      <Ic n="chevronRight" s={15} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Mobile Fixed Bottom Navigation Bar (Stage vs Off-Stage Pages) */}
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: dark ? "rgba(19, 21, 36, 0.96)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: `1px solid ${theme.cardBorder}`,
            boxShadow: dark ? "0 -8px 24px rgba(0,0,0,0.45)" : "0 -8px 24px rgba(0,0,0,0.06)",
            padding: "6px 14px calc(8px + env(safe-area-inset-bottom, 0px))",
          }}
          aria-label="Judges Sessions Navigation"
        >
          <div
            style={{
              maxWidth: 500,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {/* Stage Page Tab */}
            <button
              onClick={() => {
                setSessionFilter("Stage");
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 12px",
                borderRadius: 14,
                border: `1.5px solid ${sessionFilter === "Stage" ? theme.accent : "transparent"}`,
                backgroundColor: sessionFilter === "Stage"
                  ? (dark ? "rgba(241, 77, 77, 0.18)" : "rgba(241, 77, 77, 0.1)")
                  : "transparent",
                color: sessionFilter === "Stage" ? theme.accent : theme.subtext,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ position: "relative", display: "inline-flex" }}>
                <Ic n="mic" s={20} />
                {stageStats.pending > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -12,
                      backgroundColor: theme.accent,
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: 900,
                      minWidth: 17,
                      height: 17,
                      borderRadius: 8.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                      boxShadow: "0 2px 6px rgba(241,77,77,0.4)",
                    }}
                  >
                    {stageStats.pending}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: sessionFilter === "Stage" ? 800 : 600,
                  letterSpacing: "0.2px",
                }}
              >
                Stage
              </span>
            </button>

            {/* Off-Stage Page Tab */}
            <button
              onClick={() => {
                setSessionFilter("Off-Stage");
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 12px",
                borderRadius: 14,
                border: `1.5px solid ${sessionFilter === "Off-Stage" ? theme.accent : "transparent"}`,
                backgroundColor: sessionFilter === "Off-Stage"
                  ? (dark ? "rgba(241, 77, 77, 0.18)" : "rgba(241, 77, 77, 0.1)")
                  : "transparent",
                color: sessionFilter === "Off-Stage" ? theme.accent : theme.subtext,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ position: "relative", display: "inline-flex" }}>
                <Ic n="pen" s={20} />
                {offStageStats.pending > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -12,
                      backgroundColor: theme.accent,
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: 900,
                      minWidth: 17,
                      height: 17,
                      borderRadius: 8.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                      boxShadow: "0 2px 6px rgba(241,77,77,0.4)",
                    }}
                  >
                    {offStageStats.pending}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: sessionFilter === "Off-Stage" ? 800 : 600,
                  letterSpacing: "0.2px",
                }}
              >
                Off-Stage
              </span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: PROGRAM SCORING SHEET (Mobile-First Blind Evaluation)
  // =========================================================================

  // If loading program
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
              width: 40,
              height: 40,
              border: `3px solid ${theme.accentSoft}`,
              borderTopColor: theme.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 14px",
            }}
          />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Loading Score Sheet...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // If program not found
  if (program === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 380,
            width: "100%",
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 22,
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 6px" }}>Program Not Found</h2>
          <p style={{ fontSize: 13, color: theme.subtext, margin: "0 0 18px" }}>
            The code <strong>"{currentToken}"</strong> was not found.
          </p>
          <button
            onClick={() => {
              setCurrentToken("");
              if (typeof window !== "undefined") window.location.hash = "#/judge";
            }}
            style={{
              width: "100%",
              height: 46,
              backgroundColor: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ← Back to Programs Catalog
          </button>
        </div>
      </div>
    );
  }

  // Main Mobile Scoring Sheet
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        paddingBottom: isLocked
          ? "calc(32px + env(safe-area-inset-bottom, 0px))"
          : "calc(110px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <style>{mobileStyles}</style>

      {/* Compact Mobile Top Sticky Bar */}
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
            maxWidth: 640,
            margin: "0 auto",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button
            onClick={() => {
              setCurrentToken("");
              if (typeof window !== "undefined") window.location.hash = "#/judge";
            }}
            style={{
              background: "none",
              border: "none",
              color: theme.subtext,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px 4px 0",
              flexShrink: 0,
            }}
          >
            <Ic n="back" s={18} />
            <span>Programs</span>
          </button>

          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: theme.text,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {program.name}
          </div>

          <div style={{ width: 40, flexShrink: 0 }} />
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "14px 14px" }}>
        {/* Program Header Card */}
        <div
          style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 20,
            padding: "16px 18px",
            marginBottom: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {program.category && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 8,
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
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 8,
                  backgroundColor: theme.badgeBg,
                  color: theme.subtext,
                }}
              >
                {program.session}
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 8,
                backgroundColor: isLocked ? theme.successSoft : "rgba(59,130,246,0.15)",
                color: isLocked ? theme.success : "#3b82f6",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ic n={isLocked ? "check" : "edit"} s={11} />
              {isLocked ? "Locked" : "Open"}
            </span>
          </div>

          <h1 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.4px", lineHeight: 1.25 }}>
            {program.name}
          </h1>

          <div style={{ fontSize: 12.5, color: theme.subtext, display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span><strong>{codeLetters.length}</strong> Contestants</span>
            <span>•</span>
            <span>Scale: <strong>0 – 100 Marks</strong></span>
          </div>

          {/* Blind Evaluation Reminder */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              border: `1px dashed ${theme.cardBorder}`,
              fontSize: 11.5,
              color: theme.subtext,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ic n="shield" s={14} />
            <span><strong>Blind Scoring:</strong> Contestants are identified only by Code Letters.</span>
          </div>
        </div>

        {/* Lock Banner if already submitted */}
        {isLocked && (
          <div
            style={{
              backgroundColor: theme.successSoft,
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: theme.success,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ic n="check" s={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: theme.success }}>Evaluation Submitted</div>
              <div style={{ fontSize: 12, color: theme.subtext, marginTop: 1 }}>
                Scores are safely locked in the festival control room.
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
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 12.5,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ic n="alert" s={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Code Letters Scoring List (Mobile First Thumb Ergonomics) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {codeLetters.map((item, idx) => {
            const letter = item.codeLetter;
            const currentScore = scores[letter] || "";
            const isFilled = currentScore !== "";

            return (
              <div
                key={letter}
                style={{
                  backgroundColor: theme.card,
                  border: `1.5px solid ${isFilled ? theme.accent : theme.cardBorder}`,
                  borderRadius: 16,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: isFilled ? "0 3px 12px rgba(241,77,77,0.08)" : "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Left: Code Letter Emblem */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: isFilled ? theme.accent : theme.accentSoft,
                      color: isFilled ? "#ffffff" : theme.accent,
                      fontSize: 18,
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1.5px solid ${theme.accent}`,
                      flexShrink: 0,
                    }}
                  >
                    {letter}
                  </div>

                  {/* Middle Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
                      Code {letter}
                    </div>
                    <div style={{ fontSize: 11.5, color: theme.subtext, marginTop: 2 }}>
                      Contestant #{idx + 1}
                    </div>
                  </div>
                </div>

                {/* Right: Score Input */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9.]*"
                    disabled={isLocked}
                    placeholder="—"
                    value={currentScore}
                    onChange={(e) => handleScoreChange(letter, e.target.value)}
                    style={{
                      width: 78,
                      height: 46,
                      textAlign: "center",
                      fontSize: 19,
                      fontWeight: 900,
                      backgroundColor: isLocked ? theme.badgeBg : theme.inputBg,
                      border: `1.5px solid ${isFilled ? theme.accent : theme.inputBorder}`,
                      borderRadius: 12,
                      color: theme.text,
                      outline: "none",
                      fontFamily: "inherit",
                      cursor: isLocked ? "not-allowed" : "text",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Mobile Sticky Bottom Submission Bar (Thumb Reached) */}
      {!isLocked && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.card,
            borderTop: `1px solid ${theme.cardBorder}`,
            padding: "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))",
            zIndex: 40,
            boxShadow: "0 -6px 20px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Progress indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: theme.subtext }}>
                Scored: <strong style={{ color: theme.text }}>{filledCount} of {codeLetters.length}</strong>
              </span>
              <span style={{ color: isComplete ? theme.success : theme.subtext }}>
                {isComplete ? "✓ All scores entered" : "Enter marks for all contestants"}
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div
              style={{
                width: "100%",
                height: 4,
                backgroundColor: theme.badgeBg,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${codeLetters.length ? (filledCount / codeLetters.length) * 100 : 0}%`,
                  backgroundColor: isComplete ? theme.success : theme.accent,
                  transition: "width 0.25s ease",
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isComplete || submitting}
              style={{
                width: "100%",
                height: 48,
                backgroundColor: isComplete ? theme.accent : dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                color: isComplete ? "#ffffff" : theme.subtext,
                border: "none",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 15,
                cursor: isComplete && !submitting ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: isComplete ? "0 4px 16px rgba(241,77,77,0.3)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              <span>Submit Evaluation ({filledCount}/{codeLetters.length})</span>
              <Ic n="check" s={18} />
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal (Mobile Bottom-Sheet / Dialog) */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 22,
              padding: "24px 20px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: theme.accentSoft,
                color: theme.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <Ic n="check" s={22} />
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 900, textAlign: "center", margin: "0 0 6px" }}>
              Confirm Official Submission?
            </h3>
            <p style={{ fontSize: 12.5, color: theme.subtext, textAlign: "center", lineHeight: 1.4, margin: "0 0 16px" }}>
              Scores will be locked and sent directly to the festival control room.
            </p>

            {/* Score Summary List */}
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                backgroundColor: theme.inputBg,
                borderRadius: 14,
                padding: "8px 12px",
                marginBottom: 18,
              }}
            >
              {codeLetters.map((c) => {
                const s = scores[c.codeLetter] || 0;
                return (
                  <div
                    key={c.codeLetter}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 0",
                      borderBottom: `1px solid ${theme.cardBorder}`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>Code {c.codeLetter}</span>
                    <span style={{ fontWeight: 900, color: theme.accent }}>{s} Marks</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                  color: theme.text,
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1.4,
                  height: 44,
                  backgroundColor: theme.accent,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
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
