import { describe, it, expect } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("accepts a plain same-origin path", () => {
    expect(safeNext("/uk/cv")).toBe("/uk/cv");
  });

  it("accepts a path with a query string", () => {
    expect(safeNext("/uk/salary-calculator?gross=50000")).toBe("/uk/salary-calculator?gross=50000");
  });

  it("rejects a protocol-relative URL (open redirect)", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("//evil.com/path")).toBe("/");
  });

  it("rejects a full absolute URL", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("http://evil.com")).toBe("/");
  });

  it("rejects an auth-loop target", () => {
    expect(safeNext("/sign-in")).toBe("/");
    expect(safeNext("/sign-up?next=/x")).toBe("/");
  });

  it("rejects API paths", () => {
    expect(safeNext("/api/export/pdf")).toBe("/");
  });

  it("rejects account and billing paths that require their own auth", () => {
    expect(safeNext("/account")).toBe("/");
    expect(safeNext("/billing")).toBe("/");
  });

  it("falls back to root on null, empty, or garbage input", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("\\\\evil.com")).toBe("/");
  });
});
