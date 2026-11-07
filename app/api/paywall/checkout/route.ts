import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { readBodyCapped } from "@/lib/http/body";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Starts a Paystack checkout for the signed in user and returns the hosted authorization URL.
 *
 * Right now returns 503 after every guard, because Paystack and Supabase are not wired. The real
 * route reads the plan's amount and paystack_plan_code from the Supabase `plans` row, calls
 * POST /transaction/initialize on Paystack with a fresh reference, and returns the authorization
 * URL for the browser to redirect to. See docs/MONETIZATION.md (POST /api/paywall/checkout).
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
