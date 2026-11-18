import { useState, useEffect, useCallback } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import GlobalStyles from "./styles/GlobalStyles";
import SplashScreen from "./components/common/SplashScreen";
import LandingPage from "./components/landing/LandingPage";
import LeaderPortal from "./components/leader/LeaderPortal";
import AdminPortal from "./components/admin/AdminPortal";
import JudgePortal from "./components/judge/JudgePortal";
import { ToastProvider, useToast } from "./components/common/Toast";
import SessionTimeoutModal from "./components/common/SessionTimeoutModal";
import { useSessionTimeout, SESSION_TIMEOUT_MS, SESSION_STORAGE_KEY } from "./utils/useSessionTimeout";

import { clearHashRoute, setHashRoute, parseHash } from "./utils/useRouting";

const safeGet    = (key) => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } };
const safeSet    = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const safeRemove = (key) => { try { localStorage.removeItem(key); } catch {} };

const checkInitialSession = () => {
  const saved = safeGet("ff_user");
  if (!saved) return { user: null, expired: false };
  const lastActiveStr = localStorage.getItem(SESSION_STORAGE_KEY);
  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    if (!isNaN(lastActive) && Date.now() - lastActive >= SESSION_TIMEOUT_MS) {
      safeRemove("ff_user");
      safeRemove(SESSION_STORAGE_KEY);
      return { user: null, expired: true };
    }
  }
  return { user: saved, expired: false };
};

const AppContent = () => {
  const { groups, users } = useApp();  // single call
  const showToast = useToast();

  const [initialSession]      = useState(checkInitialSession);
  const [user, setUser]       = useState(initialSession.user);
  const [loading, setLoading] = useState(() => !initialSession.user);
  const [dark, setDark]       = useState(() => {
    try {
      const saved = localStorage.getItem("ff_dark");
      if (saved !== null) {
        return saved === "true" || saved === "1";
      }
      return window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    } catch {
      return false;
    }
  });
  const [isJudgeMode, setIsJudgeMode] = useState(() => parseHash().prefix === "judge");
  const [judgeToken, setJudgeToken]   = useState(() => parseHash().prefix === "judge" ? (parseHash().token || "") : "");

  // Notify if previous session timed out while tab was closed/away
  useEffect(() => {
    if (initialSession.expired) {
      showToast("Session expired due to 30 minutes of inactivity. Please log in again.", "info", 5000);
    }
  }, [initialSession.expired, showToast]);

  useEffect(() => {
    const handleHash = () => {
      const { prefix, token } = parseHash();
      if (prefix === "judge") {
        setIsJudgeMode(true);
        setJudgeToken(token || "");
      } else {
        setIsJudgeMode(false);
        setJudgeToken("");
      }
    };
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("popstate", handleHash);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("popstate", handleHash);
    };
  }, []);

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
      safeRemove(SESSION_STORAGE_KEY);
      clearHashRoute();
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem("ff_dark", String(dark));
      if (dark) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
    } catch {}
  }, [dark]);

  useEffect(() => {
    if (user) {
      safeSet("ff_user", user);
    } else {
      safeRemove("ff_user");
      safeRemove(SESSION_STORAGE_KEY);
    }
  }, [user]);

  // Enforce role route boundary: if user clicks Back into another role/team's URL, intercept it
  useEffect(() => {
    const enforceRoleRoute = () => {
      const { prefix } = parseHash();
      if (prefix === "judge") return; // Judge route is public and standalone
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

  const handleLogin = useCallback((u) => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, String(Date.now()));
    } catch {}
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

  const handleLogout = useCallback((reason) => {
    setUser(null);
    safeRemove("ff_user");
    safeRemove(SESSION_STORAGE_KEY);
    clearHashRoute();
    if (reason === "inactivity") {
      showToast("Session expired due to 30 minutes of inactivity. Please log in again.", "info", 5000);
    }
  }, [showToast]);

  // 30-minute session inactivity timer and warning modal hook
  const { showWarning, remainingSeconds, extendSession } = useSessionTimeout({
    user,
    onLogout: handleLogout,
  });

  return (
    <>
      <GlobalStyles dark={dark} />
      {loading && <SplashScreen onDone={handleSplashDone} dark={dark} />}

      {showWarning && (
        <SessionTimeoutModal
          remainingSeconds={remainingSeconds}
          onExtend={extendSession}
          onLogout={() => handleLogout()}
          dark={dark}
        />
      )}

      {isJudgeMode ? (
        <JudgePortal
          token={judgeToken}
          dark={dark}
          setDark={setDark}
          onExit={() => {
            setIsJudgeMode(false);
            setJudgeToken("");
            clearHashRoute();
          }}
        />
      ) : !user ? (
        <LandingPage dark={dark} onLeaderLogin={handleLogin} onAdminClick={handleLogin} />
      ) : user.role === "group" ? (
        <LeaderPortal
          user={user}
          group={
            groups.find(g => (user.groupId && g.id === user.groupId) || g.id === user.id) ||
            { id: user.groupId || user.id, name: user.name, color: user.color || "#f14d4d" }
          }
          dark={dark} setDark={setDark} onBack={handleLogout}
        />
      ) : (
        <AdminPortal user={user} dark={dark} setDark={setDark} onBack={handleLogout} />
      )}
    </>
  );
};

const App = () => (
  <AppProvider>
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  </AppProvider>
);

export default App;
