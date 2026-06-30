import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    session: v.union(v.literal("Stage"), v.literal("Off-Stage"), v.literal("General")),
    category: v.union(v.literal("Sub-Junior"), v.literal("Junior"), v.literal("Senior")),
    type: v.union(v.literal("Single"), v.literal("Group")),
    maxParticipants: v.number(),
    criteria: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("programs").collect();
    const order = all.length + 1;
    return await ctx.db.insert("programs", { ...args, order });
  },
});

export const edit = mutation({
  args: {
    id: v.id("programs"),
    name: v.string(),
    session: v.union(v.literal("Stage"), v.literal("Off-Stage"), v.literal("General")),
    category: v.union(v.literal("Sub-Junior"), v.literal("Junior"), v.literal("Senior")),
    type: v.union(v.literal("Single"), v.literal("Group")),
    maxParticipants: v.number(),
    criteria: v.array(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
