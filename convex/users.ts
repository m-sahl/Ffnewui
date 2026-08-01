import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const setAll = mutation({
  args: {
    users: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        role: v.string(),
        pin: v.string(),
        groupId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("users").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const u of args.users) {
      await ctx.db.insert("users", u);
    }
  },
});
