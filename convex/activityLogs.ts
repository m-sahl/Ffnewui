import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("activityLogs").order("desc").take(500);
    return logs;
  },
});

export const add = mutation({
  args: { userName: v.string(), action: v.string(), details: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLogs", args);
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("activityLogs").collect();
    for (const l of all) await ctx.db.delete(l._id);
  },
});
