import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSession, requireAdmin, hashSecret, randomHex, safeEq } from "./helpers";

declare const process: { env: Record<string, string | undefined> };

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ATTEMPTS = 5;
const LOCK_MS = 2 * 60 * 1000; // 2 min lockout after 5 failures

// NOTE: returns {ok:false} instead of throwing on a bad secret — a thrown error would
// roll back the mutation and the failed-attempt counter would never persist.
export const login = mutation({
  args: {
    role: v.union(v.literal("admin"), v.literal("group")),
    userId: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const uid = args.userId;
    const key = args.role === "admin" ? "admin" : `group:${uid ?? ""}`;

    const attempt = await ctx.db
      .query("loginAttempts")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (attempt && attempt.lockedUntil > now) {
      return { ok: false as const, reason: "locked" as const, retryInSec: Math.ceil((attempt.lockedUntil - now) / 1000) };
    }

    let user =
      args.role === "admin"
        ? await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "admin")).first()
        : uid
          ? await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", uid)).first()
          : null;

    // First-run bootstrap: no admin exists yet -> create one from a deployment env var
    if (args.role === "admin" && !user) {
      const boot = process.env.ADMIN_BOOTSTRAP_PASSWORD;
      if (boot && boot.length >= 8 && safeEq(boot, args.secret)) {
        const salt = randomHex(16);
        const pinHash = await hashSecret(args.secret, salt);
        const _id = await ctx.db.insert("users", { id: "u-admin", name: "System Admin", role: "admin", pinHash, pinSalt: salt });
        user = await ctx.db.get(_id);
      }
    }

    let ok = false;
    if (user && user.role === args.role) {
      if (user.pinHash && user.pinSalt) {
        ok = safeEq(await hashSecret(args.secret, user.pinSalt), user.pinHash);
      } else if (user.pin) {
        // Legacy plaintext PIN: verify, then migrate to a salted hash and drop the plaintext
        ok = safeEq(user.pin, args.secret);
        if (ok) {
          const salt = randomHex(16);
          await ctx.db.patch(user._id, {
            pinHash: await hashSecret(args.secret, salt),
            pinSalt: salt,
            pinLength: user.pin.length,
            pin: undefined,
          });
        }
      }
    }

    if (!ok) {
      // Only track attempts for real accounts (avoids unbounded rows from random ids)
      if (user && user.role === args.role) {
        const count = (attempt?.count ?? 0) + 1;
        const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCK_MS : 0;
        const next = { key, count: lockedUntil ? 0 : count, lockedUntil };
        if (attempt) await ctx.db.patch(attempt._id, next);
        else await ctx.db.insert("loginAttempts", next);
      }
      return { ok: false as const, reason: "invalid" as const };
    }

    if (attempt) await ctx.db.delete(attempt._id);

    // Drop this user's expired sessions, then issue a new one
    const old = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", user!.id)).collect();
    for (const s of old) if (s.expiresAt < now) await ctx.db.delete(s._id);

    const token = randomHex(32);
    await ctx.db.insert("sessions", {
      token,
      userId: user!.id,
      role: user!.role,
      groupId: user!.role === "group" ? (user!.groupId ?? user!.id) : undefined,
      expiresAt: now + SESSION_TTL_MS,
    });

    return {
      ok: true as const,
      token,
      user: { id: user!.id, name: user!.name, role: user!.role, groupId: user!.groupId ?? user!.id, color: user!.color },
    };
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await getSession(ctx, args.token);
    if (!s) return null;
    const user = await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", s.userId)).first();
    if (!user) return null;
    return { id: user.id, name: user.name, role: user.role, groupId: user.groupId ?? user.id, color: user.color };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (s) await ctx.db.delete(s._id);
  },
});

export const changePassword = mutation({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const s = await requireAdmin(ctx, args.token);
    const pwd = args.newPassword.trim();
    if (pwd.length < 8 || pwd.length > 128) throw new Error("Password must be 8-128 characters");
    const user = await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", s.userId)).first();
    if (!user) throw new Error("User not found");
    const salt = randomHex(16);
    await ctx.db.patch(user._id, { pinHash: await hashSecret(pwd, salt), pinSalt: salt, pin: undefined });
    // Revoke every other session of this admin
    const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", user.id)).collect();
    for (const x of sessions) if (x.token !== args.token) await ctx.db.delete(x._id);
  },
});
