/** Preferences only. No personal data is stored (CLAUDE.md rule 3, RULES.md 33). */
export const CONSENT_COOKIE = "sk_consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type Consent = { analytics: boolean; ads: boolean };

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
    const value: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof value !== "object" || value === null) return null;
    const { analytics, ads } = value as Partial<Record<keyof Consent, unknown>>;
    if (typeof analytics !== "boolean" || typeof ads !== "boolean") return null;
    return { analytics, ads };
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
