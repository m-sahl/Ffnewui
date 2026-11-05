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
    const normSession = (args.session || "").toLowerCase().includes("off") ? "off-stage" : "stage";
    const displaySession = normSession === "off-stage" ? "Off-Stage" : "Stage";
    const lockType = (args.type || `${args.groupId}_${normSession}`).toLowerCase();

    // Query all lock records and delete any matching existing entries for this group & session
    const existing = await ctx.db.query("locks").collect();
    for (const doc of existing) {
      const docType = (doc.type || `${doc.groupId}_${doc.session}`).toLowerCase();
      const docSess = (doc.session || "").toLowerCase().includes("off") ? "off-stage" : (doc.session ? "stage" : "");
      if (
        docType === lockType ||
        (doc.groupId?.toLowerCase() === args.groupId.toLowerCase() && (docSess === normSession || !docSess))
      ) {
        await ctx.db.delete(doc._id);
      }
    }

    // Insert fresh record
    await ctx.db.insert("locks", {
      groupId: args.groupId,
      session: displaySession,
      type: lockType,
      locked: args.locked,
    });
  },
});
