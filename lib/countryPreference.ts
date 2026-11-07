"use client";

import { useSyncExternalStore } from "react";
import { isCountry, type CountryCode } from "@/lib/countries";

/** Country code only. No personal data is stored. */
export const COUNTRY_STORAGE_KEY = "sk_country";
export const DEFAULT_COUNTRY: CountryCode = "uk";

const CHANGE_EVENT = "sk-country-change";

export function readSavedCountry(): CountryCode | null {
  try {
    const saved = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
    return saved !== null && isCountry(saved) ? saved : null;
  } catch {
    // Storage can be blocked. The site then uses the default.
    return null;
  }
}

export function saveCountry(code: CountryCode): void {
  try {
    window.localStorage.setItem(COUNTRY_STORAGE_KEY, code);
  } catch {
    // The choice still applies for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The visitor's market guessed from their location, held in memory for this page only. It is a
 * suggestion: it never overrides a saved choice and is never written to storage by itself.
 */
let detected: CountryCode | null = null;
let detectRequested = false;

function detectCountryOnce(): void {
  if (detectRequested || readSavedCountry() !== null) return;
  detectRequested = true;
  fetch("/api/geo", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((body: unknown) => {
      const value =
        typeof body === "object" && body !== null
          ? (body as Record<string, unknown>).country
          : null;
      if (typeof value === "string" && isCountry(value)) {
        detected = value;
        window.dispatchEvent(new Event(CHANGE_EVENT));
      }
    })
    .catch(() => {
      // No guess: the default stays. Location is only a convenience.
    });
}

function subscribe(onChange: () => void): () => void {
  detectCountryOnce();
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The remembered country, else the one guessed from location, else the UK. Matches the server
 *  render until the page hydrates. */
export function useSavedCountry(): CountryCode {
  return useSyncExternalStore(
    subscribe,
    () => readSavedCountry() ?? detected ?? DEFAULT_COUNTRY,
    (): CountryCode => DEFAULT_COUNTRY,
  );
}

export { pathForCountry } from "@/lib/routes";
