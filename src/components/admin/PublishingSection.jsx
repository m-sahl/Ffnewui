import React, { useState, useMemo } from "react";
import Ic from "../common/Ic";
import { STUDENT_CATS, catColor, ACCENT } from "../../styles/DesignTokens";

export default function PublishingSection({
  programs = [],
  groups = [],
  students = {},
  onPublishResults,
  onUnpublishResults,
  dark = false,
}) {
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [publishingId, setPublishingId] = useState(null);

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
      if (catFilter !== "All" && p.category !== catFilter) return false;
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

      const entries = (confirmed.entries || []).map((e, idx) => ({
        place: e.place || idx + 1,
        placeLabel: e.placeLabel || (idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `${idx + 1}th`),
        codeLetter: e.codeLetter || "",
        studentId: String(e.studentId || ""),
        studentName: e.studentName || "",
        chestNo: e.chestNo || "",
        groupId: e.groupId || "",
        groupName: e.groupName || "",
        groupColor: e.groupColor || "",
        points: e.score !== undefined ? Number(e.score) : Number(e.points || 0),
        grade: e.grade || "",
      }));

      const otherGrades = (confirmed.otherGrades || []).map((o) => ({
        codeLetter: o.codeLetter || "",
        studentId: String(o.studentId || ""),
        studentName: o.studentName || "",
        chestNo: o.chestNo || "",
        groupId: o.groupId || "",
        groupName: o.groupName || "",
        groupColor: o.groupColor || "",
        points: o.score !== undefined ? Number(o.score) : Number(o.points || 0),
        grade: o.grade || "",
      }));

      const payload = {
        entries,
        otherGrades,
        publishedAt: Date.now(),
      };

      await onPublishResults?.(prog.id, payload);
    } catch (err) {
      console.error("Failed to publish results:", err);
    } finally {
      setPublishingId(null);
    }
  };

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
          {["All", ...STUDENT_CATS].map((cat) => {
            const active = catFilter === cat;
            const count = cat === "All"
              ? relevantPrograms.length
              : relevantPrograms.filter((p) => p.category === cat).length;
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
                      #{prog.order || "–"}
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
                      <button
                        onClick={() => handlePublish(prog)}
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
                        <span>{publishingId === prog.id ? "Publishing..." : "Publish Results Now"}</span>
                      </button>
                    )}

                    {isPublished && onUnpublishResults && (
                      <button
                        onClick={() => onUnpublishResults(prog.id)}
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
                        Revert to Draft
                      </button>
                    )}
                  </div>
                </div>

                {/* Podium Grid (1st, 2nd, 3rd) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
                  {entries.slice(0, 3).map((e, idx) => {
                    const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
                    const medalColors = ["#f59e0b", "#94a3b8", "#b45309"];
                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: theme.inputBg,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 14,
                          padding: "12px 14px",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: medalColors[idx] || theme.accent, textTransform: "uppercase" }}>
                          {medals[idx]}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: theme.text }}>
                          {e.studentName || `Participant ${e.chestNo ? `#${e.chestNo}` : ""}`}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: 12, color: theme.subtext }}>
                            {e.groupName || (e.chestNo ? `Chest #${e.chestNo}` : "")}
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
    </div>
  );
}
