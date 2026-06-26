import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { NumPinModal, TextPinModal } from "../common/AuthModals";
import { catColor } from "../../styles/DesignTokens";
import Ic from "../common/Ic";

const LandingPage = ({ dark, onLeaderLogin, onAdminClick }) => {
  const { groups, users, students } = useApp();
  const [loginGroup, setLoginGroup] = useState(null);
  const [adminModal, setAdminModal] = useState(false);

  const handleGroupLogin = (group) => setLoginGroup(group);

  const verifyGroupPin = (pin) => {
    const u = users.find(u => u.id === loginGroup.id && u.pin === pin);
    return u || null;
  };

  const verifyAdmin = (pass) => {
    const u = users.find(u => u.role === "admin" && u.pin === pass);
    return u || null;
  };

  const groupColors = ["#f59e0b", "#0ea5e9", "#e11d48", "#10b981", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

  return (
    <div style={{ minHeight: "100vh", background: dark ? "#080912" : "#f5f5fb", position: "relative", overflow: "hidden" }}>
      {/* Ambient BG */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", top: "-20%", right: "-10%", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)", bottom: "10%", left: "-5%", filter: "blur(60px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "0 16px 120px" }}>
        {/* Hero */}
        <div className="anim-fadeUp" style={{ textAlign: "center", padding: "52px 0 36px" }}>
          <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 22px" }}>
            <div style={{
              width: 90, height: 90, borderRadius: 26,
              background: "linear-gradient(145deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 40px rgba(245,158,11,0.4)",
              animation: "glowPulse 3s infinite",
            }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 36, color: "#0a0b12", letterSpacing: -1 }}>FF</span>
            </div>
          </div>

          <h1 className="ff-display" style={{
            fontSize: 36, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1,
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #fef3c7 65%, #f59e0b 100%)",
            backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", animation: "goldShimmer 4s linear infinite",
          }}>FestFlow</h1>

          <p style={{ fontSize: 13, color: dark ? "#6b7280" : "#9ca3af", marginTop: 8, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>
            Arts & Cultural Fest
          </p>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 0, marginTop: 28, justifyContent: "center", borderRadius: 14, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
            {[
              { label: "Groups", value: groups.length },
              { label: "Students", value: Object.values(students || {}).flat().length },
              { label: "Categories", value: 3 },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: "14px 10px", textAlign: "center",
                background: dark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.8)",
                borderRight: i < 2 ? `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
              }}>
                <div className="ff-display fw-800" style={{ fontSize: 22, color: "#f59e0b" }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: dark ? "#6b7280" : "#9ca3af", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Groups section */}
        <div className="anim-fadeUp stagger-2">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div className="live-dot" />
            <span className="ff-display fw-800" style={{ fontSize: 14 }}>Select Your Group</span>
            <span className="text-muted" style={{ fontSize: 12 }}>to sign in</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groups.map((group, i) => {
              const color = group.color || groupColors[i % groupColors.length];
              const memberCount = (students[group.id] || []).length;
              return (
                <button key={group.id} onClick={() => handleGroupLogin(group)}
                  className="anim-fadeUp"
                  style={{
                    animationDelay: `${0.05 * i}s`,
                    display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                    background: dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.88)",
                    border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                    borderLeft: `4px solid ${color}`,
                    borderRadius: 16, cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = `0 8px 28px ${color}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: `${color}18`, color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 18,
                  }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ff-display fw-800" style={{ fontSize: 15, color: dark ? "#e8e8f5" : "#12121e" }}>{group.name}</div>
                    <div style={{ fontSize: 11.5, color: dark ? "#6b7280" : "#9ca3af", marginTop: 2, fontWeight: 500 }}>
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </div>
                  </div>
                  <div style={{ color: dark ? "#374151" : "#d1d5db", flexShrink: 0 }}>
                    <Ic name="chevronRight" size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin link */}
        <div className="anim-fadeUp stagger-4" style={{ marginTop: 36, textAlign: "center" }}>
          <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", marginBottom: 22 }} />
          <button onClick={() => setAdminModal(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px",
            background: dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.8)",
            border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            borderRadius: 50, cursor: "pointer", fontSize: 13, fontWeight: 600,
            color: dark ? "#9ca3af" : "#6b7280", fontFamily: "inherit",
            transition: "all 0.2s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = dark ? "#9ca3af" : "#6b7280"; e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; }}
          >
            <Ic name="shield" size={14} /> Admin Portal
          </button>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>Authorized personnel only</div>
        </div>
      </div>

      {/* Group PIN modal */}
      {loginGroup && (
        <NumPinModal
          title={`Sign in — ${loginGroup.name}`}
          subtitle="Enter your group PIN to continue"
          verify={verifyGroupPin}
          dark={dark}
          pinLength={users.find(u => u.id === loginGroup.id)?.pin?.length || 3}
          onSuccess={(u) => { setLoginGroup(null); onLeaderLogin(u); }}
          onClose={() => setLoginGroup(null)}
        />
      )}

      {/* Admin modal */}
      {adminModal && (
        <TextPinModal
          title="Admin Sign In"
          subtitle="Enter admin password to access portal"
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
