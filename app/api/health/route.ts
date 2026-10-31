import { getCloudflareContext } from "@opennextjs/cloudflare";

// Liveness probe for deploy smoke checks and uptime monitors. Touches no database, no secret and
// no user data, so it answers even when Supabase or Stripe are down. The version id lets
// scripts/smoke.mjs tie a passing check to the exact Worker version.
export const dynamic = "force-dynamic";

function workerVersion(): string | null {
  try {
    const env = getCloudflareContext().env as unknown as Record<
      string,
      { id?: unknown } | undefined
    >;
    const id = env.CF_VERSION_METADATA?.id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

export function GET(): Response {
  return Response.json(
    { status: "ok", version: workerVersion() },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
