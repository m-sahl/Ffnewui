import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { NumPinModal, TextPinModal } from "../common/AuthModals";
import Ic from "../common/Ic";

const LandingPage = ({ dark, onLeaderLogin, onAdminClick }) => {
  const { groups, users } = useApp();
  const [loginGroup, setLoginGroup] = useState(null);
  const [adminModal, setAdminModal] = useState(false);

  const verifyGroupPin = (pin) => users.find(u => u.id === loginGroup.id && u.pin === pin) || null;
  const verifyAdmin    = (pass) => users.find(u => u.role === "admin" && u.pin === pass) || null;

  const groupColors = ["#f14d4d", "#3b82f6", "#f59e0b", "#1dd183", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

  const bg      = dark ? "#07080f" : "#fdfaf9";
  const cardBg  = dark ? "rgba(255,255,255,0.035)" : "#ffffff";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx = dark ? "#64748b" : "#94a3b8";

  return (
    <div style={{
      minHeight: "100vh", background: bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 20px 80px", position: "relative", overflow: "hidden",
    }}>

      {/* Low opacity dotted & red splash background overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden",
        backgroundImage: dark
          ? "radial-gradient(rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px)"
          : "radial-gradient(rgba(241, 77, 77, 0.08) 1.2px, transparent 1.2px)",
        backgroundSize: "20px 20px",
      }}>
        {/* Soft Red Ambient Splashes (Visible on Mobile & Desktop) */}
        {/* Top-Right Mobile Accent */}
        <div style={{
          position: "absolute", width: 240, height: 240, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(241, 77, 77, 0.15) 0%, transparent 70%)",
          top: "2%", right: "-5%", filter: "blur(40px)",
        }} />
        {/* Middle-Left Mobile Accent */}
        <div style={{
          position: "absolute", width: 220, height: 220, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(241, 77, 77, 0.13) 0%, transparent 70%)",
          top: "45%", left: "-6%", filter: "blur(38px)",
        }} />
        {/* Bottom-Right Mobile Accent */}
        <div style={{
          position: "absolute", width: 250, height: 250, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(241, 77, 77, 0.14) 0%, transparent 70%)",
          bottom: "3%", right: "-5%", filter: "blur(42px)",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>

        {/* Logo block */}
        <div className="anim-fadeUp" style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            position: "relative", width: 72, height: 72, margin: "0 auto 18px",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: "#f14d4d",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "none",
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900,
              fontSize: 28, color: "#ffffff", letterSpacing: -1,
            }}>FF</div>
          </div>

          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900,
            fontSize: 34, letterSpacing: -1.2, color: dark ? "#e8e8f5" : "#0f172a",
            marginBottom: 6,
          }}>FestFlow</div>

          <div style={{ fontSize: 13, color: mutedTx, fontWeight: 500, letterSpacing: 0.3 }}>
            Arts & Cultural Fest Management
          </div>
        </div>

        {/* Divider with label */}
        {groups.length > 0 && (
          <div className="anim-fadeUp" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, animationDelay: "0.08s" }}>
            <div style={{ flex: 1, height: 1, background: border }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: mutedTx, letterSpacing: 1.2, textTransform: "uppercase" }}>Select Group</span>
            <div style={{ flex: 1, height: 1, background: border }} />
          </div>
        )}

        {/* Group cards with smooth waterfall stagger */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          {groups.length === 0 ? (
            <div className="anim-fadeUp" style={{ textAlign: "center", padding: "32px 0", color: mutedTx, animationDelay: "0.1s" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎭</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No groups yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Sign in as Admin to get started</div>
            </div>
          ) : groups.map((group, i) => {
            const color = group.color || groupColors[i % groupColors.length];
            return (
              <button key={group.id} className="anim-fadeUp" onClick={() => setLoginGroup(group)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "15px 18px",
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: 16, cursor: "pointer",
                  width: "100%", fontFamily: "inherit",
                  transition: "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
                  animationDelay: `${0.06 * i + 0.12}s`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${color}66`;
                  e.currentTarget.style.transform = "translateY(-3px) scale(1.01)";
                  e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                }}
                onTouchStart={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {/* Color dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: color, flexShrink: 0,
                  boxShadow: `0 0 10px ${color}88`,
                }} />

                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700, fontSize: 15,
                  color: dark ? "#e8e8f5" : "#0f172a",
                  flex: 1, textAlign: "left",
                }}>{group.name}</span>

                <Ic name="chevronRight" size={15} color={mutedTx} />
              </button>
            );
          })}
        </div>

        {/* Admin button */}
        <div className="anim-fadeUp" style={{ textAlign: "center", animationDelay: `${0.06 * groups.length + 0.18}s` }}>
          <button onClick={() => setAdminModal(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "10px 22px", borderRadius: 50,
            background: "transparent",
            border: `1px solid ${border}`,
            cursor: "pointer", fontFamily: "inherit",
            fontSize: 12.5, fontWeight: 600,
            color: mutedTx,
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "#f14d4d";
              e.currentTarget.style.borderColor = "rgba(241,77,77,0.35)";
              e.currentTarget.style.background = "rgba(241,77,77,0.06)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = mutedTx;
              e.currentTarget.style.borderColor = border;
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Ic name="shield" size={13} /> Admin Portal
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
