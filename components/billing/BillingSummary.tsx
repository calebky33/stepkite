"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
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
  /** Set once the user has cancelled: the last day of the paid period. */
  endsOn: string | null;
  cancelable: boolean;
};

const CANCEL_MESSAGES: Record<string, string> = {
  no_subscription: "There is no recurring plan to cancel. Reload the page to see your plan.",
  rate_limited: "Too many tries. Wait a minute and try again.",
};
const CANCEL_FALLBACK = "We couldn't cancel your plan. Try again in a minute.";

const cancelResponseSchema = z.object({
  status: z.string().optional(),
  access_until: z.string().optional(),
  error: z.string().optional(),
});

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(iso));
}

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
    return { name, nextChargeAmount: null, nextChargeDate: null, endsOn: null, cancelable: false };
  }
  const plan = getPlan(entitlement.planCode as PlanCode);
  const nextChargeDate = entitlement.currentPeriodEnd
    ? formatDate(entitlement.currentPeriodEnd)
    : null;
  const cancelled = entitlement.cancelAt !== null;
  return {
    name,
    nextChargeAmount: formatPrice(plan),
    nextChargeDate,
    endsOn: cancelled
      ? formatDate(entitlement.cancelAt ?? entitlement.currentPeriodEnd ?? "")
      : null,
    // A trial takes no card, so there is nothing to cancel. Only a live subscription that is not
    // already cancelled can be.
    cancelable:
      !cancelled && (entitlement.status === "active" || entitlement.status === "past_due"),
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
  const [confirming, setConfirming] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Each step swaps or disables the focused control, so say where focus goes next and move it
  // after the render that follows. A ref, not state, so no extra render is needed.
  const pendingFocus = useRef<"confirm" | "trigger" | "done" | null>(null);
  const confirmRef = useRef<HTMLParagraphElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const element =
      target === "confirm"
        ? confirmRef.current
        : target === "trigger"
          ? triggerRef.current
          : doneRef.current;
    element?.focus();
  });

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

  async function cancelPlan() {
    setCanceling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/paywall/cancel", { method: "POST" });
      const parsed = cancelResponseSchema.safeParse(await res.json().catch(() => null));
      if (res.ok && parsed.success && parsed.data.access_until) {
        const accessUntil = parsed.data.access_until;
        setData((current) =>
          current && current.entitlement
            ? { ...current, entitlement: { ...current.entitlement, cancelAt: accessUntil } }
            : current,
        );
        setConfirming(false);
        setSuccessNote(`Plan cancelled. You keep Pro until ${formatDate(accessUntil)}.`);
        pendingFocus.current = "done";
      } else {
        const code = parsed.success ? parsed.data.error : undefined;
        setCancelError((code && CANCEL_MESSAGES[code]) || CANCEL_FALLBACK);
        pendingFocus.current = "confirm";
      }
    } catch {
      setCancelError(CANCEL_FALLBACK);
      pendingFocus.current = "confirm";
    }
    setCanceling(false);
  }

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
      <Card className="flex flex-col gap-2" role="alert">
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
        {display.endsOn ? (
          <p ref={doneRef} tabIndex={-1} className="text-base text-muted outline-offset-4">
            Cancelled. You keep Pro until {display.endsOn}, and you won&apos;t be charged again.
          </p>
        ) : display.nextChargeAmount && display.nextChargeDate ? (
          <p className="text-base text-muted">
            Next charge {display.nextChargeAmount} on {display.nextChargeDate}.
          </p>
        ) : (
          <p className="text-base text-muted">No charges are scheduled.</p>
        )}
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted">
          {cancelError ?? successNote}
        </p>
      </div>
      {display.cancelable ? (
        confirming ? (
          <div className="flex flex-col gap-2 self-start md:self-auto">
            <p ref={confirmRef} tabIndex={-1} className="text-base text-text outline-offset-4">
              Stop renewals? You keep Pro until the period you&apos;ve paid for ends.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={canceling} onClick={cancelPlan}>
                Yes, cancel plan
              </Button>
              <Button
                variant="ghost"
                disabled={canceling}
                onClick={() => {
                  setConfirming(false);
                  setCancelError(null);
                  pendingFocus.current = "trigger";
                }}
              >
                Keep plan
              </Button>
            </div>
          </div>
        ) : (
          <Button
            ref={triggerRef}
            variant="secondary"
            className="self-start md:self-auto"
            onClick={() => {
              setConfirming(true);
              setCancelError(null);
              pendingFocus.current = "confirm";
            }}
          >
            Cancel plan
          </Button>
        )
      ) : null}
    </Card>
  );
}
