/**
 * Job ad matching is switched off. Each call costs money, so it stays off until a real per user and per IP
 * rate limit (shared storage, because Workers do not share memory between requests) and sign-in are connected.
 * An in-memory counter would not hold across requests, so none is used here.
 */
export function POST(): Response {
  return Response.json(
    { error: "not_available_yet", message: "Job ad matching is not available yet." },
    { status: 503 },
  );
}
