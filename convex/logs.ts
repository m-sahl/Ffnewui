import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("logs").collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    user: v.string(),
    action: v.string(),
    details: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("logs", args);
  },
});

export const clear = mutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("logs").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
  },
});
