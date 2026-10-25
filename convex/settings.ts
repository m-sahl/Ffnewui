import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const DEFAULT_LIMITS = {
  maxStage: 3,
  maxOffStage: 3,
};

export const getLimits = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "programLimits"))
      .first();

    if (!setting || !setting.value) {
      return DEFAULT_LIMITS;
    }

    return {
      maxStage: typeof setting.value.maxStage === "number" ? setting.value.maxStage : DEFAULT_LIMITS.maxStage,
      maxOffStage: typeof setting.value.maxOffStage === "number" ? setting.value.maxOffStage : DEFAULT_LIMITS.maxOffStage,
    };
  },
});

export const updateLimits = mutation({
  args: {
    maxStage: v.number(),
    maxOffStage: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "programLimits"))
      .first();

    const value = {
      maxStage: Math.max(1, args.maxStage),
      maxOffStage: Math.max(1, args.maxOffStage),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("settings", {
        key: "programLimits",
        value,
      });
    }

    return value;
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();
    return setting?.value ?? null;
  },
});

export const set = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
      });
    }
    return { success: true, key: args.key };
  },
});
