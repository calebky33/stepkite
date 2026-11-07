import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(body: string | null, headers: Record<string, string> = {}): Request {
  return new Request("https://stepkite.test/api/paystack/webhook", {
    method: "POST",
    headers,
    body,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("paystack webhook route", () => {
  it("returns 503 when neither Paystack secret is configured", async () => {
    const { POST } = await load();
    const res = await POST(post("{}", { "paystack-signature": "t=1,v1=whk_a:deadbeef" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_available_yet" });
  });

  it("returns 400 when both signature headers are missing", async () => {
    vi.stubEnv("PAYSTACK_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");
    const { POST } = await load();
    const res = await POST(post("{}"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_signature" });
  });

  it("rejects an empty or unreadable body with 400", async () => {
    vi.stubEnv("PAYSTACK_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");
    const { POST } = await load();
    const res = await POST(post("", { "paystack-signature": "t=1,v1=whk_a:deadbeef" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 400 bad_signature when the signature does not verify", async () => {
    vi.stubEnv("PAYSTACK_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");
    const { POST } = await load();
    const res = await POST(
      post('{"event":"charge.success"}', {
        "paystack-signature": `t=${Math.floor(Date.now() / 1000)},v1=whk_a:deadbeef`,
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bad_signature" });
  });

  it("returns 400 bad_signature for a stale legacy header", async () => {
    vi.stubEnv("PAYSTACK_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");
    const { POST } = await load();
    const res = await POST(
      post('{"event":"charge.success"}', { "x-paystack-signature": "deadbeef" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bad_signature" });
  });
});

describe("paystack webhook route, signed events", () => {
  const BODY = '{"event":"charge.success","data":{"id":1,"reference":"r"}}';
  const sign = (body: string) => createHmac("sha512", "sk_test").update(body).digest("hex");

  async function loadSigned(options: { handler?: () => Promise<string>; admin?: object | null }) {
    vi.resetModules();
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdmin: () => (options.admin === undefined ? {} : options.admin),
    }));
    const handlePaystackEvent = vi.fn<(input: unknown) => Promise<string>>(
      options.handler ?? (async () => "applied"),
    );
    vi.doMock("@/lib/billing/paystackWebhook", () => ({ handlePaystackEvent }));
    const { POST } = await import("./route");
    return { POST, handlePaystackEvent };
  }

  const signedPost = (body: string) => post(body, { "x-paystack-signature": sign(body) });

  afterEach(() => {
    vi.doUnmock("@/lib/supabase/admin");
    vi.doUnmock("@/lib/billing/paystackWebhook");
  });

  it("acknowledges applied, duplicate and ignored events with 200", async () => {
    for (const outcome of ["applied", "duplicate", "ignored"]) {
      const { POST } = await loadSigned({ handler: async () => outcome });
      const res = await POST(signedPost(BODY));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: outcome });
    }
  });

  it("passes the parsed event to the handler", async () => {
    const { POST, handlePaystackEvent } = await loadSigned({});
    await POST(signedPost(BODY));
    expect(handlePaystackEvent.mock.calls[0]?.[0]).toMatchObject({
      payload: { event: "charge.success", data: { id: 1, reference: "r" } },
    });
  });

  it("returns 500 so Paystack retries when the handler asks for a retry", async () => {
    const { POST } = await loadSigned({ handler: async () => "retry" });
    const res = await POST(signedPost(BODY));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "retry" });
  });

  it("returns 500 when the handler throws, without leaking the reason", async () => {
    const { POST } = await loadSigned({
      handler: async () => {
        throw new Error("entitlement write failed (XX000)");
      },
    });
    const res = await POST(signedPost(BODY));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "handler_failed" });
  });

  it("returns 400 for a signed body that is not JSON", async () => {
    const { POST, handlePaystackEvent } = await loadSigned({});
    const res = await POST(signedPost("not json"));
    expect(res.status).toBe(400);
    expect(handlePaystackEvent).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase is not configured", async () => {
    const { POST, handlePaystackEvent } = await loadSigned({ admin: null });
    const res = await POST(signedPost(BODY));
    expect(res.status).toBe(503);
    expect(handlePaystackEvent).not.toHaveBeenCalled();
  });
});
