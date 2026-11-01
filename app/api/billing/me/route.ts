import { getSession } from "@/lib/auth/session";
import { readEntitlement, type Entitlement } from "@/lib/billing/entitlement";

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
  const payload: BillingMe = user
    ? { signedIn: true, entitlement: await readEntitlement(user.id) }
    : { signedIn: false, entitlement: null };
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
