/**
 * Server-side entitlement helper. Once Supabase is wired, readEntitlement reads the user's row
 * from the entitlements table. Right now it returns the free plan for everyone.
 *
 * See docs/MONETIZATION.md for the schema. Only the Stripe webhook (and /api/trial/start)
 * ever write entitlements.
 */
export type PlanCode = "free" | "trial" | "monthly" | "yearly" | "lifetime";

export type Entitlement = {
  planCode: PlanCode;
  status: "none" | "trialing" | "active" | "canceled" | "past_due" | "revoked";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  trialExportsToday: number;
};

const FREE: Entitlement = {
  planCode: "free",
  status: "none",
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAt: null,
  trialExportsToday: 0,
};

export async function readEntitlement(userId: string): Promise<Entitlement> {
  // Stub: free for everyone until Supabase is wired. The id is accepted now so the final
  // version (which reads the entitlements row for this user) keeps the same signature.
  void userId;
  return FREE;
}

/** True while the user has Pro access (trial or any paid plan still inside its period). */
export function hasProAccess(e: Entitlement): boolean {
  if (e.planCode === "lifetime") return true;
  if (e.status === "trialing" || e.status === "active") return true;
  return false;
}

/** Max exports the trial allows per day. See docs/RULES.md rule 13. */
export const TRIAL_EXPORTS_PER_DAY = 2;

/** True when a trialing user may still export today. */
export function canExportDuringTrial(e: Entitlement): boolean {
  return e.status === "trialing" && e.trialExportsToday < TRIAL_EXPORTS_PER_DAY;
}
