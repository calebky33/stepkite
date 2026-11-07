"use client";

import { useEffect, useState } from "react";
import * as z from "zod/mini";
import { hasProAccess } from "./entitlement";

// zod/mini keeps this small: the hook runs on calculator pages through AdSlot.
const responseSchema = z.object({
  signedIn: z.boolean(),
  entitlement: z.nullable(
    z.object({
      planCode: z.enum(["free", "trial", "monthly", "yearly", "lifetime"]),
      status: z.enum(["none", "trialing", "active", "canceled", "past_due", "revoked"]),
      trialEndsAt: z.nullable(z.string()),
      currentPeriodEnd: z.nullable(z.string()),
      cancelAt: z.nullable(z.string()),
      trialExportsToday: z.number(),
    }),
  ),
});

export type BillingMeState =
  | { status: "loading"; isPro: false; signedIn: false }
  | { status: "ready"; isPro: boolean; signedIn: boolean }
  | { status: "error"; isPro: false; signedIn: false };

/**
 * Reads /api/billing/me once on mount so UI can gate ads and watermarks on the viewer's plan.
 * Until Supabase is wired, the API returns the free default for everyone, so isPro stays false.
 * The error branch is also treated as free so a flaky network never leaks Pro-only UI.
 */
export function useBillingMe(): BillingMeState {
  const [state, setState] = useState<BillingMeState>({
    status: "loading",
    isPro: false,
    signedIn: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/billing/me", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`billing/me ${res.status}`);
        // A body that does not match is treated like a failed request: free plan, no Pro UI.
        const body = responseSchema.parse(await res.json());
        const isPro = body.entitlement ? hasProAccess(body.entitlement) : false;
        setState({ status: "ready", isPro, signedIn: body.signedIn });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ status: "error", isPro: false, signedIn: false });
      });
    return () => controller.abort();
  }, []);

  return state;
}
