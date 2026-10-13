import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// One-off: moves legacy base64 media out of the messages table into Convex file storage.
// Run from your machine (internal functions are not callable by clients):
//   npx convex run messagesMigrate:run
// Safe to re-run; each call processes up to ~200 messages.

// Small batches: a base64 document can be close to 1MB and a query may read ~16MB
export const legacyBatch = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ _id: any; mediaUrl: string }[]> => {
    const rows = await ctx.db.query("messages").filter((q) => q.neq(q.field("mediaUrl"), undefined)).take(8);
    return rows.filter((m) => m.mediaUrl?.startsWith("data:")).map((m) => ({ _id: m._id, mediaUrl: m.mediaUrl! }));
  },
});

export const attach = internalMutation({
  args: { id: v.id("messages"), storageId: v.id("_storage") },
  handler: async (ctx, a) => {
    await ctx.db.patch(a.id, { mediaStorageId: a.storageId, mediaUrl: undefined });
  },
});

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<{ moved: number }> => {
    let moved = 0;
    for (let i = 0; i < 25; i++) {
      const batch: { _id: any; mediaUrl: string }[] = await ctx.runQuery(internal.messagesMigrate.legacyBatch, {});
      if (!batch.length) break;
      for (const m of batch) {
        const [head, b64] = m.mediaUrl.split(",");
        const mime = /^data:([^;,]+)/.exec(head)?.[1] ?? "application/octet-stream";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        const storageId = await ctx.storage.store(new Blob([bytes], { type: mime }));
        await ctx.runMutation(internal.messagesMigrate.attach, { id: m._id, storageId });
        moved++;
      }
    }
    return { moved };
  },
});
