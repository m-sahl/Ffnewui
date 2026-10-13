import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSession, requireSession, isAllowedMedia } from "./helpers";

// Step 1 of sending media: client uploads the file straight to Convex storage with this URL
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

// Admin sees every thread. A group leader only sees messages they sent or that were addressed to them.
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await getSession(ctx, args.token);
    if (!s) return [];
    let rows;
    if (s.role === "admin") {
      // newest N only — the subscription must not grow forever
      rows = (await ctx.db.query("messages").order("desc").take(ADMIN_LIMIT)).reverse();
    } else {
      const gid = s.groupId;
      if (!gid) return [];
      const [a, b, c] = await Promise.all([
        ctx.db.query("messages").withIndex("by_from", (q) => q.eq("from", gid)).order("desc").take(GROUP_LIMIT),
        ctx.db.query("messages").withIndex("by_to", (q) => q.eq("to", gid)).order("desc").take(GROUP_LIMIT),
        ctx.db.query("messages").withIndex("by_group", (q) => q.eq("groupId", gid)).order("desc").take(GROUP_LIMIT),
      ]);
      const seen = new Set<string>();
      rows = [...a, ...b, ...c]
        .filter((m) => (seen.has(m._id) ? false : (seen.add(m._id), true)))
        .sort((x, y) => x.timestamp - y.timestamp)
        .slice(-GROUP_LIMIT);
    }
    // Files live in Convex storage; hand the client a URL instead of an inline blob
    return await Promise.all(
      rows.map(async (m) => (m.mediaStorageId ? { ...m, mediaUrl: (await ctx.storage.getUrl(m.mediaStorageId)) ?? undefined } : m))
    );
  },
});

const ADMIN_LIMIT = 500;
const GROUP_LIMIT = 300;
const MAX_TEXT = 4000;

export const send = mutation({
  args: {
    token: v.string(),
    id: v.string(),
    groupId: v.string(),
    from: v.string(),
    fromName: v.optional(v.string()),
    to: v.optional(v.string()),
    text: v.string(),
    timestamp: v.number(),
    read: v.boolean(),
    mediaType: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    deletedFor: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    if (args.text.length > MAX_TEXT) throw new Error("Message too long");

    // Media must be a file in Convex storage, of the declared type and a sane size.
    // Inline URLs (data:/javascript:/external) are rejected outright.
    let mediaType = args.mediaType;
    const mediaStorageId = args.mediaStorageId;
    if (args.mediaUrl) throw new Error("Invalid media");
    if (mediaStorageId) {
      const meta = await ctx.db.system.get(mediaStorageId);
      if (!isAllowedMedia(meta, mediaType)) throw new Error("Invalid media");
    } else { mediaType = undefined; }

    // Sender identity and routing are decided by the server, never trusted from the client
    let from: string, to: string, groupId: string, fromName: string | undefined;
    if (s.role === "admin") {
      if (!args.to) throw new Error("Missing recipient");
      from = "admin"; to = args.to; groupId = args.to; fromName = args.fromName;
    } else {
      const user = await ctx.db.query("users").withIndex("by_uid", (q) => q.eq("id", s.userId)).first();
      from = s.groupId!; to = "admin"; groupId = "admin"; fromName = user?.name;
    }

    await ctx.db.insert("messages", {
      id: args.id, groupId, from, fromName, to,
      text: args.text, timestamp: Date.now(), read: false,
      mediaType, mediaStorageId,
    });
  },
});

// Marks messages addressed to the caller as read (admin -> "admin", leader -> own group id)
export const markRead = mutation({
  args: { token: v.string(), groupId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    const me = s.role === "admin" ? "admin" : s.groupId!;
    const unread = await ctx.db.query("messages").withIndex("by_to", (q) => q.eq("to", me)).collect();
    for (const msg of unread) if (!msg.read) await ctx.db.patch(msg._id, { read: true });
  },
});

export const deleteMsg = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    const msg = await ctx.db.query("messages").withIndex("by_mid", (q) => q.eq("id", args.id)).first();
    if (!msg) return;
    // Leaders may only delete messages they sent
    if (s.role !== "admin" && msg.from !== s.groupId) throw new Error("Forbidden");
    if (msg.mediaStorageId) await ctx.storage.delete(msg.mediaStorageId);
    await ctx.db.delete(msg._id);
  },
});
