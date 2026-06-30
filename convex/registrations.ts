import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("registrations").collect();
  },
});

export const listByGroup = query({
  args: { groupId: v.id("users") },
  handler: async (ctx, { groupId }) => {
    return await ctx.db.query("registrations").withIndex("by_group", q => q.eq("groupId", groupId)).collect();
  },
});

export const add = mutation({
  args: {
    groupId: v.id("users"),
    programId: v.id("programs"),
    participantIds: v.array(v.id("students")),
  },
  handler: async (ctx, args) => {
    // Block duplicate: same program already registered by this group
    const existing = await ctx.db.query("registrations").withIndex("by_group", q => q.eq("groupId", args.groupId)).collect();
    if (existing.some(r => r.programId === args.programId)) {
      throw new Error("This group has already registered for this program.");
    }
    return await ctx.db.insert("registrations", args);
  },
});

export const edit = mutation({
  args: {
    id: v.id("registrations"),
    participantIds: v.array(v.id("students")),
  },
  handler: async (ctx, { id, participantIds }) => {
    await ctx.db.patch(id, { participantIds });
  },
});

export const remove = mutation({
  args: { id: v.id("registrations") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
