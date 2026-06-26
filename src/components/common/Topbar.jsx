import { useState } from "react";
import Ic from "./Ic";
import { ACCENT } from "../../styles/DesignTokens";
import { NumPinModal, TextPinModal } from "./AuthModals";

const SettingsPanel = ({ dark, setDark, onClose, context, onLogout, isAdmin, verify, pinLength }) => {
  const [confirming, setConfirming] = useState(false);

  const sections = [
    {
      label: "Appearance",
      rows: [{
        icon: dark ? "sun" : "moon",
        label: "Theme",
        desc: dark ? "Dark mode active" : "Light mode active",
        action: (
          <button onClick={() => setDark(d => !d)} style={{
            width: 50, height: 28, borderRadius: 14, position: "relative", cursor: "pointer",
            border: "none", background: dark ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(0,0,0,0.13)",
            transition: "background 0.3s", flexShrink: 0,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: "white",
              position: "absolute", top: 3, transition: "left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              left: dark ? 25 : 3, boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }} />
          </button>
        ),
      }],
    },
    {
      label: "Security",
      rows: [{
        icon: "logout",
        label: "Sign Out",
        desc: "End your current session",
        action: (
          <button className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>Sign Out</button>
        ),
      }],
    },
    {
      label: "About",
      rows: [
        { icon: "info",    label: "FestFlow Manager", desc: "Version 1.0 · Arts & Cultural" },
        { icon: "palette", label: "Built with",       desc: "React + Vite · Hosted on Vercel" },
      ],
    },
  ];

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 390 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div className="ff-display fw-800" style={{ fontSize: 18 }}>Settings</div>
            {context && <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>{context}</div>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Ic name="x" size={14} /></button>
        </div>

        {sections.map(s => (
          <div key={s.label} style={{ marginBottom: 18 }}>
            <div className="label" style={{ paddingLeft: 4 }}>{s.label}</div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` }}>
              {s.rows.map((row, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 13, padding: "13px 16px",
                  borderTop: i > 0 ? `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` : "none",
                  background: dark ? "rgba(255,255,255,0.022)" : "rgba(255,255,255,0.8)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: row.label === "Sign Out" ? "rgba(225,29,72,0.1)" : "rgba(245,158,11,0.1)",
                    color: row.label === "Sign Out" ? "#e11d48" : ACCENT,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Ic name={row.icon} size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{row.desc}</div>
                  </div>
                  {row.action}
                </div>
              ))}
            </div>
          </div>
        ))}

        {confirming && (
          isAdmin ? (
            <TextPinModal title="Confirm Sign Out" subtitle="Enter your admin password" verify={verify || (() => true)} dark={dark} onSuccess={() => { onLogout(); onClose(); }} onClose={() => setConfirming(false)} />
          ) : (
            <NumPinModal title="Confirm Sign Out" subtitle="Enter your group PIN" verify={verify || (() => true)} dark={dark} pinLength={pinLength} onSuccess={() => { onLogout(); onClose(); }} onClose={() => setConfirming(false)} />
          )
        )}
      </div>
    </div>
  );
};

export const Topbar = ({ left, right, dark, setDark, context, onLogout, isAdmin, verify, pinLength }) => {
  const [settings, setSettings] = useState(false);
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">{left}</div>
        <div className="topbar-right">
          {right}
          <button className="btn btn-ghost btn-icon" onClick={() => setSettings(true)}>
            <Ic name="settings" size={16} />
          </button>
        </div>
      </div>
      {settings && (
        <SettingsPanel dark={dark} setDark={setDark} onClose={() => setSettings(false)}
          context={context} onLogout={onLogout} isAdmin={isAdmin} verify={verify} pinLength={pinLength} />
      )}
    </>
  );
};
