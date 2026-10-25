import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

async function validateQuota(ctx: any, registration: any) {
  if (registration?.adminOverride === true) return;
  if (!registration?.programId || !Array.isArray(registration?.participantIds) || registration.participantIds.length === 0) {
    return;
  }

  const program = await ctx.db
    .query("programs")
    .filter((q: any) => q.eq(q.field("id"), registration.programId))
    .first();

  if (!program) return;
  const maxParts = program.maxParticipants !== undefined ? Number(program.maxParticipants) : 1;
  // Solo items only
  if (maxParts !== 1) return;

  const sessionType = (program.type || program.session || "Stage") === "Off-Stage" ? "Off-Stage" : "Stage";

  // Get current limits
  const setting = await ctx.db
    .query("settings")
    .filter((q: any) => q.eq(q.field("key"), "programLimits"))
    .first();

  const maxLimit = sessionType === "Off-Stage" 
    ? (typeof setting?.value?.maxOffStage === "number" ? setting.value.maxOffStage : 3) 
    : (typeof setting?.value?.maxStage === "number" ? setting.value.maxStage : 3);

  // Fetch all registrations and all solo programs in this session to count
  const [allRegs, allProgs, allStudents] = await Promise.all([
    ctx.db.query("registrations").collect(),
    ctx.db.query("programs").collect(),
    ctx.db.query("students").collect(),
  ]);

  const soloSessionProgIds = new Set(
    allProgs
      .filter((p: any) => {
        const pMax = p.maxParticipants !== undefined ? Number(p.maxParticipants) : 1;
        const pSess = (p.type || p.session || "Stage") === "Off-Stage" ? "Off-Stage" : "Stage";
        return pMax === 1 && pSess === sessionType;
      })
      .map((p: any) => p.id)
  );

  const studentMap = new Map<string, string>();
  for (const s of allStudents) {
    studentMap.set(String(s.id), s.name || `Chest #${s.chestNo}`);
  }

  for (const studentId of registration.participantIds) {
    const sId = String(studentId);
    let count = 0;
    for (const r of allRegs) {
      if (r.id === registration.id) continue;
      if (soloSessionProgIds.has(r.programId) && Array.isArray(r.participantIds) && r.participantIds.map(String).includes(sId)) {
        count++;
      }
    }

    if (count >= maxLimit) {
      const studentName = studentMap.get(sId) || `Student #${sId}`;
      throw new Error(`Quota exceeded: ${studentName} already has ${count} ${sessionType} solo entries (Max allowed: ${maxLimit}).`);
    }
  }
}

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("registrations").collect();
  },
});

export const add = mutation({
  args: { registration: v.any() },
  handler: async (ctx, args) => {
    try {
      await validateQuota(ctx, args.registration);
      const doc = cleanDoc(args.registration);
      await ctx.db.insert("registrations", doc);
      return { success: true, id: doc.id };
    } catch (error) {
      console.error("Registration add failed:", error);
      throw error;
    }
  },
});

export const addRegistration = mutation({
  args: { registration: v.any() },
  handler: async (ctx, args) => {
    try {
      if (!args.registration || !args.registration.id) {
        throw new Error("Registration must have an id");
      }
      await validateQuota(ctx, args.registration);
      const doc = cleanDoc(args.registration);
      await ctx.db.insert("registrations", doc);
      return { success: true, id: doc.id };
    } catch (error) {
      console.error("Registration addRegistration failed:", error);
      throw error;
    }
  },
});

export const update = mutation({
  args: { id: v.string(), registration: v.any() },
  handler: async (ctx, args) => {
    try {
      const regWithId = { ...args.registration, id: args.id };
      await validateQuota(ctx, regWithId);
      const existing = await ctx.db
        .query("registrations")
        .filter((q) => q.eq(q.field("id"), args.id))
        .first();
      if (existing) {
        const doc = cleanDoc(regWithId);
        await ctx.db.patch(existing._id, doc);
        return { success: true, id: args.id };
      } else {
        const doc = cleanDoc(regWithId);
        await ctx.db.insert("registrations", doc);
        return { success: true, id: args.id, created: true };
      }
    } catch (error) {
      console.error("Registration update failed:", error);
      throw error;
    }
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      const existing = await ctx.db
        .query("registrations")
        .filter((q) => q.eq(q.field("id"), args.id))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
        return { success: true, id: args.id };
      }
      return { success: false, id: args.id, reason: "not found" };
    } catch (error) {
      console.error("Registration remove failed:", error);
      throw error;
    }
  },
});

export const setAll = mutation({
  args: { registrations: v.array(v.any()) },
  handler: async (ctx, args) => {
    try {
      const all = await ctx.db.query("registrations").collect();
      for (const item of all) {
        await ctx.db.delete(item._id);
      }
      for (const r of args.registrations) {
        if (r && r.id) {
          await ctx.db.insert("registrations", cleanDoc(r));
        }
      }
      return { success: true, count: args.registrations.length };
    } catch (error) {
      console.error("Registration setAll failed:", error);
      throw error;
    }
  },
});
