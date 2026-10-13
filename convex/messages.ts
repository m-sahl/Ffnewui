import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSession, requireSession } from "./helpers";

// Admin sees every thread. A group leader only sees messages they sent or that were addressed to them.
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await getSession(ctx, args.token);
    if (!s) return [];
    if (s.role === "admin") return await ctx.db.query("messages").collect();
    const gid = s.groupId;
    if (!gid) return [];
    const [a, b, c] = await Promise.all([
      ctx.db.query("messages").withIndex("by_from", (q) => q.eq("from", gid)).collect(),
      ctx.db.query("messages").withIndex("by_to", (q) => q.eq("to", gid)).collect(),
      ctx.db.query("messages").withIndex("by_group", (q) => q.eq("groupId", gid)).collect(),
    ]);
    const seen = new Set<string>();
    return [...a, ...b, ...c].filter((m) => (seen.has(m._id) ? false : (seen.add(m._id), true)));
  },
});

const MAX_TEXT = 4000;
const MAX_MEDIA = 900_000; // stays under Convex's 1MB document limit

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
    deletedFor: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const s = await requireSession(ctx, args.token);
    if (args.text.length > MAX_TEXT) throw new Error("Message too long");

    // Media must be an inline image/audio data URL — blocks javascript:/external URLs
    let mediaType = args.mediaType, mediaUrl = args.mediaUrl;
    if (mediaUrl) {
      const okType = mediaType === "image" ? "data:image/" : mediaType === "audio" ? "data:audio/" : null;
      if (!okType || !mediaUrl.startsWith(okType) || mediaUrl.length > MAX_MEDIA) throw new Error("Invalid media");
    } else { mediaType = undefined; mediaUrl = undefined; }

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
      mediaType, mediaUrl,
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
    await ctx.db.delete(msg._id);
  },
});
