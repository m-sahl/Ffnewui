import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSession, requireAdmin, pick } from "./helpers";

const FIELDS = ["id","name","chestNo","category","groupId","groupRole"] as const;
const clean = (o: any) => pick(o, FIELDS);

// Leaders need the full roster (chest numbers are global), so any signed-in user may read.
// Writes are admin-only.
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!(await getSession(ctx, args.token))) return [];
    return await ctx.db.query("students").collect();
  },
});

const findBySid = (ctx: any, id: string) =>
  ctx.db.query("students").withIndex("by_sid", (q: any) => q.eq("id", id)).first();

export const add = mutation({
  args: { token: v.string(), student: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    await ctx.db.insert("students", clean(args.student) as any);
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.string(), student: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await findBySid(ctx, args.id);
    const doc = clean(args.student);
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("students", { ...doc, id: args.id } as any);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await findBySid(ctx, args.id);
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const setGroupStudents = mutation({
  args: { token: v.string(), groupId: v.string(), students: v.array(v.any()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await ctx.db.query("students").withIndex("by_group", (q) => q.eq("groupId", args.groupId)).collect();
    for (const item of existing) await ctx.db.delete(item._id);
    for (const s of args.students) {
      if (s && s.id) await ctx.db.insert("students", clean({ ...s, groupId: s.groupId || args.groupId }) as any);
    }
  },
});

export const setAll = mutation({
  args: { token: v.string(), students: v.array(v.any()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const all = await ctx.db.query("students").collect();
    for (const item of all) await ctx.db.delete(item._id);
    for (const s of args.students) if (s && s.id) await ctx.db.insert("students", clean(s) as any);
  },
});
