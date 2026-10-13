/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const seedGroup = (t: any, id: string, pin: string) =>
  t.run((ctx: any) => ctx.db.insert("users", { id, name: `Group ${id}`, role: "group", groupId: id, pin }));

const loginGroup = async (t: any, id: string, pin: string) => {
  const r = await t.mutation(api.auth.login, { role: "group", userId: id, secret: pin });
  if (!r.ok) throw new Error("login failed");
  return r.token as string;
};

let t: ReturnType<typeof convexTest>;
let adminToken: string;

beforeEach(async () => {
  (globalThis as any).process = { env: { ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-pass-1" } };
  t = convexTest(schema, modules);
  const r: any = await t.mutation(api.auth.login, { role: "admin", secret: "bootstrap-pass-1" });
  adminToken = r.token;
});

describe("auth", () => {
  it("bootstraps admin from env only; wrong/default password is rejected", async () => {
    const bad = await t.mutation(api.auth.login, { role: "admin", secret: "admin" });
    expect(bad.ok).toBe(false);
    expect(adminToken).toBeTruthy();
  });

  it("never leaks pins/hashes before login, and migrates legacy plaintext PINs", async () => {
    await seedGroup(t, "g1", "1234");
    const list: any[] = await t.query(api.users.listPublic, {});
    expect(JSON.stringify(list)).not.toMatch(/pin(Hash|Salt)?"?:\s*"/);
    expect(list[0]).toMatchObject({ id: "g1", pinLength: 4 });

    await loginGroup(t, "g1", "1234");
    const doc: any = await t.run((ctx: any) => ctx.db.query("users").withIndex("by_uid", (q: any) => q.eq("id", "g1")).first());
    expect(doc.pin).toBeUndefined();
    expect(doc.pinHash).toBeTruthy();
    expect((await t.mutation(api.auth.login, { role: "group", userId: "g1", secret: "1234" })).ok).toBe(true);
  });

  it("locks out after 5 bad attempts, even for the correct PIN", async () => {
    await seedGroup(t, "g1", "1234");
    for (let i = 0; i < 5; i++) await t.mutation(api.auth.login, { role: "group", userId: "g1", secret: "0000" });
    const r: any = await t.mutation(api.auth.login, { role: "group", userId: "g1", secret: "1234" });
    expect(r).toMatchObject({ ok: false, reason: "locked" });
  });

  it("a group id can't be used to obtain an admin session", async () => {
    const r = await t.mutation(api.auth.login, { role: "group", userId: "u-admin", secret: "bootstrap-pass-1" });
    expect(r.ok).toBe(false);
  });

  it("changePassword revokes other sessions and enforces min length", async () => {
    const other: any = await t.mutation(api.auth.login, { role: "admin", secret: "bootstrap-pass-1" });
    await expect(t.mutation(api.auth.changePassword, { token: adminToken, newPassword: "short" })).rejects.toThrow();
    await t.mutation(api.auth.changePassword, { token: adminToken, newPassword: "a-new-strong-pass" });
    expect(await t.query(api.auth.me, { token: other.token })).toBeNull();
    expect(await t.query(api.auth.me, { token: adminToken })).not.toBeNull();
    expect((await t.mutation(api.auth.login, { role: "admin", secret: "a-new-strong-pass" })).ok).toBe(true);
  });
});

describe("authorization", () => {
  it("rejects anonymous / invalid tokens", async () => {
    expect(await t.query(api.programs.get, { token: "nope" })).toEqual([]);
    await expect(t.mutation(api.programs.setAll, { token: "nope", programs: [] })).rejects.toThrow();
  });

  it("group leaders cannot write admin data or manage users", async () => {
    await seedGroup(t, "g1", "1234");
    const tok = await loginGroup(t, "g1", "1234");
    await expect(t.mutation(api.programs.setAll, { token: tok, programs: [] })).rejects.toThrow("Forbidden");
    await expect(t.mutation(api.students.setAll, { token: tok, students: [] })).rejects.toThrow("Forbidden");
    await expect(t.mutation(api.logs.clear, { token: tok })).rejects.toThrow("Forbidden");
    await expect(t.mutation(api.locks.setLock, { token: tok, groupId: "g1", session: "x", locked: false })).rejects.toThrow("Forbidden");
    await expect(t.mutation(api.users.add, { token: tok, user: { id: "x", name: "x", pin: "1234" } })).rejects.toThrow("Forbidden");
    expect(await t.query(api.logs.get, { token: tok })).toEqual([]);
  });

  it("admin can create a group whose PIN is stored hashed; bad PIN format rejected", async () => {
    await expect(t.mutation(api.users.add, { token: adminToken, user: { id: "g9", name: "Nine", pin: "ab" } })).rejects.toThrow();
    await t.mutation(api.users.add, { token: adminToken, user: { id: "g9", name: "Nine", pin: "5678" } });
    const doc: any = await t.run((ctx: any) => ctx.db.query("users").withIndex("by_uid", (q: any) => q.eq("id", "g9")).first());
    expect(doc.pin).toBeUndefined();
    expect(doc.role).toBe("group");
    expect((await t.mutation(api.auth.login, { role: "group", userId: "g9", secret: "5678" })).ok).toBe(true);
  });

  it("messages are isolated per group; sender is enforced server-side", async () => {
    await seedGroup(t, "g1", "1111");
    await seedGroup(t, "g2", "2222");
    const t1 = await loginGroup(t, "g1", "1111");
    const t2 = await loginGroup(t, "g2", "2222");
    const base = { text: "hi", timestamp: 1, read: false };
    // g1 tries to spoof being g2 / admin
    await t.mutation(api.messages.send, { token: t1, id: "m1", groupId: "g2", from: "admin", to: "g2", ...base });
    await t.mutation(api.messages.send, { token: adminToken, id: "m2", groupId: "g2", from: "admin", to: "g2", fromName: "Admin", ...base });

    const g1Msgs: any[] = await t.query(api.messages.get, { token: t1 });
    const g2Msgs: any[] = await t.query(api.messages.get, { token: t2 });
    expect(g1Msgs.map((m) => m.id)).toEqual(["m1"]);
    expect(g1Msgs[0]).toMatchObject({ from: "g1", to: "admin" }); // spoof overridden
    expect(g2Msgs.map((m) => m.id)).toEqual(["m2"]);
    expect((await t.query(api.messages.get, { token: adminToken })).length).toBe(2);

    await expect(t.mutation(api.messages.deleteMsg, { token: t1, id: "m2" })).rejects.toThrow("Forbidden");
    await expect(t.mutation(api.messages.send, { token: t1, id: "m3", groupId: "admin", from: "g1", to: "admin", text: "x", timestamp: 1, read: false, mediaType: "image", mediaUrl: "javascript:alert(1)" })).rejects.toThrow("Invalid media");
  });

  it("leaders can only register their own group, and not when locked", async () => {
    await seedGroup(t, "g1", "1111");
    const t1 = await loginGroup(t, "g1", "1111");
    await t.mutation(api.programs.add, { token: adminToken, program: { id: "p1", name: "Song", category: "Senior", type: "Stage", session: "Day1", maxParticipants: 2 } });

    await expect(t.mutation(api.registrations.addRegistration, { token: t1, registration: { id: "r0", programId: "p1", groupId: "g2", participantIds: [] } })).rejects.toThrow("Forbidden");
    await t.mutation(api.registrations.addRegistration, { token: t1, registration: { id: "r1", programId: "p1", groupId: "g1", participantIds: ["s1"] } });

    await t.mutation(api.locks.setLock, { token: adminToken, groupId: "g1", session: "Day1", locked: true, type: "g1_day1" });
    await expect(t.mutation(api.registrations.update, { token: t1, id: "r1", registration: { participantIds: [] } })).rejects.toThrow("locked");
    await expect(t.mutation(api.registrations.remove, { token: t1, id: "r1" })).rejects.toThrow("locked");
  });
});
