import { rateLimit } from "@/lib/rateLimit";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Shared front door for the two password routes: same-origin only, then the auth rate limit.
 *
 * Returns the refusal Response, or null when the request may go on. The origin check comes
 * first so a cross-site post cannot spend another visitor's rate limit budget.
 */
export async function guardAuthRequest(request: Request): Promise<Response | null> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await rateLimit(request, "RL_AUTH"))) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }
  return null;
}

/** Response for both routes when Supabase is not configured. */
export function notAvailable(): Response {
  return Response.json({ error: "not_available" }, { status: 503, headers: NO_STORE });
}

/** Response for an unreadable or invalid JSON body. */
export function invalidBody(): Response {
  return Response.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
}

/** Success response. `body` is merged in, so a route can say it needs email confirmation. */
export function signedInResponse(body: Record<string, unknown> = { signedIn: true }): Response {
  return Response.json(body, { status: 200, headers: NO_STORE });
}

export function failure(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: NO_STORE });
}
