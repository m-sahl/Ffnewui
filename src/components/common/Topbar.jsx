import { useState } from "react";
import Ic from "./Ic";
import { ACCENT } from "../../styles/DesignTokens";
import { useApp } from "../../context/AppContext";

const SettingsPanel = ({ dark, setDark, onClose, context, onLogout, isAdmin, verify, pinLength }) => {
  const handleSignOut = () => {
    const doLogout = onLogout;
    if (typeof doLogout === "function") doLogout();
    onClose();
  };
  const { users, setUsers, activityLogs, clearLogs } = useApp();
  const [confirming, setConfirming]         = useState(false);
  const [changingPwd, setChangingPwd]       = useState(false);
  const [newPwd, setNewPwd]                 = useState("");
  const [newPwdConfirm, setNewPwdConfirm]   = useState("");
  const [pwdError, setPwdError]             = useState("");
  const [pwdSuccess, setPwdSuccess]         = useState(false);
  const [showLog, setShowLog]               = useState(false);
  const [clearLogConfirm, setClearLogConfirm] = useState(false);

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
    <div 
      className="modal-bg" 
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div 
        className="modal" 
        style={{ 
          maxWidth: 390,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          background: dark ? "#0e0f1f" : "#ffffff",
          border: `1px solid ${dark ? "rgba(241,77,77,0.2)" : "rgba(241,77,77,0.15)"}`,
          borderRadius: 22,
          padding: 24,
          boxShadow: "0 28px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(241,77,77,0.08)",
          animation: "modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div className="ff-display fw-800" style={{ fontSize: 18 }}>Settings</div>
            {context && <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>{context}</div>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Ic name="x" size={14} /></button>
        </div>

        {/* Appearance (Admin only) */}
        {isAdmin && (
          <div style={{ marginBottom: 18 }}>
            <div className="label" style={{ paddingLeft: 4 }}>Appearance</div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", background: rowBg }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(241,77,77,0.1)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic name={dark ? "sun" : "moon"} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Theme</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{dark ? "Dark mode" : "Light mode"}</div>
                </div>
                <button onClick={() => setDark(d => !d)} style={{
                  width: 50, height: 28, borderRadius: 14, position: "relative", cursor: "pointer",
                  border: "none", background: dark ? "linear-gradient(135deg,#f14d4d,#dc2626)" : "rgba(0,0,0,0.13)",
                  transition: "background 0.3s", flexShrink: 0,
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "white", position: "absolute", top: 3, transition: "left 0.3s cubic-bezier(0.34,1.56,0.64,1)", left: dark ? 25 : 3, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }} />
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderTop: `1px solid ${border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic name="list" size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Activity Log</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{activityLogs.length} events recorded</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowLog(true)}>View</button>
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
          <div className="modal-bg" onClick={() => setConfirming(false)}>
            <div className="modal" style={{ maxWidth: 320, textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(225,29,72,0.1)", color: "#f43f5e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Ic name="logout" size={20} />
              </div>
              <div className="ff-display fw-800" style={{ fontSize: 17, marginBottom: 6, color: dark ? "#f8fafc" : "#0f172a" }}>Sign Out?</div>
              <div style={{ fontSize: 13, color: dark ? "#94a3b8" : "#64748b", marginBottom: 20 }}>Are you sure you want to log out of your account?</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 12, height: 42 }} onClick={() => setConfirming(false)}>Cancel</button>
                <button className="btn" style={{ flex: 1, borderRadius: 12, height: 42, background: "#f43f5e", color: "white", fontWeight: 800, border: "none" }}
                  onClick={handleSignOut}>Sign Out</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Activity Log sheet */}
      {showLog && (
        <div className="modal-bg" onClick={() => setShowLog(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div className="ff-display fw-800" style={{ fontSize: 17 }}>Activity Log</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{activityLogs.length} events</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {activityLogs.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setClearLogConfirm(true)} style={{ color: "#e11d48" }}>Clear</button>
                )}
                <button className="btn btn-ghost btn-icon" onClick={() => setShowLog(false)}><Ic name="x" size={14} /></button>
              </div>
            </div>
            {activityLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>No activity yet</div>
              </div>
            ) : (
              <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${border}`, maxHeight: 400, overflowY: "auto" }}>
                {activityLogs.map((l, i) => (
                  <div key={l.id} style={{ padding: "12px 16px", borderTop: i > 0 ? `1px solid ${border}` : "none", background: i % 2 === 0 ? rowBg : "transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.action}</div>
                      <div style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(l.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{l.details} · {l.userName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear log confirm */}
      {clearLogConfirm && (
        <div className="modal-bg" onClick={() => setClearLogConfirm(false)}>
          <div className="modal" style={{ maxWidth: 320, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div className="ff-display fw-800" style={{ fontSize: 16, marginBottom: 8 }}>Clear Activity Log?</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>This will permanently remove all {activityLogs.length} log entries.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setClearLogConfirm(false)}>Cancel</button>
              <button className="btn" style={{ flex: 1, height: 44, background: "#e11d48", color: "white", fontWeight: 700 }}
                onClick={() => { clearLogs(); setClearLogConfirm(false); setShowLog(false); }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Topbar = ({ left, right, dark, setDark, context, onLogout, onBack, isAdmin, verify, pinLength, _settingsOnly, _forceOpen, onSettingsClose }) => {
  const [settings, setSettings] = useState(_forceOpen || false);
  const handleClose = () => { setSettings(false); onSettingsClose?.(); };

  // Settings-only mode — just render the panel, no topbar chrome
  if (_settingsOnly) {
    return settings ? (
      <SettingsPanel dark={dark} setDark={setDark} onClose={handleClose}
        context={context} onLogout={onLogout || onBack} onBack={onBack || onLogout} isAdmin={isAdmin} verify={verify} pinLength={pinLength} />
    ) : null;
  }

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
        <SettingsPanel dark={dark} setDark={setDark} onClose={handleClose}
          context={context} onLogout={onLogout || onBack} onBack={onBack || onLogout} isAdmin={isAdmin} verify={verify} pinLength={pinLength} />
      )}
    </>
  );
};
