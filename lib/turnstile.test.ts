import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TURNSTILE_VERIFY_URL, verifyTurnstile } from "./turnstile";

type FetchArgs = Parameters<typeof fetch>;

describe("verifyTurnstile", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("passes through when no secret is set", async () => {
    const r = await verifyTurnstile({
      secret: undefined,
      token: "anything",
      expectedAction: "newsletter",
      expectedHostnames: ["stepkite.com"],
    });
    expect(r.ok).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing token when a secret is set", async () => {
    const r = await verifyTurnstile({
      secret: "s",
      token: undefined,
      expectedAction: "newsletter",
      expectedHostnames: [],
    });
    expect(r).toEqual({ ok: false, reason: "missing" });
  });

  it("accepts a token the Turnstile API approves with matching action and host", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, action: "newsletter", hostname: "stepkite.com" }),
      ),
    );
    const r = await verifyTurnstile({
      secret: "s",
      token: "t",
      expectedAction: "newsletter",
      expectedHostnames: ["stepkite.com"],
      remoteIp: "1.2.3.4",
    });
    expect(r).toEqual({ ok: true });
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as FetchArgs;
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const body = (init as RequestInit & { body: URLSearchParams }).body;
    expect(body.toString()).toContain("remoteip=1.2.3.4");
  });

  it("rejects a mismatched action", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, action: "signup", hostname: "stepkite.com" })),
    );
    const r = await verifyTurnstile({
      secret: "s",
      token: "t",
      expectedAction: "newsletter",
      expectedHostnames: ["stepkite.com"],
    });
    expect(r).toEqual({ ok: false, reason: "wrong-action" });
  });

  it("rejects a hostname outside the allowlist", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, action: "newsletter", hostname: "evil.com" })),
    );
    const r = await verifyTurnstile({
      secret: "s",
      token: "t",
      expectedAction: "newsletter",
      expectedHostnames: ["stepkite.com"],
    });
    expect(r).toEqual({ ok: false, reason: "wrong-host" });
  });

  it("treats a Turnstile network failure as not verified", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("boom"),
    );
    const r = await verifyTurnstile({
      secret: "s",
      token: "t",
      expectedAction: "newsletter",
      expectedHostnames: [],
    });
    expect(r).toEqual({ ok: false, reason: "network" });
  });
});
