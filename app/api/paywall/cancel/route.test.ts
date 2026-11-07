import { afterEach, describe, expect, it, vi } from "vitest";
import type { PaystackClient, PaystackError } from "@/lib/paystack";

const ORIGIN = "https://stepkite.test";

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/paywall/cancel`, {
    method: "POST",
    headers: { origin: ORIGIN, ...headers },
  });
}

afterEach(() => {
  vi.doUnmock("@/lib/auth/session");
  vi.restoreAllMocks();
});

describe("paywall cancel route", () => {
  it("refuses a foreign origin with 403", async () => {
    const { POST } = await load();
    const res = await POST(post({ origin: "https://evil.test" }));
    expect(res.status).toBe(403);
  });

  it("returns 401 when anonymous", async () => {
    const { POST } = await load();
    const res = await POST(post());
    expect(res.status).toBe(401);
  });

  it("returns 503 for a signed in user", async () => {
    vi.doMock("@/lib/auth/session", async (orig) => ({
      ...(await orig<typeof import("@/lib/auth/session")>()),
      requireSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
    }));
    const { POST } = await load();
    const res = await POST(post());
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "not_available_yet" });
  });
});

type Row = Record<string, unknown> | null;

const FUTURE = "2026-12-07T12:00:00.000Z";
const ACTIVE = {
  plan_code: "monthly",
  status: "active",
  paystack_subscription_code: "SUB_1",
  current_period_end: FUTURE,
  cancel_at: null,
};

async function loadWired(options: {
  row: Row;
  lookupError?: boolean;
  updateError?: boolean;
  disable?: (ErrorClass: typeof PaystackError) => Promise<{ ok: boolean }>;
}) {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.doMock("@/lib/auth/session", async (orig) => ({
    ...(await orig<typeof import("@/lib/auth/session")>()),
    requireSession: async () => ({ id: "u1", email: "a@b.co", createdAt: "2025-01-01" }),
  }));
  const updates: unknown[] = [];
  const filters: unknown[] = [];
  vi.doMock("@/lib/supabase/admin", () => ({
    createSupabaseAdmin: () => ({
      from: () => ({
        select: () => ({
          eq: (col: string, value: string) => {
            filters.push([col, value]);
            return {
              maybeSingle: async () => ({
                data: options.row,
                error: options.lookupError ? { code: "XX000" } : null,
              }),
            };
          },
        }),
        update: (patch: unknown) => ({
          eq: async () => {
            updates.push(patch);
            return { error: options.updateError ? { code: "XX000" } : null };
          },
        }),
      }),
    }),
  }));
  const fetchSubscriptionToken = vi.fn<PaystackClient["fetchSubscriptionToken"]>(async () => "tok");
  const disableSubscription = vi.fn<PaystackClient["disableSubscription"]>(async () => ({
    ok: true,
  }));
  vi.doMock("@/lib/paystack", async (orig) => ({
    ...(await orig<typeof import("@/lib/paystack")>()),
    createPaystack: () => ({ fetchSubscriptionToken, disableSubscription }),
  }));
  const { PaystackError: RouteErrorClass } = await import("@/lib/paystack");
  const { disable } = options;
  if (disable) disableSubscription.mockImplementation(() => disable(RouteErrorClass));
  const mod = await import("./route");
  return { POST: mod.POST, updates, filters, fetchSubscriptionToken, disableSubscription };
}

describe("paywall cancel route, wired", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/admin");
    vi.doUnmock("@/lib/paystack");
  });

  it("stops renewals at Paystack and records the end of the paid period", async () => {
    const { POST, updates, filters, fetchSubscriptionToken, disableSubscription } = await loadWired(
      { row: ACTIVE },
    );
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "canceled", access_until: FUTURE });
    expect(fetchSubscriptionToken).toHaveBeenCalledWith("SUB_1");
    expect(disableSubscription).toHaveBeenCalledWith("SUB_1", "tok");
    expect(updates).toEqual([{ cancel_at: FUTURE }]);
    // Only the signed in user's own row is read.
    expect(filters).toEqual([["user_id", "u1"]]);
  });

  it("lets a past_due subscriber cancel", async () => {
    const { POST } = await loadWired({ row: { ...ACTIVE, status: "past_due" } });
    expect((await POST(post())).status).toBe(200);
  });

  it("is harmless to click twice", async () => {
    const { POST, disableSubscription } = await loadWired({
      row: { ...ACTIVE, cancel_at: FUTURE },
    });
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "already_canceled", access_until: FUTURE });
    expect(disableSubscription).not.toHaveBeenCalled();
  });

  it("returns 409 when there is nothing to cancel", async () => {
    for (const row of [
      null,
      { ...ACTIVE, paystack_subscription_code: null },
      { ...ACTIVE, plan_code: "lifetime" },
      { ...ACTIVE, status: "none" },
      { ...ACTIVE, status: "canceled" },
    ]) {
      const { POST, disableSubscription } = await loadWired({ row });
      const res = await POST(post());
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "no_subscription" });
      expect(disableSubscription).not.toHaveBeenCalled();
    }
  });

  it("returns 502 when the lookup fails or the row has an unexpected shape", async () => {
    expect((await (await loadWired({ row: ACTIVE, lookupError: true })).POST(post())).status).toBe(
      502,
    );
    expect((await (await loadWired({ row: { status: 5 } })).POST(post())).status).toBe(502);
  });

  it("maps Paystack failures to 502 and changes nothing", async () => {
    for (const [status, code] of [
      [0, "provider_unavailable"],
      [503, "provider_unavailable"],
      [400, "cancel_failed"],
    ] as const) {
      const { POST, updates } = await loadWired({
        row: ACTIVE,
        disable: async (ErrorClass) => {
          throw new ErrorClass("detail", status);
        },
      });
      const res = await POST(post());
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: code });
      expect(updates).toEqual([]);
    }
  });

  it("still succeeds when only the local date write fails, because the webhook sets it too", async () => {
    const { POST } = await loadWired({ row: ACTIVE, updateError: true });
    expect((await POST(post())).status).toBe(200);
  });
});
