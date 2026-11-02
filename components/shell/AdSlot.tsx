"use client";

import { cn } from "@/components/ui/cn";
import { useBillingMe } from "@/lib/billing/useBillingMe";
import { useConsent } from "./consentStore";

type AdSlotProps = {
  /** Only these two. Ads never appear in the CV builder or the tracker. */
  placement: "calculator" | "guide";
};

const HEIGHT: Record<AdSlotProps["placement"], string> = {
  calculator: "h-[250px]",
  guide: "h-[280px]",
};

/**
 * A reserved box so the page never jumps. No ad network is connected yet, so it stays empty.
 * When one is added it loads only if the visitor accepted ads. Hidden for viewers whose
 * entitlement grants Pro access (lifetime, trialing, or any active paid plan).
 */
export function AdSlot({ placement }: AdSlotProps) {
  const consent = useConsent();
  const billing = useBillingMe();
  if (billing.isPro) return null;
  return (
    <div className="flex w-full flex-col gap-1" data-placement={placement}>
      <p className="text-sm text-muted">Advertisement</p>
      <div
        data-testid="ad-box"
        data-ads={consent?.ads === true ? "allowed" : "off"}
        className={cn("w-full rounded-card bg-surface-2", HEIGHT[placement])}
      />
    </div>
  );
}
