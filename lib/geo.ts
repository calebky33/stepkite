import { isCountry, type CountryCode } from "@/lib/countries";

/**
 * Turns an ISO 3166-1 alpha-2 code (as Cloudflare sends it in `cf-ipcountry`) into a registry
 * code. The registry uses "uk" where ISO says "GB". Anything outside the registry, plus
 * Cloudflare's "XX" (unknown) and "T1" (Tor), gives null.
 */
export function countryFromIso(iso: string | null | undefined): CountryCode | null {
  if (!iso) return null;
  const lower = iso.trim().toLowerCase();
  const code = lower === "gb" ? "uk" : lower;
  return isCountry(code) ? code : null;
}

/** The visitor's market from Cloudflare's geolocation header, or null. Country level only:
 *  no IP address or finer location is read or kept. */
export function countryFromRequest(headers: Headers): CountryCode | null {
  return countryFromIso(headers.get("cf-ipcountry"));
}
