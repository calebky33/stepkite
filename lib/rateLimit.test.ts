import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { allowRequest, isIpAddress, rateLimit, type RateLimitName } from "@/lib/rateLimit";

const env: Record<string, unknown> = {};
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env }) }));

const throwing = {
  limit: async () => {
    throw new Error("down");
  },
};
const req = (ip?: string) =>
  new Request("https://stepkite.com/x", { headers: ip ? { "cf-connecting-ip": ip } : {} });

afterEach(() => {
  delete env.RL_NEWSLETTER;
  vi.unstubAllEnvs();
});

describe("allowRequest", () => {
  it("allows when the binding says success", async () => {
    expect(await allowRequest({ limit: async () => ({ success: true }) }, "1.2.3.4")).toBe(true);
  });
  it("blocks when limited", async () => {
    expect(await allowRequest({ limit: async () => ({ success: false }) }, "1.2.3.4")).toBe(false);
  });
  it("allows when the binding is missing", async () => {
    expect(await allowRequest(undefined, "1.2.3.4")).toBe(true);
  });
  it("fails open when the binding throws", async () => {
    expect(await allowRequest(throwing, "1.2.3.4")).toBe(true);
  });
  it("fails closed when the binding throws and failClosed is set", async () => {
    expect(await allowRequest(throwing, "1.2.3.4", { failClosed: true })).toBe(false);
  });
  it("fails closed on a missing binding in production only", async () => {
    expect(await allowRequest(undefined, "1.2.3.4", { failClosed: true })).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(await allowRequest(undefined, "1.2.3.4", { failClosed: true })).toBe(false);
  });
});

describe("isIpAddress", () => {
  it("accepts IPv4 and IPv6", () => {
    for (const ip of ["1.2.3.4", "255.255.255.255", "2001:db8::1", "::1", "::ffff:1.2.3.4"])
      expect(isIpAddress(ip)).toBe(true);
  });
  it("rejects junk", () => {
    for (const ip of [
      "",
      "unknown",
      "1.2.3",
      "256.1.1.1",
      "1.2.3.4:80",
      "01.2.3.4",
      "a::b::c",
      "1:2",
      "<x>",
    ])
      expect(isIpAddress(ip)).toBe(false);
  });
});

describe("rateLimit", () => {
  it("skips the limiter for a missing or invalid address", async () => {
    env.RL_NEWSLETTER = { limit: async () => ({ success: false }) };
    expect(await rateLimit(req(), "RL_NEWSLETTER")).toBe(true);
    expect(await rateLimit(req("not-an-ip"), "RL_NEWSLETTER")).toBe(true);
    expect(await rateLimit(req("1.2.3.4"), "RL_NEWSLETTER")).toBe(false);
  });
  it("honours failClosed through the binding", async () => {
    env.RL_NEWSLETTER = throwing;
    expect(await rateLimit(req("1.2.3.4"), "RL_NEWSLETTER", { failClosed: true })).toBe(false);
    expect(await rateLimit(req("1.2.3.4"), "RL_NEWSLETTER")).toBe(true);
  });
});

describe("binding names", () => {
  it("match the wrangler ratelimits array", () => {
    const raw = readFileSync("wrangler.jsonc", "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/,(\s*[}\]])/g, "$1");
    const names = (JSON.parse(raw) as { ratelimits: { name: string }[] }).ratelimits.map(
      (r) => r.name,
    );
    const union: Record<RateLimitName, true> = {
      RL_JOB_PREVIEW: true,
      RL_NEWSLETTER: true,
      RL_AUTH: true,
    };
    expect(names.sort()).toEqual(Object.keys(union).sort());
  });
});
