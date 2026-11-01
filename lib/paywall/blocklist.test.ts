import { describe, expect, it } from "vitest";
import { DISPOSABLE_DOMAIN_COUNT, isDisposable } from "./blocklist";

describe("isDisposable", () => {
  it("blocks a known disposable domain", () => {
    expect(isDisposable("someone@mailinator.com")).toBe(true);
    expect(isDisposable("x@guerrillamail.com")).toBe(true);
    expect(isDisposable("a@10minutemail.com")).toBe(true);
  });

  it("accepts a real inbox", () => {
    expect(isDisposable("a@gmail.com")).toBe(false);
    expect(isDisposable("name@company.co.uk")).toBe(false);
    expect(isDisposable("x@proton.me")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isDisposable("Someone@Mailinator.COM")).toBe(true);
    expect(isDisposable("A@TRASHMAIL.COM")).toBe(true);
  });

  it("blocks a subdomain of a disposable host", () => {
    expect(isDisposable("name@inbox.mailinator.com")).toBe(true);
    expect(isDisposable("x@a.b.yopmail.com")).toBe(true);
  });

  it("returns false for malformed addresses so the caller emits its own error", () => {
    expect(isDisposable("")).toBe(false);
    expect(isDisposable("no-at-sign")).toBe(false);
    expect(isDisposable("trailing@")).toBe(false);
  });

  it("has a sizable list", () => {
    expect(DISPOSABLE_DOMAIN_COUNT).toBeGreaterThanOrEqual(25);
  });
});
