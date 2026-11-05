"use client";

import { useEffect, useState } from "react";
import { hasProAccess, type Entitlement } from "./entitlement";

type BillingMeResponse = {
  signedIn: boolean;
  entitlement: Entitlement | null;
};

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
        const body = (await res.json()) as BillingMeResponse;
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
