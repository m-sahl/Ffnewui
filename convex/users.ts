import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, hashSecret, randomHex, isValidGroupPin } from "./helpers";

// Public (pre-login) list for the landing page: groups only, and NEVER any pin/hash.
export const listPublic = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    return rows
      .filter((u) => u.role === "group")
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        groupId: u.groupId ?? u.id,
        color: u.color,
        pinLength: u.pinLength ?? u.pin?.length ?? 4,
      }));
  },
});

const cleanName = (n: string) => {
  const t = n.trim();
  if (!t || t.length > 60) throw new Error("Name must be 1-60 characters");
  return t;
};

export const add = mutation({
  args: {
    token: v.string(),
    user: v.object({ id: v.string(), name: v.string(), pin: v.string(), color: v.optional(v.string()) }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const { id, name, pin, color } = args.user;
    if (!isValidGroupPin(pin)) throw new Error("PIN must be 3-8 digits");
    const dupe = await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", id)).first();
    if (dupe) throw new Error("Group already exists");
    const salt = randomHex(16);
    // role/groupId are fixed server-side — clients can't create admins
    await ctx.db.insert("users", {
      id, name: cleanName(name), role: "group", groupId: id, color,
      pinHash: await hashSecret(pin, salt), pinSalt: salt, pinLength: pin.length,
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.string(),
    user: v.object({ name: v.optional(v.string()), pin: v.optional(v.string()), color: v.optional(v.string()) }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const u = await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", args.id)).first();
    if (!u || u.role !== "group") throw new Error("Group not found"); // admin password: auth.changePassword
    const patch: Record<string, any> = {};
    if (args.user.name !== undefined) patch.name = cleanName(args.user.name);
    if (args.user.color !== undefined) patch.color = args.user.color;
    if (args.user.pin) {
      if (!isValidGroupPin(args.user.pin)) throw new Error("PIN must be 3-8 digits");
      const salt = randomHex(16);
      Object.assign(patch, { pinHash: await hashSecret(args.user.pin, salt), pinSalt: salt, pinLength: args.user.pin.length, pin: undefined });
      // PIN changed -> sign that group out everywhere
      const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", u.id)).collect();
      for (const s of sessions) await ctx.db.delete(s._id);
    }
    await ctx.db.patch(u._id, patch);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const u = await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", args.id)).first();
    if (!u || u.role !== "group") return; // the admin account can't be deleted
    const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", u.id)).collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    await ctx.db.delete(u._id);
  },
});
