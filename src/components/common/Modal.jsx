import { useEffect } from "react";
import { createPortal } from "react-dom";
import Ic from "./Ic";

const Modal = ({ title, subtitle, icon, iconColor, onClose, children, wide }) => {
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const content = (
    <div
      className="modal-bg"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div className={`modal${wide ? " modal-lg" : ""}`} style={{ margin: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {icon && (
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: `${iconColor || "#f14d4d"}18`,
                color: iconColor || "#f14d4d",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Ic name={icon} size={18} />
              </div>
            )}
            <div>
              <div className="ff-display fw-800" style={{ fontSize: 17, lineHeight: 1.2 }}>{title}</div>
              {subtitle && <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>{subtitle}</div>}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ flexShrink: 0, marginTop: -2 }}>
            <Ic name="x" size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};

export default Modal;
