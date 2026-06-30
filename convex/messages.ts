import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

export const send = mutation({
  args: {
    from: v.string(),
    fromName: v.string(),
    to: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", { ...args, read: false, deletedFor: [] });
  },
});

export const markRead = mutation({
  args: { toId: v.string() },
  handler: async (ctx, { toId }) => {
    const msgs = await ctx.db.query("messages").withIndex("by_to", q => q.eq("to", toId)).collect();
    for (const m of msgs) {
      if (!m.read) await ctx.db.patch(m._id, { read: true });
    }
  },
});

// mode: "me" (soft delete, hide for this user) or "everyone" (hard delete)
export const deleteMessage = mutation({
  args: { id: v.id("messages"), mode: v.union(v.literal("me"), v.literal("everyone")), userId: v.string() },
  handler: async (ctx, { id, mode, userId }) => {
    if (mode === "everyone") {
      await ctx.db.delete(id);
      return;
    }
    const msg = await ctx.db.get(id);
    if (!msg) return;
    await ctx.db.patch(id, { deletedFor: [...msg.deletedFor, userId] });
  },
});

export const clearChat = mutation({
  args: { a: v.string(), b: v.string() },
  handler: async (ctx, { a, b }) => {
    const all = await ctx.db.query("messages").collect();
    const toDelete = all.filter(m => (m.from === a && m.to === b) || (m.from === b && m.to === a));
    for (const m of toDelete) await ctx.db.delete(m._id);
  },
});
