import { useState, useEffect } from "react";

const SplashScreen = ({ onDone }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg, #06070f 0%, #0d0e1e 50%, #080c18 100%)",
      zIndex: 999, transition: "opacity 0.7s ease", opacity: phase === 2 ? 0 : 1,
    }}>
      {/* Ambient BG orbs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(241,77,77,0.14) 0%, transparent 70%)", top: "-10%", left: "-10%", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(225,29,72,0.08) 0%, transparent 70%)", bottom: "5%", right: "-5%", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", top: "55%", left: "20%", filter: "blur(40px)" }} />
      </div>

      <div style={{
        textAlign: "center", position: "relative", zIndex: 1,
        animation: phase >= 1 ? "splashFadeIn 0.9s cubic-bezier(0.22,1,0.36,1) both" : "none",
        opacity: phase >= 1 ? 1 : 0,
      }}>
        {/* Logo mark */}
        <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 28px" }}>
          <div style={{
            width: 110, height: 110, borderRadius: 32,
            background: "linear-gradient(145deg, #f14d4d, #dc2626, #991b1b)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "glowPulse 2.5s infinite",
          }}>
            <span style={{ fontSize: 46, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, color: "#ffffff", letterSpacing: -2 }}>FF</span>
          </div>
          {/* Orbit */}
          <div style={{ position: "absolute", inset: -12, animation: "orbitSpin 3.5s linear infinite" }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#f14d4d", boxShadow: "0 0 14px #f14d4d" }} />
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 44,
          background: "linear-gradient(135deg, #ff6b6b 0%, #f14d4d 40%, #fecaca 70%, #f14d4d 100%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          animation: "coralShimmer 3s linear infinite",
          letterSpacing: -2, lineHeight: 1,
        }}>FestFlow</div>

        <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, letterSpacing: 5, textTransform: "uppercase", marginTop: 10, fontWeight: 600 }}>
          Arts & Cultural Fest
        </div>

        {/* Progress bar */}
        <div style={{ width: 130, height: 2, background: "rgba(241,77,77,0.15)", borderRadius: 2, margin: "32px auto 0", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg, #dc2626, #f14d4d, #ff6b6b)", borderRadius: 2, animation: "progressFill 2s ease both", animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
