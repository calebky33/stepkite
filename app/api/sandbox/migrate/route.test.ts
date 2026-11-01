import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://stepkite.test";

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(body: string | null, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/sandbox/migrate`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body,
  });
}

afterEach(() => {
  vi.doUnmock("@/lib/auth/session");
  vi.restoreAllMocks();
});

describe("sandbox migrate route", () => {
  it("refuses a foreign origin with 403", async () => {
    const { POST } = await load();
    const res = await POST(post(JSON.stringify({ draft: {} }), { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on bad json or shape", async () => {
    const { POST } = await load();
    expect((await POST(post("{nope"))).status).toBe(400);
    expect((await POST(post(JSON.stringify({ wrong: true })))).status).toBe(400);
  });

  it("returns 401 when anonymous", async () => {
    const { POST } = await load();
    const res = await POST(post(JSON.stringify({ draft: { blocks: [] } })));
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("sign_in_required");
  });

  it("returns 503 for a signed in user", async () => {
    vi.doMock("@/lib/auth/session", async (orig) => ({
      ...(await orig<typeof import("@/lib/auth/session")>()),
      requireSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
    }));
    const { POST } = await load();
    const res = await POST(post(JSON.stringify({ draft: { ok: true } })));
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "not_available_yet" });
  });
});
