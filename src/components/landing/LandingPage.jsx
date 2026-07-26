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

  const groupColors = ["#f59e0b","#0ea5e9","#e11d48","#10b981","#8b5cf6","#f97316","#06b6d4","#ec4899"];

  const bg      = dark ? "#07080f" : "#f8f8fc";
  const cardBg  = dark ? "rgba(255,255,255,0.035)" : "#ffffff";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const mutedTx = dark ? "#4b5563" : "#9ca3af";

  return (
    <div style={{
      minHeight: "100vh", background: bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 20px 80px", position: "relative", overflow: "hidden",
    }}>

      {/* Subtle background gradient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: dark
          ? "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.06) 0%, transparent 70%)"
          : "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>

        {/* Logo block */}
        <div className="anim-fadeUp" style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 18px",
            background: "linear-gradient(145deg, #f59e0b, #d97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(245,158,11,0.35)",
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900,
            fontSize: 28, color: "#0a0b12", letterSpacing: -1,
          }}>FF</div>

          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900,
            fontSize: 32, letterSpacing: -1.2, color: dark ? "#e8e8f5" : "#0a0b12",
            marginBottom: 5,
          }}>FestFlow</div>

          <div style={{ fontSize: 13, color: mutedTx, fontWeight: 500, letterSpacing: 0.3 }}>
            Arts & Cultural Fest Management
          </div>
        </div>

        {/* Divider with label */}
        {groups.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: border }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: mutedTx, letterSpacing: 1, textTransform: "uppercase" }}>Select Group</span>
            <div style={{ flex: 1, height: 1, background: border }} />
          </div>
        )}

        {/* Group cards */}
        <div className="anim-fadeUp" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {groups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: mutedTx }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎭</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No groups yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Sign in as Admin to get started</div>
            </div>
          ) : groups.map((group, i) => {
            const color = group.color || groupColors[i % groupColors.length];
            return (
              <button key={group.id} onClick={() => setLoginGroup(group)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: 14, cursor: "pointer",
                  width: "100%", fontFamily: "inherit",
                  transition: "all 0.18s ease",
                  animationDelay: `${0.05 * i}s`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${color}55`;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = `0 6px 20px ${color}18`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                }}
                onTouchStart={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "#f5f5fb"; }}
                onTouchEnd={e => { e.currentTarget.style.background = cardBg; }}
              >
                {/* Color dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: color, flexShrink: 0,
                  boxShadow: `0 0 8px ${color}66`,
                }} />

                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700, fontSize: 15,
                  color: dark ? "#e8e8f5" : "#12121e",
                  flex: 1, textAlign: "left",
                }}>{group.name}</span>

                <Ic name="chevronRight" size={15} color={mutedTx} />
              </button>
            );
          })}
        </div>

        {/* Admin button */}
        <div style={{ textAlign: "center" }}>
          <button onClick={() => setAdminModal(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 20px", borderRadius: 50,
            background: "transparent",
            border: `1px solid ${border}`,
            cursor: "pointer", fontFamily: "inherit",
            fontSize: 12, fontWeight: 600,
            color: mutedTx,
            transition: "all 0.18s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)"; e.currentTarget.style.background = "rgba(245,158,11,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = mutedTx; e.currentTarget.style.borderColor = border; e.currentTarget.style.background = "transparent"; }}
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
