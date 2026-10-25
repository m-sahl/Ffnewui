import { useState, useEffect, useCallback } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import GlobalStyles from "./styles/GlobalStyles";
import SplashScreen from "./components/common/SplashScreen";
import LandingPage from "./components/landing/LandingPage";
import LeaderPortal from "./components/leader/LeaderPortal";
import AdminPortal from "./components/admin/AdminPortal";
import { ToastProvider } from "./components/common/Toast";

import { clearHashRoute, setHashRoute, parseHash } from "./utils/useRouting";

const safeGet    = (key) => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } };
const safeSet    = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const safeRemove = (key) => { try { localStorage.removeItem(key); } catch {} };

const AppContent = () => {
  const { groups, users } = useApp();  // single call

  const [user, setUser]       = useState(() => safeGet("ff_user"));
  const [loading, setLoading] = useState(() => !safeGet("ff_user"));
  const [dark, setDark]       = useState(false);

  useEffect(() => {
    if (!user || !users.length) return;
    const match = users.find(u => u.id === user.id);
    if (match) {
      if (match.pin !== user.pin || match.name !== user.name) {
        setUser(match);
      }
    } else {
      setUser(null);
      safeRemove("ff_user");
      clearHashRoute();
    }
  }, [users]);

  useEffect(() => { try { localStorage.setItem("ff_dark", dark); } catch {} }, [dark]);
  useEffect(() => { user ? safeSet("ff_user", user) : safeRemove("ff_user"); }, [user]);

  // Enforce role route boundary: if user clicks Back into another role/team's URL, intercept it
  useEffect(() => {
    const enforceRoleRoute = () => {
      const { prefix } = parseHash();
      if (!user) {
        if (prefix === "admin" || prefix === "leader") {
          clearHashRoute();
        }
        return;
      }
      if (user.role === "group") {
        if (prefix !== "leader") {
          setHashRoute("leader", "home", true);
        }
      } else {
        if (prefix !== "admin") {
          setHashRoute("admin", "students", true);
        }
      }
    };

    enforceRoleRoute();
    window.addEventListener("hashchange", enforceRoleRoute);
    window.addEventListener("popstate", enforceRoleRoute);
    return () => {
      window.removeEventListener("hashchange", enforceRoleRoute);
      window.removeEventListener("popstate", enforceRoleRoute);
    };
  }, [user]);

  const handleSplashDone = useCallback(() => setLoading(false), []);
  const handleLogin      = useCallback((u) => {
    setUser(u);
    const { prefix, subroute } = parseHash();
    if (u.role === "group") {
      const targetSub = (prefix === "leader" && subroute) ? subroute : "home";
      setHashRoute("leader", targetSub, true);
    } else {
      const targetSub = (prefix === "admin" && subroute) ? subroute : "students";
      setHashRoute("admin", targetSub, true);
    }
  }, []);
  const handleLogout     = useCallback(() => {
    setUser(null);
    safeRemove("ff_user");
    clearHashRoute();
  }, []);

  if (loading) {
    // Show splash screen as an overlay on top of LandingPage to ensure a seamless transition
  }

  return (
    <ToastProvider>
      <GlobalStyles dark={dark} />
      {loading && <SplashScreen onDone={handleSplashDone} />}
      {!user ? (
        <LandingPage dark={dark} onLeaderLogin={handleLogin} onAdminClick={handleLogin} />
      ) : user.role === "group" ? (
        <LeaderPortal
          user={user}
          group={groups.find(g => g.id === user.groupId) || { id: user.groupId, name: user.name, color: "#f14d4d" }}
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
