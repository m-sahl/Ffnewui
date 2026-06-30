import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { AppProvider, useApp } from "./context/AppContext";
import GlobalStyles from "./styles/GlobalStyles";
import SplashScreen from "./components/common/SplashScreen";
import LandingPage from "./components/landing/LandingPage";
import LeaderPortal from "./components/leader/LeaderPortal";
import AdminPortal from "./components/admin/AdminPortal";
import { ToastProvider } from "./components/common/Toast";

const safeGet    = (key) => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } };
const safeSet    = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const safeRemove = (key) => { try { localStorage.removeItem(key); } catch {} };

const AppContent = () => {
  const { groups, users } = useApp();
  const ensureAdmin = useMutation(api.users.ensureAdmin);

  const [user, setUser]       = useState(() => safeGet("ff_user"));
  const [loading, setLoading] = useState(() => !safeGet("ff_user"));
  const [dark, setDark]       = useState(() => localStorage.getItem("ff_dark") !== "false");
  const [adminEnsured, setAdminEnsured] = useState(false);

  // Ensure admin user exists on every app load
  useEffect(() => {
    if (!adminEnsured) {
      ensureAdmin().then(() => setAdminEnsured(true)).catch(() => setAdminEnsured(true));
    }
  }, []);

  // Re-validate stored user against Convex data
  useEffect(() => {
    if (!user || !users.length) return;
    const valid = users.find(u => u._id === user._id && u.pin === user.pin);
    if (!valid) { setUser(null); safeRemove("ff_user"); }
  }, [users]);

  useEffect(() => { try { localStorage.setItem("ff_dark", dark); } catch {} }, [dark]);
  useEffect(() => { user ? safeSet("ff_user", user) : safeRemove("ff_user"); }, [user]);

  const handleSplashDone = useCallback(() => setLoading(false), []);
  const handleLogin      = useCallback((u) => setUser(u), []);
  const handleLogout     = useCallback(() => { setUser(null); safeRemove("ff_user"); }, []);

  if (loading) return <SplashScreen onDone={handleSplashDone} />;

  return (
    <ToastProvider>
      <GlobalStyles dark={dark} />
      {!user ? (
        <LandingPage dark={dark} onLeaderLogin={handleLogin} onAdminClick={handleLogin} />
      ) : user.role === "group" ? (
        <LeaderPortal
          user={user}
          group={groups.find(g => g.id === user._id) || { id: user._id, name: user.name, color: "#f59e0b" }}
          dark={dark} setDark={setDark} onBack={handleLogout}
        />
      ) : (
        <AdminPortal user={user} dark={dark} setDark={setDark} onBack={handleLogout} />
      )}
    </ToastProvider>
  );
};

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
