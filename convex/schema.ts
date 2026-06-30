import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Users (admin + group leaders) ──────────────────────────────────────────
  users: defineTable({
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("group")),
    pin: v.string(),
    color: v.optional(v.string()),
  }),

  // ── Students ──────────────────────────────────────────────────────────────
  students: defineTable({
    groupId: v.id("users"),
    name: v.string(),
    category: v.union(v.literal("Sub-Junior"), v.literal("Junior"), v.literal("Senior")),
    chestNo: v.string(),
    groupRole: v.optional(v.union(v.literal("Leader"), v.literal("Asst. Leader"), v.literal("Member"))),
  }).index("by_group", ["groupId"]),

  // ── Programs ──────────────────────────────────────────────────────────────
  programs: defineTable({
    name: v.string(),
    session: v.union(v.literal("Stage"), v.literal("Off-Stage"), v.literal("General")),
    category: v.union(v.literal("Sub-Junior"), v.literal("Junior"), v.literal("Senior")),
    type: v.union(v.literal("Single"), v.literal("Group")),
    maxParticipants: v.number(),
    criteria: v.array(v.string()),
    order: v.number(),
  }).index("by_session", ["session"]),

  // ── Registrations ─────────────────────────────────────────────────────────
  registrations: defineTable({
    groupId: v.id("users"),
    programId: v.id("programs"),
    participantIds: v.array(v.id("students")),
  })
    .index("by_group", ["groupId"])
    .index("by_program", ["programId"]),

  // ── Session locks (per group, per session) ───────────────────────────────
  locks: defineTable({
    groupId: v.id("users"),
    session: v.union(v.literal("Stage"), v.literal("Off-Stage"), v.literal("General")),
    locked: v.boolean(),
  }).index("by_group_session", ["groupId", "session"]),

  // ── Messages (admin <-> group leader chat) ───────────────────────────────
  messages: defineTable({
    from: v.string(),  // "admin" or groupId string
    fromName: v.string(),
    to: v.string(),    // "admin" or groupId string
    text: v.string(),
    read: v.boolean(),
    deletedFor: v.array(v.string()),
  }).index("by_to", ["to"]),

  // ── Activity logs ─────────────────────────────────────────────────────────
  activityLogs: defineTable({
    userName: v.string(),
    action: v.string(),
    details: v.string(),
  }),
});
