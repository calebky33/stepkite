import { getSession } from "@/lib/auth/session";
import type { Entitlement } from "@/lib/billing/entitlement";
import { readEntitlement } from "@/lib/billing/readEntitlement";

/**
 * The signed in visitor's current entitlement. Anonymous callers get `{signedIn: false,
 * entitlement: null}` rather than a 401, because the pricing page and account page want to show
 * something either way. See docs/MONETIZATION.md (Routes we add) and lib/billing/entitlement.ts.
 */

export type BillingMe = {
  signedIn: boolean;
  entitlement: Entitlement | null;
};

export async function GET(request: Request): Promise<Response> {
  const user = await getSession(request);
  if (!user) {
    const anonymous: BillingMe = { signedIn: false, entitlement: null };
    return Response.json(anonymous, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const payload: BillingMe = { signedIn: true, entitlement: await readEntitlement(user.id) };
    return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Say so rather than showing a paid user the free plan.
    const detail = error instanceof Error ? error.message : "unknown";
    console.error(JSON.stringify({ route: "billing/me", event: "read_failed", detail }));
    return Response.json(
      { error: "entitlement_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
