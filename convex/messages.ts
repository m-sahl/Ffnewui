import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

export const send = mutation({
  args: {
    id: v.string(),
    groupId: v.string(),
    from: v.string(),
    text: v.string(),
    timestamp: v.number(),
    read: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", args);
  },
});

export const markRead = mutation({
  args: { groupId: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(
          q.eq(q.field("groupId"), args.groupId),
          q.eq(q.field("read"), false)
        )
      )
      .collect();
    for (const msg of unread) {
      await ctx.db.patch(msg._id, { read: true });
    }
  },
});

export const deleteMsg = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const msg = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (msg) {
      await ctx.db.delete(msg._id);
    }
  },
});
