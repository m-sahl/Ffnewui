import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { NumPinModal, TextPinModal } from "../common/AuthModals";
import { catColor } from "../../styles/DesignTokens";
import Ic from "../common/Ic";

const LandingPage = ({ dark, onLeaderLogin, onAdminClick }) => {
  const { groups, users, students, programs, registrations } = useApp();
  const [loginGroup, setLoginGroup] = useState(null);
  const [adminModal, setAdminModal] = useState(false);

  const verifyGroupPin = (pin) => users.find(u => u.id === loginGroup.id && u.pin === pin) || null;
  const verifyAdmin    = (pass) => users.find(u => u.role === "admin" && u.pin === pass) || null;

  const groupColors = ["#f59e0b","#0ea5e9","#e11d48","#10b981","#8b5cf6","#f97316","#06b6d4","#ec4899"];
  const totalStudents = Object.values(students || {}).flat().length;
  const totalRegs     = (registrations || []).length;

  const bg = dark ? "#07080f" : "#f4f4fb";

  return (
    <div style={{ minHeight: "100vh", background: bg, position: "relative", overflowX: "hidden" }}>

      {/* ── Layered ambient background ───────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {/* Large top-right gold orb */}
        <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.09) 0%, transparent 65%)", top: "-20%", right: "-15%", filter: "blur(70px)" }} />
        {/* Bottom-left blue orb */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 65%)", bottom: "-10%", left: "-10%", filter: "blur(60px)" }} />
        {/* Centre subtle ruby */}
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(225,29,72,0.05) 0%, transparent 65%)", top: "45%", left: "40%", filter: "blur(60px)" }} />
        {/* Subtle grid pattern overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: dark ? 0.018 : 0.04,
          backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />
      </div>

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 58,
        background: dark ? "rgba(7,8,15,0.85)" : "rgba(244,244,251,0.85)",
        backdropFilter: "blur(24px)",
        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(145deg,#f59e0b,#d97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(245,158,11,0.35)",
          }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 14, color: "#0a0b12", letterSpacing: -0.5 }}>FF</span>
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>FestFlow</span>
        </div>
        <button onClick={() => setAdminModal(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8,
          background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
          color: dark ? "#9ca3af" : "#6b7280", fontSize: 12.5, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s ease",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; e.currentTarget.style.background = "rgba(245,158,11,0.07)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = dark ? "#9ca3af" : "#6b7280"; e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"; e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; }}
        >
          <Ic name="shield" size={13} /> Admin
        </button>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", padding: "0 18px 100px" }}>

        {/* ── Hero section ─────────────────────────────────────── */}
        <div className="anim-fadeUp" style={{ textAlign: "center", padding: "56px 0 44px" }}>

          {/* Logo mark with orbit ring */}
          <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 28px" }}>
            {/* Orbit ring */}
            <div style={{
              position: "absolute", inset: -10,
              borderRadius: "50%",
              border: `1px solid ${dark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.2)"}`,
              animation: "orbitSpin 8s linear infinite",
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 12px rgba(245,158,11,0.8)", position: "absolute", top: -5, left: "50%" }} />
            </div>
            <div style={{
              width: 96, height: 96, borderRadius: 28,
              background: "linear-gradient(145deg, #f59e0b 0%, #d97706 60%, #b45309 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 16px 48px rgba(245,158,11,0.45), 0 4px 16px rgba(0,0,0,0.2)",
              animation: "glowPulse 3s infinite",
            }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 40, color: "#0a0b12", letterSpacing: -2 }}>FF</span>
            </div>
          </div>

          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 50, marginBottom: 16,
            background: dark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.1)",
            border: `1px solid rgba(245,158,11,0.2)`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "dotPulse 1.8s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#f59e0b" }}>Arts & Cultural Fest</span>
          </div>

          {/* Title */}
          <h1 className="ff-display" style={{
            fontSize: "clamp(36px, 10vw, 52px)", fontWeight: 900,
            letterSpacing: -2, lineHeight: 1.05, marginBottom: 14,
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 35%, #fef3c7 60%, #f59e0b 80%, #d97706 100%)",
            backgroundSize: "200% auto", WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
            animation: "goldShimmer 4s linear infinite",
          }}>FestFlow</h1>

          <p style={{ fontSize: 15, color: dark ? "#6b7280" : "#9ca3af", lineHeight: 1.6, maxWidth: 340, margin: "0 auto 36px", fontWeight: 500 }}>
            Manage your Arts & Cultural Fest — group registrations, event enrollment, and score sheets, all in one place.
          </p>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 0 }}>
            {[
              { value: groups.length,    label: "Groups",      icon: "users",   color: "#f59e0b" },
              { value: totalStudents,    label: "Students",    icon: "users",   color: "#0ea5e9" },
              { value: programs?.length || 0, label: "Events", icon: "book",    color: "#10b981" },
              { value: totalRegs,        label: "Entries",     icon: "list",    color: "#e11d48" },
            ].map((s, i) => (
              <div key={i} className={`anim-fadeUp stagger-${i+1}`} style={{
                padding: "16px 8px", borderRadius: 16, textAlign: "center",
                background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
                border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                backdropFilter: "blur(12px)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${s.color}15`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                  <Ic name={s.icon} size={15} />
                </div>
                <div className="ff-display fw-800" style={{ fontSize: 22, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3, color: dark ? "#6b7280" : "#9ca3af", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Category legend ───────────────────────────────────── */}
        <div className="anim-fadeUp stagger-2" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
          {[["Sub-Junior","#e11d48"],["Junior","#0ea5e9"],["Senior","#f59e0b"]].map(([cat, col]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 50, background: `${col}10`, border: `1px solid ${col}22` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{cat}</span>
            </div>
          ))}
        </div>

        {/* ── Section heading ───────────────────────────────────── */}
        <div className="anim-fadeUp stagger-2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="live-dot" />
            <span className="ff-display fw-800" style={{ fontSize: 15 }}>Select Your Group</span>
          </div>
          <span className="text-muted" style={{ fontSize: 12 }}>{groups.length} group{groups.length !== 1 ? "s" : ""} active</span>
        </div>

        {/* ── Group cards ───────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((group, i) => {
            const color = group.color || groupColors[i % groupColors.length];
            const memberCount = (students[group.id] || []).length;
            const groupRegs   = (registrations || []).filter(r => r.groupId === group.id).length;
            const catCounts   = ["Sub-Junior","Junior","Senior"].map(cat => ({
              cat, count: (students[group.id] || []).filter(s => s.category === cat).length, color: catColor[cat],
            })).filter(x => x.count > 0);

            return (
              <button key={group.id} onClick={() => setLoginGroup(group)}
                className="anim-fadeUp"
                style={{
                  animationDelay: `${0.06 * i}s`,
                  display: "flex", alignItems: "center", gap: 16, padding: "18px 20px",
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.88)",
                  border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                  borderRadius: 18, cursor: "pointer", textAlign: "left", width: "100%",
                  fontFamily: "inherit", position: "relative", overflow: "hidden",
                  transition: "all 0.22s cubic-bezier(0.22,1,0.36,1)",
                  backdropFilter: "blur(12px)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 12px 36px ${color}28, 0 4px 12px rgba(0,0,0,0.1)`;
                  e.currentTarget.style.borderColor = `${color}44`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
                }}
              >
                {/* Colored left accent */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${color}, ${color}88)`, borderRadius: "18px 0 0 18px" }} />

                {/* Avatar */}
                <div style={{
                  width: 50, height: 50, borderRadius: 15, flexShrink: 0, marginLeft: 6,
                  background: `linear-gradient(145deg, ${color}28, ${color}10)`,
                  border: `1.5px solid ${color}30`,
                  color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 22,
                }}>
                  {group.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ff-display fw-800" style={{ fontSize: 16, color: dark ? "#e8e8f5" : "#12121e", marginBottom: 5 }}>{group.name}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, color: dark ? "#6b7280" : "#9ca3af", fontWeight: 500 }}>
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </span>
                    {groupRegs > 0 && (
                      <>
                        <span style={{ color: dark ? "#374151" : "#d1d5db", fontSize: 10 }}>·</span>
                        <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>{groupRegs} registered</span>
                      </>
                    )}
                    {catCounts.map(x => (
                      <span key={x.cat} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, color: x.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: x.color, display: "inline-block" }} />
                        {x.count}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `${color}12`, color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform 0.18s ease",
                }}>
                  <Ic name="chevronRight" size={16} />
                </div>
              </button>
            );
          })}

          {groups.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 24px", opacity: 0.5 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎭</div>
              <div className="ff-display fw-800" style={{ fontSize: 16, marginBottom: 6 }}>No groups yet</div>
              <div style={{ fontSize: 13, color: dark ? "#6b7280" : "#9ca3af" }}>Sign in as admin to create groups</div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="anim-fadeUp stagger-6" style={{ marginTop: 48, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: dark ? "#374151" : "#d1d5db" }}>Powered by FestFlow</span>
            <div style={{ flex: 1, height: 1, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
          </div>
          <p className="text-muted" style={{ fontSize: 11.5, lineHeight: 1.7 }}>
            Arts & Cultural Fest Management System<br />
            <span style={{ opacity: 0.6 }}>Select your group above to sign in · Admins use the header link</span>
          </p>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}
      {loginGroup && (
        <NumPinModal
          title={`${loginGroup.name}`}
          subtitle="Enter your group PIN to continue"
          verify={verifyGroupPin}
          dark={dark}
          pinLength={users.find(u => u.id === loginGroup.id)?.pin?.length || 3}
          onSuccess={(u) => { setLoginGroup(null); onLeaderLogin(u); }}
          onClose={() => setLoginGroup(null)}
        />
      )}
      {adminModal && (
        <TextPinModal
          title="Admin Sign In"
          subtitle="Enter your admin password to continue"
          verify={verifyAdmin}
          dark={dark}
          onSuccess={(u) => { setAdminModal(false); onAdminClick(u); }}
          onClose={() => setAdminModal(false)}
        />
      )}
    </div>
  );
};

export default LandingPage;
