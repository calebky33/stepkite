import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { readBodyCapped } from "@/lib/http/body";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Starts the 7 day no card Pro trial.
 *
 * Right now returns 503 after every guard, because Supabase and Stripe are not wired. The real
 * route (docs/MONETIZATION.md: POST /api/trial/start) writes trial_started_at and trial_ends_at
 * on the entitlement row, inserts into trial_fingerprints, and refuses when the fingerprint,
 * IP hash, or email domain was already used.
 */

const bodySchema = z
  .object({
    fingerprint: z
      .string()
      .length(64)
      .regex(/^[0-9a-f]{64}$/),
  })
  .strict();

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
