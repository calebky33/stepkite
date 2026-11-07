/**
 * Entitlement types and pure helpers, safe to import from client code. The Supabase read lives in
 * lib/billing/readEntitlement.ts (server only).
 *
 * See docs/MONETIZATION.md for the schema. Only the Paystack webhook (and /api/trial/start)
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

export const FREE_ENTITLEMENT: Entitlement = {
  planCode: "free",
  status: "none",
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAt: null,
  trialExportsToday: 0,
};

/** A paid plan whose period ended this long ago, with no renewal recorded, no longer counts. This
 * covers a missed webhook without cutting off a renewal that Paystack is still retrying. */
const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** True while the user has Pro access (trial or any paid plan still inside its period).
 * A lifetime user whose status went to 'revoked' (chargeback, refund, abuse) loses access. */
export function hasProAccess(e: Entitlement, now: Date = new Date()): boolean {
  if (e.status === "revoked") return false;
  if (e.planCode === "lifetime") return true;
  if (e.status === "trialing") return true;
  if (e.status !== "active") return false;
  // A cancelled plan keeps access to the end of the period the user paid for.
  if (e.cancelAt && new Date(e.cancelAt).getTime() <= now.getTime()) return false;
  if (!e.currentPeriodEnd) return true;
  return new Date(e.currentPeriodEnd).getTime() + RENEWAL_GRACE_MS > now.getTime();
}

/** Max exports the trial allows per day. See docs/RULES.md rule 13. */
export const TRIAL_EXPORTS_PER_DAY = 2;

/** True when a trialing user may still export today. */
export function canExportDuringTrial(e: Entitlement): boolean {
  return e.status === "trialing" && e.trialExportsToday < TRIAL_EXPORTS_PER_DAY;
}
