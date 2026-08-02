import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const setAll = mutation({
  args: { users: v.array(v.any()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("users").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const u of args.users) {
      if (u && u.id) {
        await ctx.db.insert("users", cleanDoc(u));
      }
    }
  },
});
