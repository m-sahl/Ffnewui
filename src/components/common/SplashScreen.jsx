import { useState, useEffect } from "react";

const SplashScreen = ({ onDone }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => onDone(), 1950);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#fdfaf9",
      backgroundImage: `
        linear-gradient(to right, rgba(241, 77, 77, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(241, 77, 77, 0.04) 1px, transparent 1px),
        radial-gradient(circle at 50% 0%, rgba(241, 77, 77, 0.06), transparent 70%)
      `,
      backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      zIndex: 999, transition: "opacity 0.5s ease", opacity: phase === 2 ? 0 : 1,
    }}>
      <style>{`
        @keyframes loaderSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      <div style={{
        textAlign: "center", position: "relative", zIndex: 1,
        animation: phase >= 1 ? "fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) both" : "none",
        opacity: phase >= 1 ? 1 : 0,
      }}>
        {/* Stationary clean Logo mark */}
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: "0 auto 22px",
          background: "linear-gradient(145deg, #f14d4d, #dc2626)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 10px 28px rgba(241, 77, 77, 0.28)",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900,
          fontSize: 34, color: "#ffffff", letterSpacing: -1,
        }}>
          FF
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 34,
          color: "#0f172a", letterSpacing: -1.2, lineHeight: 1, marginBottom: 8,
        }}>FestFlow</div>

        <div style={{ color: "#94a3b8", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>
          Arts & Cultural Fest
        </div>

        {/* Smooth sliding track loader */}
        <div style={{
          width: 120, height: 3,
          background: "rgba(241, 77, 77, 0.1)",
          borderRadius: 4, margin: "26px auto 0",
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            height: "100%", width: "45%",
            background: "linear-gradient(90deg, transparent, #f14d4d, transparent)",
            borderRadius: 4,
            animation: "loaderSlide 1.1s ease-in-out infinite",
          }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
