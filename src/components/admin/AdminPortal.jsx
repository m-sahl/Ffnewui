import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Shield, Users, List, Crown, PenTool, ChevronDown } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "../common/Toast";
import { useApp } from "../../context/AppContext";
import Ic from "../common/Ic";
import { Topbar } from "../common/Topbar";
import Modal from "../common/Modal";
import PrintSection from "./PrintSection";
import MessagesPanel from "./MessagesPanel";
import ImportStudentsModal from "./ImportStudentsModal";
import ImportProgramsModal from "./ImportProgramsModal";
import PublishResultsModal from "./PublishResultsModal";
import EvaluationReviewModal from "./EvaluationReviewModal";
import CodeLetterModal from "./CodeLetterModal";
import PublishingSection from "./PublishingSection";
import { getProgramLots } from "../../utils/lotUtils";
import { buildJudgeMessage } from "../../utils/formatMessage";
import * as XLSX from "xlsx";
import { CATS, STUDENT_CATS, ACCENT, catColor, ACCENT4 } from "../../styles/DesignTokens";
import { getHashRoute, useHashSync, useModalBackHandler } from "../../utils/useRouting";
import {
  calculateTeamStandings,
  calculateStudentStandings,
  getScoringRules,
  saveScoringRules,
  DEFAULT_SCORING_RULES,
  STATIC_FESTIVAL_RULES,
  isGeneralProgram,
} from "../../utils/scoring";

const VALID_VIEWS = ["dashboard", "leaderboard", "students", "events", "programs", "users", "registrations", "results", "publishing", "print", "settings"];

const NAV = [
  { id: "dashboard",     icon: "dashboard",   label: "Dashboard"   },
  { id: "leaderboard",   icon: "trophy",      label: "Leaderboard" },
  { id: "students",      icon: "users",       label: "Students"    },
  { id: "events",        icon: "book",        label: "Events"      },
  { id: "users",         icon: "shield",      label: "Groups"      },
  { id: "registrations", icon: "list",        label: "Entries"     },
  { id: "results",       icon: "checkCircle", label: "Evaluations" },
  { id: "publishing",    icon: "award",       label: "Publish"     },
  { id: "print",         icon: "printer",     label: "Print"       },
  { id: "settings",      icon: "settings",    label: "Settings"    },
];

const Tag = ({ label, dark }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: dark ? "#6b7280" : "#9ca3af" }}>{label}</span>
);

// Thin wrapper — just the gear icon that opens Topbar's SettingsPanel
const SettingsBtn = ({ dark, setDark, userPin, onLogout }) => {
  const [open, setOpen] = React.useState(false);
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        width: 34, height: 34, borderRadius: 9, border: `1px solid ${border}`,
        background: "transparent", color: mutedTx, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.color = "#f14d4d"; e.currentTarget.style.borderColor = "rgba(241,77,77,0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = mutedTx; e.currentTarget.style.borderColor = border; }}
      >
        <Ic name="settings" size={15} />
      </button>
      {open && (
        <Topbar
          _settingsOnly
          dark={dark} setDark={setDark}
          context="Admin mode · Full access"
          onLogout={onLogout} isAdmin
          verify={(val) => val === userPin}
          onSettingsClose={() => setOpen(false)}
          _forceOpen={open}
        />
      )}
    </>
  );
};

// Searchable program select dropdown with inline search and category filters
function SearchableProgramSelect({
  value,
  onChange,
  programs = [],
  scoringRules = null,
  dark = false,
  cardBorder = "1px solid rgba(0,0,0,0.1)",
  rowBg = "#ffffff",
  primaryHeadingColor = "#0f172a",
  mutedTx = "#64748b",
  ACCENT = "#f14d4d",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedProg = useMemo(
    () => programs.find((p) => String(p.id) === String(value)),
    [programs, value]
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (selectedCat !== "All") {
      list = list.filter((p) => (p.category || "General").toLowerCase() === selectedCat.toLowerCase());
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    const cleanQ = q.replace(/^#/, "").trim();
    return list.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      const sess = (p.session || p.type || "").toLowerCase();
      const code = String(p.order ?? p.code ?? "");
      return (
        name.includes(q) ||
        cat.includes(q) ||
        sess.includes(q) ||
        code.includes(cleanQ) ||
        code.includes(q)
      );
    });
  }, [programs, search, selectedCat]);

  const popoverBg = dark ? "#1e222b" : "#ffffff";
  const itemHoverBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="input"
        style={{
          height: 38,
          width: "100%",
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          fontSize: 12.5,
          fontWeight: 700,
          background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
          borderColor: isOpen ? ACCENT : undefined,
          boxShadow: isOpen ? `0 0 0 2px ${ACCENT}25` : undefined,
          gap: 8,
        }}
      >
        {selectedProg ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(59,130,246,0.12)",
              color: "#3b82f6",
              flexShrink: 0,
            }}>
              {selectedProg.category || "General"}
            </span>
            <span style={{ color: primaryHeadingColor, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              #{selectedProg.order ?? selectedProg.code ?? "?"} {selectedProg.name}
            </span>
            <span style={{ fontSize: 10, color: mutedTx, flexShrink: 0 }}>
              ({selectedProg.session || selectedProg.type || "Stage"})
            </span>
            {scoringRules?.customProgramPoints?.[selectedProg.id] && (
              <span style={{ fontSize: 10, color: ACCENT, fontWeight: 800, flexShrink: 0 }}>★</span>
            )}
          </div>
        ) : (
          <span style={{ color: mutedTx, fontWeight: 500 }}>— Search or select a program —</span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {selectedProg && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{
                border: "none",
                background: "transparent",
                color: mutedTx,
                cursor: "pointer",
                padding: "2px 4px",
                fontSize: 12,
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
              }}
              title="Clear selection"
            >
              ✕
            </button>
          )}
          <span style={{ fontSize: 10, color: mutedTx, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            ▼
          </span>
        </div>
      </div>

      {/* Dropdown Menu with Search */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            minWidth: 320,
            maxWidth: 440,
            zIndex: 999,
            background: popoverBg,
            border: cardBorder,
            borderRadius: 12,
            boxShadow: dark ? "0 14px 36px rgba(0,0,0,0.5)" : "0 12px 32px rgba(0,0,0,0.12)",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Search Box Input */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: 10, fontSize: 12, color: mutedTx, pointerEvents: "none" }}>
              🔍
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, #code, category..."
              className="input"
              style={{
                height: 34,
                width: "100%",
                paddingLeft: 30,
                paddingRight: search ? 28 : 10,
                fontSize: 12,
                fontWeight: 600,
                background: dark ? "rgba(255,255,255,0.05)" : "#f8fafc",
                borderRadius: 8,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 6,
                  border: "none",
                  background: "transparent",
                  color: mutedTx,
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
            {["All", "Low", "Mid", "High", "General"].map((cat) => {
              const active = selectedCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  style={{
                    fontSize: 10.5,
                    fontWeight: active ? 800 : 600,
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background: active ? ACCENT : (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                    color: active ? "#ffffff" : mutedTx,
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Program Items List */}
          <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, paddingRight: 2 }}>
            {filteredPrograms.length === 0 ? (
              <div style={{ padding: "16px 8px", textAlign: "center", color: mutedTx, fontSize: 12 }}>
                No programs found matching "{search}"
              </div>
            ) : (
              filteredPrograms.map((p) => {
                const isSelected = String(p.id) === String(value);
                const isCustom = !!scoringRules?.customProgramPoints?.[p.id];
                const customPoints = scoringRules?.customProgramPoints?.[p.id];

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      background: isSelected
                        ? (dark ? "rgba(241,77,77,0.18)" : "rgba(241,77,77,0.08)")
                        : "transparent",
                      border: isSelected ? `1px solid ${ACCENT}40` : "1px solid transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = itemHoverBg;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: "rgba(59,130,246,0.12)",
                        color: "#3b82f6",
                        flexShrink: 0,
                      }}>
                        {p.category || "General"}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 12, color: primaryHeadingColor }}>
                        #{p.order ?? p.code ?? "?"}
                      </span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: isSelected ? 800 : 600,
                        color: isSelected ? ACCENT : primaryHeadingColor,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 10, color: mutedTx, flexShrink: 0 }}>
                        · {p.session || p.type || "Stage"}
                      </span>
                    </div>

                    {isCustom && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "rgba(241,77,77,0.12)",
                        color: ACCENT,
                        flexShrink: 0,
                      }}>
                        ★ {customPoints?.first ?? 3}-{customPoints?.second ?? 2}-{customPoints?.third ?? 1}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const AdminPortal = ({ user, dark, setDark, onBack }) => {
  const { groups, programs, setPrograms, addProgram, updateProgram, deleteProgram, revertEvaluation, publishResults, unpublishResults, syncCodeAllocations, students, setStudents, updateStudent, registrations, setRegistrations, addRegistration, removeRegistration, users, setUsers, addUser, updateUser, deleteUser, activityLogs, logActivity, clearLogs, messages, locks, toggleLock, isLocked, nextChestNo, programLimits, updateProgramLimits, getStudentQuotaUsage, scoringRules: contextScoringRules, updateScoringRules: contextUpdateScoringRules, isGeneralProgram: contextIsGeneralProgram } = useApp();

  const [view, setViewState]         = useState(() => getHashRoute("admin", "students", VALID_VIEWS, { programs: "events" }));
  const setViewSync                   = useHashSync("admin", view, setViewState, VALID_VIEWS, { programs: "events" });
  const setView                       = useCallback((v) => { setViewState(v); setViewSync(v); }, [setViewSync]);

  const [activeGroup, setActiveGroup] = useState(groups[0]?.id);

  const contentRef = useRef(null);
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [view]);

  // On localhost, purge any saved production vercel.app URLs to guarantee local testing links work
  useEffect(() => {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      try {
        const saved = localStorage.getItem("ff_public_app_url");
        if (saved && saved.includes("vercel.app")) {
          localStorage.removeItem("ff_public_app_url");
        }
      } catch {}
    }
  }, []);
  const showToast = useToast();
  const serverJudgePasscode = useQuery(api.settings.getJudgePasscode);
  const setServerJudgePasscode = useMutation(api.settings.setJudgePasscode);
  const currentJudgePasscode = serverJudgePasscode || "judge2026";
  const [editingJudgePasscode, setEditingJudgePasscode] = useState(false);
  const [tempJudgePasscode, setTempJudgePasscode] = useState("");
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const [isSavingPasscode, setIsSavingPasscode] = useState(false);

  const handleSaveJudgePasscode = async () => {
    const clean = tempJudgePasscode.trim();
    if (!clean) {
      if (showToast) showToast("Passcode cannot be empty", "error");
      return;
    }
    setIsSavingPasscode(true);
    try {
      await setServerJudgePasscode({ passcode: clean });
      logActivity(user.name, "Changed Judge Passcode", `Updated passcode to "${clean}"`);
      if (showToast) showToast("Judge Passcode updated successfully!", "success");
      setEditingJudgePasscode(false);
      setTempJudgePasscode("");
    } catch (err) {
      if (showToast) showToast(err?.message || "Failed to update passcode", "error");
    } finally {
      setIsSavingPasscode(false);
    }
  };

  const handleShareJudgesPortalWhatsApp = () => {
    const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const currentOrigin = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
    const customOrigin = (() => {
      try {
        const saved = localStorage.getItem("ff_public_app_url");
        if (saved && saved.trim()) {
          const cleanSaved = saved.trim().replace(/\/+$/, "");
          if (isLocalhost && cleanSaved.includes("vercel.app")) {
            return currentOrigin;
          }
          return cleanSaved;
        }
      } catch {}
      return currentOrigin;
    })();

    const portalUrl = `${customOrigin}/#/judge`;
    const text = [
      `🏆 *COGNIZANCE* — *Official Judges Scoring Portal*`,
      ``,
      `Welcome, Honorable Judges!`,
      `Please use the official portal link below to log in and enter program results:`,
      ``,
      `👉 *Scoring Portal Link:*`,
      `${portalUrl}`,
      ``,
      `🔑 *Judge Passcode:* \`${currentJudgePasscode}\``,
      ``,
      `📋 *Quick Instructions:*`,
      `1. Open the link above on your phone or tablet.`,
      `2. Enter the Judge Passcode to open your scoring dashboard.`,
      `3. Filter by Category or Session to find your assigned events.`,
      `4. Enter contestant marks (0–100) anonymously using Code Letters.`,
      `5. Submit your evaluation to transmit results directly to the control room.`,
      ``,
      `_Student identities and chest numbers remain protected via blind evaluation._`,
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    logActivity(user.name, "Shared Judges Portal invite", `Sent WhatsApp invitation with passcode`);
  };

  const handleCopyJudgesPortalLink = () => {
    const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const currentOrigin = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
    const customOrigin = (() => {
      try {
        const saved = localStorage.getItem("ff_public_app_url");
        if (saved && saved.trim()) {
          const cleanSaved = saved.trim().replace(/\/+$/, "");
          if (isLocalhost && cleanSaved.includes("vercel.app")) {
            return currentOrigin;
          }
          return cleanSaved;
        }
      } catch {}
      return currentOrigin;
    })();

    const portalUrl = `${customOrigin}/#/judge`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(portalUrl);
      setCopiedPortalLink(true);
      setTimeout(() => setCopiedPortalLink(false), 2000);
      if (showToast) showToast("Judges Portal link copied to clipboard!", "success");
      logActivity(user.name, "Copied Judges Portal link", portalUrl);
    }
  };

  const [adminNewPwd, setAdminNewPwd]             = useState("");
  const [adminNewPwdConfirm, setAdminNewPwdConfirm] = useState("");
  const [adminPwdSuccess, setAdminPwdSuccess]     = useState(false);
  const [adminPwdError, setAdminPwdError]         = useState("");
  const [showLogModal, setShowLogModal]           = useState(false);
  const [clearLogConfirm, setClearLogConfirm]     = useState(false);

  const handleAdminChangePassword = () => {
    if (!adminNewPwd.trim()) {
      setAdminPwdError("Password cannot be empty.");
      return;
    }
    if (adminNewPwd !== adminNewPwdConfirm) {
      setAdminPwdError("Passwords do not match.");
      return;
    }
    setUsers(prev => prev.map(u => u.role === "admin" ? { ...u, pin: adminNewPwd.trim() } : u));
    logActivity(user.name, "Changed admin password", "System admin PIN updated");
    setAdminPwdSuccess(true);
    setAdminPwdError("");
    setAdminNewPwd("");
    setAdminNewPwdConfirm("");
    setTimeout(() => {
      setAdminPwdSuccess(false);
    }, 3000);
  };

  const [isSyncingLots, setIsSyncingLots] = useState(false);
  const [syncLotsResult, setSyncLotsResult] = useState(null);

  const handleSyncCodeAllocations = async () => {
    setIsSyncingLots(true);
    setSyncLotsResult(null);
    try {
      const res = await syncCodeAllocations();
      setSyncLotsResult({
        success: true,
        message: `Successfully synchronized ${res?.synced ?? 0} programs.`,
      });
      logActivity(user.name, "Synchronized code allocations", `${res?.synced ?? 0} programs updated`);
      setTimeout(() => setSyncLotsResult(null), 5000);
    } catch (err) {
      setSyncLotsResult({
        success: false,
        message: err?.message || "Sync failed",
      });
    } finally {
      setIsSyncingLots(false);
    }
  };

  // ── Festival Scoring Engine & Real-Time Standings ─────────────────────────────
  const [scoringRules, setScoringRules] = useState(() => contextScoringRules || getScoringRules());
  const [scoringRulesSaved, setScoringRulesSaved] = useState(false);
  const [selectedCustomProgId, setSelectedCustomProgId] = useState("");
  const [customFirst, setCustomFirst] = useState(3);
  const [customSecond, setCustomSecond] = useState(2);
  const [customThird, setCustomThird] = useState(1);
  const [customToTeams, setCustomToTeams] = useState(true);
  const [customToIndividuals, setCustomToIndividuals] = useState(true);

  useEffect(() => {
    if (contextScoringRules) {
      setScoringRules(contextScoringRules);
    }
  }, [contextScoringRules]);

  const handleSaveScoringRules = (updatedRules) => {
    const rulesToSave = {
      ...DEFAULT_SCORING_RULES,
      ...updatedRules,
      base: { ...STATIC_FESTIVAL_RULES.base },
      individual: { ...STATIC_FESTIVAL_RULES.individual },
      group: { ...STATIC_FESTIVAL_RULES.group },
      grades: { ...STATIC_FESTIVAL_RULES.grades },
      mode: "position_and_grade",
      customProgramPoints: { ...(updatedRules?.customProgramPoints || {}) },
    };
    if (contextUpdateScoringRules) {
      contextUpdateScoringRules(rulesToSave);
    } else {
      saveScoringRules(rulesToSave);
    }
    setScoringRules(rulesToSave);
    setScoringRulesSaved(true);
    logActivity(user.name, "Updated festival scoring rules", "Saved custom program points & destination routing");
    setTimeout(() => setScoringRulesSaved(false), 3000);
  };

  const handleResetScoringRules = () => {
    if (contextUpdateScoringRules) {
      contextUpdateScoringRules(DEFAULT_SCORING_RULES);
    } else {
      saveScoringRules(DEFAULT_SCORING_RULES);
    }
    setScoringRules(DEFAULT_SCORING_RULES);
    setSelectedCustomProgId("");
    setCustomFirst(3);
    setCustomSecond(2);
    setCustomThird(1);
    setCustomToTeams(true);
    setCustomToIndividuals(true);
    setScoringRulesSaved(true);
    logActivity(user.name, "Reset scoring rules to defaults", "Restored festival defaults");
    setTimeout(() => setScoringRulesSaved(false), 3000);
  };

  const selectableProgramsList = useMemo(() => {
    return [...programs].sort((a, b) => {
      const catOrder = { "Low": 1, "Mid": 2, "High": 3, "General": 4 };
      const cA = catOrder[a.category] || 9;
      const cB = catOrder[b.category] || 9;
      if (cA !== cB) return cA - cB;
      return (Number(a.order ?? a.code) || 0) - (Number(b.order ?? b.code) || 0) || (a.name || "").localeCompare(b.name || "");
    });
  }, [programs]);

  const handleSelectProgramToCustomize = (progId) => {
    setSelectedCustomProgId(progId);
    if (!progId) {
      setCustomFirst(3);
      setCustomSecond(2);
      setCustomThird(1);
      setCustomToTeams(true);
      setCustomToIndividuals(true);
      return;
    }
    const existing = scoringRules?.customProgramPoints?.[progId];
    if (existing) {
      setCustomFirst(Number(existing.first ?? 3));
      setCustomSecond(Number(existing.second ?? 2));
      setCustomThird(Number(existing.third ?? 1));
      setCustomToTeams(existing.toTeams !== false);
      setCustomToIndividuals(existing.toIndividuals !== false);
    } else {
      setCustomFirst(3);
      setCustomSecond(2);
      setCustomThird(1);
      setCustomToTeams(true);
      setCustomToIndividuals(true);
    }
  };

  const handleAddOrUpdateCustomProgram = () => {
    if (!selectedCustomProgId) return;
    if (!customToTeams && !customToIndividuals) {
      alert("Please select at least one destination (Teams or Individuals).");
      return;
    }
    const updated = {
      ...scoringRules,
      customProgramPoints: {
        ...(scoringRules.customProgramPoints || {}),
        [selectedCustomProgId]: {
          first: Math.max(0, Number(customFirst) || 0),
          second: Math.max(0, Number(customSecond) || 0),
          third: Math.max(0, Number(customThird) || 0),
          toTeams: !!customToTeams,
          toIndividuals: !!customToIndividuals,
        },
      },
    };
    handleSaveScoringRules(updated);
    setSelectedCustomProgId("");
    setCustomFirst(3);
    setCustomSecond(2);
    setCustomThird(1);
    setCustomToTeams(true);
    setCustomToIndividuals(true);
  };

  const handleUpdateCustomProgramField = (progId, field, val) => {
    const existing = scoringRules.customProgramPoints?.[progId] || { first: 3, second: 2, third: 1, toTeams: true, toIndividuals: true };
    let nextVal = val;
    if (field === "first" || field === "second" || field === "third") {
      nextVal = Math.max(0, Number(val) || 0);
    }
    // Prevent unchecking both destinations
    if (field === "toTeams" && !nextVal && !existing.toIndividuals) {
      return;
    }
    if (field === "toIndividuals" && !nextVal && !existing.toTeams) {
      return;
    }
    const updated = {
      ...scoringRules,
      customProgramPoints: {
        ...(scoringRules.customProgramPoints || {}),
        [progId]: {
          ...existing,
          [field]: nextVal,
        },
      },
    };
    handleSaveScoringRules(updated);
  };

  const handleRemoveCustomProgram = (progId) => {
    const current = { ...(scoringRules.customProgramPoints || {}) };
    delete current[progId];
    const updated = {
      ...scoringRules,
      customProgramPoints: current,
    };
    handleSaveScoringRules(updated);
  };

  const teamStandings = useMemo(() => {
    return calculateTeamStandings(programs, groups, students, scoringRules);
  }, [programs, groups, students, scoringRules]);

  const studentStandings = useMemo(() => {
    return calculateStudentStandings(programs, students, groups, scoringRules);
  }, [programs, students, groups, scoringRules]);

  // Leaderboard exploration view state
  const [leaderboardSessionFilter, setLeaderboardSessionFilter] = useState("All");
  const [leaderboardCatFilter, setLeaderboardCatFilter] = useState("All");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [leaderboardActiveTab, setLeaderboardActiveTab] = useState("teams");
  const [expandedAwards, setExpandedAwards] = useState({});
  const toggleAwardExpanded = useCallback((title) => {
    setExpandedAwards(prev => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const [progType, setProgType]       = useState("Stage");
  const [catFilter, setCatFilter]     = useState("All");
  const [search, setSearch]           = useState("");
  const [showSearch, setShowSearch]   = useState(false);
  const searchRef                     = useRef(null);
  const [stuSearch, setStuSearch]     = useState("");
  const [stuSearchOpen, setStuSearchOpen] = useState(false);
  const [stuCatFilter, setStuCatFilter]   = useState("All");
  const [progModal, setProgModal]     = useState(false);
  const [editProg, setEditProg]       = useState(null);
  const [progForm, setProgForm]       = useState({ name: "", type: "Stage", category: "General", maxParticipants: 1 });
  const [stuModal, setStuModal]       = useState(false);
  const [stuForm, setStuForm]         = useState({ name: "", category: "High" });
  const [editNameModal, setEditNameModal] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [userModal, setUserModal]         = useState(false);
  const [userForm, setUserForm]           = useState({ name: "", pin: "" });
  const [editUserModal, setEditUserModal] = useState(false);
  const [editingUser, setEditingUser]     = useState(null);
  const [editUserForm, setEditUserForm]   = useState({ name: "", pin: "" });
  const [delConfirm, setDelConfirm]         = useState(null);
  const [regGroupFilter, setRegGroupFilter] = useState("all");
  const [regCatFilter, setRegCatFilter]     = useState("All");
  const [regSearch, setRegSearch]           = useState("");
  const [regSearchOpen, setRegSearchOpen]   = useState(false);
  const [showMessages, setShowMessages]         = useState(false);
  const [importModal, setImportModal]             = useState(false);
  const [progImportModal, setProgImportModal]     = useState(false);
  const [selectedEntryInfo, setSelectedEntryInfo] = useState(null);
  const [resCatFilter, setResCatFilter]         = useState("All");
  const [resStatusFilter, setResStatusFilter]   = useState("all");
  const [resSearch, setResSearch]               = useState("");
  const [resSearchOpen, setResSearchOpen]       = useState(true);
  const [activeResultProg, setActiveResultProg] = useState(null);
  const [activeEvalProg, setActiveEvalProg]     = useState(null);
  const [codeLetterProg, setCodeLetterProg]     = useState(null);
  const [copiedProgId, setCopiedProgId]         = useState(null);
  const [confirmSignOut, setConfirmSignOut]     = useState(false);

  const isAnyModalOpen = progModal || stuModal || userModal || editUserModal || !!delConfirm || showMessages || importModal || progImportModal || !!selectedEntryInfo || !!activeResultProg || !!activeEvalProg || !!codeLetterProg || confirmSignOut;
  const closeAllModals = useCallback(() => {
    setProgModal(false);
    setEditProg(null);
    setStuModal(false);
    setUserModal(false);
    setEditUserModal(false);
    setEditingUser(null);
    setDelConfirm(null);
    setShowMessages(false);
    setImportModal(false);
    setProgImportModal(false);
    setSelectedEntryInfo(null);
    setActiveResultProg(null);
    setActiveEvalProg(null);
    setCodeLetterProg(null);
    setConfirmSignOut(false);
  }, []);

  useModalBackHandler(isAnyModalOpen, closeAllModals);

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.id === activeGroup)) setActiveGroup(groups[0].id);
    if (groups.length > 0 && regGroupFilter !== "all" && !groups.some(g => g.id === regGroupFilter)) {
      setRegGroupFilter("all");
    }
  }, [groups, activeGroup, regGroupFilter]);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showSearch]);

  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg  = dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)";
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const sideBg  = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
  const primaryHeadingColor = dark ? "#f8fafc" : "#0f172a";

  // ── Student ops ─────────────────────────────────────────────────────────
  const saveStudent = () => {
    if (!stuForm.name.trim()) return;
    const sId = "s-" + Math.random().toString(36).substr(2, 5);
    const chestNo = stuForm.chestNo?.trim() || nextChestNo(stuForm.category);
    const newStudent = { id: sId, ...stuForm, groupId: activeGroup, chestNo };
    setStudents(prev => ({ ...prev, [activeGroup]: [...(prev[activeGroup] || []), newStudent] }));
    logActivity(user.name, "Added student", `${newStudent.name} (${newStudent.chestNo}) to ${groups.find(g => g.id === activeGroup)?.name}`);
    setStuModal(false); setStuForm({ name: "", chestNo: "", category: stuCatFilter !== "All" ? stuCatFilter : "High" });
  };
  const deleteStudent = (gId, sId, name) => {
    if (registrations.some(r => r.groupId === gId && r.participantIds.includes(sId))) {
      setDelConfirm({ type: "blocked", label: "This student has active registrations and cannot be deleted." }); return;
    }
    setDelConfirm({ type: "student", id: { gId, sId }, label: name });
  };
  const confirmDeleteStudent = () => {
    const { gId, sId } = delConfirm.id;
    const s = (students[gId] || []).find(x => x.id === sId);
    setStudents(prev => ({ ...prev, [gId]: prev[gId].filter(s => s.id !== sId) }));
    if (s) logActivity(user.name, "Deleted student", `${s.name} from ${groups.find(g => g.id === gId)?.name}`);
    setDelConfirm(null);
  };
  const updateStudentRole = (gId, sId, role) => {
    updateStudent(gId, sId, { groupRole: role });
  };
  const handleSaveStudentName = () => {
    if (!editNameModal || !editNameValue.trim()) return;
    const newName = editNameValue.trim();
    if (newName !== editNameModal.name) {
      updateStudent(editNameModal.groupId, editNameModal.id, { name: newName });
      logActivity(user.name, "Renamed student", `${editNameModal.name} → ${newName} (Chest ${editNameModal.chestNo})`);
    }
    setEditNameModal(null);
  };
  const handleImportStudents = (groupedStudents, mode, totalCount) => {
    setStudents(prev => {
      const next = { ...prev };
      for (const [gId, newStus] of Object.entries(groupedStudents)) {
        if (mode === "replace") {
          next[gId] = newStus;
        } else {
          next[gId] = [...(next[gId] || []), ...newStus];
        }
      }
      return next;
    });
    const groupCount = Object.keys(groupedStudents).length;
    logActivity(user.name, "Imported students from Excel", `${totalCount} student(s) imported across ${groupCount} group(s) (${mode} mode)`);
    setImportModal(false);
  };

  // ── Program ops ─────────────────────────────────────────────────────────
  const openAddProg  = () => { setEditProg(null); setProgForm({ name: "", type: progType, category: catFilter === "All" ? "General" : catFilter, maxParticipants: 1 }); setProgModal(true); };
  const openEditProg = (p) => { setEditProg(p.id); setProgForm({ ...p, type: p.type || p.session || "Stage" }); setProgModal(true); };
  const saveProg = () => {
    if (!progForm.name.trim()) return;
    const pData = { ...progForm, type: progForm.type || "Stage", session: progForm.type || "Stage" };
    if (editProg) {
      updateProgram(editProg, pData);
      logActivity(user.name, "Updated event", progForm.name);
    } else {
      const newProg = { id: "p-" + Math.random().toString(36).substr(2, 5), order: programs.length + 1, ...pData };
      addProgram(newProg);
      logActivity(user.name, "Added event", `${progForm.name} (${progForm.type})`);
    }
    setProgModal(false);
  };
  const deleteProg = (id, name) => {
    if (registrations.some(r => r.programId === id)) { setDelConfirm({ type: "blocked", label: "This event has active registrations and cannot be deleted." }); return; }
    setDelConfirm({ type: "program", id, label: name });
  };
  const confirmDeleteProg = () => { deleteProgram(delConfirm.id); logActivity(user.name, "Deleted event", delConfirm.label); setDelConfirm(null); };
  const openProgEntries = (p) => {
    const progRegs = registrations.filter(r => r.programId === p.id);
    const teamEntries = progRegs.map(r => {
      const grp = groups.find(g => g.id === r.groupId) || { id: r.groupId, name: "Team", color: ACCENT };
      const grpStudents = students[r.groupId] || [];
      const parts = (r.participantIds || []).map(id => grpStudents.find(s => s.id === id)).filter(Boolean);
      return { registration: r, group: grp, participants: parts };
    });
    const allParticipants = [];
    for (const te of teamEntries) {
      for (const st of te.participants) {
        allParticipants.push({
          ...st,
          groupId: te.group.id,
          groupName: te.group.name,
          groupColor: te.group.color,
        });
      }
    }
    allParticipants.sort((a, b) => {
      const gComp = (a.groupName || "").localeCompare(b.groupName || "");
      if (gComp !== 0) return gComp;
      return (Number(a.chestNo) || 0) - (Number(b.chestNo) || 0);
    });

    setSelectedEntryInfo({
      isCrossGroup: true,
      program: p,
      allParticipants,
      teamEntries,
      groupCount: teamEntries.length,
    });
  };
  const handleImportPrograms = (newPrograms, mode, mappedCategories, totalCount) => {
    setPrograms(prev => {
      if (mode === "replace") {
        const catSet = new Set(mappedCategories);
        const kept = prev.filter(p => !catSet.has(p.category));
        return [...kept, ...newPrograms];
      } else {
        return [...prev, ...newPrograms];
      }
    });
    logActivity(user.name, "Imported events from Excel", `${totalCount} event(s) imported across ${mappedCategories.length} category(s) (${mode} mode)`);
    setProgImportModal(false);
  };

  // ── Group ops ────────────────────────────────────────────────────────────
  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.pin.trim()) return;
    const id = "u-" + Math.random().toString(36).substr(2, 5);
    addUser({ id, name: userForm.name.trim(), pin: userForm.pin.trim(), role: "group", groupId: id });
    logActivity(user.name, "Added group", userForm.name);
    setUserModal(false); setUserForm({ name: "", pin: "" });
  };
  const openEditUser  = (u) => { setEditingUser(u); setEditUserForm({ name: u.name, pin: u.pin }); setEditUserModal(true); };
  const saveEditUser  = () => {
    if (!editUserForm.name.trim() || !editUserForm.pin.trim()) return;
    updateUser(editingUser.id, { name: editUserForm.name.trim(), pin: editUserForm.pin.trim() });
    logActivity(user.name, "Edited group", editUserForm.name);
    setEditUserModal(false); setEditingUser(null);
  };
  const deleteUserConfirm = (id, name) => {
    if (id === user.id) { setDelConfirm({ type: "blocked", label: "You cannot delete your own account." }); return; }
    setDelConfirm({ type: "user", id, label: name });
  };
  const confirmDeleteUser  = () => { deleteUser(delConfirm.id); logActivity(user.name, "Deleted group", delConfirm.label); setDelConfirm(null); };
  const confirmClearLogs   = () => { clearLogs(); setDelConfirm(null); };

  useEffect(() => {
    if (!delConfirm) return;
    const handleKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (delConfirm.type === "blocked") {
          setDelConfirm(null);
        } else if (delConfirm.type === "student") {
          confirmDeleteStudent();
        } else if (delConfirm.type === "program") {
          confirmDeleteProg();
        } else if (delConfirm.type === "logs") {
          confirmClearLogs();
        } else {
          confirmDeleteUser();
        }
      } else if (e.key === "Escape") {
        setDelConfirm(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [delConfirm]);

  // ── Dashboard Styles (Tokens mirror cream bg & red accent theme) ─────────
  const dashboardCss = `
    .ad {
      --bg: #fbf7f4;
      --card: #fff;
      --text: #14142b;
      --muted: #7a7a8c;
      --line: #eee7e2;
      --red: #e5383b;
      --redbg: #fde8e8;
      --gold: #d98300;
      --goldbg: #fff6df;
      --violet: #6d4aff;
      --violetbg: #f1edff;
      color: var(--text);
      font-family: Inter, system-ui, sans-serif;
      transition: background 0.4s, color 0.4s;
      width: 100%;
    }
    .ad.dark {
      --bg: #0f0f17;
      --card: #181824;
      --text: #f2f2f7;
      --muted: #9a9aae;
      --line: #2a2a3a;
      --redbg: #3a1c1f;
      --goldbg: #2e2410;
      --violetbg: #25203f;
    }
    .ad * { box-sizing: border-box; }
    .ad button { font: inherit; color: inherit; cursor: pointer; background: none; border: 0; }
    .ad .main { width: 100%; animation: adFade 0.5s ease; }
    @keyframes adFade {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: none; }
    }
    .ad h1 { font-size: 30px; margin: 0 0 20px; letter-spacing: -0.02em; font-weight: 800; color: var(--text); }
    .ad h2 { font-size: 19px; margin: 30px 0 14px; letter-spacing: -0.01em; font-weight: 800; color: var(--text); }
    .ad .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .ad .stack { display: flex; flex-direction: column; gap: 12px; }
    .ad .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(20,20,43,0.04); transition: transform 0.3s, box-shadow 0.3s; }
    .ad .card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(20,20,43,0.1); }
    .ad .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .ad .row.start { justify-content: flex-start; }
    .ad .grow { flex: 1; min-width: 0; }
    .ad .eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
    .ad .chip { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; }
    .ad .chip.red { background: var(--redbg); color: var(--red); }
    .ad .chip.blue { background: #e8f0ff; color: #3b6cf6; }
    .ad.dark .chip.blue { background: rgba(59, 108, 246, 0.2); color: #60a5fa; }
    .ad .chip.green { background: #e3f8ee; color: #12a05c; }
    .ad.dark .chip.green { background: rgba(18, 160, 92, 0.2); color: #34d399; }
    .ad .num { font-size: 38px; font-weight: 700; margin-top: 12px; letter-spacing: -0.03em; color: var(--text); }
    .ad .badge { width: 34px; height: 34px; border-radius: 10px; background: var(--redbg); color: var(--red); display: grid; place-items: center; font-weight: 700; }
    .ad .team b:not(.due) { font-size: 16px; color: var(--text); }
    .ad .kv { display: flex; justify-content: space-between; padding: 10px 0 0; margin-top: 10px; border-top: 1px solid var(--line); color: var(--muted); font-size: 14px; }
    .ad .kv b { color: var(--text); }
    .ad .kv .due { color: var(--gold); }
    .ad .split { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
    .ad .rank { display: flex; align-items: center; gap: 14px; }
    .ad .rank b { flex: 1; font-size: 17px; color: var(--text); }
    .ad .pos { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px; background: var(--line); color: var(--text); }
    .ad .r0 { background: linear-gradient(135deg, var(--goldbg), var(--card)); }
    .ad .r0 .pos { background: var(--gold); color: #fff; }
    .ad .pts { font-size: 24px; font-weight: 700; color: var(--text); }
    .ad .pts small { font-size: 12px; color: var(--muted); font-weight: 500; }
    .ad .award { display: flex; flex-direction: column; gap: 14px; cursor: pointer; user-select: none; transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; outline: none; }
    .ad .award:focus-visible { outline: 2px solid var(--red); }
    .ad .award.gold { background: linear-gradient(135deg, var(--goldbg), var(--card)); }
    .ad .award.violet { background: linear-gradient(135deg, var(--violetbg), var(--card)); }
    .ad .award-header-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ad .expand-indicator { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--muted); transition: color 0.2s ease; }
    .ad .award:hover .expand-indicator { color: var(--text); }
    .ad .expand-hint { font-size: 11px; letter-spacing: 0.02em; }
    .ad .chevron { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); color: var(--muted); }
    .ad .chevron.open { transform: rotate(180deg); color: var(--text); }
    .ad .avatar { width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; color: #fff; flex-shrink: 0; }
    .ad .gold .avatar { background: linear-gradient(135deg, #f5a524, #d98300); }
    .ad .violet .avatar { background: linear-gradient(135deg, #8b6bff, #5a3df0); }
    .ad .gold .pts { color: var(--gold); }
    .ad .violet .pts { color: var(--violet); }
    .ad .muted { color: var(--muted); font-size: 13px; margin-top: 2px; }
    .ad .award-accordion { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease; }
    .ad .award-accordion.open { grid-template-rows: 1fr; opacity: 1; }
    .ad .award-accordion-inner { overflow: hidden; }
    .ad .runners-list { padding-top: 14px; margin-top: 2px; border-top: 1px dashed var(--line); display: flex; flex-direction: column; gap: 6px; }
    .ad .runners-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; display: flex; justify-content: space-between; align-items: center; }
    .ad .runners-empty { padding: 12px; text-align: center; font-size: 12px; color: var(--muted); font-style: italic; }
    .ad .runner-row { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 9px; background: rgba(20, 20, 43, 0.025); transition: background 0.18s ease; }
    .ad.dark .runner-row { background: rgba(255, 255, 255, 0.035); }
    .ad .runner-row:hover { background: rgba(20, 20, 43, 0.05); }
    .ad.dark .runner-row:hover { background: rgba(255, 255, 255, 0.07); }
    .ad .runner-pos { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--line); color: var(--muted); min-width: 32px; text-align: center; flex-shrink: 0; }
    .ad .runner-info { flex: 1; min-width: 0; }
    .ad .runner-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
    .ad .runner-meta { font-size: 11px; color: var(--muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ad .runner-pts { font-size: 14px; font-weight: 700; margin-left: auto; color: var(--text); flex-shrink: 0; }
    .ad .gold .runner-pts { color: var(--gold); }
    .ad .violet .runner-pts { color: var(--violet); }
    .ad .runner-pts small { font-size: 10px; color: var(--muted); font-weight: 500; }
    @media(max-width: 860px) {
      .ad .split { grid-template-columns: 1fr; }
    }
    @media(max-width: 560px) {
      .ad .grid3 { grid-template-columns: 1fr; }
      .ad h1 { font-size: 26px; }
    }
  `;

  // ── RENDER: Dashboard ─────────────────────────────────────────────────────
  const renderDashboard = () => {
    const totalTeams = groups.length;
    const allStudents = Object.values(students || {}).flat();
    const totalStudents = allStudents.length;
    const totalPrograms = programs.length;

    // Team-by-team computed data
    const teamStats = groups.map(group => {
      const gStudents = students[group.id] || [];
      const gRegs = registrations.filter(r => r.groupId === group.id).length;
      const gDue = Math.max(0, programs.length - gRegs);

      return {
        ...group,
        code: (group.name || "T").charAt(0).toUpperCase(),
        students: gStudents.length,
        regs: gRegs,
        due: gDue,
      };
    });

    const stats = [
      { label: "Teams", value: totalTeams, icon: Shield, tone: "red" },
      { label: "Students", value: totalStudents, icon: Users, tone: "blue" },
      { label: "Programs", value: totalPrograms, icon: List, tone: "green" },
    ];

    const rankedTeams = teamStandings.length > 0
      ? teamStandings.map(s => ({ name: s.group.name, pts: s.totalPoints }))
      : groups.map(g => ({ name: g.name, pts: 0 }));

    const starStudent = studentStandings?.starOfTheFest;
    const penStudent = studentStandings?.penOfTheFest;

    // Next five students who stand just below the topper
    const starRunnersUp = (studentStandings?.stageRanked || []).slice(1, 6);
    const penRunnersUp = (studentStandings?.offStageRanked || []).slice(1, 6);

    const awards = [
      {
        title: "Star of the Fest",
        icon: Crown,
        tone: "gold",
        name: starStudent?.name || (registrations.length > 0 ? "Pending Evaluation" : "Awaiting Results"),
        chest: starStudent?.chestNo ? `#${starStudent.chestNo}` : "—",
        team: starStudent?.group?.name || "—",
        pts: starStudent?.stagePoints || starStudent?.totalPoints || 0,
        runnersUp: starRunnersUp,
        pointField: "stagePoints",
      },
      {
        title: "Pen of the Fest",
        icon: PenTool,
        tone: "violet",
        name: penStudent?.name || (registrations.length > 0 ? "Pending Evaluation" : "Awaiting Results"),
        chest: penStudent?.chestNo ? `#${penStudent.chestNo}` : "—",
        team: penStudent?.group?.name || "—",
        pts: penStudent?.offStagePoints || penStudent?.totalPoints || 0,
        runnersUp: penRunnersUp,
        pointField: "offStagePoints",
      },
    ];

    const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

    return (
      <div className={`ad ${dark ? "dark" : ""}`}>
        <style>{dashboardCss}</style>

        <div className="main">
          <h1>Dashboard</h1>

          {/* Stat cards */}
          <section className="grid3">
            {stats.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="card stat">
                <div className="row">
                  <span className="eyebrow">{label}</span>
                  <span className={`chip ${tone}`}><Icon size={16} /></span>
                </div>
                <div className="num">{value}</div>
              </div>
            ))}
          </section>

          {/* Team details */}
          <h2>Team Details</h2>
          <section className="grid3">
            {teamStats.length === 0 ? (
              <div className="card" style={{ gridColumn: "1 / -1", padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                No teams found. Add groups in the Groups tab to see team statistics.
              </div>
            ) : (
              teamStats.map((t) => (
                <div key={t.id || t.code} className="card team">
                  <div className="row start">
                    <span className="badge" style={t.color ? { background: `${t.color}18`, color: t.color } : {}}>{t.code}</span>
                    <b>{t.name}</b>
                  </div>
                  <div className="kv"><span>Students</span><b>{t.students}</b></div>
                  <div className="kv"><span>Due entries</span><b className="due">{t.due}</b></div>
                </div>
              ))
            )}
          </section>

          {/* Leaderboard + awards */}
          <div className="split">
            <div>
              <h2>Champion Leaderboard</h2>
              <section className="stack">
                {rankedTeams.length === 0 ? (
                  <div className="card" style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                    No team standings recorded yet
                  </div>
                ) : (
                  rankedTeams.map((r, i) => (
                    <div key={r.name} className={`card rank r${i}`}>
                      <span className="pos"><Crown size={13} /> {ORDINAL[i] || `${i + 1}th`}</span>
                      <b>{r.name}</b>
                      <span className="pts">{r.pts}<small> pts</small></span>
                    </div>
                  ))
                )}
              </section>
            </div>
            <div>
              <h2>Fest Awards</h2>
              <section className="stack">
                {awards.map((a) => {
                  const isExpanded = !!expandedAwards[a.title];
                  return (
                    <div
                      key={a.title}
                      className={`card award ${a.tone}`}
                      onClick={() => toggleAwardExpanded(a.title)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleAwardExpanded(a.title);
                        }
                      }}
                      aria-expanded={isExpanded}
                    >
                      <div className="award-header-row">
                        <span className="eyebrow">{a.title}</span>
                        <span className="expand-indicator">
                          <span className="expand-hint">
                            {isExpanded ? "Collapse" : (a.runnersUp.length > 0 ? `+${a.runnersUp.length} runners-up` : "View details")}
                          </span>
                          <ChevronDown size={14} className={`chevron ${isExpanded ? "open" : ""}`} />
                        </span>
                      </div>
                      <div className="row start">
                        <span className="avatar"><a.icon size={20} /></span>
                        <div className="grow">
                          <b>{a.name}</b>
                          <div className="muted">Chest {a.chest} · {a.team}</div>
                        </div>
                        <span className="pts">{a.pts}<small> pts</small></span>
                      </div>

                      {/* Smooth minimal collapsible runner-up list */}
                      <div className={`award-accordion ${isExpanded ? "open" : ""}`}>
                        <div className="award-accordion-inner">
                          <div className="runners-list" onClick={(e) => e.stopPropagation()}>
                            <div className="runners-eyebrow">
                              <span>Next in Line (Ranks 2–{1 + (a.runnersUp.length || 5)})</span>
                              <span>Standings</span>
                            </div>
                            {a.runnersUp.length === 0 ? (
                              <div className="runners-empty">
                                No other ranked students recorded in this category yet
                              </div>
                            ) : (
                              a.runnersUp.map((r, idx) => {
                                const rankNum = r.stageRank || r.offStageRank || (idx + 2);
                                const rankLabel = ORDINAL[rankNum - 1] || `${rankNum}th`;
                                const ptsValue = r[a.pointField] !== undefined ? r[a.pointField] : (r.totalPoints || 0);
                                return (
                                  <div key={r.id || idx} className="runner-row">
                                    <span className="runner-pos">{rankLabel}</span>
                                    <div className="runner-info">
                                      <div className="runner-name">{r.name}</div>
                                      <div className="runner-meta">
                                        Chest #{r.chestNo || "—"} · {r.group?.name || "—"}
                                      </div>
                                    </div>
                                    <span className="runner-pts">{ptsValue}<small> pts</small></span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  };


  // ── RENDER: Students ─────────────────────────────────────────────────────
  const renderStudents = () => {
    const rawStudents = [...(students[activeGroup] || [])];
    const currentGroup = groups.find(g => g.id === activeGroup) || groups[0];
    const currentGroupName = currentGroup?.name || "Team Roster";

    const groupStudents = rawStudents
      .filter(s => stuCatFilter === "All" || s.category === stuCatFilter)
      .filter(s => {
        if (!stuSearch.trim()) return true;
        const q = stuSearch.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || (s.chestNo && s.chestNo.toLowerCase().includes(q));
      })
      .sort((a, b) => { const ord = { Leader: 0, "Asst. Leader": 1, Member: 2 }; return (ord[a.groupRole || "Member"] ?? 2) - (ord[b.groupRole || "Member"] ?? 2); });

    return (
      <div className="anim-fadeIn">
        {/* Top bar: Team Name Heading on Left, Action Buttons on Right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: dark ? "#e8e8f5" : "#0f172a" }}>
              {currentGroupName}
            </div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 3 }}>
              {stuCatFilter === "All"
                ? `${rawStudents.length} students enrolled`
                : `${groupStudents.length} of ${rawStudents.length} students (${stuCatFilter})`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost btn-icon" onClick={() => { setStuSearchOpen(o => !o); setStuSearch(""); }} style={{ color: stuSearchOpen ? ACCENT : mutedTx }} title="Search students">
              <Ic name="search" size={15} />
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setImportModal(true)}
              style={{
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                fontSize: 13,
                height: 38,
                padding: "0 14px",
                color: dark ? "#e8e8f5" : "#12121e",
              }}
            >
              <Ic name="upload" size={14} /> Import Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStuForm({ name: "", chestNo: "", category: stuCatFilter !== "All" ? stuCatFilter : "High" });
                setStuModal(true);
              }}
            >
              <Ic name="plus" size={13} /> Add Student
            </button>
          </div>
        </div>

        {/* Toolbar: Category filter pills on left, Team Dropdown aligned on the right under the buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {["All", ...STUDENT_CATS].map(cat => {
              const active = stuCatFilter === cat;
              const count = cat === "All"
                ? rawStudents.length
                : rawStudents.filter(s => s.category === cat).length;
              const pillColor = cat === "All" ? ACCENT : (catColor[cat] || ACCENT);
              return (
                <button
                  key={cat}
                  onClick={() => setStuCatFilter(cat)}
                  className="btn btn-sm"
                  style={{
                    fontWeight: 700,
                    fontSize: 12.5,
                    padding: "6px 13px",
                    borderRadius: 9,
                    background: active
                      ? (dark ? `${pillColor}24` : `${pillColor}15`)
                      : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                    color: active ? pillColor : mutedTx,
                    border: `1px solid ${active ? pillColor : border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cat}</span>
                  <span style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : mutedTx,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {stuCatFilter !== "All" && (
              <button
                onClick={() => setStuCatFilter("All")}
                style={{
                  background: "none", border: "none", color: mutedTx, fontSize: 12,
                  cursor: "pointer", textDecoration: "underline", padding: "4px 8px", fontFamily: "inherit"
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Team Dropdown Selector (right-aligned under Add Student & Import buttons) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Team:
            </span>
            <div style={{ position: "relative", minWidth: 190 }}>
              <select
                value={activeGroup}
                onChange={e => setActiveGroup(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 34px 0 12px",
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  color: dark ? "#e8e8f5" : "#12121e",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = border}
              >
                {groups.map(g => (
                  <option
                    key={g.id}
                    value={g.id}
                    style={{
                      background: dark ? "#171923" : "#ffffff",
                      color: dark ? "#e8e8f5" : "#12121e",
                      padding: "8px"
                    }}
                  >
                    {g.name}
                  </option>
                ))}
              </select>
              <div style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: mutedTx,
                display: "flex",
                alignItems: "center"
              }}>
                <Ic name="chevronDown" size={13} />
              </div>
            </div>
          </div>
        </div>

        {stuSearchOpen && (
          <div style={{ marginBottom: 14 }}>
            <input
              className="input"
              type="text"
              placeholder="Search by name or chest no…"
              value={stuSearch}
              onChange={e => setStuSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setStuSearch("");
                  setStuSearchOpen(false);
                }
              }}
              style={{ fontSize: 13 }}
              autoFocus
            />
          </div>
        )}

        {groupStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {rawStudents.length === 0 ? "No students yet" : `No ${stuCatFilter} students found`}
            </div>
            <div style={{ fontSize: 13 }}>
              {rawStudents.length === 0
                ? 'Click "Add Student" to get started'
                : (stuSearch.trim() ? `No matching students for "${stuSearch}" in ${stuCatFilter}` : `There are no ${stuCatFilter} students in this group.`)}
            </div>
            {stuCatFilter !== "All" && rawStudents.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 14, border: `1px solid ${border}` }}
                onClick={() => setStuCatFilter("All")}
              >
                Show all categories ({rawStudents.length})
              </button>
            )}
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 560 }}>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 140px 68px", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
                  {["Chest", "Name", "Category", "Role", ""].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: mutedTx }}>{h}</div>
                  ))}
                </div>
                {groupStudents.map((s, i) => (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px 140px 68px", alignItems: "center", padding: "12px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent", transition: "background 0.12s" }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: ACCENT, fontSize: 14 }}>{s.chestNo}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                      {(() => {
                        const q = getStudentQuotaUsage ? getStudentQuotaUsage(s.id) : null;
                        if (!q) return null;
                        const isExceeded = q.stage > (programLimits?.maxStage || 3) || q.offStage > (programLimits?.maxOffStage || 3);
                        if (!isExceeded) return null;
                        return (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#f59e0b",
                            background: dark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.3)",
                            padding: "1px 6px",
                            borderRadius: 6,
                            letterSpacing: 0.3,
                          }}>
                            ⚠️ OVER LIMIT (Stage: {q.stage}/{programLimits?.maxStage || 3}, Off: {q.offStage}/{programLimits?.maxOffStage || 3})
                          </span>
                        );
                      })()}
                    </div>
                    <div>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: `${catColor[s.category] || "#f14d4d"}15`,
                        color: catColor[s.category] || mutedTx,
                        border: `1px solid ${catColor[s.category] || "#f14d4d"}30`,
                        width: "fit-content",
                      }}>
                        {s.category}
                      </span>
                    </div>
                    <select value={s.groupRole || "Member"} onChange={e => updateStudentRole(activeGroup, s.id, e.target.value)}
                      style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 6, color: dark ? "#e8e8f5" : "#12121e", fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none", padding: "4px 8px" }}>
                      <option>Member</option><option>Leader</option><option>Asst. Leader</option>
                    </select>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameModal({ id: s.id, name: s.name, chestNo: s.chestNo, category: s.category, groupId: activeGroup });
                          setEditNameValue(s.name);
                        }}
                        title="Edit student name"
                        style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = ACCENT}
                        onMouseLeave={e => e.currentTarget.style.color = mutedTx}
                      >
                        <Ic name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStudent(activeGroup, s.id, s.name)}
                        title="Delete student"
                        style={{ background: "none", border: "none", cursor: "pointer", color: mutedTx, padding: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#e11d48"}
                        onMouseLeave={e => e.currentTarget.style.color = mutedTx}
                      >
                        <Ic name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── RENDER: Events ───────────────────────────────────────────────────────
  const renderEvents = () => {
    const filtered = programs.filter(p => {
      const pType = p.type || p.session || "Stage";
      if (pType !== progType) return false;
      if (catFilter !== "All" && p.category !== catFilter) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return (
      <div className="anim-fadeIn">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22 }}>Events</div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>{filtered.length} {progType} events</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setProgImportModal(true)}
              style={{
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                fontSize: 13,
                height: 38,
                padding: "0 14px",
                color: dark ? "#e8e8f5" : "#12121e",
              }}
            >
              <Ic name="upload" size={14} /> Import Events
            </button>
            <button className="btn btn-primary" onClick={openAddProg}><Ic name="plus" size={13} /> Add Event</button>
          </div>
        </div>

        {/* Event Type + Category + Search in one toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 3 }}>
            {["Stage", "Off-Stage"].map(t => (
              <button key={t} onClick={() => { setProgType(t); setCatFilter("All"); setSearch(""); }} style={{
                padding: "7px 14px", border: "none", cursor: "pointer", borderRadius: 7,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: progType === t ? (dark ? "rgba(255,255,255,0.09)" : "white") : "transparent",
                color: progType === t ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
                boxShadow: progType === t ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            {["All", ...CATS].map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} className="btn btn-sm"
                style={{ fontWeight: 700, background: catFilter === cat ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: catFilter === cat ? "#0a0b12" : mutedTx }}>
                {cat}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch(""); }} className="btn btn-ghost btn-icon" style={{ color: showSearch ? ACCENT : mutedTx }}><Ic name="search" size={15} /></button>
        </div>

        {showSearch && (
          <div style={{ marginBottom: 14 }}>
            <input
              ref={searchRef}
              type="text"
              className="input"
              placeholder="Search events…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setSearch("");
                  setShowSearch(false);
                }
              }}
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No {progType} events</div>
            <div style={{ fontSize: 13 }}>Click "Add Event" to create one</div>
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 540 }}>
                <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto auto", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
                  {["No.", "Event", "Entries", ""].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: mutedTx }}>{h}</div>
                  ))}
                </div>
                {filtered.map((p, i) => {
                  const pRegs = registrations.filter(r => r.programId === p.id);
                  const pPartsCount = pRegs.reduce((sum, r) => sum + (r.participantIds?.length || 0), 0);
                  return (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto auto", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent" }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>{p.order || (i + 1)}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <Tag label={p.category} dark={dark} /><Tag label={p.type || p.session} dark={dark} /><Tag label={`Max ${p.maxParticipants}`} dark={dark} />
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => openProgEntries(p)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            borderRadius: 8,
                            border: `1px solid ${pRegs.length > 0 ? (dark ? "rgba(241,77,77,0.3)" : "rgba(241,77,77,0.25)") : border}`,
                            fontSize: 12,
                            fontWeight: 700,
                            height: 32,
                            padding: "0 10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: pRegs.length > 0 ? ACCENT : mutedTx,
                            background: pRegs.length > 0 ? (dark ? "rgba(241,77,77,0.08)" : "rgba(241,77,77,0.05)") : "transparent",
                            cursor: "pointer",
                          }}
                          title="View program entry details"
                        >
                          <Ic name="list" size={13} />
                          <span>{pRegs.length} {pRegs.length === 1 ? "Team" : "Teams"} ({pPartsCount})</span>
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditProg(p)}><Ic name="edit" size={13} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteProg(p.id, p.name)}><Ic name="trash" size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── RENDER: Groups ───────────────────────────────────────────────────────
  const renderGroups = () => (
    <div className="anim-fadeIn">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22 }}>Groups</div>
          <div style={{ fontSize: 13, color: mutedTx, marginTop: 2 }}>Access & registration locks</div>
        </div>
        <button className="btn btn-primary" onClick={() => setUserModal(true)}><Ic name="plus" size={13} /> Add Group</button>
      </div>
      {users.filter(u => u.role !== "admin").length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No groups yet</div>
          <div style={{ fontSize: 13 }}>Add a group to get started</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            {["Stage", "Off-Stage"].map(t => {
              const nonAdminUsers = users.filter(u => u.role !== "admin");
              const allLocked = nonAdminUsers.length > 0 && nonAdminUsers.every(u => isLocked(u.id, t));
              return (
                <button
                  key={t}
                  onClick={() => {
                    const targetState = !allLocked;
                    nonAdminUsers.forEach(u => {
                      if (isLocked(u.id, t) !== targetState) {
                        toggleLock(u.id, t);
                      }
                    });
                    logActivity(user.name, targetState ? `Locked all ${t} registrations` : `Unlocked all ${t} registrations`, "All groups");
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    border: `1px solid ${allLocked ? "rgba(225,29,72,0.3)" : border}`,
                    color: allLocked ? "#e11d48" : mutedTx,
                    background: allLocked ? "rgba(225,29,72,0.06)" : cardBg,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px"
                  }}
                >
                  <span>{allLocked ? "🔒" : "🔓"}</span>
                  <span>{allLocked ? `Unlock All ${t}` : `Lock All ${t}`}</span>
                </button>
              );
            })}
          </div>
          {users.filter(u => u.role !== "admin").map((u) => (
            <div key={u.id} style={{ borderRadius: 14, border: `1px solid ${border}`, background: cardBg, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: mutedTx, marginTop: 2 }}>{(students[u.id] || students[u.groupId] || []).length} members</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditUser(u)}><Ic name="edit" size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteUser(u.id, u.name)} disabled={u.id === user.id}><Ic name="trash" size={13} /></button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Stage", "Off-Stage"].map(t => {
                  const locked = isLocked(u.id, t);
                  return (
                    <button key={t} onClick={() => {
                      const willLock = !locked;
                      toggleLock(u.id, t);
                      logActivity(user.name, willLock ? "Locked registration" : "Unlocked registration", `${t} for ${u.name}`);
                    }} style={{
                      flex: 1, padding: "7px 0", borderRadius: 8,
                      border: `1px solid ${locked ? "rgba(225,29,72,0.2)" : "rgba(16,185,129,0.2)"}`,
                      background: locked ? "rgba(225,29,72,0.07)" : "rgba(16,185,129,0.07)",
                      color: locked ? "#e11d48" : "#10b981",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {locked ? "🔒" : "🔓"} {t}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── RENDER: Registrations ────────────────────────────────────────────────
  const renderRegistrations = () => {
    const isAllTeams = regGroupFilter === "all";
    const activeGroupId = !isAllTeams && groups.some(g => g.id === regGroupFilter)
      ? regGroupFilter
      : (isAllTeams ? "all" : (groups[0]?.id || ""));
    const currentGroup = isAllTeams ? null : (groups.find(g => g.id === activeGroupId) || groups[0]);
    const currentGroupName = isAllTeams ? "All Teams" : (currentGroup?.name || "Team Entries");

    // Single team calculations
    const rawRegs = isAllTeams ? [] : registrations.filter(r => r.groupId === activeGroupId);

    const filteredRegs = isAllTeams
      ? []
      : rawRegs
          .filter(r => {
            if (regCatFilter === "All") return true;
            const p = programs.find(pg => pg.id === r.programId);
            return (p?.category || "General").toLowerCase() === regCatFilter.toLowerCase();
          })
          .filter(r => {
            if (!regSearch.trim()) return true;
            const q = regSearch.toLowerCase().trim();
            const p = programs.find(pg => pg.id === r.programId);
            const progMatch = p?.name?.toLowerCase().includes(q) || (p?.order && String(p.order).includes(q));
            const parts = (r.participantIds || []).map(id => (students[activeGroupId] || []).find(s => s.id === id)).filter(Boolean);
            const partMatch = parts.some(s => s.name?.toLowerCase().includes(q) || (s.chestNo && String(s.chestNo).toLowerCase().includes(q)));
            return progMatch || partMatch;
          });

    // Cross-group (All Teams) calculations
    const progRegMap = new Map();
    if (isAllTeams) {
      for (const r of registrations) {
        if (!progRegMap.has(r.programId)) {
          progRegMap.set(r.programId, []);
        }
        progRegMap.get(r.programId).push(r);
      }
    }

    const registeredProgramList = isAllTeams
      ? programs
          .filter(p => progRegMap.has(p.id))
          .sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999))
      : [];

    if (isAllTeams) {
      for (const [progId] of progRegMap.entries()) {
        if (!programs.some(p => p.id === progId)) {
          registeredProgramList.push({
            id: progId,
            name: "Unknown Program",
            category: "General",
            session: "Stage",
            order: "",
          });
        }
      }
    }

    const progEntries = isAllTeams
      ? registeredProgramList.map(p => {
          const progRegs = progRegMap.get(p.id) || [];
          const teamEntries = progRegs.map(r => {
            const grp = groups.find(g => g.id === r.groupId) || { id: r.groupId, name: "Team", color: ACCENT };
            const grpStudents = students[r.groupId] || [];
            const parts = (r.participantIds || []).map(id => grpStudents.find(s => s.id === id)).filter(Boolean);
            return {
              registration: r,
              group: grp,
              participants: parts,
            };
          });

          const allParticipants = [];
          for (const te of teamEntries) {
            for (const st of te.participants) {
              allParticipants.push({
                ...st,
                groupId: te.group.id,
                groupName: te.group.name,
                groupColor: te.group.color,
              });
            }
          }

          allParticipants.sort((a, b) => {
            const gComp = (a.groupName || "").localeCompare(b.groupName || "");
            if (gComp !== 0) return gComp;
            return (Number(a.chestNo) || 0) - (Number(b.chestNo) || 0);
          });

          return {
            program: p,
            teamEntries,
            allParticipants,
            progRegs,
          };
        })
      : [];

    const filteredAllEntries = isAllTeams
      ? progEntries
          .filter(entry => {
            if (regCatFilter === "All") return true;
            return (entry.program.category || "General").toLowerCase() === regCatFilter.toLowerCase();
          })
          .filter(entry => {
            if (!regSearch.trim()) return true;
            const q = regSearch.toLowerCase().trim();
            const p = entry.program;
            const progMatch = p.name?.toLowerCase().includes(q) || (p.order && String(p.order).includes(q)) || p.category?.toLowerCase().includes(q) || p.session?.toLowerCase().includes(q);
            const teamMatch = entry.teamEntries.some(te => te.group.name?.toLowerCase().includes(q));
            const partMatch = entry.allParticipants.some(s => s.name?.toLowerCase().includes(q) || (s.chestNo && String(s.chestNo).toLowerCase().includes(q)));
            return progMatch || teamMatch || partMatch;
          })
      : [];

    const catRegsCount = isAllTeams
      ? (regCatFilter === "All"
          ? registrations.length
          : registrations.filter(r => {
              const p = programs.find(pg => pg.id === r.programId);
              return (p?.category || "General").toLowerCase() === regCatFilter.toLowerCase();
            }).length)
      : 0;

    return (
      <div className="anim-fadeIn">
        {/* Top bar: Team Name Heading on Left, Action Buttons on Right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: dark ? "#e8e8f5" : "#0f172a" }}>
              {currentGroupName}
            </div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 3 }}>
              {isAllTeams ? (
                regCatFilter === "All"
                  ? `${registrations.length} entries registered`
                  : `${catRegsCount} of ${registrations.length} entries (${regCatFilter})`
              ) : (
                regCatFilter === "All"
                  ? `${rawRegs.length} entries registered`
                  : `${filteredRegs.length} of ${rawRegs.length} entries (${regCatFilter})`
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost btn-icon" onClick={() => { setRegSearchOpen(o => !o); setRegSearch(""); }} style={{ color: regSearchOpen ? ACCENT : mutedTx }} title="Search entries">
              <Ic name="search" size={15} />
            </button>
          </div>
        </div>

        {/* Toolbar: Category filter pills on left, Team Dropdown aligned on the right under buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {["All", ...CATS].map(cat => {
              const active = regCatFilter === cat;
              const count = isAllTeams
                ? (cat === "All"
                    ? registrations.length
                    : registrations.filter(r => {
                        const p = programs.find(pg => pg.id === r.programId);
                        return (p?.category || "General").toLowerCase() === cat.toLowerCase();
                      }).length)
                : (cat === "All"
                    ? rawRegs.length
                    : rawRegs.filter(r => {
                        const p = programs.find(pg => pg.id === r.programId);
                        return (p?.category || "General").toLowerCase() === cat.toLowerCase();
                      }).length);
              const pillColor = cat === "All" ? ACCENT : (catColor[cat] || ACCENT);
              return (
                <button
                  key={cat}
                  onClick={() => setRegCatFilter(cat)}
                  className="btn btn-sm"
                  style={{
                    fontWeight: 700,
                    fontSize: 12.5,
                    padding: "6px 13px",
                    borderRadius: 9,
                    background: active
                      ? (dark ? `${pillColor}24` : `${pillColor}15`)
                      : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                    color: active ? pillColor : mutedTx,
                    border: `1px solid ${active ? pillColor : border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cat}</span>
                  <span style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : mutedTx,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {regCatFilter !== "All" && (
              <button
                onClick={() => setRegCatFilter("All")}
                style={{
                  background: "none", border: "none", color: mutedTx, fontSize: 12,
                  cursor: "pointer", textDecoration: "underline", padding: "4px 8px", fontFamily: "inherit"
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Team Dropdown Selector (right-aligned under buttons) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Team:
            </span>
            <div style={{ position: "relative", minWidth: 190 }}>
              <select
                value={regGroupFilter}
                onChange={e => setRegGroupFilter(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 34px 0 12px",
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  color: dark ? "#e8e8f5" : "#12121e",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = border}
              >
                <option
                  value="all"
                  style={{
                    background: dark ? "#171923" : "#ffffff",
                    color: dark ? "#e8e8f5" : "#12121e",
                    padding: "8px"
                  }}
                >
                  All Teams
                </option>
                {groups.map(g => (
                  <option
                    key={g.id}
                    value={g.id}
                    style={{
                      background: dark ? "#171923" : "#ffffff",
                      color: dark ? "#e8e8f5" : "#12121e",
                      padding: "8px"
                    }}
                  >
                    {g.name}
                  </option>
                ))}
              </select>
              <div style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: mutedTx,
                display: "flex",
                alignItems: "center"
              }}>
                <Ic name="chevronDown" size={13} />
              </div>
            </div>
          </div>
        </div>

        {regSearchOpen && (
          <div style={{ marginBottom: 14 }}>
            <input
              className="input"
              type="text"
              placeholder="Search by event or participant…"
              value={regSearch}
              onChange={e => setRegSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setRegSearch("");
                  setRegSearchOpen(false);
                }
              }}
              style={{ fontSize: 13 }}
              autoFocus
            />
          </div>
        )}

        {isAllTeams ? (
          filteredAllEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No registrations found</div>
              <div style={{ fontSize: 13 }}>
                {regSearch.trim()
                  ? `No entries match "${regSearch}"`
                  : `All Teams have no entries registered${regCatFilter !== "All" ? ` in ${regCatFilter}` : ""}`}
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 640 }}>
                  <div style={{
                display: "grid",
                gridTemplateColumns: "48px 1.2fr 100px 1.6fr 40px",
                gap: 12,
                alignItems: "center",
                padding: "10px 16px",
                background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                borderBottom: `1px solid ${border}`
              }}>
                {["No.", "Event", "Session", "Registered Teams & Chest Nos.", ""].map((h, i) => (
                  <div key={i} style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: mutedTx,
                    textAlign: i === 4 ? "right" : "left"
                  }}>
                    {h}
                  </div>
                ))}
              </div>
              {filteredAllEntries.map((entry, i) => {
                const p = entry.program;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1.2fr 100px 1.6fr 40px",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 16px",
                      borderTop: i > 0 ? `1px solid ${border}` : "none",
                      background: i % 2 === 0 ? cardBg : "transparent",
                    }}
                  >
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>
                      {p?.order ? `${p.order}` : ""}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p?.name}</div>
                      {p?.category && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: catColor[p.category] || mutedTx, marginTop: 2 }}>
                          {p.category}
                        </div>
                      )}
                    </div>
                    <div>
                      <Tag label={p?.session} dark={dark} />
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {entry.teamEntries.map(te => (
                          <div
                            key={te.group.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                              padding: "3px 8px",
                              borderRadius: 8,
                              border: `1px solid ${border}`,
                              fontSize: 12,
                            }}
                          >
                            <span style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: te.group.color || ACCENT,
                              display: "inline-block",
                              flexShrink: 0
                            }} />
                            <span style={{ fontWeight: 700, color: dark ? "#e8e8f5" : "#1f2937", marginRight: 2 }}>
                              {te.group.name}:
                            </span>
                            {te.participants.length === 0 ? (
                              <span style={{ color: mutedTx, fontSize: 11 }}>—</span>
                            ) : (
                              te.participants.map(s => (
                                <span
                                  key={s.id}
                                  style={{
                                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                                    fontWeight: 800,
                                    color: ACCENT,
                                    fontSize: 11.5,
                                    background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                                    padding: "1px 5px",
                                    borderRadius: 5,
                                    display: "inline-block",
                                  }}
                                >
                                  {s.chestNo}
                                </span>
                              ))
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setSelectedEntryInfo({
                          isCrossGroup: true,
                          program: p,
                          allParticipants: entry.allParticipants,
                          teamEntries: entry.teamEntries,
                          groupCount: entry.teamEntries.length,
                        })}
                        style={{
                          color: mutedTx,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          width: 30,
                          height: 30,
                          padding: 0,
                        }}
                        title="View all team participants"
                      >
                        <Ic name="info" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
                </div>
              </div>
            </div>
          )
        ) : (
          filteredRegs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No registrations</div>
              <div style={{ fontSize: 13 }}>{currentGroupName} has no entries{regCatFilter !== "All" ? ` in ${regCatFilter}` : ""}</div>
            </div>
          ) : (
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 640 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 110px 1fr 40px", gap: 0, padding: "10px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${border}` }}>
                {["No.", "Event", "Session", "Chest No.", ""].map((h, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: mutedTx }}>{h}</div>
                ))}
              </div>
              {filteredRegs.map((r, i) => {
                const p = programs.find(pg => pg.id === r.programId);
                const parts = (r.participantIds || []).map(id => (students[activeGroupId] || []).find(s => s.id === id)).filter(Boolean);
                return (
                  <div key={r.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr 110px 1fr 40px", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? cardBg : "transparent" }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: mutedTx }}>{p?.order ? `${p.order}` : ""}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p?.name}</div>
                      {p?.category && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: catColor[p.category] || mutedTx, marginTop: 2 }}>
                          {p.category}
                        </div>
                      )}
                    </div>
                    <Tag label={p?.session} dark={dark} />
                    <div>
                      {parts.length === 0 ? (
                        <span style={{ fontSize: 12, color: mutedTx }}>—</span>
                      ) : (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                          {parts.map(s => (
                            <span
                              key={s.id}
                              style={{
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                                fontWeight: 800,
                                color: ACCENT,
                                fontSize: 12,
                                background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                                padding: "2px 7px",
                                borderRadius: 6,
                                display: "inline-block",
                              }}
                            >
                              {s.chestNo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setSelectedEntryInfo({ isCrossGroup: false, reg: r, program: p, participants: parts, group: currentGroup })}
                        style={{
                          color: mutedTx,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          width: 30,
                          height: 30,
                          padding: 0,
                        }}
                        title="View participant details"
                      >
                        <Ic name="info" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  // ── Results ops ─────────────────────────────────────────────────────────
  const currentProgramCandidates = useMemo(() => {
    if (!activeResultProg) return [];
    const progRegs = registrations.filter(r => r.programId === activeResultProg.id);
    const list = [];
    const seenIds = new Set();

    // 0. Include desk participantsHistory / codeLetters / codeAllocations
    const hist = getProgramLots(activeResultProg);
    hist.forEach(h => {
      const sId = String(h.studentId || h.id);
      if (sId && !seenIds.has(sId)) {
        seenIds.add(sId);
        list.push({
          id: sId,
          name: `${h.codeLetter ? `[Code ${h.codeLetter}] ` : ""}${h.chestNo ? `${h.chestNo} ` : ""}${h.name}${h.groupName ? ` (${h.groupName})` : ""}`,
          chestNo: h.chestNo,
          rawName: h.name,
          codeLetter: h.codeLetter,
          groupId: h.groupId,
          groupName: h.groupName,
        });
      }
    });

    // 1. Contestants registered for this exact event
    progRegs.forEach(reg => {
      const grp = groups.find(g => g.id === reg.groupId);
      const grpStudents = students[reg.groupId] || [];
      const parts = (reg.participantIds || []).map(pId => grpStudents.find(s => s.id === pId)).filter(Boolean);

      parts.forEach(st => {
        if (!seenIds.has(String(st.id))) {
          seenIds.add(String(st.id));
          list.push({
            id: String(st.id),
            name: `${st.chestNo ? `${st.chestNo} ` : ""}${st.name}${grp ? ` (${grp.name})` : ""}`,
            chestNo: st.chestNo,
            rawName: st.name,
            groupId: reg.groupId,
            groupName: grp?.name,
          });
        }
      });
    });

    // 2. Fallback contestants in this category
    const isGeneral = !activeResultProg.category || activeResultProg.category.toLowerCase() === "general";
    const allInCat = Object.values(students).flat().filter(s => isGeneral ? true : s.category === activeResultProg.category);
    allInCat.forEach(st => {
      if (!seenIds.has(String(st.id))) {
        seenIds.add(String(st.id));
        const grp = groups.find(g => g.id === st.groupId);
        list.push({
          id: String(st.id),
          name: `${st.chestNo ? `${st.chestNo} ` : ""}${st.name}${grp ? ` (${grp.name})` : ""}`,
          chestNo: st.chestNo,
          rawName: st.name,
          groupId: st.groupId,
          groupName: grp?.name,
        });
      }
    });

    list.sort((a, b) => {
      if (a.codeLetter && b.codeLetter) return a.codeLetter.localeCompare(b.codeLetter);
      if (a.codeLetter) return -1;
      if (b.codeLetter) return 1;
      const numA = parseInt(a.chestNo) || 999999;
      const numB = parseInt(b.chestNo) || 999999;
      if (numA !== numB) return numA - numB;
      return a.rawName.localeCompare(b.rawName);
    });

    return list;
  }, [activeResultProg, registrations, students, groups]);

  const handlePublishFromModal = ({ event, results, otherGrades }) => {
    const progId = event.id;
    const prog = programs.find(p => p.id === progId);

    const lookupStudentDetails = (studentId, codeLetter) => {
      const sId = String(studentId || "");
      const cLetter = codeLetter ? String(codeLetter).trim().toUpperCase() : "";

      // 0. Check codeLetters / codeAllocations / participantsHistory
      const activeHist = getProgramLots(activeResultProg);
      const progHist = getProgramLots(prog);
      const hist = activeHist.length > 0 ? activeHist : progHist;
      const histMatch = hist.find(h =>
        (sId && String(h.studentId) === sId) ||
        (cLetter && String(h.codeLetter).trim().toUpperCase() === cLetter)
      );
      if (histMatch) {
        const grp = groups.find(g => g.id === histMatch.groupId);
        return {
          studentName: histMatch.name,
          chestNo: histMatch.chestNo || "",
          groupId: histMatch.groupId || "",
          groupName: histMatch.groupName || grp?.name || "",
          groupColor: histMatch.groupColor || grp?.color || "",
          codeLetter: histMatch.codeLetter || cLetter,
        };
      }

      // 1. Check students dictionary
      for (const [gId, stuList] of Object.entries(students || {})) {
        const st = (stuList || []).find(s => String(s.id) === sId);
        if (st) {
          const grp = groups.find(g => g.id === gId || g.id === st.groupId);
          return {
            studentName: st.name,
            chestNo: st.chestNo || "",
            groupId: st.groupId || gId,
            groupName: grp?.name || "",
            groupColor: grp?.color || "",
            codeLetter: cLetter,
          };
        }
      }

      // 2. Check candidates
      const cand = currentProgramCandidates.find(c => String(c.id) === sId);
      if (cand) {
        return {
          studentName: cand.rawName || cand.name,
          chestNo: cand.chestNo || "",
          groupId: cand.groupId || "",
          groupName: cand.groupName || "",
          groupColor: "",
          codeLetter: cand.codeLetter || cLetter,
        };
      }

      return {
        studentName: "",
        chestNo: "",
        groupId: "",
        groupName: "",
        groupColor: "",
        codeLetter: cLetter,
      };
    };

    const enrichedEntries = (results || []).map(r => {
      const details = lookupStudentDetails(r.studentId, r.codeLetter);
      return {
        ...r,
        studentName: details.studentName || r.studentName || "",
        chestNo: details.chestNo || r.chestNo || "",
        groupId: details.groupId || r.groupId || "",
        groupName: details.groupName || r.groupName || "",
        groupColor: details.groupColor || r.groupColor || "",
        codeLetter: details.codeLetter || r.codeLetter || "",
        points: r.points !== undefined && r.points !== "" ? Number(r.points) : 0,
      };
    });

    const enrichedOtherGrades = (otherGrades || []).map(o => {
      const details = lookupStudentDetails(o.studentId, o.codeLetter);
      return {
        ...o,
        studentName: details.studentName || o.studentName || "",
        chestNo: details.chestNo || o.chestNo || "",
        groupId: details.groupId || o.groupId || "",
        groupName: details.groupName || o.groupName || "",
        groupColor: details.groupColor || o.groupColor || "",
        codeLetter: details.codeLetter || o.codeLetter || "",
      };
    });

    const savedResults = {
      entries: enrichedEntries,
      otherGrades: enrichedOtherGrades,
      publishedAt: Date.now(),
    };

    updateProgram(progId, {
      status: "published",
      results: savedResults,
    });

    setActiveResultProg(null);

    logActivity(
      user.name,
      "Published results",
      `${prog?.name || event.name} (${event.code ?? prog?.order ?? ""})`
    );
  };

  const renderResults = () => {
    // 1. Filter by the selected category among CATS or "All"
    const catPrograms = resCatFilter === "All"
      ? programs
      : programs.filter(p => (p.category || "General").toLowerCase() === resCatFilter.toLowerCase());

    // 2. Filter by publication status
    const statusFiltered = catPrograms.filter(p => {
      if (resStatusFilter === "published") return p.status === "published";
      if (resStatusFilter === "unpublished") return p.status !== "published";
      return true; // "all"
    });

    // 3. Filter by search query (program code or program name)
    const filteredResults = statusFiltered.filter(p => {
      if (!resSearch.trim()) return true;
      const q = resSearch.toLowerCase().trim();
      const codeMatch = p.order && String(p.order).includes(q);
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      return codeMatch || nameMatch;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    // Category counters
    const pubCount = catPrograms.filter(p => p.status === "published").length;
    const unpubCount = catPrograms.length - pubCount;

    const handleExportJudgeLinksExcel = () => {
      const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const currentOrigin = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
      const customOrigin = (() => {
        try {
          const saved = localStorage.getItem("ff_public_app_url");
          if (saved && saved.trim()) {
            const cleanSaved = saved.trim().replace(/\/+$/, "");
            if (isLocalhost && cleanSaved.includes("vercel.app")) {
              return currentOrigin;
            }
            return cleanSaved;
          }
        } catch {}
        return currentOrigin;
      })();

      const progsToExport = filteredResults.length > 0 ? filteredResults : catPrograms;
      const rows = [
        ["Sl.", "Program Name", "Category", "Session", "Status", "Judge Code", "Scoring Link"],
      ];

      progsToExport.forEach((p, idx) => {
        const judgeToken = p.judgeToken || p.id;
        const judgeUrl = `${customOrigin}/#/judge/${judgeToken}`;
        const statusText = p.status === "published"
          ? "Published"
          : p.evaluationStatus === "confirmed" || !!p.confirmedResults
          ? "Confirmed"
          : p.evaluationStatus === "submitted" || !!p.judgeSubmission
          ? "Judge Submitted"
          : (getProgramLots(p).length > 0)
          ? "Ready for Judge"
          : "Pending Lots";

        rows.push([
          p.order || idx + 1,
          p.name || "",
          p.category || "",
          p.session || p.type || "",
          statusText,
          judgeToken,
          judgeUrl,
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 8 },
        { wch: 32 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, `${resCatFilter || "All"} Judges`);
      XLSX.writeFile(wb, `Cognizance_${resCatFilter || "All"}_Judge_Links.xlsx`);
      logActivity(user.name, "Exported judge links to Excel", `${progsToExport.length} program links exported`);
    };

    return (
      <div className="anim-fadeIn">
        {/* Top bar: Heading on Left, Action / Search on Right (Layout identical to Students page) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: dark ? "#e8e8f5" : "#0f172a" }}>
              Results
            </div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 3 }}>
              {resCatFilter === "All" ? "All Categories" : resCatFilter} · {filteredResults.length} {filteredResults.length === 1 ? "program" : "programs"} ({pubCount} published)
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExportJudgeLinksExcel}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: `1px solid ${border}`,
                fontWeight: 600,
                fontSize: 12.5,
              }}
              title="Export all judge links in this category to an Excel sheet"
            >
              <Ic name="download" size={14} />
              <span>Export Excel</span>
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => { setResSearchOpen(o => !o); if (resSearchOpen) setResSearch(""); }}
              style={{ color: resSearchOpen ? ACCENT : mutedTx }}
              title="Toggle search"
            >
              <Ic name="search" size={15} />
            </button>
          </div>
        </div>

        {/* Unified Judges Scoring Portal Banner */}
        <div
          style={{
            backgroundColor: dark ? "rgba(241,77,77,0.07)" : "rgba(241,77,77,0.04)",
            border: `1.5px solid ${dark ? "rgba(241,77,77,0.22)" : "rgba(241,77,77,0.18)"}`,
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "linear-gradient(135deg, #f14d4d, #dc2626)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(241,77,77,0.28)",
                flexShrink: 0,
              }}
            >
              <Ic name="award" size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: dark ? "#f3f4f6" : "#0f172a" }}>
                  Judges Scoring Portal
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: dark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)",
                    color: "#10b981",
                    padding: "2px 8px",
                    borderRadius: 8,
                  }}
                >
                  Blind Evaluation
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: mutedTx, marginTop: 2 }}>
                Judges log in with one passcode and score all their lot-ready programs without multiple WhatsApp links.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Passcode display & edit */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: cardBg,
                border: `1px solid ${border}`,
                borderRadius: 10,
                padding: "6px 12px",
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, color: mutedTx }}>Passcode:</span>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "1px", color: ACCENT }}>
                {currentJudgePasscode}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTempJudgePasscode(currentJudgePasscode);
                  setEditingJudgePasscode(true);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: mutedTx,
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
                title="Change Judge Passcode"
              >
                <Ic name="edit" size={13} />
              </button>
            </div>

            {/* Share via WhatsApp */}
            <button
              type="button"
              onClick={handleShareJudgesPortalWhatsApp}
              className="btn btn-sm"
              style={{
                backgroundColor: "#25D366",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: 12.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(37,211,102,0.25)",
              }}
              title="Share Judges Portal link & passcode on WhatsApp"
            >
              <Ic name="whatsapp" size={14} />
              <span>Share Portal on WhatsApp</span>
            </button>

            {/* Copy Portal Link */}
            <button
              type="button"
              onClick={handleCopyJudgesPortalLink}
              className="btn btn-ghost btn-sm"
              style={{
                border: `1px solid ${border}`,
                fontWeight: 600,
                fontSize: 12.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
              }}
              title="Copy Judges Portal link to clipboard"
            >
              <Ic name={copiedPortalLink ? "check" : "copy"} size={14} />
              <span>{copiedPortalLink ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Modal to edit Judge Passcode */}
        {editingJudgePasscode && (
          <Modal
            open={editingJudgePasscode}
            onClose={() => setEditingJudgePasscode(false)}
            title="Edit Judges Portal Passcode"
            dark={dark}
          >
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 13, color: mutedTx, marginBottom: 16, lineHeight: 1.5 }}>
                All festival judges use this single shared passcode to unlock their scoring dashboard at <code>/#/judge</code>.
              </p>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: mutedTx, marginBottom: 6, textTransform: "uppercase" }}>
                  New Judge Passcode
                </label>
                <input
                  type="text"
                  autoFocus
                  className="input"
                  value={tempJudgePasscode}
                  onChange={(e) => setTempJudgePasscode(e.target.value)}
                  placeholder="e.g. judge2026"
                  style={{ height: 46, fontSize: 16, fontWeight: 700 }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingJudgePasscode(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!tempJudgePasscode.trim() || isSavingPasscode}
                  onClick={handleSaveJudgePasscode}
                  style={{ fontWeight: 700 }}
                >
                  {isSavingPasscode ? "Saving..." : "Save Passcode"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Toolbar: Category filter pills on left, Status Dropdown aligned on the right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {["All", ...CATS].map(cat => {
              const active = resCatFilter === cat;
              const count = cat === "All"
                ? programs.length
                : programs.filter(p => (p.category || "General").toLowerCase() === cat.toLowerCase()).length;
              const pillColor = cat === "All" ? ACCENT : (catColor[cat] || ACCENT);
              return (
                <button
                  key={cat}
                  onClick={() => setResCatFilter(cat)}
                  className="btn btn-sm"
                  style={{
                    fontWeight: 700,
                    fontSize: 12.5,
                    padding: "6px 13px",
                    borderRadius: 9,
                    background: active
                      ? (dark ? `${pillColor}24` : `${pillColor}15`)
                      : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                    color: active ? pillColor : mutedTx,
                    border: `1px solid ${active ? pillColor : border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cat}</span>
                  <span style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : mutedTx,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Dropdown Selector (Right aligned matching the team dropdown in students page) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Status:
            </span>
            <div style={{ position: "relative", minWidth: 190 }}>
              <select
                value={resStatusFilter}
                onChange={e => setResStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 34px 0 12px",
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  color: dark ? "#e8e8f5" : "#12121e",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = border}
              >
                <option value="all" style={{ background: dark ? "#171923" : "#ffffff", color: dark ? "#e8e8f5" : "#12121e" }}>
                  All ({catPrograms.length})
                </option>
                <option value="published" style={{ background: dark ? "#171923" : "#ffffff", color: dark ? "#e8e8f5" : "#12121e" }}>
                  Published ({pubCount})
                </option>
                <option value="unpublished" style={{ background: dark ? "#171923" : "#ffffff", color: dark ? "#e8e8f5" : "#12121e" }}>
                  Unpublished ({unpubCount})
                </option>
              </select>
              <div style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: mutedTx,
                display: "flex",
                alignItems: "center"
              }}>
                <Ic name="chevronDown" size={13} />
              </div>
            </div>
          </div>
        </div>

        {/* Search bar */}
        {resSearchOpen && (
          <div style={{ marginBottom: 14 }}>
            <input
              className="input"
              type="text"
              placeholder="Search by program code or name…"
              value={resSearch}
              onChange={e => setResSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setResSearch("");
                  setResSearchOpen(false);
                } else if (e.key === "Enter" && filteredResults.length > 0) {
                  setActiveResultProg(filteredResults[0]);
                }
              }}
              style={{ fontSize: 13 }}
              autoFocus
            />
          </div>
        )}

        {/* Programs List */}
        {filteredResults.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {catPrograms.length === 0
                ? (resCatFilter === "All" ? "No programs found" : `No programs in ${resCatFilter}`)
                : `No ${resStatusFilter !== "all" ? resStatusFilter : ""} programs found`}
            </div>
            <div style={{ fontSize: 13 }}>
              {resSearch.trim()
                ? `No programs matching "${resSearch}"`
                : (resCatFilter === "All"
                    ? "There are no programs matching the current filters."
                    : `There are no ${resCatFilter} programs matching the current filters.`)}
            </div>
            {resStatusFilter !== "all" && catPrograms.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 14, border: `1px solid ${border}` }}
                onClick={() => setResStatusFilter("all")}
              >
                Show all statuses ({catPrograms.length})
              </button>
            )}
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 700 }}>
                {/* Table Header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 140px 175px 185px",
                  gap: 16,
                  padding: "11px 18px",
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                  borderBottom: `1px solid ${border}`
                }}>
                  {["No.", "Program Name", "Status", "Code Letter", "Actions"].map((h, i) => (
                    <div key={i} style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: mutedTx,
                      textAlign: i === 4 ? "right" : "left",
                    }}>
                      {h}
                    </div>
                  ))}
                </div>

                {/* Program rows: clicking the program opens the evaluation review modal */}
                {filteredResults.map((p, i) => {
                  const judgeToken = p.judgeToken || p.id;
                  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
                  const currentOrigin = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
                  const customOrigin = (() => {
                    try {
                      const saved = localStorage.getItem("ff_public_app_url");
                      if (saved && saved.trim()) {
                        const cleanSaved = saved.trim().replace(/\/+$/, "");
                        if (isLocalhost && cleanSaved.includes("vercel.app")) {
                          return currentOrigin;
                        }
                        return cleanSaved;
                      }
                    } catch {}
                    return currentOrigin;
                  })();
                  const judgeUrl = `${customOrigin}/#/judge/${judgeToken}`;
                  const isSubmitted = p.evaluationStatus === "submitted" || !!p.judgeSubmission;
                  const isConfirmed = p.evaluationStatus === "confirmed" || !!p.confirmedResults;
                  const isPublished = p.status === "published";
                  const isCompleted = isSubmitted || isConfirmed || isPublished;
                  const rawLots = getProgramLots(p);
                  const lotsCount = rawLots.filter(l => l && (l.codeLetter || l.studentId || l.chestNo)).length;
                  const hasLots = lotsCount > 0;
                  const isReadyForJudge = hasLots && !isCompleted;
                  const isUpcoming = !hasLots && !isCompleted;

                  const handleShareWhatsApp = (e) => {
                    e.stopPropagation();
                    const text = buildJudgeMessage({
                      festName: "Cognizance",
                      programName: p.name,
                      category: p.category,
                      judgeToken,
                      judgeUrl,
                    });
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  };

                  const handleCopy = (e) => {
                    e.stopPropagation();
                    if (navigator?.clipboard) {
                      navigator.clipboard.writeText(judgeUrl);
                      setCopiedProgId(p.id);
                      setTimeout(() => setCopiedProgId(null), 2000);
                      logActivity(user.name, "Copied judge link", `${p.name} (${p.order || ""})`);
                    }
                  };

                  return (
                    <div
                      key={p.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => setActiveEvalProg(p)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveEvalProg(p);
                        }
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr 140px 175px 185px",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 18px",
                        borderTop: i > 0 ? `1px solid ${border}` : "none",
                        background: i % 2 === 0 ? cardBg : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        outline: "none",
                      }}
                      onFocus={e => {
                        e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(241,77,77,0.05)";
                        e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${ACCENT}`;
                      }}
                      onBlur={e => {
                        e.currentTarget.style.background = i % 2 === 0 ? cardBg : "transparent";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(241,77,77,0.04)";
                      }}
                      onMouseLeave={e => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.background = i % 2 === 0 ? cardBg : "transparent";
                        }
                      }}
                      title="Click to view & evaluate results"
                    >
                      {/* 1. Program Number / Code */}
                      <div>
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontWeight: 800,
                          color: ACCENT,
                          fontSize: 13.5,
                          background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                          padding: "3px 8px",
                          borderRadius: 7,
                          display: "inline-block",
                        }}>
                          {p.order || (i + 1)}
                        </span>
                      </div>

                      {/* 2. Program Name */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: 14.5,
                          color: dark ? "#e8e8f5" : "#12121e",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {p.name}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                          {p.category && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: catColor[p.category] || mutedTx }}>
                              {p.category}
                            </span>
                          )}
                          {p.category && (p.session || p.type) && (
                            <span style={{ fontSize: 11, color: mutedTx }}>·</span>
                          )}
                          {(p.session || p.type) && (
                            <span style={{ fontSize: 11.5, color: mutedTx }}>
                              {p.session || p.type}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Status */}
                      <div>
                        {isPublished ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                            <span>Published</span>
                          </span>
                        ) : isConfirmed ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} />
                            <span>Confirmed</span>
                          </span>
                        ) : isSubmitted ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                            <span>Submitted</span>
                          </span>
                        ) : isReadyForJudge ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                            <span>Ready for Judge</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: mutedTx, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${border}`, padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: mutedTx }} />
                            <span>Upcoming</span>
                          </span>
                        )}
                      </div>

                      {/* 4. Code Letter Action */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
                        {isReadyForJudge ? (
                          <button
                            type="button"
                            onClick={() => setCodeLetterProg(p)}
                            className="btn btn-sm"
                            style={{
                              padding: "5px 11px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              background: dark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.1)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245,158,11,0.3)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              transition: "all 0.15s ease",
                            }}
                            title="Edit code letters to correct any mistakes before judge evaluation"
                          >
                            <Ic n="edit" s={13} />
                            <span>Edit Code Letters</span>
                          </button>
                        ) : isCompleted ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: mutedTx,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                            title="Code letters locked after judge evaluation"
                          >
                            <Ic n="lock" s={12} />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: mutedTx }}>—</span>
                        )}
                      </div>

                      {/* 5. Actions (WhatsApp, Copy, Open Test Link) Aligned to the Side */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={handleShareWhatsApp}
                          className="btn btn-sm"
                          title="Share scoring link via WhatsApp"
                          style={{
                            padding: "5px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: "#25D366",
                            color: "#ffffff",
                            border: "none",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Ic n="whatsapp" s={13} />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={handleCopy}
                          className="btn btn-sm btn-ghost"
                          title={copiedProgId === p.id ? "Copied Link!" : "Copy Judge link"}
                          style={{
                            padding: "5px 8px",
                            borderRadius: 8,
                            fontSize: 12,
                            border: `1px solid ${copiedProgId === p.id ? "#10b981" : border}`,
                            background: copiedProgId === p.id ? "rgba(16,185,129,0.12)" : "transparent",
                            color: copiedProgId === p.id ? "#10b981" : mutedTx,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Ic n={copiedProgId === p.id ? "check" : "copy"} s={13} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(judgeUrl, "_blank");
                          }}
                          className="btn btn-sm btn-ghost"
                          title="Open scoring link in new tab to test"
                          style={{
                            padding: "5px 8px",
                            borderRadius: 8,
                            fontSize: 12,
                            border: `1px solid ${border}`,
                            color: mutedTx,
                            cursor: "pointer",
                          }}
                        >
                          <Ic n="externalLink" s={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  
  // ── RENDER: Settings (Full Page View) ───────────────────────────────────
  const renderSettings = () => {
    const rowBg = dark ? "rgba(255,255,255,0.03)" : "#f8fafc";
    const cardBorder = `1px solid ${border}`;

    return (
      <div className="anim-fadeIn" style={{ maxWidth: 880, margin: "0 auto", paddingBottom: 60 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: "-0.5px" }}>
            Settings & System Configuration
          </div>
          <div style={{ fontSize: 13, color: mutedTx, marginTop: 4 }}>
            Manage festival participation limits, theme appearance, administrative security, and activity audit logs.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
          
          {/* Card 0: Festival Points & Scoring Rules */}
          <div style={{
            gridColumn: "1 / -1",
            borderRadius: 16,
            border: cardBorder,
            background: cardBg,
            padding: 24,
            boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(241,77,77,0.12)",
                  color: ACCENT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ic name="award" size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Festival Points & Scoring Rules</div>
                  <div style={{ fontSize: 12.5, color: mutedTx }}>
                    Customize point allocations for individual/group positions and quality grades
                  </div>
                </div>
              </div>

              {scoringRulesSaved && (
                <div style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: "rgba(16,185,129,0.12)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.25)",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span>✓</span>
                  <span>Scoring rules saved successfully</span>
                </div>
              )}
            </div>

            {/* ── 1. Universal Base Program Scoring (Defaults) ── */}
            <div style={{
              padding: "18px 20px",
              borderRadius: 14,
              background: dark ? "rgba(255,255,255,0.02)" : "#fafafa",
              border: cardBorder,
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🏆</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: primaryHeadingColor, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Universal Base Program Scoring</span>
                      <span style={{
                        fontSize: 10.5,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(16,185,129,0.12)",
                        color: "#10b981",
                        fontWeight: 800,
                        letterSpacing: "0.03em",
                      }}>
                        DEFAULT BASELINE
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: mutedTx, marginTop: 2 }}>
                      All programs across Low, Mid, High, and General default to 3, 2, 1 place scores + grade points, awarded to Both Teams & Individuals.
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: mutedTx,
                  background: rowBg,
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: cardBorder,
                }}>
                  Separate Scores + Quality Grade Points
                </div>
              </div>

              {/* Display Columns: Universal Position Points + Quality Grade Marks */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {/* Standard Base Position Points */}
                <div style={{ padding: "14px", borderRadius: 12, background: rowBg, border: cardBorder }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: primaryHeadingColor, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🎯</span>
                    <span>Standard Position Scores (All Programs)</span>
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#10b981", fontWeight: 800 }}>Teams & Individuals</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                    <div style={{ padding: "8px 4px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "#fff", border: cardBorder }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: mutedTx }}>1st Place</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>3 <span style={{ fontSize: 11, fontWeight: 700 }}>pts</span></div>
                    </div>
                    <div style={{ padding: "8px 4px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "#fff", border: cardBorder }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: mutedTx }}>2nd Place</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: "#94a3b8", marginTop: 2 }}>2 <span style={{ fontSize: 11, fontWeight: 700 }}>pts</span></div>
                    </div>
                    <div style={{ padding: "8px 4px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "#fff", border: cardBorder }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: mutedTx }}>3rd Place</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: "#b45309", marginTop: 2 }}>1 <span style={{ fontSize: 11, fontWeight: 700 }}>pt</span></div>
                    </div>
                  </div>
                </div>

                {/* Quality Grade Marks */}
                <div style={{ padding: "14px", borderRadius: 12, background: rowBg, border: cardBorder }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: primaryHeadingColor, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>⭐</span>
                    <span>Quality Grade Marks (Added to Place)</span>
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#10b981", fontWeight: 800 }}>Fixed</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, textAlign: "center" }}>
                    <div style={{ padding: "8px 2px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "#fff", border: cardBorder }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>A+</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#10b981", marginTop: 2 }}>+6 <span style={{ fontSize: 10 }}>pts</span></div>
                    </div>
                    <div style={{ padding: "8px 2px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "#fff", border: cardBorder }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6" }}>A</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#3b82f6", marginTop: 2 }}>+5 <span style={{ fontSize: 10 }}>pts</span></div>
                    </div>
                    <div style={{ padding: "8px 2px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "#fff", border: cardBorder }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>B</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>+3 <span style={{ fontSize: 10 }}>pts</span></div>
                    </div>
                    <div style={{ padding: "8px 2px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "#fff", border: cardBorder }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: mutedTx }}>C</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: mutedTx, marginTop: 2 }}>+1 <span style={{ fontSize: 10 }}>pt</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule Explanation Banner */}
              <div style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
                border: cardBorder,
                fontSize: 12,
                color: mutedTx,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 15 }}>💡</span>
                <span>
                  <strong>Calculation Formula:</strong> Total Points = Position Points + Quality Grade Points. For example, 1st Place with A+ = <strong>9 pts</strong> (3 + 6); 1st Place with A = <strong>8 pts</strong> (3 + 5); 2nd Place with A = <strong>7 pts</strong> (2 + 5). Customize any program below to set custom scores or route points to Teams only / Individuals only.
                </span>
              </div>
            </div>

            {/* ── 2. Program-Specific Custom Points & Destination Routing Manager ── */}
            <div style={{
              padding: "18px 20px",
              borderRadius: 14,
              background: rowBg,
              border: cardBorder,
            }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: primaryHeadingColor, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>🎯</span>
                  <span>Custom Program Points & Point Destinations</span>
                  <span style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(241,77,77,0.12)",
                    color: ACCENT,
                    fontWeight: 800,
                  }}>
                    {Object.keys(scoringRules.customProgramPoints || {}).length} Customized
                  </span>
                </div>
                <div style={{ fontSize: 12, color: mutedTx, marginTop: 3 }}>
                  Select any program to customize its 1st, 2nd, and 3rd place scores, and specify where points should route (Teams, Individuals, or Both). Changes sync in real-time.
                </div>
              </div>

              {/* Customization Input Controls */}
              <div style={{
                padding: "16px",
                borderRadius: 12,
                background: dark ? "rgba(255,255,255,0.02)" : "#ffffff",
                border: cardBorder,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: primaryHeadingColor, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>➕</span>
                  <span>{selectedCustomProgId && scoringRules.customProgramPoints?.[selectedCustomProgId] ? "Edit Custom Program Points" : "Add / Customize a Program"}</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                  {/* Program Selector with Search inside Dropdown */}
                  <div style={{ flex: "1 1 300px", minWidth: 260 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: mutedTx, marginBottom: 4 }}>Select Program</label>
                    <SearchableProgramSelect
                      value={selectedCustomProgId}
                      onChange={handleSelectProgramToCustomize}
                      programs={selectableProgramsList}
                      scoringRules={scoringRules}
                      dark={dark}
                      cardBorder={cardBorder}
                      rowBg={rowBg}
                      primaryHeadingColor={primaryHeadingColor}
                      mutedTx={mutedTx}
                      ACCENT={ACCENT}
                    />
                  </div>

                  {/* 1st Place */}
                  <div style={{ width: 70 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>1st Place</label>
                    <input
                      type="number"
                      min="0"
                      value={customFirst}
                      onChange={e => setCustomFirst(e.target.value)}
                      className="input"
                      style={{ height: 38, width: "100%", fontWeight: 800, textAlign: "center", fontSize: 13 }}
                    />
                  </div>

                  {/* 2nd Place */}
                  <div style={{ width: 70 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>2nd Place</label>
                    <input
                      type="number"
                      min="0"
                      value={customSecond}
                      onChange={e => setCustomSecond(e.target.value)}
                      className="input"
                      style={{ height: 38, width: "100%", fontWeight: 800, textAlign: "center", fontSize: 13 }}
                    />
                  </div>

                  {/* 3rd Place */}
                  <div style={{ width: 70 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#b45309", marginBottom: 4 }}>3rd Place</label>
                    <input
                      type="number"
                      min="0"
                      value={customThird}
                      onChange={e => setCustomThird(e.target.value)}
                      className="input"
                      style={{ height: 38, width: "100%", fontWeight: 800, textAlign: "center", fontSize: 13 }}
                    />
                  </div>

                  {/* Destination Checkboxes */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200, paddingBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: mutedTx }}>Award Points To:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: primaryHeadingColor }}>
                        <input
                          type="checkbox"
                          checked={customToTeams}
                          onChange={e => {
                            if (!e.target.checked && !customToIndividuals) return;
                            setCustomToTeams(e.target.checked);
                          }}
                          style={{ width: 16, height: 16, accentColor: ACCENT, cursor: "pointer" }}
                        />
                        <span>👥 Teams</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: primaryHeadingColor }}>
                        <input
                          type="checkbox"
                          checked={customToIndividuals}
                          onChange={e => {
                            if (!e.target.checked && !customToTeams) return;
                            setCustomToIndividuals(e.target.checked);
                          }}
                          style={{ width: 16, height: 16, accentColor: ACCENT, cursor: "pointer" }}
                        />
                        <span>👤 Individuals</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleAddOrUpdateCustomProgram}
                      disabled={!selectedCustomProgId || (!customToTeams && !customToIndividuals)}
                      className="btn btn-primary"
                      style={{ height: 38, borderRadius: 10, padding: "0 18px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span>{selectedCustomProgId && scoringRules.customProgramPoints?.[selectedCustomProgId] ? "✓ Update Points" : "+ Customize Points"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* List of Customized Programs */}
              {Object.keys(scoringRules.customProgramPoints || {}).length === 0 ? (
                <div style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  borderRadius: 12,
                  background: rowBg,
                  border: `1px dashed ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  color: mutedTx,
                  fontSize: 12.5,
                }}>
                  No programs have custom points yet. All events currently use the universal base scores (1st: 3, 2nd: 2, 3rd: 1 + grades) awarded to both Teams and Individuals.
                  <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.8 }}>
                    Select a program from the dropdown above to customize its place scores or point routing destinations.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(scoringRules.customProgramPoints || {}).map(([progId, pts]) => {
                    const prog = programs.find(p => p.id === progId);
                    const toTeams = pts?.toTeams !== false;
                    const toIndividuals = pts?.toIndividuals !== false;
                    return (
                      <div
                        key={progId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderRadius: 12,
                          background: rowBg,
                          border: cardBorder,
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 220, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 800, fontSize: 13.5, color: primaryHeadingColor }}>
                              {prog?.order || prog?.code ? `#${prog.order || prog.code} · ` : ""}{prog?.name || `Program ${progId}`}
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: "rgba(59,130,246,0.12)",
                              color: "#3b82f6",
                            }}>
                              {prog?.category || "General"}
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: "rgba(241,77,77,0.1)",
                              color: ACCENT,
                            }}>
                              {prog?.session || prog?.type || "Stage"}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                            <span style={{ fontSize: 11, color: mutedTx }}>Routing:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomProgramField(progId, "toTeams", !toTeams)}
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                                background: toTeams ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)",
                                color: toTeams ? "#10b981" : mutedTx,
                              }}
                              title="Toggle points to Team Leaderboard"
                            >
                              👥 Teams: {toTeams ? "Yes" : "No"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomProgramField(progId, "toIndividuals", !toIndividuals)}
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                                background: toIndividuals ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.15)",
                                color: toIndividuals ? "#3b82f6" : mutedTx,
                              }}
                              title="Toggle points to Student Standings"
                            >
                              👤 Individuals: {toIndividuals ? "Yes" : "No"}
                            </button>
                          </div>
                        </div>

                        {/* Point inputs for 1st, 2nd, 3rd */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>1st:</span>
                            <input
                              type="number"
                              min="0"
                              className="input"
                              style={{ width: 56, height: 34, fontWeight: 800, textAlign: "center", fontSize: 12 }}
                              value={pts?.first ?? 3}
                              onChange={e => handleUpdateCustomProgramField(progId, "first", e.target.value)}
                            />
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>2nd:</span>
                            <input
                              type="number"
                              min="0"
                              className="input"
                              style={{ width: 56, height: 34, fontWeight: 800, textAlign: "center", fontSize: 12 }}
                              value={pts?.second ?? 2}
                              onChange={e => handleUpdateCustomProgramField(progId, "second", e.target.value)}
                            />
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>3rd:</span>
                            <input
                              type="number"
                              min="0"
                              className="input"
                              style={{ width: 56, height: 34, fontWeight: 800, textAlign: "center", fontSize: 12 }}
                              value={pts?.third ?? 1}
                              onChange={e => handleUpdateCustomProgramField(progId, "third", e.target.value)}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveCustomProgram(progId)}
                            className="btn btn-ghost btn-sm"
                            title="Reset to default points"
                            style={{
                              height: 34,
                              padding: "0 10px",
                              color: "#ef4444",
                              fontSize: 12,
                              fontWeight: 700,
                              borderRadius: 8,
                            }}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 18,
                paddingTop: 16,
                borderTop: cardBorder,
                flexWrap: "wrap",
                gap: 14,
              }}>
                <div style={{ fontSize: 12, color: mutedTx }}>
                  Universal baseline: 1st (3), 2nd (2), 3rd (1) + Grades. Overrides sync to the cloud database in real-time.
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleResetScoringRules}
                    className="btn btn-ghost btn-sm"
                    style={{ height: 38, borderRadius: 10, fontWeight: 700 }}
                  >
                    Reset All Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveScoringRules(scoringRules)}
                    className="btn btn-primary"
                    style={{ height: 38, borderRadius: 10, padding: "0 18px", fontWeight: 700 }}
                  >
                    Save Scoring Rules
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card 1: Theme & Appearance */}
          <div style={{ borderRadius: 16, border: cardBorder, background: cardBg, padding: 22, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(241,77,77,0.1)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name={dark ? "sun" : "moon"} size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Appearance & Theme</div>
                <div style={{ fontSize: 12, color: mutedTx }}>Switch between light and dark visual themes</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: rowBg, border: cardBorder }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Interface Mode</div>
                <div style={{ fontSize: 12, color: mutedTx }}>Currently using {dark ? "Dark mode" : "Light mode"}</div>
              </div>
              <button
                type="button"
                onClick={() => setDark(d => !d)}
                style={{
                  width: 52, height: 30, borderRadius: 15, position: "relative", cursor: "pointer",
                  border: "none", background: dark ? "linear-gradient(135deg, #f14d4d, #dc2626)" : "rgba(0,0,0,0.13)",
                  transition: "background 0.3s ease", flexShrink: 0
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: "#ffffff",
                  position: "absolute", top: 3,
                  left: dark ? 25 : 3,
                  transition: "left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
                }} />
              </button>
            </div>
          </div>

          {/* Card 2: Student Participation Limits */}
          <div style={{ borderRadius: 16, border: cardBorder, background: cardBg, padding: 22, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(59,130,246,0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name="sliders" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Participation Limits</div>
                <div style={{ fontSize: 12, color: mutedTx }}>Max individual events per student (General events excluded)</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Stage Counter */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: rowBg, border: cardBorder }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Stage Solo Events</div>
                  <div style={{ fontSize: 11.5, color: mutedTx }}>Maximum solo stage items per student (excludes General events)</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ width: 32, height: 32, padding: 0, borderRadius: 8, minWidth: 32, border: cardBorder }}
                    onClick={() => updateProgramLimits({ maxStage: Math.max(1, (programLimits?.maxStage || 3) - 1), maxOffStage: programLimits?.maxOffStage || 3 })}
                  >-</button>
                  <span style={{ fontWeight: 800, fontSize: 16, minWidth: 28, textAlign: "center", color: ACCENT }}>
                    {programLimits?.maxStage || 3}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ width: 32, height: 32, padding: 0, borderRadius: 8, minWidth: 32, border: cardBorder }}
                    onClick={() => updateProgramLimits({ maxStage: (programLimits?.maxStage || 3) + 1, maxOffStage: programLimits?.maxOffStage || 3 })}
                  >+</button>
                </div>
              </div>

              {/* Off-Stage Counter */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: rowBg, border: cardBorder }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Off-Stage Solo Events</div>
                  <div style={{ fontSize: 11.5, color: mutedTx }}>Maximum solo off-stage items per student (excludes General events)</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ width: 32, height: 32, padding: 0, borderRadius: 8, minWidth: 32, border: cardBorder }}
                    onClick={() => updateProgramLimits({ maxStage: programLimits?.maxStage || 3, maxOffStage: Math.max(1, (programLimits?.maxOffStage || 3) - 1) })}
                  >-</button>
                  <span style={{ fontWeight: 800, fontSize: 16, minWidth: 28, textAlign: "center", color: "#3b82f6" }}>
                    {programLimits?.maxOffStage || 3}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ width: 32, height: 32, padding: 0, borderRadius: 8, minWidth: 32, border: cardBorder }}
                    onClick={() => updateProgramLimits({ maxStage: programLimits?.maxStage || 3, maxOffStage: (programLimits?.maxOffStage || 3) + 1 })}
                  >+</button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                ✓ Synced across all devices & cloud
              </div>
            </div>
          </div>

          {/* Card 3: Admin Security */}
          <div style={{ borderRadius: 16, border: cardBorder, background: cardBg, padding: 22, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(245,158,11,0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name="lock" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Admin Security</div>
                <div style={{ fontSize: 12, color: mutedTx }}>Change master password for administrator access</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label className="label">New Admin Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter new master password"
                  value={adminNewPwd}
                  onChange={e => { setAdminNewPwd(e.target.value); setAdminPwdError(""); }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Confirm new password"
                  value={adminNewPwdConfirm}
                  onChange={e => { setAdminNewPwdConfirm(e.target.value); setAdminPwdError(""); }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>

              {adminPwdError && (
                <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)", color: "#e11d48", fontSize: 12 }}>
                  {adminPwdError}
                </div>
              )}

              {adminPwdSuccess && (
                <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 12, fontWeight: 700 }}>
                  ✓ Admin password updated successfully
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                style={{ height: 40, borderRadius: 10, fontWeight: 700, marginTop: 4 }}
                onClick={handleAdminChangePassword}
              >
                Update Admin Password
              </button>
            </div>
          </div>

          {/* Card 3B: Judges Scoring Portal Access */}
          <div style={{ borderRadius: 16, border: cardBorder, background: cardBg, padding: 22, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(241,77,77,0.1)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name="award" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Judges Scoring Portal</div>
                <div style={{ fontSize: 12, color: mutedTx }}>Master passcode for judge evaluation portal at /#/judge</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: rowBg, border: cardBorder, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: mutedTx, textTransform: "uppercase" }}>Current Passcode</div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: ACCENT, letterSpacing: "1px", marginTop: 2 }}>
                    {currentJudgePasscode}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ borderRadius: 8, fontWeight: 700 }}
                  onClick={() => {
                    setTempJudgePasscode(currentJudgePasscode);
                    setEditingJudgePasscode(true);
                  }}
                >
                  Change Passcode
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleShareJudgesPortalWhatsApp}
                  style={{
                    flex: 1,
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    borderRadius: 10,
                    height: 38,
                  }}
                >
                  <Ic name="whatsapp" size={14} />
                  <span>Share on WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopyJudgesPortalLink}
                  style={{
                    border: cardBorder,
                    fontWeight: 600,
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 10,
                    height: 38,
                  }}
                >
                  <Ic name={copiedPortalLink ? "check" : "copy"} size={14} />
                  <span>{copiedPortalLink ? "Copied" : "Copy Link"}</span>
                </button>
              </div>

              <div style={{ fontSize: 11.5, color: mutedTx, lineHeight: 1.4 }}>
                Judges open <code>/#/judge</code>, enter this passcode, and directly enter blind marks for all lot-ready events.
              </div>
            </div>
          </div>

          {/* Card 4: Activity Log */}
          <div style={{ borderRadius: 16, border: cardBorder, background: cardBg, padding: 22, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(16,185,129,0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name="list" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Activity Log & Audit</div>
                <div style={{ fontSize: 12, color: mutedTx }}>Track user logins, registrations, and modifications</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "14px 16px", borderRadius: 12, background: rowBg, border: cardBorder, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: ACCENT }}>{activityLogs.length}</div>
                  <div style={{ fontSize: 12, color: mutedTx }}>Total logged events recorded</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ borderRadius: 8 }} onClick={() => setShowLogModal(true)}>
                    Browse Logs
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" style={{ borderRadius: 8 }} onClick={() => setClearLogConfirm(true)}>
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 12, color: mutedTx, lineHeight: 1.5 }}>
                Audit logs capture group creations, registration changes, and locking events in real time.
              </div>
            </div>
          </div>

          {/* Card 5: Lot Allocations & Code Letters Sync */}
          <div style={{ borderRadius: 16, border: cardBorder, background: cardBg, padding: 22, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(59,130,246,0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name="refresh" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Code Letters & Lot Sync</div>
                <div style={{ fontSize: 12, color: mutedTx }}>Synchronize and backfill assigned lots between database columns</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12.5, color: mutedTx, lineHeight: 1.5 }}>
                Ensures code letters in <code>codeAllocations</code> and <code>codeLetters</code> are 100% in sync across dev and production databases. Safely backfills without overwriting.
              </div>

              {syncLotsResult && (
                <div style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: syncLotsResult.success ? "rgba(16,185,129,0.08)" : "rgba(225,29,72,0.08)",
                  border: `1px solid ${syncLotsResult.success ? "rgba(16,185,129,0.2)" : "rgba(225,29,72,0.2)"}`,
                  color: syncLotsResult.success ? "#10b981" : "#e11d48",
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {syncLotsResult.success ? "✓ " : "✕ "}
                  {syncLotsResult.message}
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSyncingLots}
                style={{
                  height: 40,
                  borderRadius: 10,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onClick={handleSyncCodeAllocations}
              >
                <Ic name="refresh" size={15} />
                <span>{isSyncingLots ? "Synchronizing..." : "Sync Database Code Letters"}</span>
              </button>
            </div>
          </div>

        </div>

        {/* System & Session Card */}
        <div style={{ marginTop: 20, borderRadius: 16, border: cardBorder, background: cardBg, padding: 22, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Admin Session</div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                30m Auto-Logout Active
              </span>
            </div>
            <div style={{ fontSize: 12, color: mutedTx, marginTop: 4 }}>Signed in as System Administrator ({user.name}) · Automatic logout after 30 minutes of inactivity</div>
          </div>
          <button
            type="button"
            className="btn btn-danger"
            style={{ borderRadius: 10, padding: "9px 18px", fontWeight: 700 }}
            onClick={() => setConfirmSignOut(true)}
          >
            <Ic name="logout" size={15} /> Sign Out of Admin
          </button>
        </div>

        {/* Browse Logs Modal */}
        {showLogModal && (
          <div className="modal-bg" onClick={() => setShowLogModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", borderRadius: 20, padding: 24, background: dark ? "#111322" : "#ffffff", border: cardBorder }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>System Activity Logs</div>
                  <div style={{ fontSize: 12, color: mutedTx }}>{activityLogs.length} events recorded</div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowLogModal(false)}><Ic name="x" size={16} /></button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", border: cardBorder, borderRadius: 12, padding: 8 }}>
                {activityLogs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: mutedTx, fontSize: 13 }}>No activity recorded yet</div>
                ) : (
                  activityLogs.map((log, idx) => (
                    <div key={log.id || idx} style={{ padding: "8px 12px", borderBottom: cardBorder, fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: ACCENT }}>{log.user}: </span>
                        <span>{log.action}</span>
                        {log.details && <span style={{ color: mutedTx, marginLeft: 6 }}>({log.details})</span>}
                      </div>
                      <span style={{ color: mutedTx, fontSize: 11, flexShrink: 0 }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clear Log Confirmation Modal */}
        {clearLogConfirm && (
          <div className="modal-bg" onClick={() => setClearLogConfirm(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, width: "100%", borderRadius: 20, padding: 24, background: dark ? "#111322" : "#ffffff", border: cardBorder, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Clear Activity Log?</div>
              <div style={{ fontSize: 13, color: mutedTx, marginBottom: 20 }}>
                This will permanently remove all {activityLogs.length} log entries from the database.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 42, borderRadius: 12 }} onClick={() => setClearLogConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn" style={{ flex: 1, height: 42, borderRadius: 12, background: "#e11d48", color: "#ffffff", fontWeight: 700 }} onClick={() => { clearLogs(); setClearLogConfirm(false); }}>
                  Clear Logs
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderPublishing = () => (
    <PublishingSection
      programs={programs}
      groups={groups}
      students={students}
      scoringRules={scoringRules}
      onPublishResults={async (progId, resultsData) => {
        if (publishResults) {
          await publishResults(progId, resultsData);
        } else {
          updateProgram(progId, {
            status: "published",
            evaluationStatus: "published",
            results: resultsData,
          });
        }
        const prog = programs.find(p => p.id === progId);
        logActivity(user.name, "Published results", `${prog?.name || ""} (${prog?.order || ""})`);
      }}
      onUnpublishResults={async (progId) => {
        if (unpublishResults) {
          await unpublishResults(progId);
        } else {
          updateProgram(progId, {
            status: "draft",
            evaluationStatus: "confirmed",
            results: null,
          });
        }
        const prog = programs.find(p => p.id === progId);
        logActivity(user.name, "Unpublished results", `${prog?.name || ""} (${prog?.order || ""})`);
      }}
      onRevertEvaluation={async (progId) => {
        const prog = programs.find((p) => p.id === progId);
        if (revertEvaluation) {
          await revertEvaluation(progId);
        } else {
          const fallbackStatus = prog?.judgeSubmission ? "submitted" : "ready_for_judge";
          updateProgram(progId, {
            confirmedResults: null,
            results: null,
            status: "draft",
            evaluationStatus: fallbackStatus,
          });
        }
        logActivity(
          user.name,
          "Reverted evaluation confirmation to draft",
          `${prog?.name || ""} (${prog?.order || ""})`
        );
      }}
      dark={dark}
    />
  );

  // ── RENDER: Full Dedicated Leaderboard View ────────────────────────────────
  const renderLeaderboard = () => {
    const isStageOnly = leaderboardSessionFilter === "Stage";
    const isOffStageOnly = leaderboardSessionFilter === "Off-Stage";

    // Dynamic team standings sorting based on selected session filter
    const list = [...teamStandings];
    if (isStageOnly) {
      list.sort((a, b) => {
        if (b.stagePoints !== a.stagePoints) return b.stagePoints - a.stagePoints;
        if (b.firsts !== a.firsts) return b.firsts - a.firsts;
        return b.totalPoints - a.totalPoints;
      });
    } else if (isOffStageOnly) {
      list.sort((a, b) => {
        if (b.offStagePoints !== a.offStagePoints) return b.offStagePoints - a.offStagePoints;
        if (b.firsts !== a.firsts) return b.firsts - a.firsts;
        return b.totalPoints - a.totalPoints;
      });
    } else {
      list.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.firsts !== a.firsts) return b.firsts - a.firsts;
        if (b.seconds !== a.seconds) return b.seconds - a.seconds;
        return b.thirds - a.thirds;
      });
    }
    const displayedTeamStandings = list.map((t, idx) => ({ ...t, displayRank: idx + 1 }));

    // Filter students by category & search
    let rankedStudents = studentStandings.allStudents || [];
    if (leaderboardCatFilter !== "All") {
      rankedStudents = rankedStudents.filter(s => (s.category || "").toLowerCase() === leaderboardCatFilter.toLowerCase());
    }
    if (leaderboardSearch.trim()) {
      const q = leaderboardSearch.toLowerCase().trim();
      rankedStudents = rankedStudents.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.chestNo && String(s.chestNo).includes(q)) ||
        (s.group?.name && s.group.name.toLowerCase().includes(q))
      );
    }

    const publishedCount = programs.filter(p => p.status === "published" || !!p.results?.entries?.length).length;
    const totalPointsAwarded = teamStandings.reduce((sum, t) => sum + t.totalPoints, 0);

    return (
      <div className="anim-fadeIn" style={{ paddingBottom: 60 }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: "-0.5px",
              color: primaryHeadingColor,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span style={{ fontSize: 28 }}>🏆</span>
              <span>Championship Leaderboard</span>
            </div>
            <div style={{ fontSize: 13, color: mutedTx, marginTop: 4 }}>
              Official team standings, dense-ranked points, and fest crowns
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${border}`,
              fontSize: 12.5,
              fontWeight: 700,
              color: primaryHeadingColor,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span>📜</span>
              <span>{publishedCount} Published Events</span>
            </div>

            <div style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: "rgba(241,77,77,0.1)",
              border: "1px solid rgba(241,77,77,0.25)",
              fontSize: 12.5,
              fontWeight: 800,
              color: ACCENT,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span>⚡</span>
              <span>{totalPointsAwarded} Total Pts</span>
            </div>
          </div>
        </div>

        {/* Tab switcher: 2 Clean Non-Duplicated Tabs */}
        <div style={{
          display: "flex",
          background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          borderRadius: 14,
          padding: 4,
          marginBottom: 24,
          maxWidth: 480,
        }}>
          {[
            { id: "teams", label: "Team Championship", icon: "trophy" },
            { id: "students", label: "Contestants & Fest Crowns", icon: "users" },
          ].map(tab => {
            const active = leaderboardActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLeaderboardActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: active ? (dark ? "#1e2238" : "#ffffff") : "transparent",
                  color: active ? ACCENT : mutedTx,
                  boxShadow: active ? (dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.06)") : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ic name={tab.icon} size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* View 1: Team Championship Standings (Single Source of Truth, No Repeated Cards) */}
        {leaderboardActiveTab === "teams" && (
          <div className="anim-fadeIn">
            {/* Filter pills for Stage vs Off-Stage vs All */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {["All", "Stage", "Off-Stage"].map(sf => {
                  const active = leaderboardSessionFilter === sf;
                  return (
                    <button
                      key={sf}
                      type="button"
                      onClick={() => setLeaderboardSessionFilter(sf)}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 9,
                        border: `1px solid ${active ? ACCENT : border}`,
                        background: active ? "rgba(241,77,77,0.12)" : (dark ? "rgba(255,255,255,0.04)" : "#ffffff"),
                        color: active ? ACCENT : mutedTx,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {sf === "All" ? "All Items" : sf === "Stage" ? "🎭 Stage Only" : "✒️ Off-Stage Only"}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: 12, color: mutedTx, fontWeight: 600 }}>
                {isStageOnly
                  ? "Teams ranked by Stage items points"
                  : isOffStageOnly
                  ? "Teams ranked by Off-Stage items points"
                  : "Teams ranked by overall tournament points"}
              </div>
            </div>

            {/* Comprehensive Championship Table with Built-In Podium Design */}
            <div style={{
              borderRadius: 16,
              border: `1px solid ${border}`,
              background: cardBg,
              overflow: "hidden",
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13.5 }}>
                  <thead>
                    <tr style={{
                      borderBottom: `1px solid ${border}`,
                      background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    }}>
                      <th style={{ padding: "14px 18px", width: 90, fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Rank</th>
                      <th style={{ padding: "14px 18px", fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Team</th>
                      <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 800, color: isStageOnly ? ACCENT : mutedTx, textTransform: "uppercase", fontSize: 11 }}>Stage Pts</th>
                      <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 800, color: isOffStageOnly ? ACCENT : mutedTx, textTransform: "uppercase", fontSize: 11 }}>Off-Stage Pts</th>
                      <th style={{ padding: "14px 18px", textAlign: "right", fontWeight: 800, color: (!isStageOnly && !isOffStageOnly) ? ACCENT : mutedTx, textTransform: "uppercase", fontSize: 11 }}>
                        {isStageOnly ? "Stage Points" : isOffStageOnly ? "Off-Stage Points" : "Total Points"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTeamStandings.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "36px 20px", textAlign: "center", color: mutedTx }}>
                          No team standings available yet. Published results will populate the leaderboard automatically.
                        </td>
                      </tr>
                    ) : (
                      displayedTeamStandings.map((standing, idx) => {
                        const rank = standing.displayRank;
                        const isGold = rank === 1;
                        const isSilver = rank === 2;
                        const isBronze = rank === 3;
                        const medal = isGold ? "🥇" : isSilver ? "🥈" : isBronze ? "🥉" : null;
                        const medalBg = isGold ? "rgba(245, 158, 11, 0.15)" : isSilver ? "rgba(148, 163, 184, 0.15)" : "rgba(180, 83, 9, 0.15)";
                        const medalBorder = isGold ? "rgba(245, 158, 11, 0.35)" : isSilver ? "rgba(148, 163, 184, 0.35)" : "rgba(180, 83, 9, 0.35)";
                        const activePts = isStageOnly ? standing.stagePoints : isOffStageOnly ? standing.offStagePoints : standing.totalPoints;

                        return (
                          <tr
                            key={standing.group.id}
                            style={{
                              borderBottom: idx < displayedTeamStandings.length - 1 ? `1px solid ${border}` : "none",
                              background: isGold
                                ? (dark ? "linear-gradient(90deg, rgba(245,158,11,0.08) 0%, transparent 100%)" : "linear-gradient(90deg, rgba(254,243,199,0.5) 0%, transparent 100%)")
                                : isSilver
                                ? (dark ? "linear-gradient(90deg, rgba(148,163,184,0.06) 0%, transparent 100%)" : "linear-gradient(90deg, rgba(241,245,249,0.5) 0%, transparent 100%)")
                                : isBronze
                                ? (dark ? "linear-gradient(90deg, rgba(180,83,9,0.06) 0%, transparent 100%)" : "linear-gradient(90deg, rgba(254,237,213,0.4) 0%, transparent 100%)")
                                : "transparent",
                              transition: "background 0.15s ease",
                            }}
                          >
                            <td style={{ padding: "14px 18px" }}>
                              {medal ? (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "3px 8px",
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  background: medalBg,
                                  border: `1px solid ${medalBorder}`,
                                  color: isGold ? "#f59e0b" : isSilver ? "#94a3b8" : "#b45309",
                                }}>
                                  <span>{medal}</span>
                                  <span>{rank}</span>
                                </span>
                              ) : (
                                <span style={{ color: mutedTx, fontWeight: 700, paddingLeft: 8 }}>#{rank}</span>
                              )}
                            </td>
                            <td style={{ padding: "14px 18px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  background: standing.group.color || ACCENT,
                                  flexShrink: 0,
                                }} />
                                <span style={{ fontWeight: 800, color: isGold ? (dark ? "#fbbf24" : "#b45309") : primaryHeadingColor }}>
                                  {standing.group.name}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: isStageOnly ? 900 : 700, color: isStageOnly ? ACCENT : "#f59e0b" }}>
                              {standing.stagePoints}
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: isOffStageOnly ? 900 : 700, color: isOffStageOnly ? ACCENT : "#8b5cf6" }}>
                              {standing.offStagePoints}
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "right" }}>
                              <span style={{
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                                fontWeight: 900,
                                fontSize: 19,
                                color: isGold ? "#f59e0b" : primaryHeadingColor,
                              }}>
                                {activePts}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: mutedTx, marginLeft: 3 }}>
                                pts
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Individual Contestants & Crown Kings (Unified and Deduplicated) */}
        {leaderboardActiveTab === "students" && (
          <div className="anim-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Festival Crown Kings 2-Column Showcase Header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {/* Star of the Fest Card */}
              <div
                className="card"
                style={{
                  padding: "20px 22px",
                  borderRadius: 18,
                  border: "1.5px solid rgba(245, 158, 11, 0.4)",
                  background: dark
                    ? "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(19, 21, 36, 0.98) 100%)"
                    : "linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, #ffffff 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                  }}>
                    <span>🌟</span>
                    <span>STAR OF THE FEST</span>
                  </span>
                  {studentStandings.starOfTheFest && studentStandings.starOfTheFest.stagePoints > 0 && (
                    <span style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      {studentStandings.starOfTheFest.stagePoints} <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx }}>pts</span>
                    </span>
                  )}
                </div>

                {studentStandings.starOfTheFest && studentStandings.starOfTheFest.stagePoints > 0 ? (
                  <div>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 900,
                      fontSize: 22,
                      color: primaryHeadingColor,
                    }}>
                      {studentStandings.starOfTheFest.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 12.5, color: mutedTx, flexWrap: "wrap" }}>
                      {studentStandings.starOfTheFest.chestNo && (
                        <span>Chest #{studentStandings.starOfTheFest.chestNo}</span>
                      )}
                      <span>•</span>
                      <span>Category: <b>{studentStandings.starOfTheFest.category || "General"}</b></span>
                      <span>•</span>
                      <span style={{ fontWeight: 800, color: studentStandings.starOfTheFest.group?.color || ACCENT }}>
                        {studentStandings.starOfTheFest.group?.name}
                      </span>
                    </div>

                    {/* Winning Events Preview */}
                    {studentStandings.starOfTheFest.stageAwards?.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {studentStandings.starOfTheFest.stageAwards.map((aw, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: dark ? "rgba(255,255,255,0.06)" : "#ffffff",
                              border: `1px solid ${border}`,
                              fontSize: 11,
                              fontWeight: 700,
                              color: primaryHeadingColor,
                            }}
                          >
                            {aw.programName} (+{aw.points} pts)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: "16px 0", color: mutedTx, fontSize: 13 }}>
                    Awaiting published stage event evaluations
                  </div>
                )}
              </div>

              {/* Pen of the Fest Card */}
              <div
                className="card"
                style={{
                  padding: "20px 22px",
                  borderRadius: 18,
                  border: "1.5px solid rgba(139, 92, 246, 0.4)",
                  background: dark
                    ? "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(19, 21, 36, 0.98) 100%)"
                    : "linear-gradient(135deg, rgba(237, 233, 254, 0.6) 0%, #ffffff 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "#8b5cf6",
                    border: "1px solid rgba(139, 92, 246, 0.4)",
                  }}>
                    <span>✒️</span>
                    <span>PEN OF THE FEST</span>
                  </span>
                  {studentStandings.penOfTheFest && studentStandings.penOfTheFest.offStagePoints > 0 && (
                    <span style={{ fontSize: 20, fontWeight: 900, color: "#8b5cf6", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      {studentStandings.penOfTheFest.offStagePoints} <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx }}>pts</span>
                    </span>
                  )}
                </div>

                {studentStandings.penOfTheFest && studentStandings.penOfTheFest.offStagePoints > 0 ? (
                  <div>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 900,
                      fontSize: 22,
                      color: primaryHeadingColor,
                    }}>
                      {studentStandings.penOfTheFest.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 12.5, color: mutedTx, flexWrap: "wrap" }}>
                      {studentStandings.penOfTheFest.chestNo && (
                        <span>Chest #{studentStandings.penOfTheFest.chestNo}</span>
                      )}
                      <span>•</span>
                      <span>Category: <b>{studentStandings.penOfTheFest.category || "General"}</b></span>
                      <span>•</span>
                      <span style={{ fontWeight: 800, color: studentStandings.penOfTheFest.group?.color || ACCENT }}>
                        {studentStandings.penOfTheFest.group?.name}
                      </span>
                    </div>

                    {/* Winning Events Preview */}
                    {studentStandings.penOfTheFest.offStageAwards?.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {studentStandings.penOfTheFest.offStageAwards.map((aw, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: dark ? "rgba(255,255,255,0.06)" : "#ffffff",
                              border: `1px solid ${border}`,
                              fontSize: 11,
                              fontWeight: 700,
                              color: primaryHeadingColor,
                            }}
                          >
                            {aw.programName} (+{aw.points} pts)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: "16px 0", color: mutedTx, fontSize: 13 }}>
                    Awaiting published off-stage event evaluations
                  </div>
                )}
              </div>
            </div>

            {/* Contestants Table Toolbar: Category Filters on Left, Search on Right */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 6,
              marginBottom: 4,
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {["All", ...STUDENT_CATS].map(cat => {
                  const active = leaderboardCatFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLeaderboardCatFilter(cat)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${active ? ACCENT : border}`,
                        background: active ? "rgba(241,77,77,0.12)" : "transparent",
                        color: active ? ACCENT : mutedTx,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder="Search contestant or chest no..."
                value={leaderboardSearch}
                onChange={e => setLeaderboardSearch(e.target.value)}
                className="input"
                style={{ width: 250, height: 38, fontSize: 13 }}
              />
            </div>

            {/* Complete Contestants Table */}
            <div style={{
              borderRadius: 16,
              border: `1px solid ${border}`,
              background: cardBg,
              overflow: "hidden",
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13.5 }}>
                  <thead>
                    <tr style={{
                      borderBottom: `1px solid ${border}`,
                      background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    }}>
                      <th style={{ padding: "14px 18px", width: 70, fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Rank</th>
                      <th style={{ padding: "14px 18px", fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Contestant</th>
                      <th style={{ padding: "14px 18px", fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Team</th>
                      <th style={{ padding: "14px 18px", fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Category</th>
                      <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Stage Pts</th>
                      <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Off-Stage Pts</th>
                      <th style={{ padding: "14px 18px", textAlign: "right", fontWeight: 800, color: mutedTx, textTransform: "uppercase", fontSize: 11 }}>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "36px 20px", textAlign: "center", color: mutedTx }}>
                          No contestants matched your search criteria
                        </td>
                      </tr>
                    ) : (
                      rankedStudents.map((st, idx) => {
                        const isStar = studentStandings.starOfTheFest?.id === st.id && st.stagePoints > 0;
                        const isPen = studentStandings.penOfTheFest?.id === st.id && st.offStagePoints > 0;

                        return (
                          <tr
                            key={st.id || idx}
                            style={{
                              borderBottom: idx < rankedStudents.length - 1 ? `1px solid ${border}` : "none",
                              background: isStar
                                ? (dark ? "rgba(245,158,11,0.06)" : "rgba(254,243,199,0.3)")
                                : isPen
                                ? (dark ? "rgba(139,92,246,0.06)" : "rgba(237,233,254,0.3)")
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "14px 18px", fontWeight: 800, color: idx < 3 ? ACCENT : mutedTx }}>
                              #{st.overallRank || (idx + 1)}
                            </td>
                            <td style={{ padding: "14px 18px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontWeight: 800, color: primaryHeadingColor }}>
                                  {st.name}
                                </span>
                                {st.chestNo && (
                                  <span style={{ fontSize: 11, color: mutedTx, fontWeight: 700 }}>
                                    (#{st.chestNo})
                                  </span>
                                )}
                                {isStar && (
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 900,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    background: "rgba(245,158,11,0.2)",
                                    color: "#f59e0b",
                                    border: "1px solid rgba(245,158,11,0.4)",
                                  }}>
                                    🌟 STAR OF THE FEST
                                  </span>
                                )}
                                {isPen && (
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 900,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    background: "rgba(139,92,246,0.2)",
                                    color: "#8b5cf6",
                                    border: "1px solid rgba(139,92,246,0.4)",
                                  }}>
                                    ✒️ PEN OF THE FEST
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "14px 18px" }}>
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12.5,
                                fontWeight: 700,
                                color: st.group?.color || primaryHeadingColor,
                              }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.group?.color || ACCENT }} />
                                {st.group?.name || "Team"}
                              </span>
                            </td>
                            <td style={{ padding: "14px 18px", color: mutedTx, fontSize: 12.5 }}>
                              {st.category || "General"}
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, color: "#f59e0b" }}>
                              {st.stagePoints}
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, color: "#8b5cf6" }}>
                              {st.offStagePoints}
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "right" }}>
                              <span style={{
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                                fontWeight: 900,
                                fontSize: 16,
                                color: primaryHeadingColor,
                              }}>
                                {st.totalPoints}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: mutedTx, marginLeft: 3 }}>
                                pts
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderViews = {
    dashboard: renderDashboard,
    leaderboard: renderLeaderboard,
    students: renderStudents,
    events: renderEvents,
    programs: renderEvents,
    users: renderGroups,
    registrations: renderRegistrations,
    results: renderResults,
    publishing: renderPublishing,
    settings: renderSettings,
  };

  const unreadCount = (messages || []).filter(m => m.to === "admin" && !m.read).length;

  return (
    <div className="admin-portal-shell" style={{
      height: "100vh",
      maxHeight: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: dark ? "#080912" : "#fdfaf9",
    }}>

      {/* ── Top bar ── */}
      <header className="admin-topbar-responsive" style={{
        height: 58, minHeight: 58, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", borderBottom: `1px solid ${border}`,
        background: dark ? "rgba(7,8,15,0.95)" : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)", zIndex: 100, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(145deg,#f14d4d,#dc2626)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900,
            fontSize: 13, color: "#ffffff", boxShadow: "0 2px 8px rgba(241,77,77,0.3)"
          }}>C</div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 800, fontSize: 16, color: dark ? "#e8e8f5" : "#12121e"
          }}>Cognizance</div>
          <div style={{ width: 1, height: 20, background: border, marginLeft: 4 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: mutedTx, fontWeight: 500 }}>Admin Portal</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: dark ? "rgba(241,77,77,0.14)" : "rgba(241,77,77,0.08)",
              color: ACCENT, letterSpacing: "0.2px", textTransform: "capitalize"
            }}>
              {NAV.find(n => n.id === view)?.label || view}
            </span>
          </div>
        </div>

        {/* Topbar Right Actions: Theme Toggle & Sign Out */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setDark(!dark)}
            title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: `1px solid ${border}`,
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              color: mutedTx,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <Ic name={dark ? "sun" : "moon"} size={16} />
          </button>

          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            title="Sign Out of Admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${dark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)"}`,
              background: dark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
              color: "#ef4444",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Ic name="logout" size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="admin-layout-wrapper" style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        height: "calc(100vh - 58px)",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* ── Sidebar ── */}
        <aside className="admin-sidebar-responsive" style={{
          width: 240,
          minWidth: 240,
          flexShrink: 0,
          height: "100%",
          maxHeight: "100%",
          borderRight: `1px solid ${border}`,
          background: sideBg,
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px 16px",
          gap: 3,
          overflowY: "auto",
          boxSizing: "border-box",
        }}>
          <div className="admin-sidebar-nav-header" style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            textTransform: "uppercase", color: mutedTx, padding: "4px 8px 10px"
          }}>
            Navigation
          </div>
          {NAV.map(n => {
            const isActive = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
                  borderRadius: 10,
                  border: isActive
                    ? (dark ? "1px solid rgba(241,77,77,0.25)" : "1px solid rgba(241,77,77,0.2)")
                    : "1px solid transparent",
                  cursor: "pointer", fontFamily: "inherit",
                  background: isActive
                    ? (dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)")
                    : "transparent",
                  color: isActive ? ACCENT : (dark ? "#9ca3af" : "#64748b"),
                  fontWeight: isActive ? 700 : 500, fontSize: 13.5,
                  transition: "all 0.15s ease", width: "100%", textAlign: "left",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)";
                    e.currentTarget.style.color = dark ? "#f3f4f6" : "#1f2937";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = dark ? "#9ca3af" : "#64748b";
                  }
                }}
              >
                {/* Active Indicator Bar on left edge */}
                {isActive && (
                  <span style={{
                    position: "absolute", left: -1, top: 8, bottom: 8, width: 3,
                    borderRadius: "0 3px 3px 0", background: ACCENT
                  }} />
                )}
                <span style={{ display: "flex", alignItems: "center", color: isActive ? ACCENT : "inherit" }}>
                  <Ic name={n.icon} size={16} />
                </span>
                <span style={{ flex: 1 }}>{n.label}</span>
              </button>
            );
          })}

          {/* Sidebar footer — User card & Sign out */}
          <div className="admin-sidebar-footer" style={{
            marginTop: "auto",
            paddingTop: 14,
            borderTop: `1px solid ${border}`,
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}>
            {/* Admin identity pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderRadius: 10, background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
              border: `1px solid ${border}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #f14d4d, #dc2626)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0
              }}>
                A
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 700,
                  color: dark ? "#f1f5f9" : "#0f172a",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {user?.name || "System Admin"}
                </div>
                <div style={{ fontSize: 10.5, color: mutedTx, fontWeight: 500 }}>
                  Administrator
                </div>
              </div>
            </div>

            <button
              onClick={() => setConfirmSignOut(true)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: "transparent", color: mutedTx, fontWeight: 500, fontSize: 13.5,
                width: "100%", textAlign: "left", transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "#e11d48";
                e.currentTarget.style.background = "rgba(225,29,72,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = mutedTx;
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Ic name="logout" size={15} /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── Content ── */}
        <main ref={contentRef} className="admin-content-responsive" style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          padding: "28px 36px 64px",
          boxSizing: "border-box",
        }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", width: "100%" }}>
            {view === "print" ? <PrintSection dark={dark} /> : renderViews[view]?.()}
          </div>
        </main>
      </div>

      {showMessages && <MessagesPanel user={user} dark={dark} onClose={() => setShowMessages(false)} />}

      {/* ── Modals ── */}
      {editNameModal && (
        <Modal title="Edit Student Name" onClose={() => setEditNameModal(null)}>
          <form onSubmit={e => {
            e.preventDefault();
            handleSaveStudentName();
          }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              border: `1px solid ${border}`,
              fontSize: 12.5
            }}>
              <div>Chest No: <strong style={{ color: ACCENT }}>{editNameModal.chestNo}</strong></div>
              <div style={{ color: mutedTx }}>•</div>
              <div>Category: <strong>{editNameModal.category}</strong></div>
              <div style={{ color: mutedTx }}>•</div>
              <div>Team: <strong>{groups.find(g => g.id === editNameModal.groupId)?.name || "Team"}</strong></div>
            </div>
            <div>
              <label className="label">Student Name</label>
              <input
                type="text"
                className="input"
                placeholder="Full name"
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setEditNameModal(null)}>Cancel</button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, height: 44 }}
                disabled={!editNameValue.trim() || editNameValue.trim() === editNameModal.name}
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {stuModal && (
        <Modal title="Add Student" onClose={() => setStuModal(false)}>
          <form onSubmit={e => { e.preventDefault(); if (stuForm.name.trim()) saveStudent(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="label">Group</label><select className="input select" value={activeGroup} onChange={e => setActiveGroup(e.target.value)}>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
            <div><label className="label">Chest No</label><input type="text" className="input" placeholder="e.g. 101" value={stuForm.chestNo || ""} onChange={e => setStuForm({ ...stuForm, chestNo: e.target.value })} /></div>
            <div><label className="label">Name</label><input type="text" className="input" placeholder="Full name" value={stuForm.name} onChange={e => setStuForm({ ...stuForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">Category</label><select className="input select" value={stuForm.category} onChange={e => setStuForm({ ...stuForm, category: e.target.value })}>{STUDENT_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setStuModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!stuForm.name.trim()}>Add Student</button>
            </div>
          </form>
        </Modal>
      )}

      {progModal && (
        <Modal title={editProg ? "Edit Event" : "Add Event"} onClose={() => setProgModal(false)} wide>
          <form onSubmit={e => { e.preventDefault(); if (progForm.name.trim()) saveProg(); }} style={{ display: "grid", gap: 16 }}>
            <div className="form-row">
              <div><label className="label">Name</label><input type="text" className="input" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} placeholder="Event name" autoFocus /></div>
              <div><label className="label">Type</label><select className="input select" value={progForm.type || progForm.session || "Stage"} onChange={e => setProgForm({ ...progForm, type: e.target.value, session: e.target.value })}><option value="Stage">Stage</option><option value="Off-Stage">Off-Stage</option></select></div>
            </div>
            <div className="form-row">
              <div><label className="label">Category</label><select className="input select" value={progForm.category} onChange={e => setProgForm({ ...progForm, category: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="label">Max Participants</label><input type="number" className="input" min={1} value={progForm.maxParticipants} onChange={e => setProgForm({ ...progForm, maxParticipants: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setProgModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!progForm.name.trim()}>{editProg ? "Save Changes" : "Add Event"}</button>
            </div>
          </form>
        </Modal>
      )}

      {userModal && (
        <Modal title="Add Group" onClose={() => setUserModal(false)}>
          <form onSubmit={e => { e.preventDefault(); if (userForm.name.trim() && userForm.pin.trim()) saveUser(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="label">Group Name</label><input type="text" className="input" placeholder="e.g. Team Alpha" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">PIN / Password</label><input type="text" className="input" placeholder="e.g. 1234" value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value })} autoComplete="new-password" /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setUserModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!userForm.name.trim() || !userForm.pin.trim()}>Add Group</button>
            </div>
          </form>
        </Modal>
      )}

      {editUserModal && editingUser && (
        <Modal title="Edit Group" onClose={() => { setEditUserModal(false); setEditingUser(null); }}>
          <form onSubmit={e => { e.preventDefault(); if (editUserForm.name.trim() && editUserForm.pin.trim()) saveEditUser(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="label">Group Name</label><input type="text" className="input" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} autoFocus /></div>
            <div><label className="label">PIN / Password</label><input type="text" className="input" value={editUserForm.pin} onChange={e => setEditUserForm({ ...editUserForm, pin: e.target.value })} autoComplete="new-password" /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => { setEditUserModal(false); setEditingUser(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, height: 44 }} disabled={!editUserForm.name.trim() || !editUserForm.pin.trim()}>Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {delConfirm && (
        <div className="modal-bg" onClick={() => setDelConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            {delConfirm.type === "blocked" ? (
              <><div style={{ fontSize: 13, color: mutedTx, marginBottom: 20, lineHeight: 1.6 }}>{delConfirm.label}</div><button className="btn btn-primary" style={{ width: "100%", height: 44 }} onClick={() => setDelConfirm(null)}>Got it</button></>
            ) : (
              <><div className="ff-display fw-800" style={{ fontSize: 18, marginBottom: 8 }}>Delete?</div>
              <div style={{ fontSize: 13, color: mutedTx, marginBottom: 24, lineHeight: 1.6 }}>"{delConfirm.label}" will be permanently removed.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setDelConfirm(null)}>Cancel</button>
                <button className="btn" style={{ flex: 1, height: 44, background: "#e11d48", color: "white", fontWeight: 700 }}
                  onClick={delConfirm.type === "student" ? confirmDeleteStudent : delConfirm.type === "program" ? confirmDeleteProg : delConfirm.type === "logs" ? confirmClearLogs : confirmDeleteUser}>
                  Delete
                </button>
              </div></>
            )}
          </div>
        </div>
      )}

      {importModal && (
        <ImportStudentsModal
          isOpen={importModal}
          onClose={() => setImportModal(false)}
          groups={groups}
          students={students}
          onImport={handleImportStudents}
          dark={dark}
        />
      )}

      {progImportModal && (
        <ImportProgramsModal
          isOpen={progImportModal}
          onClose={() => setProgImportModal(false)}
          programs={programs}
          registrations={registrations}
          onImport={handleImportPrograms}
          dark={dark}
        />
      )}

      {selectedEntryInfo && (() => {
        const participantsList = selectedEntryInfo.isCrossGroup
          ? (selectedEntryInfo.allParticipants || [])
          : (selectedEntryInfo.participants || []).map(p => ({
              ...p,
              groupName: p.groupName || selectedEntryInfo.group?.name || "Team",
              groupColor: p.groupColor || selectedEntryInfo.group?.color || ACCENT,
            }));

        const teamsCount = selectedEntryInfo.isCrossGroup
          ? (selectedEntryInfo.groupCount || new Set(participantsList.map(s => s.groupId)).size)
          : 1;

        const histMap = new Map();
        getProgramLots(selectedEntryInfo.program).forEach(h => {
          if (h.studentId) histMap.set(String(h.studentId), h.codeLetter);
          if (h.id) histMap.set(String(h.id), h.codeLetter);
          if (h.chestNo) histMap.set(String(h.chestNo), h.codeLetter);
        });
        const hasCodeLetters = histMap.size > 0;
        const gridCols = hasCodeLetters ? "140px 85px 85px 1fr 110px" : "150px 95px 1fr 120px";

        return (
          <Modal
            title="Program Entry Details"
            onClose={() => setSelectedEntryInfo(null)}
            wide
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header info card */}
              <div style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: dark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)",
                border: `1px solid ${border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {selectedEntryInfo.program?.order && (
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: ACCENT }}>
                        {selectedEntryInfo.program.order}
                      </span>
                    )}
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 18, color: dark ? "#f8fafc" : "#0f172a" }}>
                      {selectedEntryInfo.program?.name || "Program Details"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                    {selectedEntryInfo.program?.category && (
                      <Tag label={selectedEntryInfo.program.category} dark={dark} />
                    )}
                    {selectedEntryInfo.program?.session && (
                      <Tag label={selectedEntryInfo.program.session} dark={dark} />
                    )}
                    {selectedEntryInfo.program?.maxParticipants && (
                      <Tag label={`Max ${selectedEntryInfo.program.maxParticipants}`} dark={dark} />
                    )}
                    {hasCodeLetters && (
                      <span style={{
                        borderRadius: 9999,
                        border: "1px solid rgba(16,185,129,0.35)",
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#10b981",
                        background: "rgba(16,185,129,0.08)",
                      }}>
                        ✨ {histMap.size} Coded (Desk Sealed)
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: mutedTx, marginLeft: 4 }}>
                      {selectedEntryInfo.isCrossGroup ? (
                        <>Teams: <strong style={{ color: dark ? "#e8e8f5" : "#0f172a" }}>All Teams ({teamsCount} registered)</strong></>
                      ) : (
                        <>Team: <strong style={{ color: dark ? "#e8e8f5" : "#0f172a" }}>{selectedEntryInfo.group?.name || "Team"}</strong></>
                      )}
                    </span>
                  </div>
                </div>

                <div style={{
                  textAlign: "right",
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${border}`,
                }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: ACCENT, fontSize: 15 }}>
                    {participantsList.length} Enrolled
                  </div>
                  <div style={{ fontSize: 11, color: mutedTx, fontWeight: 600 }}>
                    Across {teamsCount} {teamsCount === 1 ? "Team" : "Teams"}
                  </div>
                </div>
              </div>

              {/* Participants list */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Registered Participants ({participantsList.length})</span>
                </div>

                <div style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${border}`,
                  background: dark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                }}>
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ minWidth: 460 }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: gridCols,
                        gap: 12,
                        alignItems: "center",
                        padding: "11px 16px",
                        background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        borderBottom: `1px solid ${border}`,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.7,
                        textTransform: "uppercase",
                        color: mutedTx,
                      }}>
                        <div>Team</div>
                        <div>Chest No.</div>
                        {hasCodeLetters && <div>Code</div>}
                        <div>Student</div>
                        <div>Category</div>
                      </div>

                      {participantsList.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "36px 0", color: mutedTx, fontSize: 13 }}>
                          No participants registered for this program.
                        </div>
                      ) : (
                        participantsList.map((s, idx) => {
                          const codeLetter = histMap.get(String(s.id)) || histMap.get(String(s.chestNo)) || s.codeLetter;
                          return (
                          <div
                            key={s.id || idx}
                            style={{
                              display: "grid",
                              gridTemplateColumns: gridCols,
                              gap: 12,
                              alignItems: "center",
                              padding: "12px 16px",
                              borderTop: idx > 0 ? `1px solid ${border}` : "none",
                              background: idx % 2 === 0 ? cardBg : "transparent",
                              transition: "background 0.12s ease",
                            }}
                          >
                            {/* 1. Team */}
                            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: s.groupColor || selectedEntryInfo.group?.color || ACCENT,
                                display: "inline-block",
                                flexShrink: 0,
                              }} />
                              <span style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: dark ? "#e8e8f5" : "#1f2937",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}>
                                {s.groupName || selectedEntryInfo.group?.name || "Team"}
                              </span>
                            </div>

                            {/* 2. Chest No */}
                            <div>
                              <span style={{
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                                fontWeight: 800,
                                color: ACCENT,
                                fontSize: 12.5,
                                background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                                padding: "3px 8px",
                                borderRadius: 6,
                                display: "inline-block",
                                letterSpacing: "0.2px",
                              }}>
                                {s.chestNo || "—"}
                              </span>
                            </div>

                            {/* 2b. Code Letter (if coded) */}
                            {hasCodeLetters && (
                              <div>
                                {codeLetter ? (
                                  <span style={{
                                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                                    fontWeight: 800,
                                    color: "#10b981",
                                    fontSize: 12,
                                    background: dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
                                    border: "1px solid rgba(16,185,129,0.3)",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                    display: "inline-block",
                                  }}>
                                    Code {codeLetter}
                                  </span>
                                ) : (
                                  <span style={{ color: mutedTx, fontSize: 11 }}>—</span>
                                )}
                              </div>
                            )}

                            {/* 3. Student Name */}
                            <div style={{
                              fontWeight: 600,
                              fontSize: 13.5,
                              color: dark ? "#f8fafc" : "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}>
                              {s.name}
                            </div>

                            {/* 4. Category */}
                            <div>
                              <span style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: catColor[s.category] || mutedTx,
                                background: `${catColor[s.category] || "#f14d4d"}15`,
                                border: `1px solid ${catColor[s.category] || "#f14d4d"}30`,
                                padding: "2px 8px",
                                borderRadius: 6,
                                display: "inline-block",
                              }}>
                                {s.category || "—"}
                              </span>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal close action */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  className="btn btn-primary"
                  style={{ height: 42, padding: "0 24px" }}
                  onClick={() => setSelectedEntryInfo(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {activeEvalProg && (
        <EvaluationReviewModal
          open={!!activeEvalProg}
          onClose={() => setActiveEvalProg(null)}
          program={programs.find((p) => p.id === activeEvalProg.id) || activeEvalProg}
          students={students}
          groups={groups}
          registrations={registrations}
          onConfirm={({ programId, confirmedResults }) => {
            updateProgram(programId, {
              confirmedResults,
              evaluationStatus: "confirmed",
            });
            logActivity(
              user.name,
              "Confirmed judge evaluation",
              `${activeEvalProg?.name || ""} (${activeEvalProg?.order || ""})`
            );
          }}
          onRevertConfirm={async (programId) => {
            const prog = programs.find((p) => p.id === programId);
            const fallbackStatus = prog?.judgeSubmission ? "submitted" : "ready_for_judge";
            if (revertEvaluation) {
              await revertEvaluation(programId);
            } else {
              updateProgram(programId, {
                confirmedResults: null,
                results: null,
                status: "draft",
                evaluationStatus: fallbackStatus,
              });
            }
            logActivity(
              user.name,
              "Reverted confirmed evaluation",
              `${prog?.name || ""} (${prog?.order || ""})`
            );
            setActiveEvalProg(null);
          }}
          onUpdateProgram={updateProgram}
          onOpenCodeLetterModal={(prog) => setCodeLetterProg(prog)}
          dark={dark}
        />
      )}

      {codeLetterProg && (
        <CodeLetterModal
          open={!!codeLetterProg}
          onClose={() => setCodeLetterProg(null)}
          program={programs.find((p) => p.id === codeLetterProg.id) || codeLetterProg}
          students={students}
          groups={groups}
          registrations={registrations}
          onSave={(programId, updatedData) => {
            updateProgram(programId, updatedData);
            logActivity(
              user.name,
              "Updated code letters",
              `${codeLetterProg?.name || ""} (${codeLetterProg?.order || ""})`
            );
          }}
          dark={dark}
        />
      )}

      {activeResultProg && (
        <PublishResultsModal
          open={!!activeResultProg}
          onClose={() => setActiveResultProg(null)}
          event={{
            id: activeResultProg.id,
            code: activeResultProg.order || 1,
            name: activeResultProg.name,
            category: activeResultProg.category,
            type: activeResultProg.type || activeResultProg.session || "Stage",
            session: activeResultProg.session || activeResultProg.type || "Stage",
            maxParticipants: activeResultProg.maxParticipants || 1,
            results: activeResultProg.results,
            status: activeResultProg.status,
            codeLetters: getProgramLots(activeResultProg),
            participantsHistory: activeResultProg.participantsHistory || getProgramLots(activeResultProg),
            codeAllocations: getProgramLots(activeResultProg),
          }}
          students={currentProgramCandidates}
          allPrograms={programs}
          groups={groups}
          allStudents={students}
          scoringRules={scoringRules}
          onPublish={handlePublishFromModal}
          dark={dark}
        />
      )}

      {/* ── Messages Floating Action Button (FAB) ── */}
      {!showMessages && (
        <button
          type="button"
          className="admin-fab"
          onClick={() => setShowMessages(true)}
          aria-label="Messages"
          title="Messages"
          style={{
            position: "fixed",
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ff5c5c 0%, #f14d4d 100%)",
            color: "#ffffff",
            border: "none",
            boxShadow: dark
              ? "0 8px 24px rgba(241, 77, 77, 0.45), 0 2px 8px rgba(0,0,0,0.5)"
              : "0 8px 24px rgba(241, 77, 77, 0.4), 0 2px 8px rgba(0,0,0,0.12)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 140,
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "scale(1.08) translateY(-2px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "none";
          }}
        >
          <Ic name="message" size={22} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                minWidth: 19,
                height: 19,
                padding: "0 4px",
                borderRadius: 10,
                background: "#ffffff",
                color: "#f14d4d",
                fontSize: 10.5,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                border: "2px solid #f14d4d",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Sign Out Confirmation Modal ── */}
      {confirmSignOut && typeof document !== "undefined" && createPortal(
        <div
          className="modal-bg"
          onClick={() => setConfirmSignOut(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100dvh",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          <div
            className="modal anim-scaleUp"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 400,
              width: "100%",
              borderRadius: 22,
              padding: "28px 24px 24px",
              background: dark ? "#111322" : "#ffffff",
              border: `1px solid ${border}`,
              textAlign: "center",
              boxShadow: "0 28px 70px -15px rgba(0,0,0,0.6)",
              margin: "auto",
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                margin: "0 auto 16px",
                background: "rgba(225, 29, 72, 0.12)",
                color: "#e11d48",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(225, 29, 72, 0.2)",
              }}
            >
              <Ic name="logout" size={24} />
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 19,
                color: dark ? "#f8fafc" : "#0f172a",
                marginBottom: 8,
              }}
            >
              Sign Out?
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: mutedTx,
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to end your administrator session ({user?.name || "System Admin"})?
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 13.5,
                  background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  cursor: "pointer",
                }}
                onClick={() => setConfirmSignOut(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  background: "#e11d48",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 13.5,
                  border: "none",
                  boxShadow: "0 4px 14px rgba(225,29,72,0.35)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setConfirmSignOut(false);
                  onBack();
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminPortal;
