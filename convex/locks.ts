import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("locks").collect();
  },
});

export const toggle = mutation({
  args: {
    groupId: v.id("users"),
    session: v.union(v.literal("Stage"), v.literal("Off-Stage"), v.literal("General")),
  },
  handler: async (ctx, { groupId, session }) => {
    const existing = await ctx.db
      .query("locks")
      .withIndex("by_group_session", q => q.eq("groupId", groupId).eq("session", session))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { locked: !existing.locked });
    } else {
      await ctx.db.insert("locks", { groupId, session, locked: true });
    }
  },
});
