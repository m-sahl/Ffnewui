import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSession, requireAdmin } from "./helpers";

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!(await getSession(ctx, args.token))) return [];
    return await ctx.db.query("locks").collect();
  },
});

export const setLock = mutation({
  args: {
    token: v.string(),
    groupId: v.string(),
    session: v.string(),
    locked: v.boolean(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const lockType = (args.type || `${args.groupId}_${args.session}`).toLowerCase();
    // Indexed lookup instead of scanning the whole table
    const existing = await ctx.db.query("locks").withIndex("by_type", (q) => q.eq("type", lockType)).collect();
    for (const doc of existing) await ctx.db.delete(doc._id);
    await ctx.db.insert("locks", { groupId: args.groupId, session: args.session, type: lockType, locked: args.locked });
  },
});
