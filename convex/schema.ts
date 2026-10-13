import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  programs: defineTable({
    id: v.string(),
    name: v.string(),
    category: v.string(),
    type: v.string(),
    session: v.string(),
    maxParticipants: v.number(),
    minParticipants: v.optional(v.number()),
    criteria: v.optional(v.array(v.string())),
    date: v.optional(v.string()),
    status: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    order: v.optional(v.number()),
  }).index("by_pid", ["id"]),

  students: defineTable({
    id: v.string(),
    name: v.string(),
    chestNo: v.string(),
    category: v.string(),
    groupId: v.string(),
    groupRole: v.optional(v.string()),
  }).index("by_sid", ["id"]).index("by_group", ["groupId"]),

  registrations: defineTable({
    id: v.string(),
    programId: v.string(),
    groupId: v.string(),
    participantIds: v.array(v.string()),
  }).index("by_rid", ["id"]),

  users: defineTable({
    id: v.string(),
    name: v.string(),
    role: v.string(),
    // `pin` is the LEGACY plaintext field; it is migrated to pinHash/pinSalt on first login
    pin: v.optional(v.string()),
    pinHash: v.optional(v.string()),
    pinSalt: v.optional(v.string()),
    pinLength: v.optional(v.number()),
    groupId: v.optional(v.string()),
    color: v.optional(v.string()),
  }).index("by_uid", ["id"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.string(),
    role: v.string(),
    groupId: v.optional(v.string()),
    expiresAt: v.number(),
  }).index("by_token", ["token"]).index("by_user", ["userId"]),

  loginAttempts: defineTable({
    key: v.string(),
    count: v.number(),
    lockedUntil: v.number(),
  }).index("by_key", ["key"]),

  locks: defineTable({
    type: v.string(),
    locked: v.boolean(),
    groupId: v.optional(v.string()),
    session: v.optional(v.string()),
  }).index("by_type", ["type"]),

  messages: defineTable({
    id: v.string(),
    groupId: v.string(),
    from: v.string(),
    fromName: v.optional(v.string()),
    to: v.optional(v.string()),
    text: v.string(),
    timestamp: v.number(),
    read: v.boolean(),
    mediaType: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),          // LEGACY base64 data URL (see messagesMigrate)
    mediaStorageId: v.optional(v.id("_storage")),
    deletedFor: v.optional(v.array(v.string())),
  }).index("by_mid", ["id"]).index("by_from", ["from"]).index("by_to", ["to"]).index("by_group", ["groupId"]),

  logs: defineTable({
    id: v.string(),
    user: v.string(),
    action: v.string(),
    details: v.string(),
    timestamp: v.number(),
  }),
});
