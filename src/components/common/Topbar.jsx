import { useState } from "react";
import Ic from "./Ic";
import { ACCENT } from "../../styles/DesignTokens";
import { NumPinModal, TextPinModal } from "./AuthModals";
import { useApp } from "../../context/AppContext";

const SettingsPanel = ({ dark, setDark, onClose, context, onLogout, isAdmin, verify, pinLength }) => {
  const { users, setUsers } = useApp();
  const [confirming, setConfirming]         = useState(false);
  const [changingPwd, setChangingPwd]       = useState(false);
  const [newPwd, setNewPwd]                 = useState("");
  const [newPwdConfirm, setNewPwdConfirm]   = useState("");
  const [pwdError, setPwdError]             = useState("");
  const [pwdSuccess, setPwdSuccess]         = useState(false);

  const handleChangePassword = () => {
    if (!newPwd.trim()) { setPwdError("Password cannot be empty."); return; }
    if (newPwd !== newPwdConfirm) { setPwdError("Passwords do not match."); return; }
    setUsers(prev => prev.map(u => u.role === "admin" ? { ...u, pin: newPwd.trim() } : u));
    setPwdSuccess(true); setPwdError(""); setNewPwd(""); setNewPwdConfirm("");
    setTimeout(() => { setPwdSuccess(false); setChangingPwd(false); }, 1500);
  };

  const border = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const rowBg  = dark ? "rgba(255,255,255,0.022)" : "rgba(255,255,255,0.8)";

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

        {/* Appearance */}
        <div style={{ marginBottom: 18 }}>
          <div className="label" style={{ paddingLeft: 4 }}>Appearance</div>
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", background: rowBg }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name={dark ? "sun" : "moon"} size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Theme</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{dark ? "Dark mode" : "Light mode"}</div>
              </div>
              <button onClick={() => setDark(d => !d)} style={{
                width: 50, height: 28, borderRadius: 14, position: "relative", cursor: "pointer",
                border: "none", background: dark ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(0,0,0,0.13)",
                transition: "background 0.3s", flexShrink: 0,
              }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "white", position: "absolute", top: 3, transition: "left 0.3s cubic-bezier(0.34,1.56,0.64,1)", left: dark ? 25 : 3, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Admin password change */}
        {isAdmin && (
          <div style={{ marginBottom: 18 }}>
            <div className="label" style={{ paddingLeft: 4 }}>Security</div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
              <div style={{ padding: "13px 16px", background: rowBg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: changingPwd ? 14 : 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ic name="lock" size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Admin Password</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>Change your login password</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setChangingPwd(p => !p); setPwdError(""); setPwdSuccess(false); }}>
                    {changingPwd ? "Cancel" : "Change"}
                  </button>
                </div>
                {changingPwd && (
                  <div className="anim-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input type="password" className="input" placeholder="New password" value={newPwd}
                      onChange={e => { setNewPwd(e.target.value); setPwdError(""); }}
                      autoCapitalize="none" autoCorrect="off" spellCheck="false" autoFocus />
                    <input type="password" className="input" placeholder="Confirm new password" value={newPwdConfirm}
                      onChange={e => { setNewPwdConfirm(e.target.value); setPwdError(""); }}
                      autoCapitalize="none" autoCorrect="off" spellCheck="false" />
                    {pwdError && <div style={{ fontSize: 12, color: "#e11d48" }}>{pwdError}</div>}
                    {pwdSuccess && <div style={{ fontSize: 12, color: "#10b981" }}>✓ Password updated successfully</div>}
                    <button className="btn btn-primary" style={{ height: 42 }} onClick={handleChangePassword}>Update Password</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div style={{ marginBottom: 18 }}>
          <div className="label" style={{ paddingLeft: 4 }}>Session</div>
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", background: rowBg }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(225,29,72,0.1)", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name="logout" size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Sign Out</div>
                <div className="text-muted" style={{ fontSize: 12 }}>End your current session</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>Sign Out</button>
            </div>
          </div>
        </div>

        {/* About */}
        <div style={{ marginBottom: 4 }}>
          <div className="label" style={{ paddingLeft: 4 }}>About</div>
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
            {[
              { label: "FestFlow Manager", sub: "Version 1.0 · Arts & Cultural" },
              { label: "Built with",       sub: "React + Vite · Hosted on Vercel" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", background: rowBg, borderTop: i > 0 ? `1px solid ${border}` : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic name="info" size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{row.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
