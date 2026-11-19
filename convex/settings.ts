import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const DEFAULT_LIMITS = {
  maxStage: 6,
  maxOffStage: 20,
};

export const DEFAULT_JUDGE_PASSCODE = "judge2026";

export const getJudgePasscode = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "judge_passcode"))
      .first();
    return setting?.value ? String(setting.value) : DEFAULT_JUDGE_PASSCODE;
  },
});

export const setJudgePasscode = mutation({
  args: { passcode: v.string() },
  handler: async (ctx, args) => {
    const clean = String(args.passcode || "").trim();
    if (!clean) throw new Error("Passcode cannot be empty");
    const existing = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "judge_passcode"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: clean });
    } else {
      await ctx.db.insert("settings", {
        key: "judge_passcode",
        value: clean,
      });
    }
    return clean;
  },
});

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
