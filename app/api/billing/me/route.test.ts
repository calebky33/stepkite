import { afterEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return import("./route");
}

function get(): Request {
  return new Request("https://stepkite.test/api/billing/me", { method: "GET" });
}

afterEach(() => {
  vi.doUnmock("@/lib/auth/session");
  vi.doUnmock("@/lib/billing/readEntitlement");
  vi.restoreAllMocks();
});

describe("billing me route", () => {
  it("returns signedIn false and null entitlement for anonymous", async () => {
    const { GET } = await load();
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ signedIn: false, entitlement: null });
  });

  it("returns the entitlement for a signed in user", async () => {
    vi.doMock("@/lib/auth/session", async (orig) => ({
      ...(await orig<typeof import("@/lib/auth/session")>()),
      getSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
    }));
    const { GET } = await load();
    const res = await GET(get());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      signedIn: boolean;
      entitlement: { planCode: string } | null;
    };
    expect(body.signedIn).toBe(true);
    expect(body.entitlement?.planCode).toBe("free");
  });

  it("returns 503, not the free plan, when the entitlement read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("@/lib/auth/session", async (orig) => ({
      ...(await orig<typeof import("@/lib/auth/session")>()),
      getSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
    }));
    vi.doMock("@/lib/billing/readEntitlement", () => ({
      readEntitlement: async () => {
        throw new Error("entitlement read failed (XX000)");
      },
    }));
    const { GET } = await load();
    const res = await GET(get());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "entitlement_unavailable" });
  });
});
