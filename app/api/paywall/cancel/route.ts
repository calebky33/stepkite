import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { readBodyCapped } from "@/lib/http/body";
import { PaystackError, createPaystack } from "@/lib/paystack";
import { rateLimit } from "@/lib/rateLimit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Cancels the signed in user's Paystack subscription. One click: no email, no chat
 * (docs/RULES.md rule 17). Access runs to `current_period_end`: this sets `cancel_at` to that
 * date, which hasProAccess honours, and the subscription.disable webhook keeps it that way.
 *
 * Paystack has no hosted customer portal, so this endpoint replaces the old Stripe portal route.
 * The subscription code comes from the user's own entitlements row, never from the request.
 * See docs/MONETIZATION.md (POST /api/paywall/cancel) and docs/RULES.md rules 17 and 18.
 */

const MAX_REQUEST_BYTES = 4096;

const rowSchema = z
  .object({
    plan_code: z.string(),
    status: z.string(),
    paystack_subscription_code: z.string().nullable(),
    current_period_end: z.string().nullable(),
    cancel_at: z.string().nullable(),
  })
  .nullable();

function reply(body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function logFailure(event: string, fields: Record<string, string> = {}): void {
  // Ids and codes only: never an email, a token or a key.
  console.error(JSON.stringify({ route: "paywall/cancel", event, ...fields }));
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return reply({ error: "forbidden" }, 403);
  if (!(await rateLimit(request, "RL_AUTH"))) return reply({ error: "rate_limited" }, 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES)
    return reply({ error: "too_large" }, 413);

  // No body is expected, but drain whatever the client sent under the cap so a stray payload
  // does not keep the stream open.
  const body = await readBodyCapped(request, MAX_REQUEST_BYTES);
  if (body.kind === "too-large") return reply({ error: "too_large" }, 413);
  if (body.kind === "read-failed") return reply({ error: "invalid_request" }, 400);

  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const admin = createSupabaseAdmin();
  const paystack = createPaystack();
  if (!admin || !paystack) {
    logFailure("not_configured");
    return reply({ error: "not_available_yet" }, 503);
  }

  const found = await admin
    .from("entitlements")
    .select("plan_code, status, paystack_subscription_code, current_period_end, cancel_at")
    .eq("user_id", session.id)
    .maybeSingle();
  const parsed = rowSchema.safeParse(found.data);
  if (found.error || !parsed.success) {
    logFailure("lookup_failed", { userId: session.id });
    return reply({ error: "lookup_failed" }, 502);
  }

  const row = parsed.data;
  const code = row?.paystack_subscription_code;
  if (
    !row ||
    !code ||
    row.plan_code === "lifetime" ||
    (row.status !== "active" && row.status !== "past_due")
  ) {
    return reply({ error: "no_subscription" }, 409);
  }
  const accessUntil = row.current_period_end ?? new Date().toISOString();
  // Already cancelled: say so and change nothing, so a double click or a retry is harmless.
  if (row.cancel_at) return reply({ status: "already_canceled", access_until: accessUntil }, 200);

  try {
    const token = await paystack.fetchSubscriptionToken(code);
    await paystack.disableSubscription(code, token);
  } catch (error) {
    const unavailable =
      !(error instanceof PaystackError) || error.status === 0 || error.status >= 500;
    logFailure("disable_failed", {
      userId: session.id,
      paystackStatus: error instanceof PaystackError ? String(error.status) : "not_paystack_error",
    });
    return reply({ error: unavailable ? "provider_unavailable" : "cancel_failed" }, 502);
  }

  // Paystack has stopped the renewals. Record the end date now so the account page is right
  // straight away. If this write fails the webhook sets the same value, so only log it.
  const { error } = await admin
    .from("entitlements")
    .update({ cancel_at: accessUntil })
    .eq("user_id", session.id);
  if (error) logFailure("cancel_at_write_failed", { userId: session.id });

  return reply({ status: "canceled", access_until: accessUntil }, 200);
}
