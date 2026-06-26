import Ic from "./Ic";

const Modal = ({ title, subtitle, icon, iconColor, onClose, children, wide }) => (
  <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal${wide ? " modal-lg" : ""}`}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `${iconColor || "#f59e0b"}18`,
              color: iconColor || "#f59e0b",
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

export default Modal;
