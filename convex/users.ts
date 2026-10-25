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

export const add = mutation({
  args: { user: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("users", cleanDoc(args.user));
  },
});

export const update = mutation({
  args: { id: v.string(), user: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, cleanDoc(args.user));
    } else {
      await ctx.db.insert("users", cleanDoc(args.user));
    }
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
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

export const changePin = mutation({
  args: {
    groupId: v.string(),
    currentPin: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanGroupId = String(args.groupId).trim();
    let targetId = cleanGroupId;
    if (cleanGroupId === "u-g1" || cleanGroupId.toLowerCase() === "alpha") {
      targetId = "u-2yojq";
    } else if (cleanGroupId === "u-g2" || cleanGroupId.toLowerCase() === "beta") {
      targetId = "u-qmdps";
    }

    const allUsers = await ctx.db.query("users").collect();
    const user = allUsers.find(
      (u: any) =>
        u.id === targetId ||
        u.groupId === targetId ||
        u.id === cleanGroupId ||
        u.groupId === cleanGroupId ||
        (u.name && u.name.trim().toLowerCase() === cleanGroupId.toLowerCase()) ||
        (u.name && u.name.trim().toLowerCase() === targetId.toLowerCase())
    );

    if (!user) {
      throw new Error("Leader user not found in database");
    }

    if (String(user.pin).trim() !== String(args.currentPin).trim()) {
      throw new Error("Current password is incorrect");
    }

    const trimmedNewPin = String(args.newPin).trim();
    if (!trimmedNewPin) {
      throw new Error("New password cannot be empty");
    }

    await ctx.db.patch(user._id, {
      pin: trimmedNewPin,
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        groupId: user.groupId,
      },
    };
  },
});
