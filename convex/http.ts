import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const jsonResponse = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status = 400) =>
  jsonResponse({ success: false, error: message }, status);

const handleCorsPreflight = httpAction(async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
});

const GROUP_COLORS = [
  "#f14d4d", "#3b82f6", "#f59e0b", "#1dd183",
  "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"
];

// ── GET /api/groups ──────────────────────────────────────────────────────────
http.route({
  path: "/api/groups",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/groups",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const allUsers = await ctx.runQuery(api.users.get);
      const groups = allUsers
        .filter((u: any) => u.role === "group")
        .map((u: any, idx: number) => ({
          id: u.id,
          name: u.name,
          color: u.color || GROUP_COLORS[idx % GROUP_COLORS.length],
          role: u.role,
        }));
      return jsonResponse({ success: true, groups });
    } catch (err: any) {
      return errorResponse(err?.message || "Failed to fetch groups", 500);
    }
  }),
});

// ── POST /api/auth/verify-pin ────────────────────────────────────────────────
http.route({
  path: "/api/auth/verify-pin",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/auth/verify-pin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { groupId, pin } = body;
      if (!groupId || !pin) {
        return errorResponse("groupId and pin are required");
      }

      const cleanGroupId = String(groupId).trim();
      let targetId = cleanGroupId;
      if (cleanGroupId === "u-g1" || cleanGroupId.toLowerCase() === "alpha") {
        targetId = "u-2yojq";
      } else if (cleanGroupId === "u-g2" || cleanGroupId.toLowerCase() === "beta") {
        targetId = "u-qmdps";
      }

      const allUsers = await ctx.runQuery(api.users.get);
      const user = allUsers.find(
        (u: any) =>
          (u.id === targetId ||
            u.groupId === targetId ||
            u.id === cleanGroupId ||
            u.groupId === cleanGroupId ||
            (u.name && u.name.trim().toLowerCase() === cleanGroupId.toLowerCase()) ||
            (u.name && u.name.trim().toLowerCase() === targetId.toLowerCase())) &&
          String(u.pin).trim() === String(pin).trim()
      );

      if (!user) {
        return errorResponse("Invalid PIN", 401);
      }

      const groupUsers = allUsers.filter((u: any) => u.role === "group");
      const userIdx = groupUsers.findIndex((u: any) => u.id === user.id);
      const userColor =
        user.color ||
        (userIdx >= 0 ? GROUP_COLORS[userIdx % GROUP_COLORS.length] : GROUP_COLORS[0]);

      return jsonResponse({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          groupId: user.groupId || user.id,
          color: userColor,
        },
      });
    } catch (err: any) {
      return errorResponse(err?.message || "Verification failed", 500);
    }
  }),
});

// ── GET /api/leader/data (with ?groupId=...) ─────────────────────────────────
http.route({
  path: "/api/leader/data",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/leader/data",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const rawGroupId = url.searchParams.get("groupId");
      if (!rawGroupId) {
        return errorResponse("groupId query parameter is required");
      }

      const groupId = rawGroupId.trim();
      let targetGroupId = groupId;
      if (groupId === "u-g1" || groupId.toLowerCase() === "alpha") {
        targetGroupId = "u-2yojq";
      } else if (groupId === "u-g2" || groupId.toLowerCase() === "beta") {
        targetGroupId = "u-qmdps";
      }

      const [allPrograms, allStudents, allRegistrations, allLocks, allMessages, allUsers] =
        await Promise.all([
          ctx.runQuery(api.programs.get),
          ctx.runQuery(api.students.get),
          ctx.runQuery(api.registrations.get),
          ctx.runQuery(api.locks.get),
          ctx.runQuery(api.messages.get),
          ctx.runQuery(api.users.get),
        ]);

      const groupUser = allUsers.find(
        (u: any) =>
          u.id === targetGroupId ||
          u.groupId === targetGroupId ||
          u.id === groupId ||
          u.groupId === groupId ||
          (u.name && u.name.trim().toLowerCase() === groupId.toLowerCase()) ||
          (u.name && u.name.trim().toLowerCase() === targetGroupId.toLowerCase())
      );

      // Collect all identifiers for this group (id, groupId, name, targetGroupId)
      const groupIdentifiers = new Set<string>();
      groupIdentifiers.add(groupId);
      groupIdentifiers.add(groupId.toLowerCase());
      groupIdentifiers.add(targetGroupId);
      groupIdentifiers.add(targetGroupId.toLowerCase());
      if (groupUser) {
        if (groupUser.id) {
          groupIdentifiers.add(groupUser.id);
          groupIdentifiers.add(groupUser.id.toLowerCase());
        }
        if (groupUser.groupId) {
          groupIdentifiers.add(groupUser.groupId);
          groupIdentifiers.add(groupUser.groupId.toLowerCase());
        }
        if (groupUser.name) {
          groupIdentifiers.add(groupUser.name);
          groupIdentifiers.add(groupUser.name.toLowerCase());
          groupIdentifiers.add(groupUser.name.trim());
        }
      }

      const groupStudents = (allStudents || []).filter((s: any) => {
        if (!s.groupId) return false;
        const sGid = String(s.groupId).trim();
        return (
          groupIdentifiers.has(sGid) ||
          groupIdentifiers.has(sGid.toLowerCase())
        );
      });

      const groupRegistrations = (allRegistrations || []).filter((r: any) => {
        if (!r.groupId) return false;
        const rGid = String(r.groupId).trim();
        return (
          groupIdentifiers.has(rGid) ||
          groupIdentifiers.has(rGid.toLowerCase())
        );
      });

      const groupMessages = (allMessages || []).filter((m: any) => {
        const mGid = m.groupId ? String(m.groupId).trim().toLowerCase() : "";
        const mTo = m.to ? String(m.to).trim().toLowerCase() : "";
        const mFrom = m.from ? String(m.from).trim().toLowerCase() : "";
        for (const id of groupIdentifiers) {
          const lower = id.toLowerCase();
          if (mGid === lower || mTo === lower || mFrom === lower) return true;
        }
        return false;
      });

      // Transform locks list to dictionary
      const lockMap: Record<string, boolean> = {};
      for (const l of allLocks || []) {
        if (!l) continue;
        const key = (l.type || `${l.groupId}_${l.session}`).toLowerCase();
        if (key) lockMap[key] = !!l.locked;
      }

      const groupIndex = allUsers
        .filter((u: any) => u.role === "group")
        .findIndex((u: any) => u.id === (groupUser?.id || targetGroupId));
      const groupColor =
        groupUser?.color ||
        (groupIndex >= 0
          ? GROUP_COLORS[groupIndex % GROUP_COLORS.length]
          : GROUP_COLORS[0]);

      // Enrich programs with published result details
      const enrichedPrograms = (allPrograms || []).map((p: any) => {
        if (!p.results?.entries) return p;
        const entries = (p.results.entries || []).map((e: any) => {
          const st = (allStudents || []).find((s: any) => String(s.id) === String(e.studentId));
          const grp = (allUsers || []).find((u: any) => u.id === (e.groupId || st?.groupId));
          return {
            ...e,
            studentName: e.studentName || st?.name,
            chestNo: e.chestNo || st?.chestNo,
            groupId: e.groupId || st?.groupId,
            groupName: e.groupName || grp?.name,
          };
        });
        const otherGrades = (p.results.otherGrades || []).map((o: any) => {
          const st = (allStudents || []).find((s: any) => String(s.id) === String(o.studentId));
          const grp = (allUsers || []).find((u: any) => u.id === (o.groupId || st?.groupId));
          return {
            ...o,
            studentName: o.studentName || st?.name,
            chestNo: o.chestNo || st?.chestNo,
            groupId: o.groupId || st?.groupId,
            groupName: o.groupName || grp?.name,
          };
        });
        return {
          ...p,
          results: {
            ...p.results,
            entries,
            otherGrades,
          },
        };
      });

      return jsonResponse({
        success: true,
        data: {
          group: groupUser
            ? { id: groupUser.id, name: groupUser.name, color: groupColor }
            : { id: targetGroupId, name: targetGroupId, color: groupColor },
          programs: enrichedPrograms,
          students: groupStudents,
          registrations: groupRegistrations,
          locks: lockMap,
          messages: groupMessages || [],
        },
      });
    } catch (err: any) {
      return errorResponse(err?.message || "Failed to fetch leader data", 500);
    }
  }),
});

// ── POST /api/leader/register ────────────────────────────────────────────────
http.route({
  path: "/api/leader/register",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/leader/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id, programId, groupId, participantIds } = body;
      if (!programId || !groupId || !Array.isArray(participantIds)) {
        return errorResponse("programId, groupId, and participantIds array are required");
      }

      let targetGroupId = String(groupId).trim();
      if (targetGroupId === "u-g1" || targetGroupId.toLowerCase() === "alpha") {
        targetGroupId = "u-2yojq";
      } else if (targetGroupId === "u-g2" || targetGroupId.toLowerCase() === "beta") {
        targetGroupId = "u-qmdps";
      }

      const allRegs = await ctx.runQuery(api.registrations.get);
      const existing = (allRegs || []).find(
        (r: any) =>
          (r.groupId === targetGroupId || r.groupId === groupId) &&
          r.programId === programId
      );

      const regId = id || existing?.id || `reg_${targetGroupId}_${programId}`;
      const registrationDoc = {
        id: regId,
        programId,
        groupId: targetGroupId,
        participantIds,
      };

      await ctx.runMutation(api.registrations.update, {
        id: regId,
        registration: registrationDoc,
      });

      return jsonResponse({ success: true, id: regId });
    } catch (err: any) {
      return errorResponse(err?.message || "Registration failed", 500);
    }
  }),
});

// ── POST /api/leader/unregister ──────────────────────────────────────────────
http.route({
  path: "/api/leader/unregister",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/leader/unregister",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id } = body;
      if (!id) {
        return errorResponse("Registration id is required");
      }

      await ctx.runMutation(api.registrations.remove, { id });
      return jsonResponse({ success: true, id });
    } catch (err: any) {
      return errorResponse(err?.message || "Unregistration failed", 500);
    }
  }),
});

// ── POST /api/leader/messages/send ───────────────────────────────────────────
http.route({
  path: "/api/leader/messages/send",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/leader/messages/send",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id, groupId, from, fromName, to, text, timestamp, mediaType, mediaUrl } = body;
      if (!groupId || (!text && !mediaUrl) || !from) {
        return errorResponse("groupId, from, and text/media are required");
      }

      const msgId = id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await ctx.runMutation(api.messages.send, {
        id: msgId,
        groupId,
        from,
        fromName: fromName || from,
        to: to || "admin",
        text: text || "",
        timestamp: timestamp || Date.now(),
        read: false,
        mediaType: mediaType || undefined,
        mediaUrl: mediaUrl || undefined,
      });

      return jsonResponse({ success: true, id: msgId });
    } catch (err: any) {
      return errorResponse(err?.message || "Failed to send message", 500);
    }
  }),
});

// ── POST /api/leader/messages/read ───────────────────────────────────────────
http.route({
  path: "/api/leader/messages/read",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/leader/messages/read",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { groupId } = body;
      if (!groupId) {
        return errorResponse("groupId is required");
      }

      await ctx.runMutation(api.messages.markRead, { groupId });
      return jsonResponse({ success: true });
    } catch (err: any) {
      return errorResponse(err?.message || "Failed to mark messages as read", 500);
    }
  }),
});

// ── GET /api/results (with optional ?category=...&groupId=...) ────────────────
http.route({
  path: "/api/results",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/results",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const category = url.searchParams.get("category") || undefined;
      const groupId = url.searchParams.get("groupId") || undefined;

      const data = await ctx.runQuery(api.programs.getPublishedResults, {
        category,
        groupId,
      });

      return jsonResponse({
        success: true,
        count: data.results.length,
        results: data.results,
        leaderboard: data.leaderboard,
      });
    } catch (err: any) {
      return errorResponse(err?.message || "Failed to fetch published results", 500);
    }
  }),
});

// ── GET /api/published-results (alias) ───────────────────────────────────────
http.route({
  path: "/api/published-results",
  method: "OPTIONS",
  handler: handleCorsPreflight,
});

http.route({
  path: "/api/published-results",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const category = url.searchParams.get("category") || undefined;
      const groupId = url.searchParams.get("groupId") || undefined;

      const data = await ctx.runQuery(api.programs.getPublishedResults, {
        category,
        groupId,
      });

      return jsonResponse({
        success: true,
        count: data.results.length,
        results: data.results,
        leaderboard: data.leaderboard,
      });
    } catch (err: any) {
      return errorResponse(err?.message || "Failed to fetch published results", 500);
    }
  }),
});

export default http;
