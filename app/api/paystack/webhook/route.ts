import { readEnv } from "@/lib/env";
import { readBodyCapped } from "@/lib/http/body";
import { handlePaystackEvent } from "@/lib/billing/paystackWebhook";
import { createPaystack, verifyPaystackSignature } from "@/lib/paystack";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Paystack webhook. The only server writer to `entitlements` and `payments`. Never session gated:
 * requests come from Paystack, not from a browser, so authentication is the signature check.
 *
 * Shape (from docs/MONETIZATION.md Webhook contract):
 * - verifies `Paystack-Signature` against PAYSTACK_WEBHOOK_SECRET (HMAC-SHA512 over
 *   `<t>.<kid>.<body>` with a 300 second tolerance on t), or the legacy `x-paystack-signature`
 *   against PAYSTACK_SECRET_KEY (bare HMAC-SHA512 of the raw body). Either one is enough; the
 *   route returns 503 only when neither secret is configured.
 * - reads the raw request body with a 1 MiB cap (the signature covers the exact bytes, so no
 *   JSON parse first)
 * - idempotent on each event's stable identifier. Paystack events have no top-level event id,
 *   so derive one such as `<event>:<data.id>` or `<event>:<data.reference>` and insert into
 *   `payments(event_id unique)`. This matters for the legacy header path, which has no
 *   timestamp to protect against replay.
 * - maps events to entitlement writes (full table in docs/MONETIZATION.md):
 *     charge.success                → first charge: mark entitlement active and store subscription code
 *     subscription.create           → subscription code + next payment date
 *     subscription.disable          → status = "canceled"
 *     subscription.not_renew        → cancel_at = current_period_end
 *     invoice.update                → if paid, extend current_period_end
 *     invoice.payment_failed        → status = "past_due"
 *     charge.refunded               → status = "revoked" when the refund is full
 *
 * After the signature check, lib/billing/paystackWebhook.ts applies the event. It returns 200 for
 * applied, duplicate and ignored events and 500 when Paystack should retry. A missing signature
 * header returns 400 so misrouted or probing traffic fails fast. A present signature that does
 * not verify also returns 400. It returns 503 only when a secret or Supabase is not configured.
 * Refund events are not handled; refunds are done by hand in the Paystack dashboard.
 */

const MAX_WEBHOOK_BYTES = 1_048_576; // 1 MiB; Paystack events run small, but allow room.

function reply(body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const signingSecret = readEnv("PAYSTACK_WEBHOOK_SECRET");
  const secretKey = readEnv("PAYSTACK_SECRET_KEY");
  // At least one of the two must be configured so one of the signature paths can run.
  if (!signingSecret.ok && !secretKey.ok) return reply({ error: "not_available_yet" }, 503);

  const signature = request.headers.get("paystack-signature");
  const legacy = request.headers.get("x-paystack-signature");
  if (!signature && !legacy) return reply({ error: "missing_signature" }, 400);

  // Read the raw body under a hard cap, chunked so a missing or lying Content-Length header
  // cannot buffer an oversize body before the signature check.
  const body = await readBodyCapped(request, MAX_WEBHOOK_BYTES);
  if (body.kind === "too-large") return reply({ error: "too_large" }, 413);
  if (body.kind === "read-failed") return reply({ error: "invalid_request" }, 400);
  if (body.text.length === 0) return reply({ error: "invalid_request" }, 400);

  const ok = await verifyPaystackSignature({
    rawBody: body.text,
    signatureHeader: signature,
    legacyHeader: legacy,
    signingSecret: signingSecret.ok ? signingSecret.value : null,
    secretKey: secretKey.ok ? secretKey.value : null,
  });
  if (!ok) return reply({ error: "bad_signature" }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(body.text);
  } catch {
    return reply({ error: "invalid_request" }, 400);
  }

  const admin = createSupabaseAdmin();
  const paystack = createPaystack();
  if (!admin || !paystack) {
    console.error(JSON.stringify({ route: "paystack/webhook", event: "not_configured" }));
    return reply({ error: "not_available_yet" }, 503);
  }

  try {
    const outcome = await handlePaystackEvent({ admin, paystack, payload });
    // A non-2xx makes Paystack retry. Only "retry" and real failures should.
    if (outcome === "retry") return reply({ error: "retry" }, 500);
    return reply({ status: outcome }, 200);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error(JSON.stringify({ route: "paystack/webhook", event: "handler_failed", detail }));
    return reply({ error: "handler_failed" }, 500);
  }
}
