"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Entitlement } from "@/lib/billing/entitlement";
import { formatPrice, getPlan, type PlanCode } from "@/lib/billing/plans";

/** Shape returned by GET /api/billing/me. Mirrors app/api/billing/me/route.ts BillingMe. */
type BillingMe = { signedIn: boolean; entitlement: Entitlement | null };
type Status = "loading" | "ready" | "failed";

type DisplayPlan = {
  name: string;
  nextChargeAmount: string | null;
  nextChargeDate: string | null;
  cancelable: boolean;
};

const PLAN_NAMES: Record<Entitlement["planCode"], string> = {
  free: "Free",
  trial: "7 day Pro trial",
  monthly: "Monthly plan",
  yearly: "Yearly plan",
  lifetime: "Lifetime",
};

const SUBSCRIPTION_PLANS = new Set<PlanCode>(["monthly", "yearly"]);

function toDisplay(entitlement: Entitlement): DisplayPlan {
  const name = PLAN_NAMES[entitlement.planCode];
  // Only paid subscriptions have a next charge amount and date, and only they can be canceled.
  if (!SUBSCRIPTION_PLANS.has(entitlement.planCode as PlanCode)) {
    return { name, nextChargeAmount: null, nextChargeDate: null, cancelable: false };
  }
  const plan = getPlan(entitlement.planCode as PlanCode);
  const nextChargeDate = entitlement.currentPeriodEnd
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
        new Date(entitlement.currentPeriodEnd),
      )
    : null;
  return {
    name,
    nextChargeAmount: formatPrice(plan),
    nextChargeDate,
    cancelable: entitlement.status === "active" || entitlement.status === "trialing",
  };
}

/**
 * Reads the signed in visitor's entitlement from GET /api/billing/me and shows the plan name,
 * the next charge, and a Cancel button when there is a subscription to cancel. For anonymous
 * visitors the component renders the sign in prompt instead. See docs/MONETIZATION.md (Pages
 * we add or refresh).
 */
export function BillingSummary(): React.ReactElement {
  const [state, setState] = useState<Status>("loading");
  const [data, setData] = useState<BillingMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/me", {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (!res.ok) {
          if (!cancelled) setState("failed");
          return;
        }
        const json = (await res.json()) as BillingMe;
        if (cancelled) return;
        setData(json);
        setState("ready");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <Card aria-busy="true" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Your plan</h2>
        <p className="text-base text-muted">Loading your plan.</p>
      </Card>
    );
  }

  if (state === "failed" || !data) {
    return (
      <Card className="flex flex-col gap-2" role="status">
        <h2 className="text-sm font-semibold text-muted">Your plan</h2>
        <p className="text-base text-muted">
          We couldn&apos;t load your plan. Reload the page to try again.
        </p>
      </Card>
    );
  }

  if (!data.signedIn || !data.entitlement) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Your plan</h2>
        <p className="text-base text-muted">
          You&apos;re not signed in, so there&apos;s no plan to show.
        </p>
      </Card>
    );
  }

  const display = toDisplay(data.entitlement);
  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Your plan</h2>
        <p className="text-xl font-semibold text-text">{display.name}</p>
        {display.nextChargeAmount && display.nextChargeDate ? (
          <p className="text-base text-muted">
            Next charge {display.nextChargeAmount} on {display.nextChargeDate}.
          </p>
        ) : (
          <p className="text-base text-muted">No charges are scheduled.</p>
        )}
      </div>
      {display.cancelable ? (
        <Button variant="secondary" className="self-start md:self-auto">
          Cancel plan
        </Button>
      ) : null}
    </Card>
  );
}
