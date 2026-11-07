import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://stepkite.test";

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/newsletter`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("newsletter route", () => {
  it("refuses a foreign origin with 403", async () => {
    const { POST } = await load();
    const res = await POST(post({ email: "a@b.co" }, { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
  });

  it("rejects a bad email with 400", async () => {
    const { POST } = await load();
    expect((await POST(post({ email: "nope" }))).status).toBe(400);
  });

  it("asks for a bot check token when the secret is set, and logs only the reason", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await load();
    const res = await POST(post({ email: "a@b.co" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "challenge_failed" });
    const line = String(log.mock.calls[0]?.[0]);
    expect(line).toContain('"reason":"missing"');
    expect(line).not.toContain("a@b.co");
  });

  it("reports a wrong hostname as the reason", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "stepkite.app");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ success: true, action: "newsletter", hostname: "stepkite.com" }),
      ),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await load();
    const res = await POST(post({ email: "a@b.co", turnstile: "tok" }));
    expect(res.status).toBe(403);
    expect(String(log.mock.calls[0]?.[0])).toContain('"reason":"wrong-host"');
  });

  it("passes the check and then says sign-up is not open yet", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "secret");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "stepkite.app");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ success: true, action: "newsletter", hostname: "stepkite.app" }),
      ),
    );
    const { POST } = await load();
    const res = await POST(post({ email: "a@b.co", turnstile: "tok" }));
    expect(res.status).toBe(503);
  });
});
