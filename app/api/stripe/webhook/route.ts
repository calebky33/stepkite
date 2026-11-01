import { readEnv } from "@/lib/env";
import { createStripe, cryptoProvider } from "@/lib/stripe";

/**
 * Stripe webhook. The only server writer to `entitlements` and `payments`. Never session gated:
 * requests come from Stripe, not from a browser, so authentication is the signature check.
 *
 * Shape (from docs/MONETIZATION.md Webhook contract):
 * - verifies `stripe-signature` against STRIPE_WEBHOOK_SECRET
 * - reads the raw request body (the signature covers the exact bytes, so no JSON parse first)
 * - idempotent on `event.id`: inserts into `payments(event_id unique)` and drops repeats
 * - maps events to entitlement writes:
 *     customer.created              → insert users row if missing, store stripe_customer_id
 *     checkout.session.completed    → set entitlement status based on the plan
 *     customer.subscription.updated → update status, current_period_end, cancel_at
 *     customer.subscription.deleted → status = "canceled", cancel_at = now
 *     invoice.paid                  → append to payments, extend current_period_end
 *     invoice.payment_failed        → status = "past_due"
 *     charge.refunded               → status = "revoked" when the refund is full
 *
 * Nothing is wired yet, so this returns 503 as soon as STRIPE_WEBHOOK_SECRET is missing (always,
 * for now). A missing stripe-signature header returns 400 so misrouted or probing traffic fails
 * fast. A valid secret with a bad signature also returns 400.
 */

const MAX_WEBHOOK_BYTES = 1_048_576; // 1 MiB; Stripe events run small, but allow room.

function reply(body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const secret = readEnv("STRIPE_WEBHOOK_SECRET");
  if (!secret.ok) return reply({ error: "not_available_yet" }, 503);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return reply({ error: "missing_signature" }, 400);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_WEBHOOK_BYTES)
    return reply({ error: "too_large" }, 413);

  // The signature covers the exact raw body. Read as text, do not parse first.
  const raw = await request.text().catch(() => null);
  if (raw === null) return reply({ error: "invalid_request" }, 400);
  if (raw.length === 0) return reply({ error: "invalid_request" }, 400);

  const stripe = createStripe();
  if (!stripe) return reply({ error: "not_available_yet" }, 503);

  try {
    // Async check with the Web Crypto provider: works on Cloudflare Workers.
    await stripe.webhooks.constructEventAsync(
      raw,
      signature,
      secret.value,
      undefined,
      cryptoProvider,
    );
  } catch {
    return reply({ error: "bad_signature" }, 400);
  }

  // Supabase admin writes land here once wired. See the comment block above for the mapping.
  return reply({ error: "not_available_yet" }, 503);
}
