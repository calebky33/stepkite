import { z } from "zod";
import type { PaystackClient } from "@/lib/paystack";
import type { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Applies one verified Paystack event to Supabase. The route has already checked the signature.
 *
 * Rules:
 * - Grant first, record second. Every write here is idempotent, so a crash or a retry between the
 *   two just applies the same write again. The `payments(event_id unique)` row is written last and
 *   only means "done": a repeat of a recorded event returns "duplicate" and writes nothing.
 *   Nothing is ever deleted to compensate, so a failed delete cannot strand a paid user.
 * - A paid charge is never trusted from the webhook body. `charge.success` re-fetches the
 *   transaction from Paystack and checks status, currency, plan and amount against `plans`.
 * - "retry" (HTTP 500, Paystack tries again) is for anything that may fix itself or needs a human:
 *   the row the event points at is not there yet, or the plans table disagrees with a real
 *   payment. "ignored" is only for events that are not ours, not paid, or not for a live user.
 * - A lifetime plan is never downgraded or cancelled by an older subscription event.
 * - Refunds stay manual, so refund events are acknowledged and ignored.
 */

type Admin = NonNullable<ReturnType<typeof createSupabaseAdmin>>;

export type WebhookOutcome = "applied" | "duplicate" | "ignored" | "retry";

const eventSchema = z.object({
  event: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

const chargeSchema = z.object({ reference: z.string().min(1) });
const metadataSchema = z.object({
  user_id: z.uuid(),
  plan: z.enum(["monthly", "yearly", "lifetime"]),
});
const planRowSchema = z.object({
  code: z.string(),
  amount_cents: z.number().int(),
  interval: z.enum(["day", "month", "year"]).nullable(),
});
const entitlementSchema = z.object({
  user_id: z.string(),
  plan_code: z.string(),
  status: z.string(),
  current_period_end: z.string().nullable().optional(),
});
const customerSchema = z.object({ customer_code: z.string().min(1) });
const subscriptionEventSchema = z.object({
  subscription_code: z.string().min(1),
  customer: customerSchema,
  next_payment_date: z.string().nullable().optional(),
});
const subscriptionRefSchema = z.object({ subscription_code: z.string().min(1) });
const invoiceFailedSchema = z.object({ customer: customerSchema });

const HANDLED = new Set([
  "charge.success",
  "subscription.create",
  "subscription.not_renew",
  "subscription.disable",
  "invoice.payment_failed",
]);

function log(event: string, fields: Record<string, string> = {}): void {
  // Ids and codes only. Never an email, a body or a key.
  console.error(JSON.stringify({ route: "paystack/webhook", event, ...fields }));
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (typeof value === "number") return String(value);
  return null;
}

/**
 * Stable id for idempotency. Paystack events carry no top-level event id, so use the object's own
 * id or reference. If there is none, the subscription code alone would collapse two separate
 * events into one, so add whatever marks this occurrence.
 */
export function eventKey(event: string, data: Record<string, unknown>): string | null {
  for (const field of ["id", "reference", "invoice_code"]) {
    const value = text(data[field]);
    if (value) return `${event}:${value}`;
  }
  const code = text(data.subscription_code);
  if (!code) return null;
  const occurrence = text(data.next_payment_date) ?? text(data.createdAt) ?? text(data.status);
  return occurrence ? `${event}:${code}:${occurrence}` : null;
}

function addInterval(from: Date, interval: "day" | "month" | "year" | null): string | null {
  if (!interval) return null;
  const next = new Date(from);
  if (interval === "day") next.setUTCDate(next.getUTCDate() + 1);
  if (interval === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  if (interval === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString();
}

async function alreadyRecorded(admin: Admin, eventId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("payments")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(`payments lookup failed (${error.code ?? "unknown"})`);
  return data !== null;
}

/** Written last. A concurrent duplicate hitting the unique key counts as already recorded. */
async function recordEvent(
  admin: Admin,
  row: {
    eventId: string;
    type: string;
    userId: string | null;
    amountCents: number;
    raw: Record<string, string>;
  },
): Promise<void> {
  const { error } = await admin.from("payments").insert({
    event_id: row.eventId,
    type: row.type,
    user_id: row.userId,
    amount_cents: row.amountCents,
    currency: "USD",
    raw: row.raw,
  });
  if (error && error.code !== "23505") {
    throw new Error(`payments insert failed (${error.code ?? "unknown"})`);
  }
}

export async function handlePaystackEvent(input: {
  admin: Admin;
  paystack: PaystackClient;
  payload: unknown;
  now?: Date;
}): Promise<WebhookOutcome> {
  const { admin, paystack } = input;
  const now = input.now ?? new Date();

  const parsed = eventSchema.safeParse(input.payload);
  if (!parsed.success || !HANDLED.has(parsed.data.event)) return "ignored";
  const { event, data } = parsed.data;
  const eventId = eventKey(event, data);
  if (!eventId) {
    log("no_event_key", { event });
    return "ignored";
  }
  if (await alreadyRecorded(admin, eventId)) return "duplicate";

  if (event === "charge.success") return handleCharge({ admin, paystack, data, eventId, now });

  const outcome = await applyLifecycle({ admin, event, data, now });
  if (outcome === "applied") {
    await recordEvent(admin, { eventId, type: event, userId: null, amountCents: 0, raw: {} });
  }
  return outcome;
}

async function applyLifecycle(input: {
  admin: Admin;
  event: string;
  data: Record<string, unknown>;
  now: Date;
}): Promise<WebhookOutcome> {
  const { admin, event, data, now } = input;

  if (event === "subscription.create") {
    const sub = subscriptionEventSchema.safeParse(data);
    if (!sub.success) return "ignored";
    const patch: Record<string, string> = {
      paystack_subscription_code: sub.data.subscription_code,
    };
    if (sub.data.next_payment_date) patch.current_period_end = sub.data.next_payment_date;
    const { data: rows, error } = await admin
      .from("entitlements")
      .update(patch)
      .eq("paystack_customer_code", sub.data.customer.customer_code)
      .neq("plan_code", "lifetime")
      .select("user_id");
    if (error) throw new Error(`subscription.create update failed (${error.code ?? "unknown"})`);
    // No row yet usually means the first charge has not landed. Paystack will retry.
    return rows && rows.length > 0 ? "applied" : "retry";
  }

  if (event === "invoice.payment_failed") {
    const failed = invoiceFailedSchema.safeParse(data);
    if (!failed.success) return "ignored";
    const { data: rows, error } = await admin
      .from("entitlements")
      .update({ status: "past_due" })
      .eq("paystack_customer_code", failed.data.customer.customer_code)
      .neq("plan_code", "lifetime")
      .select("user_id");
    if (error) throw new Error(`invoice.payment_failed update failed (${error.code ?? "unknown"})`);
    return rows && rows.length > 0 ? "applied" : "retry";
  }

  // subscription.not_renew and subscription.disable carry the subscription code, at the top level
  // or nested under `subscription`.
  const direct = subscriptionRefSchema.safeParse(data);
  const nested = z.object({ subscription: subscriptionRefSchema }).safeParse(data);
  const code = direct.success
    ? direct.data.subscription_code
    : nested.success
      ? nested.data.subscription.subscription_code
      : null;
  if (!code) return "ignored";
  return applyCancellation({ admin, event, code, now });
}

async function applyCancellation(input: {
  admin: Admin;
  event: string;
  code: string;
  now: Date;
}): Promise<WebhookOutcome> {
  const { admin, event, code, now } = input;
  const found = await admin
    .from("entitlements")
    .select("user_id, plan_code, status, current_period_end")
    .eq("paystack_subscription_code", code)
    .maybeSingle();
  if (found.error) throw new Error(`${event} lookup failed (${found.error.code ?? "unknown"})`);
  if (found.data === null) return "retry";
  const row = entitlementSchema.safeParse(found.data);
  if (!row.success) return "ignored";
  // An old subscription must never cancel a lifetime plan bought later.
  if (row.data.plan_code === "lifetime") return "ignored";

  // The user cancelled. A plan that is paid up keeps access until its period ends (`cancel_at`,
  // which hasProAccess honours). Only a plan with no paid time left becomes "canceled" now.
  const periodEnd = row.data.current_period_end ? Date.parse(row.data.current_period_end) : NaN;
  const paidUp = Number.isFinite(periodEnd) && periodEnd > now.getTime();
  const patch =
    event === "subscription.not_renew" || paidUp
      ? { cancel_at: row.data.current_period_end ?? now.toISOString() }
      : { status: "canceled", cancel_at: now.toISOString() };
  const { error } = await admin.from("entitlements").update(patch).eq("user_id", row.data.user_id);
  if (error) throw new Error(`${event} update failed (${error.code ?? "unknown"})`);
  return "applied";
}

async function handleCharge(input: {
  admin: Admin;
  paystack: PaystackClient;
  data: Record<string, unknown>;
  eventId: string;
  now: Date;
}): Promise<WebhookOutcome> {
  const { admin, paystack, data, eventId, now } = input;
  const charge = chargeSchema.safeParse(data);
  if (!charge.success) return "ignored";

  // Never trust the webhook body for money. Ask Paystack what this transaction really is.
  const tx = await paystack.verifyTransaction(charge.data.reference);
  if (tx.status !== "success" || tx.currency !== "USD") return "ignored";

  const meta = metadataSchema.safeParse(tx.metadata);
  const isLifetime = meta.success && meta.data.plan === "lifetime";
  // Neither a plan code nor a lifetime tag: not one of our charges.
  if (!tx.planCode && !isLifetime) return "ignored";

  // From here the charge is a real payment for us. Anything that stops access being granted is
  // "retry", never a silent "ignored", so a paid customer is not dropped.
  let planQuery = admin.from("plans").select("code, amount_cents, interval").eq("active", true);
  planQuery = tx.planCode
    ? planQuery.eq("paystack_plan_code", tx.planCode)
    : planQuery.eq("code", "lifetime");
  const planRes = await planQuery.maybeSingle();
  if (planRes.error) throw new Error(`plans lookup failed (${planRes.error.code ?? "unknown"})`);
  const plan = planRowSchema.safeParse(planRes.data);
  if (!plan.success) {
    log("plan_unknown", { reference: tx.reference });
    return "retry";
  }
  if (meta.success && meta.data.plan !== plan.data.code) {
    log("plan_mismatch", { reference: tx.reference, plan: plan.data.code });
    return "retry";
  }
  if (tx.amount !== plan.data.amount_cents) {
    log("amount_mismatch", { reference: tx.reference, plan: plan.data.code });
    return "retry";
  }

  // The first charge names the user in metadata. Renewals do not, so fall back to the customer.
  let userId: string | null = meta.success ? meta.data.user_id : null;
  if (!userId) {
    const byCustomer = await admin
      .from("entitlements")
      .select("user_id")
      .eq("paystack_customer_code", tx.customerCode)
      .maybeSingle();
    if (byCustomer.error) {
      throw new Error(`customer lookup failed (${byCustomer.error.code ?? "unknown"})`);
    }
    const ref = z.object({ user_id: z.string() }).safeParse(byCustomer.data);
    userId = ref.success ? ref.data.user_id : null;
  }
  if (!userId) {
    // The first charge may not have written the customer code yet. Try again later.
    log("charge_without_user", { reference: tx.reference });
    return "retry";
  }

  // One Paystack customer belongs to one user.
  const owner = await admin
    .from("entitlements")
    .select("user_id")
    .eq("paystack_customer_code", tx.customerCode)
    .maybeSingle();
  if (owner.error) throw new Error(`owner lookup failed (${owner.error.code ?? "unknown"})`);
  const ownerRef = z.object({ user_id: z.string() }).safeParse(owner.data);
  if (ownerRef.success && ownerRef.data.user_id !== userId) {
    log("customer_owned_by_other_user", { reference: tx.reference });
    return "ignored";
  }

  const existingRes = await admin
    .from("entitlements")
    .select("user_id, plan_code, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingRes.error)
    throw new Error(`entitlement lookup failed (${existingRes.error.code ?? "unknown"})`);
  const existing = entitlementSchema.safeParse(existingRes.data);
  const record = () =>
    recordEvent(admin, {
      eventId,
      type: "charge.success",
      userId,
      amountCents: tx.amount,
      raw: { reference: tx.reference, plan: plan.data.code, customer_code: tx.customerCode },
    });

  if (existing.success) {
    // Paid for a time-limited plan while holding lifetime: keep lifetime, flag it for a refund.
    if (existing.data.plan_code === "lifetime" && plan.data.code !== "lifetime") {
      log("charge_on_lifetime", { reference: tx.reference });
      await record();
      return "ignored";
    }
    // A renewal that shows up after the plan was cancelled or revoked must not bring it back.
    // A fresh checkout carries metadata and is allowed to.
    if (!meta.success && ["canceled", "revoked"].includes(existing.data.status)) {
      log("renewal_after_cancel", { reference: tx.reference });
      return "ignored";
    }
  }

  const { error } = await admin.from("entitlements").upsert(
    {
      user_id: userId,
      plan_code: plan.data.code,
      status: "active",
      paystack_customer_code: tx.customerCode,
      current_period_end: addInterval(now, plan.data.interval),
      // A new checkout clears an old cancellation. A renewal that lands just before a cancel must
      // not erase it.
      ...(meta.success ? { cancel_at: null } : {}),
      // Buying lifetime ends any old subscription link so its later events cannot touch it.
      ...(plan.data.code === "lifetime" ? { paystack_subscription_code: null } : {}),
    },
    { onConflict: "user_id" },
  );
  if (error?.code === "23503") {
    // The account was deleted between checkout and the webhook. Nothing to grant.
    log("charge_unknown_user", { reference: tx.reference });
    return "ignored";
  }
  if (error) throw new Error(`entitlement write failed (${error.code ?? "unknown"})`);

  await record();
  return "applied";
}
