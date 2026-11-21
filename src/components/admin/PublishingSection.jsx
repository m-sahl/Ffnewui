import React, { useState, useMemo } from "react";
import Ic from "../common/Ic";
import { CATS, catColor, ACCENT } from "../../styles/DesignTokens";
import { calculateEntryPoints, simulateLeaderboardImpact } from "../../utils/scoring";

export default function PublishingSection({
  programs = [],
  groups = [],
  students = {},
  scoringRules = null,
  onPublishResults,
  onUnpublishResults,
  onRevertEvaluation,
  dark = false,
}) {
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [publishingId, setPublishingId] = useState(null);
  const [previewImpactProg, setPreviewImpactProg] = useState(null);
  const [revertTargetProg, setRevertTargetProg] = useState(null);
  const [publishTargetProg, setPublishTargetProg] = useState(null);
  const [unpublishTargetProg, setUnpublishTargetProg] = useState(null);
  const [isReverting, setIsReverting] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  const theme = useMemo(() => {
    return dark
      ? {
          bg: "#090a10",
          card: "#131524",
          cardBorder: "rgba(255,255,255,0.08)",
          text: "#f3f4f6",
          subtext: "#9ca3af",
          inputBg: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.08)",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.15)",
        }
      : {
          bg: "#f8fafc",
          card: "#ffffff",
          cardBorder: "rgba(0,0,0,0.08)",
          text: "#0f172a",
          subtext: "#64748b",
          inputBg: "#ffffff",
          border: "rgba(0,0,0,0.08)",
          accent: "#f14d4d",
          accentSoft: "rgba(241,77,77,0.1)",
        };
  }, [dark]);

  // Programs that are either confirmed or published
  const relevantPrograms = useMemo(() => {
    return programs.filter((p) => {
      const isConfirmed = p.evaluationStatus === "confirmed" || !!p.confirmedResults;
      const isPublished = p.status === "published" || !!p.results?.entries?.length;
      return isConfirmed || isPublished;
    });
  }, [programs]);

  // Filtered by category and search
  const filteredPrograms = useMemo(() => {
    return relevantPrograms.filter((p) => {
      if (catFilter !== "All" && (p.category || "General").toLowerCase() !== catFilter.toLowerCase()) return false;
      const isPublished = p.status === "published";
      if (statusFilter === "confirmed" && isPublished) return false;
      if (statusFilter === "published" && !isPublished) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const codeMatch = p.order && String(p.order).includes(q);
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        return codeMatch || nameMatch;
      }
      return true;
    }).sort((a, b) => {
      // Confirmed first, then by order
      const aConf = a.status !== "published" ? 0 : 1;
      const bConf = b.status !== "published" ? 0 : 1;
      if (aConf !== bConf) return aConf - bConf;
      return (a.order || 0) - (b.order || 0);
    });
  }, [relevantPrograms, catFilter, statusFilter, search]);

  const confirmedCount = relevantPrograms.filter((p) => p.status !== "published").length;
  const publishedCount = relevantPrograms.filter((p) => p.status === "published").length;

  const handlePublish = async (prog) => {
    setPublishingId(prog.id);
    try {
      const confirmed = prog.confirmedResults;
      if (!confirmed) return;

      const entries = (confirmed.entries || []).map((e, idx) => {
        const place = e.place || idx + 1;
        const autoPts = calculateEntryPoints(place, e.grade, prog, scoringRules);
        return {
          place,
          placeLabel: e.placeLabel || (idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `${idx + 1}th`),
          isShared: !!e.isShared,
          codeLetter: e.codeLetter || "",
          studentId: String(e.studentId || ""),
          studentName: e.studentName || "",
          chestNo: e.chestNo || "",
          groupId: e.groupId || "",
          groupName: e.groupName || "",
          groupColor: e.groupColor || "",
          points: autoPts,
          grade: e.grade || "",
        };
      });

      const otherGrades = (confirmed.otherGrades || []).map((o) => ({
        codeLetter: o.codeLetter || "",
        studentId: String(o.studentId || ""),
        studentName: o.studentName || "",
        chestNo: o.chestNo || "",
        groupId: o.groupId || "",
        groupName: o.groupName || "",
        groupColor: o.groupColor || "",
        points: calculateEntryPoints(null, o.grade, prog, scoringRules),
        grade: o.grade || "",
      }));

      const payload = {
        entries,
        otherGrades,
        publishedAt: Date.now(),
      };

      await onPublishResults?.(prog.id, payload);
      setPreviewImpactProg(null);
      setPublishTargetProg(null);
    } catch (err) {
      console.error("Failed to publish results:", err);
    } finally {
      setPublishingId(null);
    }
  };

  const previewImpactData = useMemo(() => {
    if (!previewImpactProg || !previewImpactProg.confirmedResults) return null;
    const confirmed = previewImpactProg.confirmedResults;
    const candidateResults = {
      entries: (confirmed.entries || []).map((e, idx) => {
        const place = e.place || idx + 1;
        const autoPts = calculateEntryPoints(place, e.grade, previewImpactProg, scoringRules);
        return {
          ...e,
          place,
          placeLabel: e.placeLabel || (idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `${idx + 1}th`),
          points: autoPts,
        };
      }),
      otherGrades: (confirmed.otherGrades || []).map((o) => ({
        ...o,
        points: calculateEntryPoints(null, o.grade, previewImpactProg, scoringRules),
      })),
    };
    return simulateLeaderboardImpact(
      programs,
      groups,
      previewImpactProg,
      candidateResults,
      students,
      scoringRules
    );
  }, [previewImpactProg, programs, groups, students, scoringRules]);

  return (
    <div className="anim-fadeIn">
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: theme.text }}>
            Publish Results
          </div>
          <div style={{ fontSize: 13, color: theme.subtext, marginTop: 4 }}>
            Review confirmed evaluations and publish final awards to leaderboards and groups.
          </div>
        </div>

        {/* Counter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              backgroundColor: confirmedCount > 0 ? "rgba(245,158,11,0.15)" : theme.cardBorder,
              color: confirmedCount > 0 ? "#f59e0b" : theme.subtext,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{confirmedCount} Ready to Publish</span>
          </div>

          <div
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              backgroundColor: "rgba(16,185,129,0.15)",
              color: "#10b981",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ic n="check" s={14} />
            <span>{publishedCount} Published</span>
          </div>
        </div>
      </div>

      {/* Future Publishing Features Teaser Banner */}
      <div
        style={{
          backgroundColor: dark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 16,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "#6366f1",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ic n="award" s={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#c7d2fe" : "#4338ca" }}>
            Publishing Control Center
          </div>
          <div style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>
            Dedicated release controls, stage announcements, and certificate printing will be managed right from this section.
          </div>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {["All", ...CATS].map((cat) => {
            const active = catFilter === cat;
            const count = cat === "All"
              ? relevantPrograms.length
              : relevantPrograms.filter((p) => (p.category || "General").toLowerCase() === cat.toLowerCase()).length;
            const pillColor = catColor[cat] || theme.accent;

            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  padding: "6px 13px",
                  borderRadius: 9,
                  background: active
                    ? (dark ? `${pillColor}24` : `${pillColor}15`)
                    : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                  color: active ? pillColor : theme.subtext,
                  border: `1px solid ${active ? pillColor : theme.border}`,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{cat}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : theme.subtext,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 36,
              fontSize: 13,
              fontWeight: 700,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
              color: theme.text,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All ({relevantPrograms.length})</option>
            <option value="confirmed">Ready to Publish ({confirmedCount})</option>
            <option value="published">Published ({publishedCount})</option>
          </select>

          <input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: 36,
              width: 180,
              fontSize: 13,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
              color: theme.text,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Program Cards */}
      {filteredPrograms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: theme.subtext }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No programs to publish yet</div>
          <div style={{ fontSize: 13 }}>
            Programs will appear here after judges submit scores and they are confirmed in Evaluations.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredPrograms.map((prog) => {
            const isPublished = prog.status === "published";
            const resultsData = isPublished ? prog.results : prog.confirmedResults;
            const entries = resultsData?.entries || [];
            const otherGrades = resultsData?.otherGrades || [];

            return (
              <div
                key={prog.id}
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${isPublished ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                  borderRadius: 18,
                  padding: "20px 24px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Header Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 6,
                        backgroundColor: theme.accentSoft,
                        color: theme.accent,
                      }}
                    >
                      {prog.order || "–"}
                    </span>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: theme.text }}>
                      {prog.name}
                    </h3>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        backgroundColor: `${catColor[prog.category] || theme.accent}15`,
                        color: catColor[prog.category] || theme.accent,
                      }}
                    >
                      {prog.category}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isPublished ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "4px 12px",
                          borderRadius: 20,
                          backgroundColor: "rgba(16,185,129,0.15)",
                          color: "#10b981",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Ic n="check" s={14} />
                        <span>Published</span>
                      </span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => setPreviewImpactProg(prog)}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 12,
                            border: `1px solid ${theme.border}`,
                            backgroundColor: dark ? "rgba(255,255,255,0.06)" : "#ffffff",
                            color: theme.text,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span>⚡ Impact Preview</span>
                        </button>
                        <button
                          onClick={() => setPublishTargetProg(prog)}
                          disabled={publishingId === prog.id}
                          style={{
                            padding: "8px 18px",
                            borderRadius: 12,
                            border: "none",
                            backgroundColor: "#10b981",
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: publishingId === prog.id ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                          }}
                        >
                          <Ic n="send" s={14} />
                          <span>{publishingId === prog.id ? "Publishing..." : "Publish Results"}</span>
                        </button>
                      </div>
                    )}

                    {!isPublished && onRevertEvaluation && (
                      <button
                        onClick={() => setRevertTargetProg(prog)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(239,68,68,0.35)",
                          backgroundColor: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        title="Revert to draft evaluation to correct codes or marks"
                      >
                        <Ic n="back" s={13} />
                        <span>Revert to Evaluation</span>
                      </button>
                    )}

                    {isPublished && onUnpublishResults && (
                      <button
                        onClick={() => setUnpublishTargetProg(prog)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 10,
                          border: `1px solid ${theme.border}`,
                          backgroundColor: "transparent",
                          color: theme.subtext,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Unpublish Results
                      </button>
                    )}
                  </div>
                </div>

                {/* Podium Grid (1st, 2nd, 3rd + Shared Winners) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
                  {entries.map((e, idx) => {
                    const place = Number(e.place || (idx === 0 ? 1 : idx === 1 ? 2 : 3));
                    const isShared = e.isShared || (e.placeLabel && e.placeLabel.includes("Shared"));
                    const medalColors = {
                      1: "#f59e0b",
                      2: "#94a3b8",
                      3: "#b45309",
                    };
                    const medalColor = medalColors[place] || theme.accent;
                    const medalEmoji = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : "🎖️";
                    const placeTitle = `${medalEmoji} ${e.placeLabel || (place === 1 ? "1st Place" : place === 2 ? "2nd Place" : place === 3 ? "3rd Place" : `${place}th Place`)}`;

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: theme.inputBg,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 14,
                          padding: "12px 14px",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: medalColor, textTransform: "uppercase" }}>
                            {placeTitle}
                          </div>
                          {isShared && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "1px 6px",
                                borderRadius: 10,
                                backgroundColor: "rgba(245,158,11,0.15)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.3)",
                              }}
                            >
                              Shared
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: theme.text }}>
                          {e.studentName || `Participant ${e.chestNo ? `${e.chestNo}` : ""}`}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: 12, color: theme.subtext }}>
                            {e.groupName || (e.chestNo ? `Chest ${e.chestNo}` : "")}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 6,
                              backgroundColor: "rgba(16,185,129,0.12)",
                              color: "#10b981",
                            }}
                          >
                            {e.grade ? `Grade ${e.grade}` : `${e.points || 0} pts`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Other grades preview */}
                {otherGrades.length > 0 && (
                  <div style={{ fontSize: 12, color: theme.subtext, display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <Ic n="award" s={14} />
                    <span>+{otherGrades.length} additional participants awarded grades ({otherGrades.map(o => o.grade).filter(Boolean).join(", ")})</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Thrilling Live Leaderboard Impact Preview Modal */}
      {previewImpactProg && previewImpactData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setPreviewImpactProg(null)}
        >
          <div
            className="anim-scaleUp"
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 24,
              padding: 24,
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: theme.accent }}>
                  Live Impact Preview
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginTop: 2 }}>
                  {previewImpactProg.name} (#{previewImpactProg.order || 1})
                </div>
              </div>
              <button
                onClick={() => setPreviewImpactProg(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Thrilling Lead Change Alert */}
            {previewImpactData.hasLeaderChanged && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(241,77,77,0.18) 100%)",
                  border: "1.5px solid rgba(245,158,11,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 28 }}>👑</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#f59e0b" }}>
                    Leaderboard Change!
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: theme.text, marginTop: 2 }}>
                    <span style={{ color: theme.accent }}>{previewImpactData.leaderAfter}</span> will overtake {previewImpactData.leaderBefore} to claim #1!
                  </div>
                </div>
              </div>
            )}

            {/* Points Awarded Chips */}
            {previewImpactData.teamsGainingPoints?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: theme.subtext, marginBottom: 8 }}>
                  Points Added In This Event
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {previewImpactData.teamsGainingPoints.map((tg) => (
                    <span
                      key={tg.groupId}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 10,
                        fontSize: 12.5,
                        fontWeight: 700,
                        background: "rgba(241,77,77,0.1)",
                        color: theme.accent,
                        border: "1px solid rgba(241,77,77,0.25)",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: tg.groupColor || theme.accent }} />
                      <span>{tg.groupName}</span>
                      <span style={{ fontWeight: 900, color: "#10b981", marginLeft: 2 }}>+{tg.pointsAdded} pts</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Projected Standings Board */}
            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                overflow: "hidden",
                background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  padding: "8px 14px",
                  background: "rgba(0,0,0,0.03)",
                  borderBottom: `1px solid ${theme.border}`,
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 64px 84px",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: theme.subtext,
                }}
              >
                <span>Rank</span>
                <span>Team</span>
                <span style={{ textAlign: "center" }}>Shift</span>
                <span style={{ textAlign: "right" }}>Projected</span>
              </div>

              <div>
                {previewImpactData.comparison.map((team, idx) => {
                  const isGaining = team.pointsAdded > 0;
                  const rankMovedUp = team.rankDiff > 0;
                  const rankMovedDown = team.rankDiff < 0;
                  const rankMedal = team.projectedRank === 1 ? "🥇" : team.projectedRank === 2 ? "🥈" : team.projectedRank === 3 ? "🥉" : null;

                  return (
                    <div
                      key={team.groupId || idx}
                      style={{
                        padding: "9px 14px",
                        display: "grid",
                        gridTemplateColumns: "40px 1fr 64px 84px",
                        alignItems: "center",
                        borderTop: idx > 0 ? `1px solid ${theme.border}` : "none",
                        background: isGaining ? "rgba(241,77,77,0.06)" : "transparent",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 900 }}>
                        {rankMedal || `#${team.projectedRank}`}
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, paddingRight: 6 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: team.groupColor || theme.accent, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: isGaining ? 800 : 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {team.groupName}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {rankMovedUp ? (
                          <span style={{ padding: "2px 6px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: "rgba(16,185,129,0.18)", color: "#10b981" }}>
                            ▲ +{team.rankDiff}
                          </span>
                        ) : rankMovedDown ? (
                          <span style={{ padding: "2px 6px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                            ▼ {team.rankDiff}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: theme.subtext, fontWeight: 700 }}>—</span>
                        )}
                      </div>

                      <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: isGaining ? theme.accent : theme.text }}>
                          {team.projectedPoints} <span style={{ fontSize: 10 }}>pts</span>
                        </div>
                        {isGaining && (
                          <div style={{ fontSize: 10.5, color: "#10b981", fontWeight: 700 }}>
                            +{team.pointsAdded} pts
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setPreviewImpactProg(null)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => handlePublish(previewImpactProg)}
                disabled={publishingId === previewImpactProg.id}
                style={{
                  flex: 1.5,
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px -4px rgba(16,185,129,0.5)",
                }}
              >
                {publishingId === previewImpactProg.id ? "Publishing..." : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish Results Confirmation Dialog ── */}
      {publishTargetProg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => publishingId !== publishTargetProg.id && setPublishTargetProg(null)}
        >
          <div
            className="anim-scaleUp"
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 22,
              padding: 24,
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(16,185,129,0.12)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <Ic n="send" s={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.text }}>
                  Publish Results?
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.subtext }}>
                  Broadcast winners and update official leaderboard standings.
                </p>
              </div>
              <button
                type="button"
                disabled={publishingId === publishTargetProg.id}
                onClick={() => setPublishTargetProg(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  cursor: publishingId === publishTargetProg.id ? "not-allowed" : "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Ic n="x" s={14} />
              </button>
            </div>

            {/* Program Details Card */}
            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                backgroundColor: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 6,
                    backgroundColor: theme.accentSoft,
                    color: theme.accent,
                  }}
                >
                  #{publishTargetProg.order || publishTargetProg.id}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>
                  {publishTargetProg.name}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.subtext, display: "flex", gap: 10, alignItems: "center" }}>
                <span>Category: <strong>{publishTargetProg.category}</strong></span>
                <span>•</span>
                <span>Session: <strong>{publishTargetProg.type || publishTargetProg.session || "Stage"}</strong></span>
              </div>
            </div>

            {/* Podium Preview */}
            {(() => {
              const confirmed = publishTargetProg.confirmedResults;
              const entries = confirmed?.entries || [];
              const otherGrades = confirmed?.otherGrades || [];
              if (entries.length === 0) return null;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Podium Winners to be Published:
                  </div>
                  <div
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.card,
                      overflow: "hidden",
                    }}
                  >
                    {entries.map((e, idx) => {
                      const place = e.place || idx + 1;
                      const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : "🎖️";
                      return (
                        <div
                          key={e.studentId || idx}
                          style={{
                            padding: "9px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: idx < entries.length - 1 ? `1px solid ${theme.border}` : "none",
                            fontSize: 12.5,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, paddingRight: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 800 }}>
                              {medal} {e.placeLabel || `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`}
                            </span>
                            <span style={{ fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {e.studentName}
                              {e.chestNo && ` (${e.chestNo})`}
                            </span>
                            {e.groupName && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: e.groupColor || theme.accent,
                                  padding: "1px 6px",
                                  borderRadius: 5,
                                  backgroundColor: e.groupColor ? `${e.groupColor}18` : theme.accentSoft,
                                }}
                              >
                                {e.groupName}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 12, color: "#10b981", flexShrink: 0 }}>
                            {e.points || 0} pts
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {otherGrades.length > 0 && (
                    <div style={{ fontSize: 12, color: theme.subtext, display: "flex", alignItems: "center", gap: 6 }}>
                      <Ic n="award" s={13} />
                      <span>+{otherGrades.length} additional participants awarded grades</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Informational Note */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                backgroundColor: dark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.25)",
                fontSize: 12.5,
                color: dark ? "#6ee7b7" : "#047857",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ic n="check" s={15} />
              <span>
                Publishing will make these standings official and immediately visible to contestants and team leaders across the festival portal.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={publishingId === publishTargetProg.id}
                onClick={() => setPublishTargetProg(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: publishingId === publishTargetProg.id ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishingId === publishTargetProg.id}
                onClick={async () => {
                  await handlePublish(publishTargetProg);
                }}
                style={{
                  padding: "9px 22px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: publishingId === publishTargetProg.id ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                }}
              >
                <Ic n="send" s={14} />
                <span>{publishingId === publishTargetProg.id ? "Publishing..." : "Confirm & Publish"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revert to Evaluation Confirmation Dialog ── */}
      {revertTargetProg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !isReverting && setRevertTargetProg(null)}
        >
          <div
            className="anim-scaleUp"
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 22,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(239,68,68,0.12)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <Ic n="alert" s={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.text }}>
                  Revert to Evaluation?
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.subtext }}>
                  Return this program back to evaluation to modify marks or code allocations.
                </p>
              </div>
              <button
                type="button"
                disabled={isReverting}
                onClick={() => setRevertTargetProg(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  cursor: isReverting ? "not-allowed" : "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Ic n="x" s={14} />
              </button>
            </div>

            {/* Program Details Card */}
            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                backgroundColor: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 6,
                    backgroundColor: theme.accentSoft,
                    color: theme.accent,
                  }}
                >
                  #{revertTargetProg.order || revertTargetProg.id}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>
                  {revertTargetProg.name}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.subtext, display: "flex", gap: 10, alignItems: "center" }}>
                <span>Category: <strong>{revertTargetProg.category}</strong></span>
                <span>•</span>
                <span>Type: <strong>{revertTargetProg.type || revertTargetProg.session || "Stage"}</strong></span>
              </div>
            </div>

            {/* Warning Message Box */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                backgroundColor: dark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.25)",
                fontSize: 12.5,
                color: dark ? "#fca5a5" : "#b91c1c",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ marginTop: 2, flexShrink: 0 }}>
                <Ic n="back" s={15} />
              </span>
              <span>
                This will un-confirm the results and remove this event from Publishing. It will revert to draft evaluation status (<strong>{revertTargetProg.judgeSubmission ? "submitted scores" : "ready for judge"}</strong>) so you can review judge entries and make corrections.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={isReverting}
                onClick={() => setRevertTargetProg(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isReverting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReverting}
                onClick={async () => {
                  setIsReverting(true);
                  try {
                    await onRevertEvaluation(revertTargetProg.id);
                    setRevertTargetProg(null);
                  } catch (err) {
                    console.error("Failed to revert evaluation:", err);
                  } finally {
                    setIsReverting(false);
                  }
                }}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isReverting ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                }}
              >
                <Ic n="back" s={14} />
                <span>{isReverting ? "Reverting..." : "Yes, Revert to Evaluation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unpublish Confirmation Dialog ── */}
      {unpublishTargetProg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !isUnpublishing && setUnpublishTargetProg(null)}
        >
          <div
            className="anim-scaleUp"
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 22,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(245,158,11,0.12)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <Ic n="alert" s={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.text }}>
                  Unpublish Results?
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.subtext }}>
                  Withdraw published results from public leaderboards.
                </p>
              </div>
              <button
                type="button"
                disabled={isUnpublishing}
                onClick={() => setUnpublishTargetProg(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  cursor: isUnpublishing ? "not-allowed" : "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Ic n="x" s={14} />
              </button>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                backgroundColor: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 6,
                    backgroundColor: theme.accentSoft,
                    color: theme.accent,
                  }}
                >
                  #{unpublishTargetProg.order || unpublishTargetProg.id}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>
                  {unpublishTargetProg.name}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.subtext }}>
                Category: <strong>{unpublishTargetProg.category}</strong>
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                backgroundColor: dark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.25)",
                fontSize: 12.5,
                color: dark ? "#fcd34d" : "#b45309",
                lineHeight: 1.5,
              }}
            >
              Unpublishing will return this program to confirmed status and remove points earned from this event from public team standings until republished.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={isUnpublishing}
                onClick={() => setUnpublishTargetProg(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.subtext,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isUnpublishing ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnpublishing}
                onClick={async () => {
                  setIsUnpublishing(true);
                  try {
                    await onUnpublishResults?.(unpublishTargetProg.id);
                    setUnpublishTargetProg(null);
                  } catch (err) {
                    console.error("Failed to unpublish results:", err);
                  } finally {
                    setIsUnpublishing(false);
                  }
                }}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                  color: theme.text,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isUnpublishing ? "not-allowed" : "pointer",
                }}
              >
                {isUnpublishing ? "Unpublishing..." : "Yes, Unpublish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
