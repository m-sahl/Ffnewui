import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { AppProvider, useApp } from "./context/AppContext";
import GlobalStyles from "./styles/GlobalStyles";
import SplashScreen from "./components/common/SplashScreen";
import LandingPage from "./components/landing/LandingPage";
const LeaderPortal = lazy(() => import("./components/leader/LeaderPortal"));
const AdminPortal  = lazy(() => import("./components/admin/AdminPortal"));
import { ToastProvider } from "./components/common/Toast";

const SESSION_KEY = "ff_session"; // { token, user } — user has NO pin; token is validated server-side

const safeGet    = (key) => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } };
const safeSet    = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const safeRemove = (key) => { try { localStorage.removeItem(key); } catch {} };

// Old versions cached PINs and private data in localStorage — wipe them
const LEGACY_KEYS = ["ff_user", "ff_users", "ff_programs", "ff_students", "ff_registrations", "ff_logs", "ff_locks", "ff_messages"];

// Lightweight placeholder while a portal chunk downloads
const PortalFallback = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(241,77,77,0.2)", borderTopColor: "#f14d4d", animation: "spin 0.8s linear infinite" }} />
  </div>
);

// Picks landing / leader / admin based on the validated session
const Routes = ({ session, dark, setDark, onLogin, onLogout }) => {
  const { groups } = useApp();
  const me = useQuery(api.auth.me, session?.token ? { token: session.token } : "skip");
  useEffect(() => { if (session && me === null) onLogout(); }, [me, session]);

  const user = session?.user || null;
  if (!user) return <LandingPage dark={dark} onLeaderLogin={onLogin} onAdminClick={onLogin} />;
  if (user.role === "group") {
    return (
      <Suspense fallback={<PortalFallback />}><LeaderPortal
        user={user}
        group={groups.find(g => g.id === user.groupId) || { id: user.groupId, name: user.name, color: "#f14d4d" }}
        dark={dark} setDark={setDark} onBack={onLogout}
      /></Suspense>
    );
  }
  return <Suspense fallback={<PortalFallback />}><AdminPortal user={user} dark={dark} setDark={setDark} onBack={onLogout} /></Suspense>;
};

const App = () => {
  const [session, setSession] = useState(() => safeGet(SESSION_KEY));
  const [loading, setLoading] = useState(() => !safeGet(SESSION_KEY));
  const [dark, setDark]       = useState(false);
  const serverLogout = useMutation(api.auth.logout);

  useEffect(() => { LEGACY_KEYS.forEach(safeRemove); }, []);
  useEffect(() => { try { localStorage.setItem("ff_dark", dark); } catch {} }, [dark]);
  useEffect(() => { session ? safeSet(SESSION_KEY, session) : safeRemove(SESSION_KEY); }, [session]);

  const handleSplashDone = useCallback(() => setLoading(false), []);
  // res = { ok, token, user } returned by auth.login
  const handleLogin  = useCallback((res) => setSession({ token: res.token, user: res.user }), []);
  const handleLogout = useCallback(() => {
    if (session?.token) serverLogout({ token: session.token }).catch(() => {});
    setSession(null);
  }, [session]);

  return (
    <ToastProvider>
      <GlobalStyles dark={dark} />
      {loading && <SplashScreen onDone={handleSplashDone} />}
      {/* key = token: every login/logout fully resets in-memory data (no leakage between users) */}
      <AppProvider key={session?.token || "anon"} token={session?.token}>
        <Routes session={session} dark={dark} setDark={setDark} onLogin={handleLogin} onLogout={handleLogout} />
      </AppProvider>
    </ToastProvider>
  );
};

export default App;
