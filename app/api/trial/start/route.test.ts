import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://stepkite.test";
const VALID_FINGERPRINT = "a".repeat(64);

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(body: string | null, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/trial/start`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body,
  });
}

afterEach(() => {
  vi.doUnmock("@/lib/auth/session");
  vi.restoreAllMocks();
});

describe("trial start route", () => {
  it("refuses a foreign origin with 403", async () => {
    const { POST } = await load();
    const res = await POST(
      post(JSON.stringify({ fingerprint: VALID_FINGERPRINT }), { origin: "https://evil.test" }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects a non hex or wrong length fingerprint with 400", async () => {
    const { POST } = await load();
    expect((await POST(post(JSON.stringify({ fingerprint: "short" })))).status).toBe(400);
    expect((await POST(post(JSON.stringify({ fingerprint: "G".repeat(64) })))).status).toBe(400);
    expect((await POST(post(JSON.stringify({})))).status).toBe(400);
  });

  it("returns 401 when anonymous", async () => {
    const { POST } = await load();
    const res = await POST(post(JSON.stringify({ fingerprint: VALID_FINGERPRINT })));
    expect(res.status).toBe(401);
  });

  it("returns 503 happy path for a signed in user", async () => {
    vi.doMock("@/lib/auth/session", async (orig) => ({
      ...(await orig<typeof import("@/lib/auth/session")>()),
      requireSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
    }));
    const { POST } = await load();
    const res = await POST(post(JSON.stringify({ fingerprint: VALID_FINGERPRINT })));
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "not_available_yet" });
  });
});
