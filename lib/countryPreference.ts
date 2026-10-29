"use client";

import { useSyncExternalStore } from "react";
import { isCountry, type CountryCode } from "@/lib/countries";
import { countryRoutes } from "@/lib/routes";

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

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The remembered country, or the UK. Matches the server render until the page hydrates. */
export function useSavedCountry(): CountryCode {
  return useSyncExternalStore(
    subscribe,
    () => readSavedCountry() ?? DEFAULT_COUNTRY,
    (): CountryCode => DEFAULT_COUNTRY,
  );
}

/** The same page in another country when that route exists, else the country hub. */
export function pathForCountry(pathname: string, target: CountryCode): string {
  const [, first = "", ...rest] = pathname.split("/");
  if (!isCountry(first) || rest.length === 0 || rest.every((part) => part === "")) {
    return `/${target}`;
  }
  const candidate = `/${target}/${rest.join("/")}`;
  return countryRoutes(target).includes(candidate) ? candidate : `/${target}`;
}
