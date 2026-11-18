import Modal from "./Modal";
import Ic from "./Ic";

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export default function SessionTimeoutModal({
  remainingSeconds,
  onExtend,
  onLogout,
  dark,
}) {
  return (
    <Modal
      title="Session Expiring Soon"
      subtitle="Security Inactivity Notice"
      icon="clock"
      iconColor="#f59e0b"
      onClose={onExtend}
    >
      <div style={{ padding: "4px 0" }}>
        <p style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: dark ? "#94a3b8" : "#64748b",
          margin: "0 0 20px 0"
        }}>
          You have been inactive for almost 30 minutes. To protect your account security, you will be automatically signed out in{" "}
          <span style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(239, 68, 68, 0.12)",
            color: "#ef4444",
            fontWeight: 800,
            fontFamily: "monospace",
            fontSize: 15,
          }}>
            {formatTime(remainingSeconds)}
          </span>.
        </p>

        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap"
        }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ borderRadius: 10, height: 40, padding: "0 16px" }}
            onClick={onLogout}
          >
            Sign Out Now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ borderRadius: 10, height: 40, padding: "0 20px", fontWeight: 700 }}
            onClick={onExtend}
            autoFocus
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </Modal>
  );
}
