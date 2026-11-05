import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

export const normalizeCategory = (cat?: string): string | undefined => {
  if (!cat || cat.toLowerCase() === "all") return undefined;
  const c = String(cat).trim().toLowerCase();
  if (c.includes("sub") || c === "sj" || c === "low") return "Low";
  if (c.includes("jun") || c === "jr" || c === "mid") return "Mid";
  if (c.includes("sen") || c === "sr" || c === "high") return "High";
  if (c.includes("gen")) return "General";
  return cat;
};

export const get = query({
  handler: async (ctx) => {
    const list = await ctx.db.query("programs").collect();
    return list.map((p) => ({
      ...p,
      category: normalizeCategory(p.category) || p.category,
    }));
  },
});

export const add = mutation({
  args: { program: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("programs", cleanDoc(args.program));
  },
});

export const update = mutation({
  args: { id: v.string(), program: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, cleanDoc(args.program));
    } else {
      await ctx.db.insert("programs", cleanDoc(args.program));
    }
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const setAll = mutation({
  args: { programs: v.array(v.any()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("programs").collect();
    for (const item of all) {
      await ctx.db.delete(item._id);
    }
    for (const p of args.programs) {
      if (p && p.id) {
        await ctx.db.insert("programs", cleanDoc(p));
      }
    }
  },
});

export const updateStatus = mutation({
  args: {
    id: v.string(),
    status: v.string(),
    participantsHistory: v.optional(v.any()),
    codeAllocations: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      const patch: any = { status: args.status };
      if (args.participantsHistory !== undefined) {
        patch.participantsHistory = args.participantsHistory;
        patch.codeAllocations = args.participantsHistory;
        if (!existing.judgeToken) {
          patch.judgeToken = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        if (!existing.evaluationStatus || existing.evaluationStatus === "pending_lots") {
          patch.evaluationStatus = "ready_for_judge";
        }
      }
      if (args.codeAllocations !== undefined) {
        patch.codeAllocations = args.codeAllocations;
      }
      await ctx.db.patch(existing._id, patch);
    }
  },
});

export const updateParticipantsHistory = mutation({
  args: {
    id: v.string(),
    participantsHistory: v.any(),
    status: v.optional(v.string()),
    codeAllocations: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      const patch: any = {
        participantsHistory: args.participantsHistory,
        codeAllocations: args.codeAllocations !== undefined ? args.codeAllocations : args.participantsHistory,
      };
      if (args.status !== undefined) {
        patch.status = args.status;
      }
      if (!existing.judgeToken) {
        patch.judgeToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
      if (!existing.evaluationStatus || existing.evaluationStatus === "pending_lots") {
        patch.evaluationStatus = "ready_for_judge";
      }
      await ctx.db.patch(existing._id, patch);
    }
  },
});

export const updateDate = mutation({
  args: { id: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { date: args.date });
    }
  },
});

export const getPublishedResults = query({
  args: {
    category: v.optional(v.string()),
    groupId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [allPrograms, allStudents, allUsers] = await Promise.all([
      ctx.db.query("programs").collect(),
      ctx.db.query("students").collect(),
      ctx.db.query("users").collect(),
    ]);

    const studentMap = new Map<string, any>();
    for (const s of allStudents) {
      studentMap.set(String(s.id), s);
    }

    const groupUsers = allUsers.filter((u: any) => u.role === "group");
    const GROUP_COLORS = ["#f14d4d", "#3b82f6", "#f59e0b", "#1dd183", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];
    const groupMap = new Map<string, any>();
    groupUsers.forEach((u: any, idx: number) => {
      groupMap.set(String(u.id), {
        id: u.id,
        name: u.name,
        color: u.color || GROUP_COLORS[idx % GROUP_COLORS.length],
      });
    });

    let published = allPrograms.filter(
      (p) => p.status === "published" || (p.results?.entries && p.results.entries.length > 0)
    );

    if (args.category && args.category !== "All") {
      const targetCat = normalizeCategory(args.category);
      published = published.filter(
        (p) => normalizeCategory(p.category) === targetCat
      );
    }

    published.sort((a, b) => (a.order || 0) - (b.order || 0));

    const enrichedResults = published.map((p) => {
      const rawEntries = Array.isArray(p.results?.entries) ? p.results.entries : [];
      const rawOtherGrades = Array.isArray(p.results?.otherGrades) ? p.results.otherGrades : [];

      const entries = rawEntries.map((e: any, idx: number) => {
        const place = e.place !== undefined ? Number(e.place) : idx + 1;
        const placeLabel = place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`;
        const student = studentMap.get(String(e.studentId));
        const groupId = e.groupId || student?.groupId || "";
        const group = groupMap.get(groupId);

        return {
          place,
          placeLabel,
          studentId: String(e.studentId),
          studentName: e.studentName || student?.name || `Contestant #${e.studentId}`,
          chestNo: e.chestNo || student?.chestNo || "",
          codeLetter: e.codeLetter || "",
          groupId,
          groupName: e.groupName || group?.name || groupId || "Team",
          groupColor: e.groupColor || group?.color || "#f14d4d",
          points: e.points !== undefined && e.points !== "" ? Number(e.points) : 0,
          grade: e.grade || "—",
        };
      });

      const otherGrades = rawOtherGrades.map((o: any) => {
        const student = studentMap.get(String(o.studentId));
        const groupId = o.groupId || student?.groupId || "";
        const group = groupMap.get(groupId);

        return {
          studentId: String(o.studentId),
          studentName: o.studentName || student?.name || `Contestant #${o.studentId}`,
          chestNo: o.chestNo || student?.chestNo || "",
          codeLetter: o.codeLetter || "",
          groupId,
          groupName: o.groupName || group?.name || groupId || "Team",
          groupColor: o.groupColor || group?.color || "#f14d4d",
          grade: o.grade || "—",
        };
      });

      return {
        id: p.id,
        name: p.name,
        code: p.order || p.id,
        order: p.order,
        category: normalizeCategory(p.category) || p.category,
        type: p.type,
        session: p.session,
        publishedAt: p.results?.publishedAt || null,
        results: {
          entries,
          otherGrades,
          publishedAt: p.results?.publishedAt || null,
        },
      };
    });

    // Calculate leaderboard / team standings
    const scores: Record<string, any> = {};
    groupUsers.forEach((u: any, idx: number) => {
      scores[u.id] = {
        group: {
          id: u.id,
          name: u.name,
          color: u.color || GROUP_COLORS[idx % GROUP_COLORS.length],
        },
        totalPoints: 0,
        firsts: 0,
        seconds: 0,
        thirds: 0,
        gradeA: 0,
        gradeB: 0,
        gradeC: 0,
        totalAwards: 0,
      };
    });

    enrichedResults.forEach((p) => {
      p.results.entries.forEach((e: any) => {
        if (e.groupId) {
          if (!scores[e.groupId]) {
            scores[e.groupId] = {
              group: {
                id: e.groupId,
                name: e.groupName || e.groupId,
                color: e.groupColor || "#f14d4d",
              },
              totalPoints: 0,
              firsts: 0,
              seconds: 0,
              thirds: 0,
              gradeA: 0,
              gradeB: 0,
              gradeC: 0,
              totalAwards: 0,
            };
          }
          scores[e.groupId].totalPoints += Number(e.points) || 0;
          if (e.place === 1) scores[e.groupId].firsts += 1;
          else if (e.place === 2) scores[e.groupId].seconds += 1;
          else if (e.place === 3) scores[e.groupId].thirds += 1;
          if (e.grade === "A") scores[e.groupId].gradeA += 1;
          else if (e.grade === "B") scores[e.groupId].gradeB += 1;
          else if (e.grade === "C") scores[e.groupId].gradeC += 1;
          scores[e.groupId].totalAwards += 1;
        }
      });

      p.results.otherGrades.forEach((o: any) => {
        if (o.groupId) {
          if (!scores[o.groupId]) {
            scores[o.groupId] = {
              group: {
                id: o.groupId,
                name: o.groupName || o.groupId,
                color: o.groupColor || "#f14d4d",
              },
              totalPoints: 0,
              firsts: 0,
              seconds: 0,
              thirds: 0,
              gradeA: 0,
              gradeB: 0,
              gradeC: 0,
              totalAwards: 0,
            };
          }
          if (o.grade === "A") scores[o.groupId].gradeA += 1;
          else if (o.grade === "B") scores[o.groupId].gradeB += 1;
          else if (o.grade === "C") scores[o.groupId].gradeC += 1;
          scores[o.groupId].totalAwards += 1;
        }
      });
    });

    const leaderboard = Object.values(scores)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.firsts !== a.firsts) return b.firsts - a.firsts;
        return b.seconds - a.seconds;
      })
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
      }));

    return {
      results: enrichedResults,
      leaderboard,
    };
  },
});

export const migrateCategories = mutation({
  args: {},
  handler: async (ctx) => {
    let programsUpdated = 0;
    let studentsUpdated = 0;

    const allPrograms = await ctx.db.query("programs").collect();
    for (const p of allPrograms) {
      const norm = normalizeCategory(p.category);
      if (norm && norm !== p.category) {
        await ctx.db.patch(p._id, { category: norm });
        programsUpdated++;
      }
    }

    const allStudents = await ctx.db.query("students").collect();
    for (const s of allStudents) {
      const norm = normalizeCategory(s.category);
      if (norm && norm !== s.category) {
        await ctx.db.patch(s._id, { category: norm });
        studentsUpdated++;
      }
    }

    return { programsUpdated, studentsUpdated };
  },
});

export const getProgramByJudgeToken = query({
  args: { judgeToken: v.string() },
  handler: async (ctx, args) => {
    if (!args.judgeToken) return null;
    const token = String(args.judgeToken).trim();
    const program = await ctx.db
      .query("programs")
      .filter((q) => q.or(q.eq(q.field("judgeToken"), token), q.eq(q.field("id"), token)))
      .first();

    if (!program) return null;

    // Return blind data only: no student names, no chest numbers, no groups
    const rawLots =
      program.participantsHistory ||
      program.codeAllocations ||
      program.codeLetters ||
      [];

    const seenLetters = new Set<string>();
    const blindCodeLetters = rawLots
      .filter((c: any) => c && c.codeLetter)
      .map((c: any) => ({
        codeLetter: String(c.codeLetter || "").toUpperCase(),
      }))
      .filter((c: any) => {
        if (seenLetters.has(c.codeLetter)) return false;
        seenLetters.add(c.codeLetter);
        return true;
      })
      .sort((a: any, b: any) => a.codeLetter.localeCompare(b.codeLetter));

    return {
      id: program.id,
      name: program.name,
      category: program.category,
      type: program.type,
      session: program.session,
      codeLetters: blindCodeLetters,
      isSubmitted: !!program.judgeSubmission,
      judgeSubmission: program.judgeSubmission || null,
      evaluationStatus: program.evaluationStatus || "ready_for_judge",
    };
  },
});

export const generateJudgeToken = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!existing) throw new Error("Program not found");

    if (existing.judgeToken) {
      return existing.judgeToken;
    }

    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    await ctx.db.patch(existing._id, {
      judgeToken: token,
      evaluationStatus: existing.evaluationStatus || "ready_for_judge",
    });
    return token;
  },
});

export const submitJudgeScores = mutation({
  args: {
    judgeToken: v.string(),
    scores: v.array(
      v.object({
        codeLetter: v.string(),
        score: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const token = String(args.judgeToken).trim();
    const program = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("judgeToken"), token))
      .first();

    if (!program) throw new Error("Invalid judge token");

    await ctx.db.patch(program._id, {
      judgeSubmission: {
        submittedAt: Date.now(),
        scores: args.scores,
      },
      evaluationStatus: "submitted",
    });

    return { success: true };
  },
});

export const saveCodeLetters = mutation({
  args: {
    id: v.string(),
    codeLetters: v.array(
      v.object({
        codeLetter: v.string(),
        chestNo: v.string(),
        studentId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!existing) throw new Error("Program not found");

    const token = existing.judgeToken || Math.random().toString(36).substring(2, 8).toUpperCase();
    const nextStatus =
      existing.evaluationStatus === "submitted" ||
      existing.evaluationStatus === "confirmed" ||
      existing.evaluationStatus === "published"
        ? existing.evaluationStatus
        : "ready_for_judge";

    await ctx.db.patch(existing._id, {
      codeLetters: args.codeLetters,
      judgeToken: token,
      evaluationStatus: nextStatus,
    });

    return { success: true, judgeToken: token };
  },
});

export const confirmEvaluation = mutation({
  args: {
    id: v.string(),
    confirmedResults: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!existing) throw new Error("Program not found");

    await ctx.db.patch(existing._id, {
      confirmedResults: args.confirmedResults,
      evaluationStatus: "confirmed",
    });

    return { success: true };
  },
});

export const publishConfirmedResults = mutation({
  args: {
    id: v.string(),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!existing) throw new Error("Program not found");

    await ctx.db.patch(existing._id, {
      status: "published",
      evaluationStatus: "published",
      results: args.results,
    });

    return { success: true };
  },
});


