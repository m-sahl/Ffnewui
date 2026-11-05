import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

const normalizeCategory = (cat?: string): string => {
  if (!cat) return "";
  const c = String(cat).trim().toLowerCase();
  if (c.includes("sub") || c === "sj" || c === "low") return "Low";
  if (c.includes("jun") || c === "jr" || c === "mid") return "Mid";
  if (c.includes("sen") || c === "sr" || c === "high") return "High";
  return cat;
};

export const get = query({
  handler: async (ctx) => {
    const list = await ctx.db.query("students").collect();
    return list.map((s) => ({
      ...s,
      category: normalizeCategory(s.category) || s.category,
    }));
  },
});

export const add = mutation({
  args: { student: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("students", cleanDoc(args.student));
  },
});

export const update = mutation({
  args: { id: v.string(), student: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, cleanDoc(args.student));
    } else {
      await ctx.db.insert("students", cleanDoc(args.student));
    }
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
  args: { groupId: v.optional(v.string()), students: v.array(v.any()) },
  handler: async (ctx, args) => {
    if (args.groupId) {
      const existing = await ctx.db
        .query("students")
        .filter((q) => q.eq(q.field("groupId"), args.groupId))
        .collect();
      for (const item of existing) {
        await ctx.db.delete(item._id);
      }
      for (const s of args.students) {
        if (s && s.id) {
          const studentDoc = cleanDoc({ ...s, groupId: s.groupId || args.groupId });
          await ctx.db.insert("students", studentDoc);
        }
      }
    } else {
      const all = await ctx.db.query("students").collect();
      for (const item of all) {
        await ctx.db.delete(item._id);
      }
      for (const s of args.students) {
        if (s && s.id) {
          await ctx.db.insert("students", cleanDoc(s));
        }
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
