import { afterEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(body: string | null, headers: Record<string, string> = {}): Request {
  return new Request("https://stepkite.test/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("stripe webhook route", () => {
  it("returns 503 when STRIPE_WEBHOOK_SECRET is missing (always, for now)", async () => {
    const { POST } = await load();
    const res = await POST(post("{}", { "stripe-signature": "sig" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_available_yet" });
  });

  it("returns 400 when the stripe-signature header is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    const { POST } = await load();
    const res = await POST(post("{}"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_signature" });
  });

  it("rejects an empty or unreadable body with 400", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    const { POST } = await load();
    const res = await POST(post("", { "stripe-signature": "sig" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 400 bad_signature when the signature does not verify", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    const { POST } = await load();
    const res = await POST(post('{"id":"evt_1"}', { "stripe-signature": "t=1,v1=deadbeef" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bad_signature" });
  });
});
