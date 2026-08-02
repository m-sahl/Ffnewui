import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("registrations").collect();
  },
});

export const add = mutation({
  args: { registration: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("registrations", cleanDoc(args.registration));
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
  args: { registrations: v.array(v.any()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("registrations").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const r of args.registrations) {
      if (r && r.id) {
        await ctx.db.insert("registrations", cleanDoc(r));
      }
    }
  },
});
