import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("students").collect();
  },
});

export const add = mutation({
  args: { student: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("students", cleanDoc(args.student));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const setGroupStudents = mutation({
  args: { groupId: v.string(), students: v.array(v.any()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .collect();
    for (const item of existing) {
      await ctx.db.delete(item._id);
    }
    for (const s of args.students) {
      if (s && s.id) {
        await ctx.db.insert("students", cleanDoc(s));
      }
    }
  },
});

export const setAll = mutation({
  args: { students: v.array(v.any()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("students").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const s of args.students) {
      if (s && s.id) {
        await ctx.db.insert("students", cleanDoc(s));
      }
    }
  },
});
