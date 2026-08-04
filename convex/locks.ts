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

    if (existingList.length > 0) {
      // Patch the first matched record and clean up any duplicate legacy documents
      await ctx.db.patch(existingList[0]._id, {
        locked: args.locked,
        groupId: args.groupId,
        session: args.session,
      });
      for (let i = 1; i < existingList.length; i++) {
        await ctx.db.delete(existingList[i]._id);
      }
    } else {
      await ctx.db.insert("locks", args);
    }
  },
});
