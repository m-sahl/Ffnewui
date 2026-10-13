import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSession, requireSession, pick } from "./helpers";

const FIELDS = ["id","programId","groupId","participantIds"] as const;
const clean = (o: any) => pick(o, FIELDS);

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!(await getSession(ctx, args.token))) return [];
    return await ctx.db.query("registrations").collect();
  },
});

const findByRid = (ctx: any, id: string) =>
  ctx.db.query("registrations").withIndex("by_rid", (q: any) => q.eq("id", id)).first();

// Admin: anything. Group leader: only their own group, and only while the group/session isn't locked.
async function authorize(ctx: any, session: any, groupId: string, programId: string) {
  if (session.role === "admin") return;
  if (session.role !== "group" || session.groupId !== groupId) throw new Error("Forbidden");
  const prog = await ctx.db.query("programs").withIndex("by_pid", (q: any) => q.eq("id", programId)).first();
  if (prog) {
    const key = `${groupId}_${prog.session}`.toLowerCase();
    const lock = await ctx.db.query("locks").withIndex("by_type", (q: any) => q.eq("type", key)).first();
    if (lock?.locked) throw new Error("Registration is locked for this session");
  }
}

export const addRegistration = mutation({
  args: { token: v.string(), registration: v.any() },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    const doc = clean(args.registration);
    if (!doc.id) throw new Error("Registration must have an id");
    await authorize(ctx, s, doc.groupId, doc.programId);
    await ctx.db.insert("registrations", doc as any);
    return { success: true, id: doc.id };
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.string(), registration: v.any() },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    const existing = await findByRid(ctx, args.id);
    const doc = clean({ ...args.registration, id: args.id });
    if (existing) {
      await authorize(ctx, s, existing.groupId, existing.programId);
      // a non-admin can never move a registration to another group/program
      if (s.role !== "admin") { doc.groupId = existing.groupId; doc.programId = existing.programId; }
      await ctx.db.patch(existing._id, doc);
      return { success: true, id: args.id };
    }
    await authorize(ctx, s, doc.groupId, doc.programId);
    await ctx.db.insert("registrations", doc as any);
    return { success: true, id: args.id, created: true };
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    const existing = await findByRid(ctx, args.id);
    if (!existing) return { success: false, id: args.id, reason: "not found" };
    await authorize(ctx, s, existing.groupId, existing.programId);
    await ctx.db.delete(existing._id);
    return { success: true, id: args.id };
  },
});

export const setAll = mutation({
  args: { token: v.string(), registrations: v.array(v.any()) },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    if (s.role !== "admin") throw new Error("Forbidden");
    const all = await ctx.db.query("registrations").collect();
    for (const item of all) await ctx.db.delete(item._id);
    for (const r of args.registrations) if (r && r.id) await ctx.db.insert("registrations", clean(r) as any);
    return { success: true, count: args.registrations.length };
  },
});
