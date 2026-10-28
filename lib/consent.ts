import { z } from "zod";

/** Preferences only. No personal data is stored (CLAUDE.md rule 3, RULES.md 33). */
export const CONSENT_COOKIE = "sk_consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const consentSchema = z.object({
  analytics: z.boolean(),
  ads: z.boolean(),
});
export type Consent = z.infer<typeof consentSchema>;

export const DECLINED: Consent = { analytics: false, ads: false };

/** Countries where a consent choice is required before any optional cookie. */
export const CONSENT_REQUIRED_REGIONS = new Set([
  "GB",
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "CH",
]);

export function needsConsentBanner(countryCode: string | null | undefined): boolean {
  if (!countryCode) return true; // Unknown location: ask, to be safe.
  return CONSENT_REQUIRED_REGIONS.has(countryCode.toUpperCase());
}

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  try {
    const parsed = consentSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function serializeConsent(consent: Consent): string {
  return `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax; Secure`;
}

export function readConsentCookie(cookieString: string): Consent | null {
  const match = cookieString.split("; ").find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
}
