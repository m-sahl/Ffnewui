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
    const existingList = await ctx.db
      .query("locks")
      .filter((q) => q.eq(q.field("type"), args.type))
      .collect();

    for (const doc of existingList) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.insert("locks", {
      type: args.type,
      locked: args.locked,
      groupId: args.groupId,
      session: args.session,
    });
  },
});
