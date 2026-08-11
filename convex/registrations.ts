import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("registrations").collect();
  },
});

export const add = mutation({
  args: { registration: v.any() },
  handler: async (ctx, args) => {
    // Atomic: Add single registration without fetching all
    try {
      const doc = cleanDoc(args.registration);
      await ctx.db.insert("registrations", doc);
      return { success: true, id: doc.id };
    } catch (error) {
      console.error("Registration add failed:", error);
      throw error;
    }
  },
});

export const addRegistration = mutation({
  args: { registration: v.any() },
  handler: async (ctx, args) => {
    // Atomic: Add single registration with validation
    try {
      if (!args.registration || !args.registration.id) {
        throw new Error("Registration must have an id");
      }
      const doc = cleanDoc(args.registration);
      await ctx.db.insert("registrations", doc);
      return { success: true, id: doc.id };
    } catch (error) {
      console.error("Registration addRegistration failed:", error);
      throw error;
    }
  },
});

export const update = mutation({
  args: { id: v.string(), registration: v.any() },
  handler: async (ctx, args) => {
    // Atomic: Update single registration
    try {
      const existing = await ctx.db
        .query("registrations")
        .filter((q) => q.eq(q.field("id"), args.id))
        .first();
      if (existing) {
        const doc = cleanDoc({ ...args.registration, id: args.id });
        await ctx.db.patch(existing._id, doc);
        return { success: true, id: args.id };
      } else {
        // Create if not found
        const doc = cleanDoc({ ...args.registration, id: args.id });
        await ctx.db.insert("registrations", doc);
        return { success: true, id: args.id, created: true };
      }
    } catch (error) {
      console.error("Registration update failed:", error);
      throw error;
    }
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Atomic: Remove single registration
    try {
      const existing = await ctx.db
        .query("registrations")
        .filter((q) => q.eq(q.field("id"), args.id))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
        return { success: true, id: args.id };
      }
      return { success: false, id: args.id, reason: "not found" };
    } catch (error) {
      console.error("Registration remove failed:", error);
      throw error;
    }
  },
});

export const setAll = mutation({
  args: { registrations: v.array(v.any()) },
  handler: async (ctx, args) => {
    // Bulk: Use only when needed (admin reset scenario)
    try {
      const all = await ctx.db.query("registrations").collect();
      for (const item of all) {
        await ctx.db.delete(item._id);
      }
      for (const r of args.registrations) {
        if (r && r.id) {
          await ctx.db.insert("registrations", cleanDoc(r));
        }
      }
      return { success: true, count: args.registrations.length };
    } catch (error) {
      console.error("Registration setAll failed:", error);
      throw error;
    }
  },
});
