import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("students").collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    chestNo: v.string(),
    category: v.string(),
    groupId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("students", args);
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
  args: {
    groupId: v.string(),
    students: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        chestNo: v.string(),
        category: v.string(),
        groupId: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .collect();
    for (const item of existing) {
      await ctx.db.delete(item._id);
    }
    for (const s of args.students) {
      await ctx.db.insert("students", s);
    }
  },
});
