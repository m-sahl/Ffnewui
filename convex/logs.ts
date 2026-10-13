import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSession, requireAdmin, requireSession } from "./helpers";

// Activity log is admin-only; capped to the latest 500 entries
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await getSession(ctx, args.token);
    if (!s || s.role !== "admin") return [];
    return await ctx.db.query("logs").order("desc").take(500);
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    id: v.string(),
    action: v.string(),
    details: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    // Attribute the entry to the authenticated user — the client can't spoof it
    const user = await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", s.userId)).first();
    await ctx.db.insert("logs", {
      id: args.id,
      user: user?.name ?? s.userId,
      action: args.action.slice(0, 200),
      details: args.details.slice(0, 500),
      timestamp: Date.now(),
    });
  },
});

export const clear = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const all = await ctx.db.query("logs").collect();
    for (const item of all) await ctx.db.delete(item._id);
  },
});
