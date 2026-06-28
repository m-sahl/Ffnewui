import { useState, useEffect, useRef } from "react";
import Ic from "./Ic";

export const NumPinModal = ({ title, subtitle, onSuccess, onClose, dark, verify, pinLength = 3 }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    window.addEventListener("click", focus);
    return () => window.removeEventListener("click", focus);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setPin(val.slice(0, pinLength));
  };

  const attempt = (val) => {
    const res = verify(val);
    if (res) onSuccess(res);
    else {
      setShaking(true); setError(true);
      setTimeout(() => { setPin(""); setError(false); setShaking(false); inputRef.current?.focus(); }, 700);
    }
  };

  useEffect(() => {
    if (pin.length >= pinLength) {
      const t = setTimeout(() => attempt(pin), 150);
      return () => clearTimeout(t);
    }
  }, [pin, pinLength]);

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 330, textAlign: "center", position: "relative" }}>
        <input
          ref={inputRef} type="tel" inputMode="numeric" value={pin} onChange={handleChange}
          style={{ position: "absolute", opacity: 0, top: 0, left: 0, width: "100%", height: "100%", cursor: "default" }}
          autoFocus
        />
        <div style={{
          width: 60, height: 60, borderRadius: 18, margin: "0 auto 18px",
          background: "linear-gradient(145deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 28px rgba(245,158,11,0.4)",
        }}>
          <Ic name="lock" size={24} color="#0a0b12" />
        </div>
        <div className="ff-display fw-800" style={{ fontSize: 19, marginBottom: 6 }}>{title}</div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 4 }}>{subtitle}</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "32px 0", animation: shaking ? "shake 0.4s ease" : "none" }}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <div key={i} className={`pin-dot ${i < pin.length ? (error ? "error" : "filled") : ""}`} />
          ))}
        </div>

        <div className="text-muted" style={{ fontSize: 11, marginBottom: 16, opacity: 0.6 }}>
          Use your device keyboard to enter PIN
        </div>
        <button className="btn btn-ghost" style={{ width: "100%", height: 44 }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export const TextPinModal = ({ title, subtitle, onSuccess, onClose, dark, verify }) => {
  const [val, setVal] = useState("");
  const [error, setError] = useState(false);
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const attempt = () => {
    const res = verify(val);
    if (res) onSuccess(res);
    else {
      setError(true);
      setTimeout(() => { setError(false); setVal(""); inputRef.current?.focus(); }, 700);
    }
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 370, textAlign: "center" }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18, margin: "0 auto 18px",
          background: "linear-gradient(145deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 28px rgba(245,158,11,0.4)",
        }}>
          <Ic name="shield" size={24} color="#0a0b12" />
        </div>
        <div className="ff-display fw-800" style={{ fontSize: 19, marginBottom: 6 }}>{title}</div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 24 }}>{subtitle}</div>

        <div style={{ position: "relative", marginBottom: 14, textAlign: "left" }}>
          <input
            ref={inputRef} type={show ? "text" : "password"} className="input" value={val}
            onChange={e => { setVal(e.target.value); setError(false); }}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="Enter password" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck="false"
            style={{
              textAlign: "center", fontSize: 16, letterSpacing: show ? 1 : 5,
              borderColor: error ? "#e11d48" : undefined,
              boxShadow: error ? "0 0 0 3px rgba(225,29,72,0.18)" : undefined,
              animation: error ? "shake 0.4s ease" : "none",
              paddingRight: 46,
            }}
          />
          <button onClick={() => setShow(s => !s)} style={{
            position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: dark ? "#6b7280" : "#9ca3af", display: "flex", alignItems: "center",
          }}>
            <Ic name={show ? "eyeOff" : "eye"} size={16} />
          </button>
        </div>

        {error && <div style={{ color: "#e11d48", fontSize: 12, marginBottom: 12, animation: "fadeIn 0.2s ease" }}>Incorrect password. Try again.</div>}

        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", height: 46, marginBottom: 10 }} onClick={attempt}>
          <Ic name="check" size={15} /> Confirm
        </button>
        <button className="btn btn-ghost" style={{ width: "100%", height: 44 }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};
