import { useEffect, useState } from "react";

// Minimal path router (3 routes — no react-router needed). Vercel already rewrites every path to index.html.

const norm = (p) => ("/" + (p || "").toLowerCase().replace(/^\/+|\/+$/g, "")).replace(/\/+/g, "/");

// Pure routing rules: which screen to show for (path, session role), and where to redirect.
//   /        and /leader  -> group login (leader portal when signed in)
//   /admin                -> admin login (admin portal when signed in)
// Signed-in users are always moved to their own portal's URL.
export const resolveRoute = (rawPath, role) => {
  const path = norm(rawPath);
  if (role === "admin") return { view: "admin",  redirect: path === "/admin"  ? null : "/admin" };
  if (role === "group") return { view: "leader", redirect: path === "/leader" ? null : "/leader" };
  if (path === "/admin") return { view: "adminLogin", redirect: null };
  if (path === "/" || path === "/leader") return { view: "landing", redirect: null };
  return { view: "landing", redirect: "/" }; // unknown URL
};

export const navigate = (to, replace = false) => {
  if (norm(window.location.pathname) === norm(to)) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export const usePath = () => {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
};
