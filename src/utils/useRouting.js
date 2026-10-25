import { useEffect, useRef, useCallback } from "react";

/**
 * Parses the current window.location.hash
 * E.g., "#/admin/print" -> { prefix: "admin", subroute: "print" }
 * E.g., "#/leader/events" -> { prefix: "leader", subroute: "events" }
 */
export const parseHash = () => {
  if (typeof window === "undefined") return { prefix: "", subroute: "" };
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  if (!raw) return { prefix: "", subroute: "" };
  const parts = raw.split("/").filter(Boolean);
  const prefix = parts[0]?.toLowerCase() || "";
  const subroute = parts[1]?.toLowerCase() || "";
  return { prefix, subroute };
};

/**
 * Gets the current subroute for a given role/prefix.
 * Falls back to defaultRoute if hash does not match.
 */
export const getHashRoute = (expectedPrefix, defaultRoute, validRoutes = [], aliases = {}) => {
  const { prefix, subroute } = parseHash();
  const resolved = aliases[subroute] || subroute;
  if (prefix === expectedPrefix && resolved && (validRoutes.length === 0 || validRoutes.includes(resolved))) {
    return resolved;
  }
  if (!resolved && validRoutes.includes(prefix)) {
    return prefix;
  }
  return defaultRoute;
};

/**
 * Sets the hash for a given role and subroute with clean history state (null state to avoid flag leakage).
 */
export const setHashRoute = (prefix, subroute, replace = false) => {
  if (typeof window === "undefined") return;
  const targetHash = `#/${prefix}/${subroute}`;
  if (window.location.hash !== targetHash) {
    if (replace) {
      window.history.replaceState(null, "", targetHash);
    } else {
      window.history.pushState(null, "", targetHash);
    }
  }
};

/**
 * Clears the hash back to root.
 */
export const clearHashRoute = () => {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
};

/**
 * Hook to synchronize component state (view or tab) with the URL hash.
 * Immediately updates the page on browser Back / Forward navigation.
 * Prevents crossing over into another role/team's pages.
 */
export const useHashSync = (prefix, currentRoute, setRoute, validRoutes, aliases = {}) => {
  const currentRouteRef = useRef(currentRoute);
  currentRouteRef.current = currentRoute;

  const navigate = useCallback((newRoute, replace = false) => {
    const resolved = aliases[newRoute] || newRoute;
    if (!validRoutes.includes(resolved)) return;
    currentRouteRef.current = resolved;
    setRoute(resolved);
    setHashRoute(prefix, resolved, replace);
  }, [prefix, setRoute, validRoutes, aliases]);

  useEffect(() => {
    // Initial sync of hash on mount
    const { prefix: currentPrefix, subroute: currentSub } = parseHash();
    const resolvedSub = aliases[currentSub] || currentSub;
    if (currentPrefix === prefix && validRoutes.includes(resolvedSub) && resolvedSub !== currentRouteRef.current) {
      currentRouteRef.current = resolvedSub;
      setRoute(resolvedSub);
      if (currentSub !== resolvedSub) {
        setHashRoute(prefix, resolvedSub, true);
      }
    } else if (currentPrefix !== prefix || currentSub !== currentRouteRef.current) {
      setHashRoute(prefix, currentRouteRef.current, true);
    }

    const onLocationChange = () => {
      const { prefix: newPrefix, subroute: newSub } = parseHash();

      // Guard: If browser Back went to another role/team's prefix (e.g. from admin to a leader team page)
      if (newPrefix && newPrefix !== prefix) {
        // Intercept: stay on current portal, never switch to another team/role page!
        setHashRoute(prefix, currentRouteRef.current, true);
        return;
      }

      const rawCandidate = (newPrefix === prefix) ? newSub : (!newSub && validRoutes.includes(newPrefix) ? newPrefix : "");
      const candidate = aliases[rawCandidate] || rawCandidate;
      if (candidate && validRoutes.includes(candidate)) {
        if (rawCandidate !== candidate) {
          setHashRoute(prefix, candidate, true);
        }
        if (candidate !== currentRouteRef.current) {
          currentRouteRef.current = candidate;
          setRoute(candidate);
        }
      }
    };

    window.addEventListener("hashchange", onLocationChange);
    window.addEventListener("popstate", onLocationChange);
    return () => {
      window.removeEventListener("hashchange", onLocationChange);
      window.removeEventListener("popstate", onLocationChange);
    };
  }, [prefix, setRoute, validRoutes, aliases]);

  return navigate;
};

/**
 * Hook to intercept the browser / Android hardware back button when a modal is open.
 * Closes the modal cleanly without affecting the hash or page route.
 */
export const useModalBackHandler = (isOpen, onClose) => {
  const pushedModalRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (pushedModalRef.current) {
        pushedModalRef.current = false;
        // If modal was closed via UI button and not via Back button, pop the modal state
        if (window.history.state && window.history.state.__isModalOpen) {
          window.history.back();
        }
      }
      return;
    }

    // Modal just opened: push clean modal state
    window.history.pushState({ __isModalOpen: true }, "");
    pushedModalRef.current = true;

    const handlePopState = () => {
      // If modal was open and user pressed Back button
      if (pushedModalRef.current) {
        pushedModalRef.current = false;
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen, onClose]);
};
