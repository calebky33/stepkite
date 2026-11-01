import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { readBodyCapped } from "@/lib/http/body";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Opens a Stripe Checkout session for the signed in user.
 *
 * Right now returns 503 after every guard, because Stripe is not wired. The real route reads
 * STRIPE_SECRET_KEY and the per plan price id from env, creates the session with the plan's
 * price, Stripe Tax on, success and cancel URLs, and returns the hosted URL for the client to
 * redirect to. See docs/MONETIZATION.md (POST /api/paywall/checkout).
 */

const bodySchema = z.object({ plan: z.enum(["monthly", "yearly", "lifetime"]) }).strict();
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

  const body = await readBodyCapped(request, MAX_REQUEST_BYTES);
  if (body.kind === "too-large") return reply({ error: "too_large" }, 413);
  if (body.kind === "read-failed") return reply({ error: "invalid_request" }, 400);

  let json: unknown = null;
  try {
    json = JSON.parse(body.text);
  } catch {
    return reply({ error: "invalid_request" }, 400);
  }
  if (!bodySchema.safeParse(json).success) return reply({ error: "invalid_request" }, 400);

  const session = await requireSession(request);
  if (session instanceof Response) return session;

  return reply({ error: "not_available_yet" }, 503);
}
