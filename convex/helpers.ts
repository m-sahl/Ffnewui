import type { DatabaseReader } from "./_generated/server";

// ---- Whitelist helper: only copy known fields from client-supplied objects ----
// Prevents mass-assignment (e.g. a client sending `role: "admin"`).
export const pick = (obj: any, keys: readonly string[]) => {
  const out: Record<string, any> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
};

// ---- Crypto helpers (Web Crypto is available in the Convex runtime) ----
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

export const randomHex = (n = 32) => toHex(crypto.getRandomValues(new Uint8Array(n)));

// Salted, iterated SHA-256. NOTE: short numeric PINs are inherently weak offline;
// the real protection is server-side lockout (see auth.login) + never exposing hashes.
export const hashSecret = async (secret: string, salt: string) => {
  let data = new TextEncoder().encode(`${salt}:${secret}`);
  for (let i = 0; i < 2000; i++) {
    data = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  }
  return toHex(data);
};

// Constant-time string compare
export const safeEq = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// ---- Sessions ----
type Ctx = { db: DatabaseReader };

// Returns the session or null (used by queries so an expired token yields empty data, not a crash)
export async function getSession(ctx: Ctx, token?: string) {
  if (!token) return null;
  const s = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!s || s.expiresAt < Date.now()) return null;
  return s;
}

export async function requireSession(ctx: Ctx, token?: string) {
  const s = await getSession(ctx, token);
  if (!s) throw new Error("Unauthorized");
  return s;
}

export async function requireAdmin(ctx: Ctx, token?: string) {
  const s = await requireSession(ctx, token);
  if (s.role !== "admin") throw new Error("Forbidden");
  return s;
}

export const isValidGroupPin = (pin: string) => /^\d{3,8}$/.test(pin);
