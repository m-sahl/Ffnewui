import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("locks").collect();
  },
});

export const setLock = mutation({
  args: {
    groupId: v.string(),
    session: v.string(),
    locked: v.boolean(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lockType = (args.type || `${args.groupId}_${args.session}`).toLowerCase();

    // Query all lock records and delete any matching existing entries for this group & session
    const existing = await ctx.db.query("locks").collect();
    for (const doc of existing) {
      const docType = (doc.type || `${doc.groupId}_${doc.session}`).toLowerCase();
      if (docType === lockType || (doc.groupId === args.groupId && doc.session === args.session)) {
        await ctx.db.delete(doc._id);
      }
    }

    // Insert fresh record
    await ctx.db.insert("locks", {
      groupId: args.groupId,
      session: args.session,
      type: lockType,
      locked: args.locked,
    });
  },
});
