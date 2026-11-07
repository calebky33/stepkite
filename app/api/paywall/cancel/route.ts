import { requireSession } from "@/lib/auth/session";
import { readBodyCapped } from "@/lib/http/body";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Cancels the signed in user's Paystack subscription. One click: no email, no chat
 * (docs/RULES.md rule 17). Access runs to `current_period_end`, then revokes via the
 * subscription.disable webhook.
 *
 * Paystack does not host a customer portal like Stripe's, so this endpoint replaces the old
 * /api/paywall/portal. The account page uses it for the Cancel button, then shows the stored
 * `cancel_at` from the entitlements row.
 *
 * Right now returns 503 after every guard, because Paystack and Supabase are not wired. The real
 * route reads the user's paystack_subscription_code from entitlements, fetches a one time
 * email_token from GET /subscription/:code, then POSTs /subscription/disable. See
 * docs/MONETIZATION.md (POST /api/paywall/cancel) and docs/RULES.md rules 17 and 18.
 */

const MAX_REQUEST_BYTES = 4096;

function reply(body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
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

  return reply({ error: "not_available_yet" }, 503);
}
