import type Stripe from "stripe";
import { readEnv } from "@/lib/env";
import { createStripe, cryptoProvider } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const PASS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const secret = readEnv("STRIPE_WEBHOOK_SECRET");
  const stripe = createStripe();
  const admin = createSupabaseAdmin();
  if (!secret.ok || !stripe || !admin)
    return Response.json({ error: "not_available" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "missing_signature" }, { status: 400 });

  // The signature covers the exact raw body, so read text and do not parse first.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    // Async check with the Web Crypto provider: works on Cloudflare Workers.
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret.value,
      undefined,
      cryptoProvider,
    );
  } catch {
    return Response.json({ error: "bad_signature" }, { status: 400 });
  }

  // Delayed methods (bank debits, UPI) confirm later with the async event, so grant on both.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  const userId = session.client_reference_id;
  // Only the one-time pass is granted here. The annual plan is added with its own events later.
  if (session.mode !== "payment" || !userId || session.payment_status !== "paid") {
    return Response.json({ received: true });
  }

  // Idempotent: a repeated delivery hits the unique stripe_session_id and is ignored.
  const { error } = await admin.from("entitlements").upsert(
    {
      user_id: userId,
      kind: "pro_pass",
      expires_at: new Date(Date.now() + PASS_DAYS * DAY_MS).toISOString(),
      stripe_session_id: session.id,
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true },
  );
  // A failure returns 500 so Stripe retries the delivery.
  if (error) return Response.json({ error: "grant_failed" }, { status: 500 });
  return Response.json({ received: true });
}
