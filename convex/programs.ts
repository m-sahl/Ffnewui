import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    category: v.string(),
    type: v.string(),
    session: v.string(),
    maxParticipants: v.number(),
    minParticipants: v.optional(v.number()),
    criteria: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("programs", args);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const setAll = mutation({
  args: {
    programs: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        category: v.string(),
        type: v.string(),
        session: v.string(),
        maxParticipants: v.number(),
        minParticipants: v.optional(v.number()),
        criteria: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("programs").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const p of args.programs) {
      await ctx.db.insert("programs", p);
    }
  },
});
