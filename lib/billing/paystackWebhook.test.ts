import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaystackClient } from "@/lib/paystack";
import { eventKey, handlePaystackEvent } from "./paystackWebhook";

type Row = Record<string, unknown>;
type Op = "select" | "insert" | "update" | "delete" | "upsert";
type Filter = { col: string; val: unknown; negate: boolean };

/**
 * Small in-memory stand-in for the Supabase calls the webhook makes. It copies the parts of
 * PostgREST that matter here: a unique `event_id`, foreign keys to users, `maybeSingle` failing on
 * several rows, `eq.null` never matching, and an upsert that reports the conflict column.
 */
function makeDb(seed: { plans: Row[]; entitlements: Row[]; users: string[] }) {
  const tables: Record<string, Row[]> = {
    plans: seed.plans,
    entitlements: seed.entitlements,
    payments: [],
  };
  const users = new Set(seed.users);
  const failOn = new Set<string>();
  const upsertConflicts: unknown[] = [];

  function builder(name: string) {
    let op: Op = "select";
    let payload: Row = {};
    let returning = false;
    const filters: Filter[] = [];
    const matches = (row: Row) =>
      filters.every((f) =>
        f.negate ? row[f.col] !== f.val : f.val !== null && row[f.col] === f.val,
      );

    const exec = async (single: boolean) => {
      const rows = tables[name] ?? [];
      if (failOn.has(`${name}:${op}`)) return { data: null, error: { code: "XX000" } };
      if (op === "insert") {
        if (rows.some((r) => r.event_id === payload.event_id))
          return { data: null, error: { code: "23505" } };
        if (typeof payload.user_id === "string" && !users.has(payload.user_id))
          return { data: null, error: { code: "23503" } };
        rows.push({ ...payload });
        return { data: null, error: null };
      }
      if (op === "delete") {
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i];
          if (row && matches(row)) rows.splice(i, 1);
        }
        return { data: null, error: null };
      }
      if (op === "update") {
        const hit = rows.filter(matches);
        for (const row of hit) Object.assign(row, payload);
        return { data: returning ? hit.map((r) => ({ user_id: r.user_id })) : null, error: null };
      }
      if (op === "upsert") {
        if (typeof payload.user_id === "string" && !users.has(payload.user_id))
          return { data: null, error: { code: "23503" } };
        const existing = rows.find((r) => r.user_id === payload.user_id);
        if (existing) Object.assign(existing, payload);
        else rows.push({ ...payload });
        return { data: null, error: null };
      }
      const hit = rows.filter(matches);
      if (single) {
        if (hit.length > 1) return { data: null, error: { code: "PGRST116" } };
        return { data: hit[0] ?? null, error: null };
      }
      return { data: hit, error: null };
    };

    const b = {
      select: () => {
        if (op !== "select") returning = true;
        return b;
      },
      insert: (p: Row) => {
        op = "insert";
        payload = p;
        return b;
      },
      update: (p: Row) => {
        op = "update";
        payload = p;
        return b;
      },
      upsert: (p: Row, options?: { onConflict?: string }) => {
        op = "upsert";
        payload = p;
        upsertConflicts.push(options?.onConflict);
        return b;
      },
      delete: () => {
        op = "delete";
        return b;
      },
      eq: (col: string, val: unknown) => {
        filters.push({ col, val, negate: false });
        return b;
      },
      neq: (col: string, val: unknown) => {
        filters.push({ col, val, negate: true });
        return b;
      },
      maybeSingle: () => exec(true),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        exec(false).then(resolve, reject),
    };
    return b;
  }

  const admin = { from: (name: string) => builder(name) } as unknown as Parameters<
    typeof handlePaystackEvent
  >[0]["admin"];
  return { tables, users, failOn, upsertConflicts, admin };
}

const UID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-11-07T12:00:00.000Z");
const MONTH_END = "2026-12-07T12:00:00.000Z";

const PLANS: Row[] = [
  {
    code: "monthly",
    paystack_plan_code: "PLN_m",
    amount_cents: 999,
    interval: "month",
    active: true,
  },
  {
    code: "yearly",
    paystack_plan_code: "PLN_y",
    amount_cents: 3900,
    interval: "year",
    active: true,
  },
  { code: "lifetime", paystack_plan_code: null, amount_cents: 14900, interval: null, active: true },
];

function paystackReturning(overrides: Record<string, unknown> = {}): PaystackClient {
  return {
    verifyTransaction: vi.fn(async () => ({
      status: "success" as const,
      amount: 999,
      currency: "USD",
      reference: "ref1",
      customerEmail: "a@b.co",
      customerCode: "CUS_1",
      planCode: "PLN_m",
      metadata: { user_id: UID, plan: "monthly" },
      ...overrides,
    })),
    initializeTransaction: vi.fn(),
    disableSubscription: vi.fn(),
  };
}

const charge = { event: "charge.success", data: { id: 123, reference: "ref1" } };

let db: ReturnType<typeof makeDb>;

function run(payload: unknown, paystack: PaystackClient = paystackReturning()) {
  return handlePaystackEvent({ admin: db.admin, paystack, payload, now: NOW });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  db = makeDb({
    plans: PLANS.map((p) => ({ ...p })),
    entitlements: [{ user_id: UID, plan_code: "free", status: "none" }],
    users: [UID],
  });
});

describe("charge.success", () => {
  it("grants the monthly plan and records the payment", async () => {
    expect(await run(charge)).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({
      plan_code: "monthly",
      status: "active",
      paystack_customer_code: "CUS_1",
      current_period_end: MONTH_END,
      cancel_at: null,
    });
    expect(db.tables.payments).toHaveLength(1);
    expect(db.tables.payments?.[0]).toMatchObject({
      event_id: "charge.success:123",
      amount_cents: 999,
      user_id: UID,
    });
    expect(JSON.stringify(db.tables.payments?.[0])).not.toContain("a@b.co");
    expect(db.upsertConflicts).toEqual(["user_id"]);
  });

  it("does nothing the second time the same event arrives", async () => {
    await run(charge);
    expect(await run(charge)).toBe("duplicate");
    expect(db.tables.payments).toHaveLength(1);
  });

  it("grants lifetime with no period end and drops any old subscription link", async () => {
    db.tables.entitlements = [
      {
        user_id: UID,
        plan_code: "monthly",
        status: "active",
        paystack_subscription_code: "SUB_old",
      },
    ];
    const paystack = paystackReturning({
      amount: 14900,
      planCode: null,
      metadata: { user_id: UID, plan: "lifetime" },
    });
    expect(await run(charge, paystack)).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({
      plan_code: "lifetime",
      status: "active",
      current_period_end: null,
      paystack_subscription_code: null,
    });
  });

  it("finds the user by customer code on a renewal with no metadata", async () => {
    db.tables.entitlements = [
      { user_id: UID, plan_code: "monthly", status: "active", paystack_customer_code: "CUS_1" },
    ];
    expect(await run(charge, paystackReturning({ metadata: null }))).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({ current_period_end: MONTH_END });
  });

  it("asks for a retry, and grants nothing, when a real payment does not match the plans table", async () => {
    for (const override of [
      { amount: 100 },
      { metadata: { user_id: UID, plan: "yearly" } },
      { planCode: "PLN_unknown" },
    ]) {
      expect(await run(charge, paystackReturning(override))).toBe("retry");
    }
    expect(db.tables.payments).toHaveLength(0);
    expect(db.tables.entitlements?.[0]).toMatchObject({ plan_code: "free" });
  });

  it("ignores charges that are not paid, not USD or not ours", async () => {
    for (const override of [
      { status: "failed" },
      { currency: "KES" },
      { planCode: null, metadata: null },
    ]) {
      expect(await run(charge, paystackReturning(override))).toBe("ignored");
    }
    expect(db.tables.payments).toHaveLength(0);
  });

  it("asks for a retry when it cannot tie a paid renewal to any user yet", async () => {
    db.tables.entitlements = [];
    expect(await run(charge, paystackReturning({ metadata: null }))).toBe("retry");
    expect(db.tables.payments).toHaveLength(0);
  });

  it("refuses to attach a customer that already belongs to another user", async () => {
    db.tables.entitlements?.push({
      user_id: "other",
      plan_code: "monthly",
      status: "active",
      paystack_customer_code: "CUS_1",
    });
    expect(await run(charge)).toBe("ignored");
    expect(db.tables.entitlements?.[0]).toMatchObject({ plan_code: "free" });
  });

  it("keeps lifetime when the same user pays for a time-limited plan, and records it for a refund", async () => {
    db.tables.entitlements = [{ user_id: UID, plan_code: "lifetime", status: "active" }];
    expect(await run(charge)).toBe("ignored");
    expect(db.tables.entitlements?.[0]).toMatchObject({ plan_code: "lifetime", status: "active" });
    expect(db.tables.payments).toHaveLength(1);
  });

  it("does not revive a cancelled plan from a late renewal, but a new checkout can", async () => {
    db.tables.entitlements = [
      { user_id: UID, plan_code: "monthly", status: "canceled", paystack_customer_code: "CUS_1" },
    ];
    expect(await run(charge, paystackReturning({ metadata: null }))).toBe("ignored");
    expect(db.tables.entitlements?.[0]).toMatchObject({ status: "canceled" });
    expect(await run(charge)).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({ status: "active", cancel_at: null });
  });

  it("ignores a charge for an account that was deleted", async () => {
    db.users.clear();
    expect(await run(charge)).toBe("ignored");
    expect(db.tables.payments).toHaveLength(0);
  });

  it("rethrows a failed entitlement write and records nothing, so the retry applies it", async () => {
    db.failOn.add("entitlements:upsert");
    await expect(run(charge)).rejects.toThrow("entitlement write failed");
    expect(db.tables.payments).toHaveLength(0);
    db.failOn.clear();
    expect(await run(charge)).toBe("applied");
  });

  it("still grants access when recording fails, and the retry finishes the job", async () => {
    db.failOn.add("payments:insert");
    await expect(run(charge)).rejects.toThrow("payments insert failed");
    expect(db.tables.entitlements?.[0]).toMatchObject({ plan_code: "monthly", status: "active" });
    db.failOn.clear();
    expect(await run(charge)).toBe("applied");
    expect(db.tables.payments).toHaveLength(1);
  });

  it("throws on database errors instead of acknowledging", async () => {
    for (const failure of ["plans:select", "payments:select"]) {
      db.failOn.clear();
      db.failOn.add(failure);
      await expect(run(charge)).rejects.toThrow();
    }
    db.failOn.clear();
    db.failOn.add("entitlements:select");
    await expect(run(charge, paystackReturning({ metadata: null }))).rejects.toThrow(
      "customer lookup failed",
    );
  });
});

describe("subscription events", () => {
  const created = {
    event: "subscription.create",
    data: {
      id: 9,
      subscription_code: "SUB_1",
      customer: { customer_code: "CUS_1" },
      next_payment_date: MONTH_END,
    },
  };

  it("asks for a retry when the charge has not landed yet, then applies", async () => {
    expect(await run(created)).toBe("retry");
    expect(db.tables.payments).toHaveLength(0);
    await run(charge);
    expect(await run(created)).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({
      paystack_subscription_code: "SUB_1",
      current_period_end: MONTH_END,
    });
  });

  it("ignores a subscription.create with an unexpected shape", async () => {
    expect(await run({ event: "subscription.create", data: { id: 1 } })).toBe("ignored");
  });

  it("keeps access until the period ends on not_renew, and ends it on disable", async () => {
    db.tables.entitlements = [
      {
        user_id: UID,
        plan_code: "monthly",
        status: "active",
        paystack_subscription_code: "SUB_1",
        current_period_end: MONTH_END,
      },
    ];
    const notRenew = {
      event: "subscription.not_renew",
      data: { id: 10, subscription_code: "SUB_1" },
    };
    expect(await run(notRenew)).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({ status: "active", cancel_at: MONTH_END });

    const disable = {
      event: "subscription.disable",
      data: { id: 11, subscription: { subscription_code: "SUB_1" } },
    };
    expect(await run(disable)).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({ status: "canceled" });
  });

  it("asks for a retry when the subscription is unknown, and never cancels a lifetime plan", async () => {
    const disable = { event: "subscription.disable", data: { id: 11, subscription_code: "SUB_x" } };
    expect(await run(disable)).toBe("retry");
    db.tables.entitlements = [
      {
        user_id: UID,
        plan_code: "lifetime",
        status: "active",
        paystack_subscription_code: "SUB_x",
      },
    ];
    expect(await run(disable)).toBe("ignored");
    expect(db.tables.entitlements?.[0]).toMatchObject({ status: "active" });
  });

  it("marks the plan past_due on a failed invoice but never touches lifetime", async () => {
    db.tables.entitlements = [
      { user_id: UID, plan_code: "monthly", status: "active", paystack_customer_code: "CUS_1" },
      {
        user_id: "other",
        plan_code: "lifetime",
        status: "active",
        paystack_customer_code: "CUS_1",
      },
    ];
    const failed = {
      event: "invoice.payment_failed",
      data: { id: 12, customer: { customer_code: "CUS_1" } },
    };
    expect(await run(failed)).toBe("applied");
    expect(db.tables.entitlements?.[0]).toMatchObject({ status: "past_due" });
    expect(db.tables.entitlements?.[1]).toMatchObject({ status: "active" });
    const unknown = {
      event: "invoice.payment_failed",
      data: { id: 13, customer: { customer_code: "CUS_9" } },
    };
    expect(await run(unknown)).toBe("retry");
  });

  it("throws when a lifecycle update fails, and records nothing", async () => {
    db.failOn.add("entitlements:update");
    await expect(run(created)).rejects.toThrow("update failed");
    expect(db.tables.payments).toHaveLength(0);
  });
});

describe("event keys and other events", () => {
  it("builds a stable key and refuses an ambiguous one", () => {
    expect(eventKey("charge.success", { id: 5, reference: "r" })).toBe("charge.success:5");
    expect(eventKey("charge.success", { reference: "r" })).toBe("charge.success:r");
    expect(eventKey("invoice.payment_failed", { invoice_code: "INV_1" })).toBe(
      "invoice.payment_failed:INV_1",
    );
    expect(
      eventKey("subscription.disable", { subscription_code: "SUB_1", next_payment_date: "d" }),
    ).toBe("subscription.disable:SUB_1:d");
    expect(eventKey("subscription.disable", { subscription_code: "SUB_1" })).toBeNull();
    expect(eventKey("subscription.disable", {})).toBeNull();
  });

  it("acknowledges unhandled events and malformed payloads without writing", async () => {
    for (const payload of [
      { event: "refund.processed", data: { id: 1 } },
      { event: "subscription.disable", data: { subscription_code: "SUB_1" } },
      { nope: true },
      null,
    ]) {
      expect(await run(payload)).toBe("ignored");
    }
    expect(db.tables.payments).toHaveLength(0);
  });
});
