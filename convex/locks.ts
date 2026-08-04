import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("locks").collect();
  },
});

export const setLock = mutation({
  args: {
    type: v.string(),
    locked: v.boolean(),
    groupId: v.optional(v.string()),
    session: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("locks")
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        locked: args.locked,
        groupId: args.groupId,
        session: args.session,
      });
    } else {
      await ctx.db.insert("locks", args);
    }
  },
});
