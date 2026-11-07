import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaystackClient, PaystackError } from "@/lib/paystack";

const ORIGIN = "https://stepkite.test";

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(body: string | null, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/paywall/checkout`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body,
  });
}

afterEach(() => {
  vi.doUnmock("@/lib/auth/session");
  vi.restoreAllMocks();
});

describe("paywall checkout route", () => {
  it("refuses a foreign origin with 403", async () => {
    const { POST } = await load();
    const res = await POST(
      post(JSON.stringify({ plan: "monthly" }), { origin: "https://evil.test" }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects an unknown plan with 400", async () => {
    const { POST } = await load();
    expect((await POST(post(JSON.stringify({ plan: "weekly" })))).status).toBe(400);
    expect((await POST(post(JSON.stringify({ plan: "" })))).status).toBe(400);
    expect((await POST(post(JSON.stringify({})))).status).toBe(400);
  });

  it("returns 401 when anonymous", async () => {
    const { POST } = await load();
    const res = await POST(post(JSON.stringify({ plan: "monthly" })));
    expect(res.status).toBe(401);
  });

  it("returns 503 happy path for a signed in user", async () => {
    vi.doMock("@/lib/auth/session", async (orig) => ({
      ...(await orig<typeof import("@/lib/auth/session")>()),
      requireSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
    }));
    const { POST } = await load();
    const res = await POST(post(JSON.stringify({ plan: "yearly" })));
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "not_available_yet" });
  });
});

type Row = Record<string, unknown> | null;

function fakeAdmin(plan: Row, entitlement: Row, error: boolean = false) {
  const result = (data: Row) => ({ data, error: error ? { message: "boom" } : null });
  return {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => result(table === "plans" ? plan : entitlement),
      };
      return chain;
    },
  };
}

async function loadWired(options: {
  plan: Row;
  entitlement?: Row;
  lookupError?: boolean;
  /** Receives the PaystackError class the route sees, so `instanceof` works after resetModules. */
  initialize?: (
    ErrorClass: typeof PaystackError,
  ) => Promise<{ authorizationUrl: string; accessCode: string; reference: string }>;
}) {
  vi.resetModules();
  vi.doMock("@/lib/auth/session", async (orig) => ({
    ...(await orig<typeof import("@/lib/auth/session")>()),
    requireSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createSupabaseAdmin: () =>
      fakeAdmin(options.plan, options.entitlement ?? null, options.lookupError),
  }));
  const initializeTransaction = vi.fn<PaystackClient["initializeTransaction"]>(async () => ({
    authorizationUrl: "https://checkout.paystack.com/abc",
    accessCode: "abc",
    reference: "r",
  }));
  vi.doMock("@/lib/paystack", async (orig) => ({
    ...(await orig<typeof import("@/lib/paystack")>()),
    createPaystack: () => ({ initializeTransaction }),
  }));
  // Import after the mock so the class is the exact one the route sees (instanceof works).
  const { PaystackError: RouteErrorClass } = await import("@/lib/paystack");
  const { initialize } = options;
  if (initialize) initializeTransaction.mockImplementation(() => initialize(RouteErrorClass));
  const mod = await import("./route");
  return { POST: mod.POST, initializeTransaction };
}

const MONTHLY = { code: "monthly", paystack_plan_code: "PLN_m", amount_cents: 999 };
const LIFETIME = { code: "lifetime", paystack_plan_code: null, amount_cents: 14900 };

describe("paywall checkout route, wired", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/admin");
    vi.doUnmock("@/lib/paystack");
  });

  it("starts a subscription with the plan amount and code from the database", async () => {
    const { POST, initializeTransaction } = await loadWired({ plan: MONTHLY });
    const res = await POST(post(JSON.stringify({ plan: "monthly" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authorization_url: "https://checkout.paystack.com/abc" });
    const input = initializeTransaction.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      email: "a@b.co",
      amount: 999,
      plan: "PLN_m",
      metadata: { user_id: "u1", plan: "monthly" },
    });
    expect(input?.reference).toMatch(/^sk_/);
    expect(input?.callbackUrl).toMatch(/\/account$/);
  });

  it("starts lifetime as a one-time charge with no plan code", async () => {
    const { POST, initializeTransaction } = await loadWired({ plan: LIFETIME });
    const res = await POST(post(JSON.stringify({ plan: "lifetime" })));
    expect(res.status).toBe(200);
    const input = initializeTransaction.mock.calls[0]?.[0];
    expect(input?.amount).toBe(14900);
    expect(input).not.toHaveProperty("plan");
  });

  it("returns 404 when the plan row is missing, inactive or unpriced", async () => {
    expect(
      (await (await loadWired({ plan: null })).POST(post(JSON.stringify({ plan: "monthly" }))))
        .status,
    ).toBe(404);
    expect(
      (
        await (
          await loadWired({ plan: { ...MONTHLY, paystack_plan_code: null } })
        ).POST(post(JSON.stringify({ plan: "monthly" })))
      ).status,
    ).toBe(404);
    expect(
      (
        await (
          await loadWired({ plan: { ...MONTHLY, amount_cents: 0 } })
        ).POST(post(JSON.stringify({ plan: "monthly" })))
      ).status,
    ).toBe(404);
  });

  it("returns 409 when the user already has an active plan or lifetime", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    for (const entitlement of [
      { plan_code: "monthly", status: "active", current_period_end: null },
      { plan_code: "monthly", status: "past_due", current_period_end: null },
      { plan_code: "monthly", status: "canceled", current_period_end: future },
      { plan_code: "lifetime", status: "none", current_period_end: null },
    ]) {
      const { POST, initializeTransaction } = await loadWired({ plan: MONTHLY, entitlement });
      const res = await POST(post(JSON.stringify({ plan: "monthly" })));
      expect(res.status).toBe(409);
      expect(initializeTransaction).not.toHaveBeenCalled();
    }
  });

  it("lets trialing, expired-cancelled and revoked users buy", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    for (const entitlement of [
      { plan_code: "free", status: "trialing", current_period_end: null },
      { plan_code: "monthly", status: "canceled", current_period_end: past },
      { plan_code: "free", status: "revoked", current_period_end: null },
    ]) {
      const { POST } = await loadWired({ plan: MONTHLY, entitlement });
      expect((await POST(post(JSON.stringify({ plan: "monthly" })))).status).toBe(200);
    }
  });

  it("returns 502 when a row has an unexpected shape", async () => {
    const { POST } = await loadWired({ plan: { ...MONTHLY, amount_cents: "999" } });
    expect((await POST(post(JSON.stringify({ plan: "monthly" })))).status).toBe(502);
  });

  it("maps a non-Paystack throw to provider_unavailable", async () => {
    const { POST } = await loadWired({
      plan: MONTHLY,
      initialize: async () => {
        throw new Error("boom");
      },
    });
    const res = await POST(post(JSON.stringify({ plan: "monthly" })));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "provider_unavailable" });
  });

  it("returns 502 when the database lookup fails", async () => {
    const { POST } = await loadWired({ plan: MONTHLY, lookupError: true });
    const res = await POST(post(JSON.stringify({ plan: "monthly" })));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "lookup_failed" });
  });

  it("maps Paystack failures to 502 without leaking details", async () => {
    for (const [status, code] of [
      [0, "provider_unavailable"],
      [503, "provider_unavailable"],
      [400, "checkout_failed"],
    ] as const) {
      const { POST } = await loadWired({
        plan: MONTHLY,
        initialize: async (ErrorClass) => {
          throw new ErrorClass("secret detail", status);
        },
      });
      const res = await POST(post(JSON.stringify({ plan: "monthly" })));
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: code });
    }
  });
});
