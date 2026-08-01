import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("registrations").collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    programId: v.string(),
    groupId: v.string(),
    participantIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("registrations", args);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("registrations")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const setAll = mutation({
  args: {
    registrations: v.array(
      v.object({
        id: v.string(),
        programId: v.string(),
        groupId: v.string(),
        participantIds: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("registrations").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const r of args.registrations) {
      await ctx.db.insert("registrations", r);
    }
  },
});
