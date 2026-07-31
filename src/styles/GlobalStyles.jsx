import { ACCENT } from "./DesignTokens";

const GlobalStyles = ({ dark }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      font-family: 'Inter', sans-serif;
      background-color: ${dark ? "#080912" : "#fdfaf9"};
      background-image: 
        linear-gradient(to right, ${dark ? "rgba(241, 77, 77, 0.05)" : "rgba(241, 77, 77, 0.04)"} 1px, transparent 1px),
        linear-gradient(to bottom, ${dark ? "rgba(241, 77, 77, 0.05)" : "rgba(241, 77, 77, 0.04)"} 1px, transparent 1px),
        radial-gradient(circle at 50% 0%, ${dark ? "rgba(241, 77, 77, 0.08)" : "rgba(241, 77, 77, 0.05)"}, transparent 70%);
      background-size: 24px 24px, 24px 24px, 100% 100%;
      background-attachment: fixed;
      color: ${dark ? "#e8e8f5" : "#0f172a"};
      min-height: 100vh;
      overflow-x: hidden;
      transition: background 0.4s, color 0.4s;
    }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(241, 77, 77, 0.25); border-radius: 4px; }

    /* ── Keyframes ────────────────────────────────────── */
    @keyframes splashFadeIn { from { opacity:0; transform:scale(0.85) translateY(24px); } to { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes fadeUp        { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn        { from { opacity:0; } to { opacity:1; } }
    @keyframes slideDown     { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideRight    { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
    @keyframes scaleIn       { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
    @keyframes modalIn       { from { opacity:0; transform:scale(0.90) translateY(24px); } to { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes floatY        { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
    @keyframes glowPulse     { 0%,100%{box-shadow:0 0 24px rgba(241, 77, 77,0.3);} 50%{box-shadow:0 0 48px rgba(241, 77, 77,0.65);} }
    @keyframes orbitSpin     { from{transform:rotate(0deg) translateX(64px) rotate(0deg);} to{transform:rotate(360deg) translateX(64px) rotate(-360deg);} }
    @keyframes dotPulse      { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.3;transform:scale(0.6);} }
    @keyframes progressFill  { from{width:0;} to{width:100%;} }
    @keyframes shake         { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
    @keyframes coralShimmer  { 0%{background-position:0% 50%;} 100%{background-position:200% 50%;} }
    @keyframes ripple        { 0%{transform:scale(0);opacity:0.6;} 100%{transform:scale(4);opacity:0;} }
    @keyframes toastIn       { from{opacity:0;transform:translateY(20px) scale(0.95);} to{opacity:1;transform:translateY(0) scale(1);} }
    @keyframes toastOut      { from{opacity:1;transform:translateY(0);} to{opacity:0;transform:translateY(10px);} }

    /* ── Animation helpers ───────────────────────────── */
    .anim-fadeUp    { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
    .anim-fadeIn    { animation: fadeIn 0.35s ease both; }
    .anim-scaleIn   { animation: scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
    .anim-slideDown { animation: slideDown 0.3s cubic-bezier(0.22,1,0.36,1) both; }
    .anim-slideRight{ animation: slideRight 0.3s cubic-bezier(0.22,1,0.36,1) both; }
    .stagger-1{animation-delay:.04s} .stagger-2{animation-delay:.08s} .stagger-3{animation-delay:.12s}
    .stagger-4{animation-delay:.16s} .stagger-5{animation-delay:.20s} .stagger-6{animation-delay:.24s}
    .stagger-7{animation-delay:.28s} .stagger-8{animation-delay:.32s}

    /* ── Card ─────────────────────────────────────────── */
    .card {
      background: ${dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.9)"};
      border: 1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"};
      border-radius: 18px;
      backdrop-filter: blur(16px);
      transition: transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease, border-color 0.22s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 36px rgba(241, 77, 77, 0.12);
      border-color: rgba(241, 77, 77, 0.22);
    }
    .card-flat { background: ${dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.9)"}; border: 1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}; border-radius: 18px; }

    /* ── Buttons ──────────────────────────────────────── */
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 6px; padding: 9px 16px; border-radius: 10px;
      font-size: 13.5px; font-weight: 600; cursor: pointer; border: none;
      font-family: 'Inter', sans-serif;
      transition: all 0.18s cubic-bezier(0.22,1,0.36,1);
      position: relative; overflow: hidden; white-space: nowrap; flex-shrink: 0;
      letter-spacing: 0.1px;
    }
    .btn::after {
      content: ''; position: absolute; inset: 0;
      background: rgba(255,255,255,0.1); opacity: 0; transition: opacity 0.15s;
    }
    .btn:hover::after { opacity: 1; }
    .btn:active { transform: scale(0.96); }

    .btn-primary {
      background: linear-gradient(135deg, #f14d4d, #dc2626);
      color: #ffffff; font-weight: 700;
      box-shadow: 0 4px 18px rgba(241, 77, 77, 0.35);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(241, 77, 77, 0.48); }

    .btn-ghost {
      background: ${dark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.045)"};
      color: ${dark ? "#9ca3af" : "#64748b"};
    }
    .btn-ghost:hover { background: rgba(241, 77, 77, 0.1); color: #f14d4d; }

    .btn-danger { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    .btn-danger:hover { background: rgba(239,68,68,0.18); transform: translateY(-1px); }

    .btn-sm   { padding: 5px 10px; font-size: 12px; border-radius: 8px; }
    .btn-icon { padding: 7px; border-radius: 9px; width: 32px; height: 32px; }

    /* ── Inputs ───────────────────────────────────────── */
    .input {
      width: 100%; padding: 11px 14px; border-radius: 11px; font-size: 14px;
      background: ${dark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)"};
      border: 1.5px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"};
      color: ${dark ? "#e8e8f5" : "#0f172a"};
      font-family: 'Inter', sans-serif; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .input:focus { border-color: #f14d4d; box-shadow: 0 0 0 3px rgba(241, 77, 77, 0.16); background: ${dark ? "rgba(241, 77, 77, 0.04)" : "rgba(241, 77, 77, 0.03)"}; }
    .input::placeholder { color: ${dark ? "#4b5563" : "#94a3b8"}; }
    .input-icon-wrap { position: relative; }
    .input-icon-wrap .input { padding-left: 40px; }
    .input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: ${dark ? "#4b5563" : "#94a3b8"}; pointer-events: none; }

    .label { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: ${dark ? "#6b7280" : "#64748b"}; margin-bottom: 7px; }

    .select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center;
      padding-right: 36px; cursor: pointer;
    }

    /* ── Tables ───────────────────────────────────────── */
    .tbl-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 340px; }
    .tbl thead th {
      padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
      color: ${dark ? "#4b5563" : "#64748b"};
      background: ${dark ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.022)"};
      white-space: nowrap; border-bottom: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"};
    }
    .tbl tbody td { padding: 12px 16px; border-top: 1px solid ${dark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.045)"}; }
    .tbl tbody tr { transition: background 0.12s; }
    .tbl tbody tr:hover { background: ${dark ? "rgba(241, 77, 77, 0.055)" : "rgba(241, 77, 77, 0.04)"}; }

    /* ── Badges & chips ───────────────────────────────── */
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .badge-senior  { background: rgba(245,158,11,0.14); color: #f59e0b; }
    .badge-junior  { background: rgba(59,130,246,0.14); color: #3b82f6; }
    .badge-sj      { background: rgba(241,77,77,0.14);  color: #f14d4d; }
    .badge-single  { background: rgba(29,209,131,0.14); color: #1dd183; }
    .badge-group   { background: rgba(139,92,246,0.14); color: #8b5cf6; }

    .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }

    /* ── Modals ───────────────────────────────────────── */
    .modal-bg {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      backdrop-filter: blur(8px); z-index: 200;
      display: flex; align-items: center; justify-content: center;
      padding: 14px; animation: fadeIn 0.2s ease;
    }
    .modal {
      background: ${dark ? "#0e0f1f" : "#ffffff"};
      border: 1px solid ${dark ? "rgba(241,77,77,0.2)" : "rgba(241,77,77,0.15)"};
      border-radius: 22px; padding: 24px; width: 100%; max-width: 480px;
      animation: modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow: 0 28px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(241,77,77,0.08);
      max-height: 92vh; overflow-y: auto;
    }
    .modal-lg { max-width: 540px; }

    /* ── PIN dots ─────────────────────────────────────── */
    .pin-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.13)"}; transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
    .pin-dot.filled { background: #f14d4d; border-color: #f14d4d; box-shadow: 0 0 12px rgba(241, 77, 77, 0.55); transform: scale(1.12); }
    .pin-dot.error  { background: #ff0f0f; border-color: #ff0f0f; animation: shake 0.4s ease; }

    /* ── Topbar ───────────────────────────────────────── */
    .topbar {
      height: 58px; display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; position: sticky; top: 0; z-index: 100;
      background: ${dark ? "rgba(8,9,18,0.92)" : "rgba(253,250,249,0.92)"};
      backdrop-filter: blur(24px) saturate(180%);
      border-bottom: 1px solid ${dark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.055)"};
      gap: 8px;
    }
    .topbar-left  { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; overflow: hidden; }
    .topbar-right { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .topbar-title { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 14px; font-weight: 800; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topbar-sub   { font-size: 10.5px; color: ${dark ? "#6b7280" : "#94a3b8"}; white-space: nowrap; }

    /* ── Sidebar (Admin) ──────────────────────────────── */
    .sidebar {
      width: 220px; flex-shrink: 0; position: sticky; top: 58px;
      height: calc(100vh - 58px); overflow-y: auto;
      border-right: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"};
      padding: 16px 10px; background: ${dark ? "rgba(8,9,18,0.7)" : "rgba(253,250,249,0.8)"};
      display: flex; flex-direction: column; gap: 2px;
      scrollbar-width: none;
    }
    .sidebar::-webkit-scrollbar { display: none; }
    .sidebar-item {
      display: flex; align-items: center; gap: 11px; padding: 10px 12px;
      border-radius: 11px; cursor: pointer; font-size: 13.5px; font-weight: 600;
      color: ${dark ? "#6b7280" : "#64748b"};
      transition: all 0.18s ease; border: 1px solid transparent; user-select: none;
    }
    .sidebar-item:hover { background: ${dark ? "rgba(241,77,77,0.07)" : "rgba(241,77,77,0.06)"}; color: #f14d4d; }
    .sidebar-item.active {
      background: rgba(241,77,77,0.12); color: #f14d4d;
      border-color: rgba(241,77,77,0.2);
      box-shadow: inset 0 0 0 1px rgba(241,77,77,0.08);
    }
    .sidebar-section { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: ${dark ? "#374151" : "#cbd5e1"}; padding: 14px 12px 6px; }

    /* ── Leader bottom tab bar ────────────────────────── */
    .tabbar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 90;
      display: flex; align-items: center;
      background: ${dark ? "rgba(8,9,18,0.96)" : "rgba(253,250,249,0.96)"};
      backdrop-filter: blur(20px);
      border-top: 1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
      padding: 6px 8px 10px; gap: 4px;
    }
    .tab-item {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; padding: 6px; border-radius: 10px; cursor: pointer;
      font-size: 11px; font-weight: 600; color: ${dark ? "#4b5563" : "#64748b"};
      transition: all 0.18s ease; border: none; background: none; font-family: 'Inter', sans-serif;
    }
    .tab-item.active { color: #f14d4d; background: rgba(241,77,77,0.1); }
    .tab-item:hover { color: #f14d4d; }

    /* ── Live dot ─────────────────────────────────────── */
    .live { display: inline-flex; align-items: center; gap: 5px; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #1dd183; position: relative; flex-shrink: 0; }
    .live-dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 2px solid #1dd183; animation: dotPulse 1.5s infinite; }

    /* ── Gradient text ────────────────────────────────── */
    .grad-text {
      background: linear-gradient(135deg, #f14d4d 0%, #ff6b6b 40%, #f14d4d 60%, #dc2626 100%);
      background-size: 200% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: coralShimmer 3s linear infinite;
    }

    /* ── Toast ────────────────────────────────────────── */
    .toast-container { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
    .toast {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 11px 18px; border-radius: 50px;
      font-size: 13.5px; font-weight: 600; white-space: nowrap;
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    .toast-success { background: rgba(29,209,131,0.92); color: white; }
    .toast-error   { background: rgba(255,15,15,0.92); color: white; }
    .toast-info    { background: rgba(241,77,77,0.92); color: white; }
    .toast-exit    { animation: toastOut 0.25s ease both; }

    /* ── Stats card ───────────────────────────────────── */
    .stat-card {
      background: ${dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)"};
      border: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"};
      border-radius: 16px; padding: 18px 20px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(241,77,77,0.1); }

    /* ── Misc ─────────────────────────────────────────── */
    .divider { height: 1px; background: ${dark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.055)"}; margin: 12px 0; }
    .text-muted { color: ${dark ? "#6b7280" : "#64748b"}; }
    .fw-800 { font-weight: 800; }
    .ff-display { font-family: 'Plus Jakarta Sans', sans-serif; }
    .page { padding: 20px 16px 100px; max-width: 900px; margin: 0 auto; }
    .page-admin { padding: 20px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .group-tabs { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
    .group-tabs::-webkit-scrollbar { display: none; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .section-title { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 800; font-size: 18px; }
    .section-sub { font-size: 12px; color: ${dark ? "#6b7280" : "#64748b"}; margin-top: 2px; font-weight: 500; }

    /* ── Empty states ─────────────────────────────────── */
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
    .empty-title { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 800; font-size: 16px; margin-bottom: 6px; opacity: 0.7; }
    .empty-desc { font-size: 13px; color: ${dark ? "#6b7280" : "#64748b"}; }

    /* ── Admin layout ─────────────────────────────────── */
    .admin-layout { display: flex; min-height: calc(100vh - 58px); }
    .admin-main { flex: 1; min-width: 0; padding: 24px; overflow-y: auto; }

    @media(min-width: 600px) {
      .page { padding: 24px 24px 100px; }
    }
    @media(max-width: 680px) {
      .sidebar { display: none; }
      .admin-layout { display: block; }
      .admin-main { padding: 16px; }
      .grid-2 { grid-template-columns: 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr; }
      .grid-4 { grid-template-columns: 1fr 1fr; }
      .form-row { grid-template-columns: 1fr; }
      .modal { padding: 18px; border-radius: 18px; }
    }
    @media(min-width: 681px) {
      .mobile-nav { display: none !important; }
    }
  `}</style>
);

export default GlobalStyles;
