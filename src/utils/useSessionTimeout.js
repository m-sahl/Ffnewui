import { useState, useEffect, useRef, useCallback } from "react";

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_WARNING_MS = 2 * 60 * 1000;  // 2 minutes warning (at 28 min inactivity)
export const SESSION_STORAGE_KEY = "ff_session_last_active";

/**
 * Custom hook to monitor user inactivity and automatically trigger session logout.
 *
 * @param {Object} options
 * @param {Object|null} options.user - The currently authenticated user
 * @param {Function} options.onLogout - Callback to invoke when timeout occurs
 * @param {number} [options.timeoutMs=SESSION_TIMEOUT_MS] - Timeout duration in ms
 * @param {number} [options.warningMs=SESSION_WARNING_MS] - Warning duration in ms
 * @returns {{ showWarning: boolean, remainingSeconds: number, extendSession: Function }}
 */
export function useSessionTimeout({
  user,
  onLogout,
  timeoutMs = SESSION_TIMEOUT_MS,
  warningMs = SESSION_WARNING_MS,
}) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(warningMs / 1000));

  const lastActiveRef = useRef(Date.now());
  const lastPersistRef = useRef(0);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    lastPersistRef.current = now;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, String(now));
    } catch {}
    setShowWarning(false);
    setRemainingSeconds(Math.round(warningMs / 1000));
  }, [warningMs]);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    const now = Date.now();
    const stored = Number(localStorage.getItem(SESSION_STORAGE_KEY));

    if (stored && !isNaN(stored)) {
      if (now - stored >= timeoutMs) {
        onLogoutRef.current?.("inactivity");
        return;
      }
      lastActiveRef.current = Math.max(lastActiveRef.current, stored);
    } else {
      lastActiveRef.current = now;
      lastPersistRef.current = now;
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, String(now));
      } catch {}
    }

    const handleUserActivity = () => {
      const currentTime = Date.now();
      lastActiveRef.current = currentTime;

      // Close warning modal if user becomes active
      setShowWarning(prev => (prev ? false : prev));

      // Throttled persistence: save at most once every 5 seconds
      if (currentTime - lastPersistRef.current >= 5000) {
        lastPersistRef.current = currentTime;
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, String(currentTime));
        } catch {}
      }
    };

    const checkTimeout = () => {
      const currentTime = Date.now();
      const storedTime = Number(localStorage.getItem(SESSION_STORAGE_KEY)) || 0;
      const effectiveLastActive = Math.max(lastActiveRef.current, storedTime);
      const elapsed = currentTime - effectiveLastActive;

      if (elapsed >= timeoutMs) {
        setShowWarning(false);
        onLogoutRef.current?.("inactivity");
      } else if (elapsed >= timeoutMs - warningMs) {
        const remaining = Math.max(1, Math.ceil((timeoutMs - elapsed) / 1000));
        setRemainingSeconds(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    // User interaction listeners to reset the idle timer
    const events = [
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
      "click",
      "mousemove",
    ];
    const passiveOpts = { passive: true };

    events.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, passiveOpts);
    });

    // Check every second
    const intervalId = setInterval(checkTimeout, 1000);

    // Recheck immediately when window is refocused or document becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkTimeout();
      }
    };
    const handleFocus = () => {
      checkTimeout();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // Multi-tab synchronization
    const handleStorage = (e) => {
      if (e.key === SESSION_STORAGE_KEY && e.newValue) {
        const newTime = Number(e.newValue);
        if (!isNaN(newTime) && newTime > lastActiveRef.current) {
          lastActiveRef.current = newTime;
          setShowWarning(false);
        }
      } else if (e.key === "ff_user" && !e.newValue) {
        // User logged out in another tab
        onLogoutRef.current?.("storage");
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      events.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity, passiveOpts);
      });
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, [Boolean(user), timeoutMs, warningMs]);

  return {
    showWarning,
    remainingSeconds,
    extendSession,
  };
}

export default useSessionTimeout;
