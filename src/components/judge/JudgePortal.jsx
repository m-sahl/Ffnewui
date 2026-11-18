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
  const [sessionFilter, setSessionFilter] = useState("All");
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
      setAuthError("Incorrect Judge Passcode. Please check with the festival control room.");
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

      // Session filter
      if (sessionFilter !== "All") {
        const sess = (p.session || p.type || "").toLowerCase();
        const fSess = sessionFilter.toLowerCase();
        if (fSess === "stage" && sess.includes("off")) return false;
        if (fSess === "off-stage" && !sess.includes("off")) return false;
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

  // Catalog Counters
  const catalogStats = useMemo(() => {
    const list = catalogPrograms || [];
    const submitted = list.filter((p) => p.isSubmitted || p.isConfirmed || p.isPublished).length;
    const pending = list.length - submitted;
    return { total: list.length, submitted, pending };
  }, [catalogPrograms]);

  // =========================================================================
  // SCREEN 1: PASSCODE LOGIN SCREEN (If not authenticated and no direct program token)
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
          padding: 24,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Soft background ambient glow */}
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
            maxWidth: 440,
            width: "100%",
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 24,
            padding: "38px 28px",
            textAlign: "center",
            boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.5)" : "0 20px 48px rgba(0,0,0,0.08)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Festival Emblem */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              background: "linear-gradient(135deg, #f14d4d, #dc2626)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 10px 28px rgba(241,77,77,0.35)",
            }}
          >
            <Ic n="award" s={32} />
          </div>

          <h2 style={{ fontSize: 23, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            Judges Scoring Portal
          </h2>
          <p style={{ fontSize: 13, color: theme.subtext, lineHeight: 1.5, margin: "0 0 26px" }}>
            Cognizance Arts & Cultural Fest · Official Evaluation
          </p>

          {authError && (
            <div
              style={{
                backgroundColor: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444",
                borderRadius: 14,
                padding: "11px 14px",
                marginBottom: 20,
                fontSize: 13,
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

          <form onSubmit={handlePasscodeLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  display: "block",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: theme.subtext,
                  marginBottom: 8,
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
                    height: 52,
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
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: theme.subtext,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
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
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${theme.cardBorder}` }}>
            <button
              onClick={() => setShowSingleCodeTab(!showSingleCodeTab)}
              style={{
                background: "none",
                border: "none",
                color: theme.subtext,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>Have a single program 6-character code?</span>
              <Ic n={showSingleCodeTab ? "chevronDown" : "chevronRight"} s={14} />
            </button>

            {showSingleCodeTab && (
              <form onSubmit={handleSingleCodeSubmit} style={{ marginTop: 14, display: "flex", gap: 8 }}>
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
                marginTop: 22,
                background: "transparent",
                border: "none",
                color: theme.subtext,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
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
  // SCREEN 2: PROGRAM CATALOG DASHBOARD (Judge is logged in, no program opened)
  // =========================================================================
  if (isLoggedIn && !currentToken) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          paddingBottom: 80,
        }}
      >
        {/* Top Header */}
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
              maxWidth: 960,
              margin: "0 auto",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
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
                  flexShrink: 0,
                }}
              >
                <Ic n="award" s={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", color: theme.accent }}>
                  Cognizance Arts Fest
                </div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Judges Portal</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

              <button
                onClick={handleLogout}
                style={{
                  background: dark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  padding: "7px 14px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Log out of Judges Portal"
              >
                <Ic n="logout" s={14} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Catalog Main Content */}
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
          {/* Welcome & Stats Banner */}
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 20,
              padding: "20px 24px",
              marginBottom: 20,
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.4px" }}>
                Festival Scoring Sheet
              </h1>
              <p style={{ fontSize: 13, color: theme.subtext, margin: 0 }}>
                Select an event below to enter results. Student identities are masked for blind evaluation.
              </p>
            </div>

            {/* Quick Counters */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div
                style={{
                  backgroundColor: theme.accentSoft,
                  border: `1px solid ${theme.accent}30`,
                  borderRadius: 14,
                  padding: "10px 16px",
                  textAlign: "center",
                  minWidth: 90,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: theme.accent }}>{catalogStats.pending}</div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: theme.subtext }}>
                  Pending
                </div>
              </div>

              <div
                style={{
                  backgroundColor: theme.successSoft,
                  border: "1px solid rgba(16,185,129,0.3)",
                  borderRadius: 14,
                  padding: "10px 16px",
                  textAlign: "center",
                  minWidth: 90,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: theme.success }}>{catalogStats.submitted}</div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: theme.subtext }}>
                  Submitted
                </div>
              </div>

              <div
                style={{
                  backgroundColor: theme.badgeBg,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: 14,
                  padding: "10px 16px",
                  textAlign: "center",
                  minWidth: 90,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900 }}>{catalogStats.total}</div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: theme.subtext }}>
                  Total Lot-Ready
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 18,
              padding: "16px",
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: theme.subtext }}>
                <Ic n="search" s={18} />
              </span>
              <input
                type="text"
                placeholder="Search program by name, category, or order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: 46,
                  padding: "0 16px 0 42px",
                  fontSize: 14,
                  backgroundColor: theme.inputBg,
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 12,
                  color: theme.text,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 12,
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

            {/* Filter Pills */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              {/* Category Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.subtext, marginRight: 4 }}>Category:</span>
                {["All", "Low", "Mid", "High", "General"].map((cat) => {
                  const active = categoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: active ? 700 : 600,
                        backgroundColor: active ? theme.accent : theme.badgeBg,
                        color: active ? "#ffffff" : theme.subtext,
                        border: `1px solid ${active ? theme.accent : theme.cardBorder}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Session Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.subtext, marginRight: 4 }}>Session:</span>
                {["All", "Stage", "Off-Stage"].map((sess) => {
                  const active = sessionFilter === sess;
                  return (
                    <button
                      key={sess}
                      onClick={() => setSessionFilter(sess)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: active ? 700 : 600,
                        backgroundColor: active ? (dark ? "rgba(255,255,255,0.2)" : "#334155") : theme.badgeBg,
                        color: active ? "#ffffff" : theme.subtext,
                        border: `1px solid ${active ? "transparent" : theme.cardBorder}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {sess}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Programs List */}
          {catalogPrograms === undefined ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: theme.subtext }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: `3px solid ${theme.accentSoft}`,
                  borderTopColor: theme.accent,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <div style={{ fontWeight: 600, fontSize: 15 }}>Loading Programs Catalog...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 20,
                padding: "50px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>No Lot-Ready Programs Found</h3>
              <p style={{ fontSize: 13, color: theme.subtext, margin: 0, maxWidth: 420, marginInline: "auto" }}>
                {searchQuery || categoryFilter !== "All" || sessionFilter !== "All"
                  ? "No programs matched your current search or filters. Try adjusting your filters."
                  : "Programs will appear here as soon as contestant lots and code letters are drawn by the stage manager."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
              {filteredCatalog.map((p) => {
                const isSub = p.isSubmitted || p.isConfirmed || p.isPublished;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      const token = p.judgeToken || p.id;
                      setCurrentToken(token);
                      if (typeof window !== "undefined") {
                        window.location.hash = `#/judge/${token}`;
                      }
                    }}
                    style={{
                      backgroundColor: theme.card,
                      border: `1px solid ${isSub ? "rgba(16,185,129,0.3)" : theme.cardBorder}`,
                      borderRadius: 18,
                      padding: "18px 20px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = isSub ? "#10b981" : theme.accent;
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = isSub ? "rgba(16,185,129,0.3)" : theme.cardBorder;
                      e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.03)";
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 8,
                              backgroundColor: theme.badgeBg,
                              color: theme.subtext,
                            }}
                          >
                            #{p.order}
                          </span>
                          {p.category && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                padding: "3px 8px",
                                borderRadius: 8,
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
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "3px 8px",
                                borderRadius: 8,
                                backgroundColor: theme.badgeBg,
                                color: theme.subtext,
                              }}
                            >
                              {p.session}
                            </span>
                          )}
                        </div>

                        {/* Status Indicator */}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: isSub ? theme.success : theme.accent,
                          }}
                        >
                          <Ic n={isSub ? "checkCircle" : "edit"} s={12} />
                          {isSub ? "Submitted" : "Ready"}
                        </span>
                      </div>

                      {/* Program Title */}
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          margin: "0 0 10px",
                          letterSpacing: "-0.3px",
                          lineHeight: 1.35,
                        }}
                      >
                        {p.name}
                      </h3>

                      <div style={{ fontSize: 12, color: theme.subtext, display: "flex", alignItems: "center", gap: 6 }}>
                        <Ic n="users" s={14} />
                        <span>{p.contestantCount} Contestants</span>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${theme.cardBorder}` }}>
                      <div
                        style={{
                          width: "100%",
                          padding: "9px 0",
                          borderRadius: 12,
                          backgroundColor: isSub ? theme.badgeBg : theme.accent,
                          color: isSub ? theme.text : "#ffffff",
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>{isSub ? "View Submitted Scores" : "Start Evaluation"}</span>
                        <Ic n={isSub ? "chevronRight" : "chevronRight"} s={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: PROGRAM SCORING SHEET (Blind Evaluation)
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
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Program Not Found</h2>
          <p style={{ fontSize: 13, color: theme.subtext, margin: "0 0 20px" }}>
            The code or program reference <strong>"{currentToken}"</strong> could not be located.
          </p>
          <button
            onClick={() => {
              setCurrentToken("");
              if (typeof window !== "undefined") window.location.hash = "#/judge";
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Back to Programs Catalog
          </button>
        </div>
      </div>
    );
  }

  // Main Scoring Sheet
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        paddingBottom: 120,
      }}
    >
      {/* Top Header */}
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
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
              gap: 6,
              padding: 0,
            }}
          >
            <Ic n="back" s={18} />
            <span>All Programs</span>
          </button>

          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {program.name}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {setDark && (
              <button
                onClick={() => setDark(!dark)}
                style={{
                  background: theme.inputBg,
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.text,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Toggle Theme"
              >
                <Ic n={dark ? "sun" : "moon"} s={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Scoring Sheet Container */}
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
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 20,
                backgroundColor: isLocked ? theme.successSoft : "rgba(59,130,246,0.15)",
                color: isLocked ? theme.success : "#3b82f6",
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
            <span><strong>Blind Evaluation:</strong> Student names and chest numbers are masked with Code Letters.</span>
          </div>
        </div>

        {/* Lock Banner if already submitted */}
        {isLocked && (
          <div
            style={{
              backgroundColor: theme.successSoft,
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
                backgroundColor: theme.success,
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
              <div style={{ fontWeight: 700, fontSize: 15, color: theme.success }}>Evaluation Submitted</div>
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
                  border: `1.5px solid ${currentScore !== "" ? theme.accent : theme.cardBorder}`,
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
                    <div style={{ fontSize: 12, color: theme.subtext }}>Contestant {idx + 1}</div>
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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {gradeInfo.label}
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
                        width: 84,
                        height: 46,
                        textAlign: "center",
                        fontSize: 18,
                        fontWeight: 800,
                        backgroundColor: isLocked ? theme.badgeBg : theme.inputBg,
                        border: `1.5px solid ${currentScore !== "" ? theme.accent : theme.inputBorder}`,
                        borderRadius: 14,
                        color: theme.text,
                        outline: "none",
                        fontFamily: "inherit",
                        cursor: isLocked ? "not-allowed" : "text",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      {!isLocked && (
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
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {filledCount} of {codeLetters.length} contestants scored
              </div>
              <div style={{ fontSize: 12, color: theme.subtext }}>
                {isComplete ? "All marks entered. Ready to submit." : "Enter marks (0–100) for all contestants"}
              </div>
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isComplete || submitting}
              style={{
                backgroundColor: isComplete ? theme.accent : dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                color: isComplete ? "#ffffff" : theme.subtext,
                border: "none",
                borderRadius: 14,
                padding: "12px 24px",
                fontWeight: 800,
                fontSize: 15,
                cursor: isComplete && !submitting ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: isComplete ? "0 4px 16px rgba(241,77,77,0.3)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              <span>Submit Evaluation</span>
              <Ic n="check" s={18} />
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 24,
              padding: "28px 24px",
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
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
              Confirm Official Submission?
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
