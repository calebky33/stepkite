import { z } from "zod";
import { FREE_ENTITLEMENT, type Entitlement } from "@/lib/billing/entitlement";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server only. Reads one user's entitlement row. The caller passes the id from the verified
 * session, never an id taken from the request. Returns the free plan when the user has no row or
 * Supabase is not configured, and throws when the read itself fails so the caller can say so
 * instead of showing a paid user the free plan.
 */

const rowSchema = z.object({
  plan_code: z.enum(["free", "trial", "monthly", "yearly", "lifetime"]),
  status: z.enum(["none", "trialing", "active", "canceled", "past_due", "revoked"]),
  trial_ends_at: z.string().nullable(),
  current_period_end: z.string().nullable(),
  cancel_at: z.string().nullable(),
  trial_exports_today: z.number().int().nonnegative(),
});

export async function readEntitlement(userId: string): Promise<Entitlement> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error(JSON.stringify({ route: "entitlement", event: "not_configured" }));
    return FREE_ENTITLEMENT;
  }
  const { data, error } = await admin
    .from("entitlements")
    .select("plan_code, status, trial_ends_at, current_period_end, cancel_at, trial_exports_today")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`entitlement read failed (${error.code ?? "unknown"})`);
  if (data === null) return FREE_ENTITLEMENT;
  const row = rowSchema.safeParse(data);
  if (!row.success) throw new Error("entitlement row has an unexpected shape");
  return {
    planCode: row.data.plan_code,
    status: row.data.status,
    trialEndsAt: row.data.trial_ends_at,
    currentPeriodEnd: row.data.current_period_end,
    cancelAt: row.data.cancel_at,
    trialExportsToday: row.data.trial_exports_today,
  };
}
