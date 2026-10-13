import { describe, it, expect } from "vitest";
import { resolveRoute } from "./router";

describe("resolveRoute", () => {
  it("signed-out: /admin shows admin login, / and /leader show the group login", () => {
    expect(resolveRoute("/admin", null)).toEqual({ view: "adminLogin", redirect: null });
    expect(resolveRoute("/", null)).toEqual({ view: "landing", redirect: null });
    expect(resolveRoute("/leader", null)).toEqual({ view: "landing", redirect: null });
  });
  it("is case/trailing-slash tolerant and sends unknown URLs home", () => {
    expect(resolveRoute("/Admin/", null).view).toBe("adminLogin");
    expect(resolveRoute("/nope", null)).toEqual({ view: "landing", redirect: "/" });
  });
  it("admin session always lands on /admin, even from /leader", () => {
    expect(resolveRoute("/admin", "admin")).toEqual({ view: "admin", redirect: null });
    expect(resolveRoute("/leader", "admin")).toEqual({ view: "admin", redirect: "/admin" });
    expect(resolveRoute("/", "admin")).toEqual({ view: "admin", redirect: "/admin" });
  });
  it("group session can never view the admin URL", () => {
    expect(resolveRoute("/admin", "group")).toEqual({ view: "leader", redirect: "/leader" });
    expect(resolveRoute("/", "group")).toEqual({ view: "leader", redirect: "/leader" });
    expect(resolveRoute("/leader", "group")).toEqual({ view: "leader", redirect: null });
  });
});
