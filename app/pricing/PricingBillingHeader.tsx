"use client";

import { useEffect, useState } from "react";
import { CurrentPlanPanel, type CurrentPlan } from "@/components/billing/CurrentPlanPanel";
import type { Entitlement } from "@/lib/billing/entitlement";
import { formatPrice, getPlan, type PlanCode } from "@/lib/billing/plans";

type BillingMe = { signedIn: boolean; entitlement: Entitlement | null };

const PAID: ReadonlyArray<PlanCode> = ["monthly", "yearly", "lifetime"];

function toCurrentPlan(entitlement: Entitlement): CurrentPlan | null {
  const code = entitlement.planCode;
  // Free (and the no card trial) use the regular pricing cards. Only paid plans show the panel.
  if (!(PAID as ReadonlyArray<string>).includes(code)) return null;
  const plan = getPlan(code as PlanCode);
  const nextChargeAmount = code === "lifetime" ? null : formatPrice(plan);
  const nextChargeDate = code === "lifetime" ? null : entitlement.currentPeriodEnd;
  return { plan: code as PlanCode, nextChargeAmount, nextChargeDate };
}

/**
 * Pricing page banner for signed in Pro users. Fetches /api/billing/me on mount and renders
 * CurrentPlanPanel when the visitor is on a paid plan. Anonymous and Free visitors see nothing
 * here, so the four pricing cards below stay the hero. See docs/MONETIZATION.md.
 */
export function PricingBillingHeader(): React.ReactElement | null {
  const [state, setState] = useState<CurrentPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/me", {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as BillingMe;
        if (cancelled || !data.signedIn || !data.entitlement) return;
        setState(toCurrentPlan(data.entitlement));
      } catch {
        // Pricing is readable without this panel. Any load error leaves it hidden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;
  return <CurrentPlanPanel state={state} />;
}
