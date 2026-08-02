import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

export const add = mutation({
  args: { program: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("programs", cleanDoc(args.program));
  },
});

export const update = mutation({
  args: { id: v.string(), program: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, cleanDoc(args.program));
    } else {
      await ctx.db.insert("programs", cleanDoc(args.program));
    }
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
  args: { programs: v.array(v.any()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("programs").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const p of args.programs) {
      if (p && p.id) {
        await ctx.db.insert("programs", cleanDoc(p));
      }
    }
  },
});

export const updateStatus = mutation({
  args: { id: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status });
    }
  },
});

export const updateDate = mutation({
  args: { id: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { date: args.date });
    }
  },
});
