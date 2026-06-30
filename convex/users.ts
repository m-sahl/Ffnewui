import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const GROUP_COLORS = ["#6c63ff","#22d3ee","#f472b6","#34d399","#fb923c","#60a5fa","#a78bfa","#fbbf24","#f87171","#2dd4bf"];

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Returns groups (role === "group") with assigned colors, same shape as old `groups` array
export const listGroups = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").filter(q => q.eq(q.field("role"), "group")).collect();
    return users.map((u, i) => ({
      id: u._id,
      name: u.name,
      color: u.color || GROUP_COLORS[i % GROUP_COLORS.length],
    }));
  },
});

// Ensures the default admin exists — call once on app load
export const ensureAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("users").filter(q => q.eq(q.field("role"), "admin")).first();
    if (!existing) {
      await ctx.db.insert("users", { name: "System Admin", role: "admin", pin: "admin" });
    }
  },
});

export const addGroup = mutation({
  args: { name: v.string(), pin: v.string() },
  handler: async (ctx, { name, pin }) => {
    return await ctx.db.insert("users", { name, role: "group", pin });
  },
});

export const editGroup = mutation({
  args: { id: v.id("users"), name: v.string(), pin: v.string() },
  handler: async (ctx, { id, name, pin }) => {
    await ctx.db.patch(id, { name, pin });
  },
});

export const deleteGroup = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const changeAdminPassword = mutation({
  args: { newPin: v.string() },
  handler: async (ctx, { newPin }) => {
    const admin = await ctx.db.query("users").filter(q => q.eq(q.field("role"), "admin")).first();
    if (admin) await ctx.db.patch(admin._id, { pin: newPin });
  },
});

// Verify login — returns the user if pin matches, else null
export const verifyLogin = query({
  args: { id: v.id("users"), pin: v.string() },
  handler: async (ctx, { id, pin }) => {
    const user = await ctx.db.get(id);
    if (!user || user.pin !== pin) return null;
    return user;
  },
});
