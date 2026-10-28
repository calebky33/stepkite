"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CONSENT_COOKIE, parseConsent, serializeConsent, type Consent } from "@/lib/consent";

const CHANGE_EVENT = "sk-consent-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** The raw cookie value, or an empty string. A string keeps the snapshot stable between reads. */
function readRaw(): string {
  const part = document.cookie.split("; ").find((p) => p.startsWith(`${CONSENT_COOKIE}=`));
  return part ? part.slice(CONSENT_COOKIE.length + 1) : "";
}

/** The stored choice, or null when the visitor has not chosen. Always null on the server. */
export function useConsent(): Consent | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parseConsent(raw), [raw]);
}

/** Stores the choice. This is the only place a cookie is written, and only after a click. */
export function saveConsent(consent: Consent): void {
  document.cookie = serializeConsent(consent);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToConsent(onChange: () => void): () => void {
  return subscribe(onChange);
}
