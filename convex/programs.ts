import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const cleanDoc = (obj: any) => {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, _creationTime, ...rest } = obj;
  return rest;
};

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
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
  args: { id: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status });
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
      const catLower = args.category.toLowerCase();
      published = published.filter(
        (p) => p.category?.toLowerCase() === catLower
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
        category: p.category,
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

