import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSession, requireAdmin, pick } from "./helpers";

const FIELDS = ["id","name","category","type","session","maxParticipants","minParticipants","criteria","date","status","sortOrder","order"] as const;
const clean = (o: any) => pick(o, FIELDS);

// Any signed-in user can read programs; no/expired token -> empty list
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!(await getSession(ctx, args.token))) return [];
    return await ctx.db.query("programs").collect();
  },
});

const findByPid = (ctx: any, id: string) =>
  ctx.db.query("programs").withIndex("by_pid", (q: any) => q.eq("id", id)).first();

export const add = mutation({
  args: { token: v.string(), program: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    await ctx.db.insert("programs", clean(args.program) as any);
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.string(), program: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await findByPid(ctx, args.id);
    const doc = clean(args.program);
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("programs", { ...doc, id: args.id } as any);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await findByPid(ctx, args.id);
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const setAll = mutation({
  args: { token: v.string(), programs: v.array(v.any()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const all = await ctx.db.query("programs").collect();
    for (const item of all) await ctx.db.delete(item._id);
    for (const p of args.programs) if (p && p.id) await ctx.db.insert("programs", clean(p) as any);
  },
});

export const updateStatus = mutation({
  args: { token: v.string(), id: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await findByPid(ctx, args.id);
    if (existing) await ctx.db.patch(existing._id, { status: args.status });
  },
});

export const updateDate = mutation({
  args: { token: v.string(), id: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await findByPid(ctx, args.id);
    if (existing) await ctx.db.patch(existing._id, { date: args.date });
  },
});
