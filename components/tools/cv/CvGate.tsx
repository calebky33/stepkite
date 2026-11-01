"use client";

import { useSyncExternalStore } from "react";
import type { CountryCode } from "@/lib/countries";
import { isAnonymous } from "@/lib/cv/sandbox";
import { CvBuilderShell } from "./CvBuilderShell";
import { SandboxShell } from "./SandboxShell";

type Mode = "sandbox" | "account";

/** The cookie and the stored user id can only be read on the client, so there is nothing to
 *  subscribe to. The returned noop lets useSyncExternalStore track a one-shot client read. */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): Mode {
  return isAnonymous() ? "sandbox" : "account";
}

/** During SSR we treat the visitor as anonymous. The signed-in builder reads IndexedDB, which
 *  only exists in the browser, so this matches what the client actually renders in the
 *  anonymous case. React re-renders the signed-in case after hydration. */
function getServerSnapshot(): Mode {
  return "sandbox";
}

/**
 * Picks the sandbox or the signed-in builder based on whether this device is signed in.
 * See docs/MONETIZATION.md (Soft-start sandbox) and docs/RULES.md rule 16.
 */
export function CvGate({ country }: { country: CountryCode }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (mode === "sandbox") return <SandboxShell country={country} />;
  return <CvBuilderShell country={country} />;
}
