import { useState, useEffect, useRef } from "react";
import Ic from "./Ic";

export const WhatsAppVoiceNote = ({ mediaUrl, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      document.querySelectorAll("audio").forEach(a => a.pause());
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const pct = duration > 0 ? (currentTime / duration) : 0;
  const waveformHeights = [30, 45, 65, 35, 80, 50, 90, 40, 70, 30, 60, 85, 45, 75, 50, 90, 60, 40, 70, 35];

  const fmtDur = (secs) => {
    if (!secs || isNaN(secs)) return "0:05";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200, padding: "4px 0" }}>
      <audio
        ref={audioRef}
        src={mediaUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        style={{ display: "none" }}
      />

      {/* Play / Pause Circular Button */}
      <button onClick={togglePlay} style={{
        width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
        background: isOwn ? "#ffffff" : "linear-gradient(135deg, #f14d4d 0%, #e11d48 100%)",
        color: isOwn ? "#e11d48" : "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "transform 0.1s ease"
      }}>
        <Ic name={isPlaying ? "pause" : "play"} size={16} />
      </button>

      {/* Interactive WhatsApp Waveform Scrubber */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 22, cursor: "pointer" }}
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            audioRef.current.currentTime = ratio * duration;
            setCurrentTime(ratio * duration);
          }}
        >
          {waveformHeights.map((h, idx) => {
            const barPct = idx / waveformHeights.length;
            const isPlayed = barPct <= pct;
            return (
              <span key={idx} style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: 2,
                background: isOwn
                  ? (isPlayed ? "#ffffff" : "rgba(255,255,255,0.4)")
                  : (isPlayed ? "#f14d4d" : "rgba(0,0,0,0.2)"),
                transition: "all 0.1s ease"
              }} />
            );
          })}
        </div>

        {/* Live Duration Counter & Mic Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, opacity: 0.85, fontWeight: 700 }}>
          <span>{isPlaying ? fmtDur(currentTime) : fmtDur(duration)}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <Ic name="mic" size={11} />
          </span>
        </div>
      </div>
    </div>
  );
};
