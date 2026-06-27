import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { NumPinModal, TextPinModal } from "../common/AuthModals";
import Ic from "../common/Ic";

const LandingPage = ({ dark, onLeaderLogin, onAdminClick }) => {
  const { groups, users, students } = useApp();
  const [loginGroup, setLoginGroup] = useState(null);
  const [adminModal, setAdminModal] = useState(false);

  const verifyGroupPin = (pin) => users.find(u => u.id === loginGroup.id && u.pin === pin) || null;
  const verifyAdmin    = (pass) => users.find(u => u.role === "admin" && u.pin === pass) || null;

  const groupColors = ["#f59e0b","#0ea5e9","#e11d48","#10b981","#8b5cf6","#f97316","#06b6d4","#ec4899"];

  return (
    <div style={{ minHeight: "100vh", background: dark ? "#07080f" : "#f4f4fb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 18px 80px", position: "relative", overflow: "hidden" }}>

      {/* Subtle ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)", top: "-15%", left: "50%", transform: "translateX(-50%)", filter: "blur(60px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>

        {/* Logo + Title */}
        <div className="anim-fadeUp" style={{ textAlign: "center", marginBottom: 48 }}>
          {/* Logo with orbit */}
          <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 20px" }}>
            <div style={{
              position: "absolute", inset: -12, borderRadius: "50%",
              border: "1px solid rgba(245,158,11,0.2)",
              animation: "orbitSpin 8s linear infinite",
            }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 10px rgba(245,158,11,0.9)", position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)" }} />
            </div>
            <div style={{
              width: 88, height: 88, borderRadius: 26,
              background: "linear-gradient(145deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 40px rgba(245,158,11,0.4)",
              animation: "glowPulse 3s infinite",
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 36, color: "#0a0b12", letterSpacing: -1,
            }}>FF</div>
          </div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900,
            fontSize: 38, letterSpacing: -1.5, lineHeight: 1,
            background: "linear-gradient(135deg, #fbbf24, #f59e0b, #fef3c7, #f59e0b)",
            backgroundSize: "200% auto", WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
            animation: "goldShimmer 4s linear infinite", marginBottom: 6,
          }}>FestFlow</h1>

          <p style={{ fontSize: 13, color: dark ? "#4b5563" : "#9ca3af", fontWeight: 500, letterSpacing: 0.2 }}>
            Arts & Cultural Fest
          </p>
        </div>

        {/* Group cards */}
        <div className="anim-fadeUp stagger-2" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((group, i) => {
            const color = group.color || groupColors[i % groupColors.length];
            return (
              <button key={group.id} onClick={() => setLoginGroup(group)}
                className="anim-fadeUp"
                style={{
                  animationDelay: `${0.06 * i}s`,
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)",
                  border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                  borderRadius: 16, cursor: "pointer", width: "100%", fontFamily: "inherit",
                  transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 30px ${color}22`; e.currentTarget.style.borderColor = `${color}44`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"; }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                  background: `${color}18`, color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 18,
                }}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: dark ? "#e8e8f5" : "#12121e", flex: 1, textAlign: "left" }}>
                  {group.name}
                </span>
                <div style={{ color: dark ? "#2d2f3a" : "#d1d5db", flexShrink: 0 }}>
                  <Ic name="chevronRight" size={16} />
                </div>
              </button>
            );
          })}
        </div>

        </div>

        {/* Admin pill */}
        <div className="anim-fadeUp stagger-4" style={{ textAlign: "center", marginTop: 28 }}>
          <button onClick={() => setAdminModal(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 18px", borderRadius: 50,
            background: "transparent",
            border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            cursor: "pointer", fontFamily: "inherit",
            fontSize: 12, fontWeight: 600,
            color: dark ? "#374151" : "#c4c4d4",
            transition: "all 0.18s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = dark ? "#374151" : "#c4c4d4"; e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; }}
          >
            <Ic name="shield" size={12} /> Admin Portal
          </button>
        </div>
      </div>

      {loginGroup && (
        <NumPinModal
          title={loginGroup.name}
          subtitle="Enter your group PIN to continue"
          verify={verifyGroupPin} dark={dark}
          pinLength={users.find(u => u.id === loginGroup.id)?.pin?.length || 3}
          onSuccess={(u) => { setLoginGroup(null); onLeaderLogin(u); }}
          onClose={() => setLoginGroup(null)}
        />
      )}
      {adminModal && (
        <TextPinModal
          title="Admin Sign In"
          subtitle="Enter your admin password to continue"
          verify={verifyAdmin} dark={dark}
          onSuccess={(u) => { setAdminModal(false); onAdminClick(u); }}
          onClose={() => setAdminModal(false)}
        />
      )}
    </div>
  );
};

export default LandingPage;
