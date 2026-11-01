import { afterEach, describe, expect, it, vi } from "vitest";
import { computeFingerprint } from "./fingerprint";

function stubBrowser(overrides: {
  userAgent?: string;
  language?: string;
  timezone?: string;
  width?: number;
  height?: number;
}): void {
  vi.stubGlobal("navigator", {
    userAgent: overrides.userAgent ?? "test-agent",
    language: overrides.language ?? "en-GB",
  });
  vi.stubGlobal("screen", {
    width: overrides.width ?? 1280,
    height: overrides.height ?? 720,
  });
  vi.stubGlobal("Intl", {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: overrides.timezone ?? "Europe/London" }),
    }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("computeFingerprint", () => {
  it("returns a 64 character hex SHA-256", async () => {
    stubBrowser({});
    const hash = await computeFingerprint();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", async () => {
    stubBrowser({});
    const a = await computeFingerprint();
    const b = await computeFingerprint();
    expect(a).toBe(b);
  });

  it("changes when the user agent changes", async () => {
    stubBrowser({ userAgent: "ua-one" });
    const a = await computeFingerprint();
    stubBrowser({ userAgent: "ua-two" });
    const b = await computeFingerprint();
    expect(a).not.toBe(b);
  });

  it("changes when the screen or language changes", async () => {
    stubBrowser({});
    const base = await computeFingerprint();
    stubBrowser({ width: 1920 });
    expect(await computeFingerprint()).not.toBe(base);
    stubBrowser({ language: "en-US" });
    expect(await computeFingerprint()).not.toBe(base);
    stubBrowser({ timezone: "Asia/Kolkata" });
    expect(await computeFingerprint()).not.toBe(base);
  });
});
