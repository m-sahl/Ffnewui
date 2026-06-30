import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const CHEST_BASE = { "Sub-Junior": 100, "Junior": 200, "Senior": 300 };

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("students").collect();
  },
});

export const listByGroup = query({
  args: { groupId: v.id("users") },
  handler: async (ctx, { groupId }) => {
    return await ctx.db.query("students").withIndex("by_group", q => q.eq("groupId", groupId)).collect();
  },
});

export const add = mutation({
  args: { groupId: v.id("users"), name: v.string(), category: v.union(v.literal("Sub-Junior"), v.literal("Junior"), v.literal("Senior")) },
  handler: async (ctx, { groupId, name, category }) => {
    const all = await ctx.db.query("students").collect();
    const inCat = all.filter(s => s.category === category);
    const maxUsed = inCat.reduce((max, s) => Math.max(max, parseInt(s.chestNo) || 0), CHEST_BASE[category]);
    const chestNo = (maxUsed + 1).toString();
    return await ctx.db.insert("students", { groupId, name, category, chestNo, groupRole: "Member" });
  },
});

export const updateRole = mutation({
  args: { id: v.id("students"), groupRole: v.union(v.literal("Leader"), v.literal("Asst. Leader"), v.literal("Member")) },
  handler: async (ctx, { id, groupRole }) => {
    const student = await ctx.db.get(id);
    if (!student) return;
    // Demote any existing holder of the same role within the group
    if (groupRole === "Leader" || groupRole === "Asst. Leader") {
      const groupMates = await ctx.db.query("students").withIndex("by_group", q => q.eq("groupId", student.groupId)).collect();
      for (const mate of groupMates) {
        if (mate._id !== id && mate.groupRole === groupRole) {
          await ctx.db.patch(mate._id, { groupRole: "Member" });
        }
      }
    }
    await ctx.db.patch(id, { groupRole });
  },
});

export const remove = mutation({
  args: { id: v.id("students") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
