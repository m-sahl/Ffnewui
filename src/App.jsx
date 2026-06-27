import { useState, useEffect, useCallback } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import GlobalStyles from "./styles/GlobalStyles";
import SplashScreen from "./components/common/SplashScreen";
import LandingPage from "./components/landing/LandingPage";
import LeaderPortal from "./components/leader/LeaderPortal";
import AdminPortal from "./components/admin/AdminPortal";
import { ToastProvider } from "./components/common/Toast";

const AppContent = () => {
  const { groups, users } = useApp();

  // Restore user from localStorage
  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem("ff_user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  // Skip splash on refresh if already logged in
  const [loading, setLoading] = useState(!user);
  const [dark, setDark] = useState(() => localStorage.getItem("ff_dark") !== "false");

  // Re-validate restored user — if PIN changed or user deleted, kick them out
  useEffect(() => {
    if (!user || users.length === 0) return;
    const valid = users.find(u => u.id === user.id && u.pin === user.pin);
    if (!valid) { setUser(null); localStorage.removeItem("ff_user"); }
  }, [users]);

  useEffect(() => { localStorage.setItem("ff_dark", dark); }, [dark]);

  useEffect(() => {
    if (user) localStorage.setItem("ff_user", JSON.stringify(user));
    else localStorage.removeItem("ff_user");
  }, [user]);

  const handleSplashDone = useCallback(() => setLoading(false), []);
  const handleLogin      = useCallback((u) => setUser(u), []);
  const handleLogout     = useCallback(() => { setUser(null); localStorage.removeItem("ff_user"); }, []);

  if (loading) return <SplashScreen onDone={handleSplashDone} />;

  return (
    <ToastProvider>
      <GlobalStyles dark={dark} />
      {!user ? (
        <LandingPage dark={dark} onLeaderLogin={handleLogin} onAdminClick={handleLogin} />
      ) : user.role === "group" ? (
        <LeaderPortal
          user={user}
          group={groups.find(g => g.id === user.groupId) || { id: user.groupId, name: user.name, color: "#f59e0b" }}
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
