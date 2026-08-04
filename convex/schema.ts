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
  }),

  students: defineTable({
    id: v.string(),
    name: v.string(),
    chestNo: v.string(),
    category: v.string(),
    groupId: v.string(),
    groupRole: v.optional(v.string()),
  }),

  registrations: defineTable({
    id: v.string(),
    programId: v.string(),
    groupId: v.string(),
    participantIds: v.array(v.string()),
  }),

  users: defineTable({
    id: v.string(),
    name: v.string(),
    role: v.string(),
    pin: v.string(),
    groupId: v.optional(v.string()),
    color: v.optional(v.string()),
  }),

  locks: defineTable({
    type: v.string(),
    locked: v.boolean(),
    groupId: v.optional(v.string()),
    session: v.optional(v.string()),
  }),

  messages: defineTable({
    id: v.string(),
    groupId: v.string(),
    from: v.string(),
    text: v.string(),
    timestamp: v.number(),
    read: v.boolean(),
  }),

  logs: defineTable({
    id: v.string(),
    user: v.string(),
    action: v.string(),
    details: v.string(),
    timestamp: v.number(),
  }),
});
