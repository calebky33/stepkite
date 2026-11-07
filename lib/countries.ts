/**
 * Country registry. The single source of truth for every market Stepkite supports.
 *
 * A country is identified by its lowercase ISO 3166-1 alpha-2 code. Tier 1 countries have a
 * verified tax engine and verified CV rules; tier 2 countries get the CV builder, cover letters,
 * templates, tracker and import/export but never a tax figure (CLAUDE.md rule 1: no rates from
 * memory, and never invent tax).
 *
 * Adding a market is data only: add one entry to COUNTRY_LIST. English is the platform language,
 * so `locale` drives number and date formatting (via Intl), not translation.
 */

export type Currency = string; // ISO 4217 code
export type CountryTier = 1 | 2;

/** Lowercase ISO 3166-1 alpha-2 codes for every registered market. Compile-time checked. */
export type CountryCode =
  | "uk"
  | "us"
  | "in"
  | "ca"
  | "au"
  | "nz"
  | "ie"
  | "qa"
  | "ae"
  | "sa"
  | "kw"
  | "bh"
  | "om"
  | "sg"
  | "za"
  | "ke"
  | "ng"
  | "gh"
  | "ph"
  | "my"
  | "nl"
  | "de"
  | "se";

/** Markets with a verified tax engine. Everything tax related is typed with this. */
export type TaxCountry = "uk" | "us" | "in";

export const isTaxCountry = (value: string): value is TaxCountry =>
  value === "uk" || value === "us" || value === "in";

export interface CountryInfo {
  code: CountryCode;
  name: string;
  /** Short display name for compact UI, for example "UK", "US", "India", "UAE". */
  shortName: string;
  currency: Currency;
  /** BCP 47 locale for number and date formatting only. English text everywhere. */
  locale: string;
  /** What people in this market call the document. */
  cvName: string;
  /** What people call the money that lands in the bank. */
  takeHomeTerm: string;
  paper: "A4" | "Letter";
  /** Gross amounts that get their own salary page. Empty when no tax engine exists. */
  salaryLevels: readonly number[];
  /** 1 = verified tax + rules. 2 = career tools only, no tax calculation. */
  tier: CountryTier;
}

const COUNTRY_LIST: readonly CountryInfo[] = [
  // Tier 1: verified tax engines (lib/tax) and CV rules (lib/cv/rules).
  {
    code: "uk",
    name: "United Kingdom",
    shortName: "UK",
    currency: "GBP",
    locale: "en-GB",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [20000, 25000, 30000, 40000, 50000, 60000],
    tier: 1,
  },
  {
    code: "us",
    name: "United States",
    shortName: "US",
    currency: "USD",
    locale: "en-US",
    cvName: "resume",
    takeHomeTerm: "take-home pay",
    paper: "Letter",
    salaryLevels: [40000, 60000, 80000, 100000, 150000],
    tier: 1,
  },
  {
    code: "in",
    name: "India",
    shortName: "India",
    currency: "INR",
    locale: "en-IN",
    cvName: "CV",
    takeHomeTerm: "in-hand salary",
    paper: "A4",
    salaryLevels: [500000, 1000000, 1500000, 2000000, 2500000],
    tier: 1,
  },
  // Tier 2: career tools only. English UI, localized currency/date/paper conventions.
  {
    code: "ca",
    name: "Canada",
    shortName: "Canada",
    currency: "CAD",
    locale: "en-CA",
    cvName: "resume",
    takeHomeTerm: "take-home pay",
    paper: "Letter",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "au",
    name: "Australia",
    shortName: "Australia",
    currency: "AUD",
    locale: "en-AU",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "nz",
    name: "New Zealand",
    shortName: "New Zealand",
    currency: "NZD",
    locale: "en-NZ",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "ie",
    name: "Ireland",
    shortName: "Ireland",
    currency: "EUR",
    locale: "en-IE",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "qa",
    name: "Qatar",
    shortName: "Qatar",
    currency: "QAR",
    locale: "en-QA",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "ae",
    name: "United Arab Emirates",
    shortName: "UAE",
    currency: "AED",
    locale: "en-AE",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "sa",
    name: "Saudi Arabia",
    shortName: "Saudi Arabia",
    currency: "SAR",
    locale: "en-SA",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "kw",
    name: "Kuwait",
    shortName: "Kuwait",
    currency: "KWD",
    locale: "en-KW",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "bh",
    name: "Bahrain",
    shortName: "Bahrain",
    currency: "BHD",
    locale: "en-BH",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "om",
    name: "Oman",
    shortName: "Oman",
    currency: "OMR",
    locale: "en-OM",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "sg",
    name: "Singapore",
    shortName: "Singapore",
    currency: "SGD",
    locale: "en-SG",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "za",
    name: "South Africa",
    shortName: "South Africa",
    currency: "ZAR",
    locale: "en-ZA",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "ke",
    name: "Kenya",
    shortName: "Kenya",
    currency: "KES",
    locale: "en-KE",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "ng",
    name: "Nigeria",
    shortName: "Nigeria",
    currency: "NGN",
    locale: "en-NG",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "gh",
    name: "Ghana",
    shortName: "Ghana",
    currency: "GHS",
    locale: "en-GH",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "ph",
    name: "Philippines",
    shortName: "Philippines",
    currency: "PHP",
    locale: "en-PH",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "Letter",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "my",
    name: "Malaysia",
    shortName: "Malaysia",
    currency: "MYR",
    locale: "en-MY",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "nl",
    name: "Netherlands",
    shortName: "Netherlands",
    currency: "EUR",
    locale: "en-NL",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "de",
    name: "Germany",
    shortName: "Germany",
    currency: "EUR",
    locale: "en-DE",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
  {
    code: "se",
    name: "Sweden",
    shortName: "Sweden",
    currency: "SEK",
    locale: "en-SE",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [],
    tier: 2,
  },
];

export const COUNTRIES: readonly CountryCode[] = COUNTRY_LIST.map((c) => c.code);

export const COUNTRY_INFO: Record<CountryCode, CountryInfo> = COUNTRY_LIST.reduce(
  (acc, c) => {
    acc[c.code] = c;
    return acc;
  },
  {} as Record<CountryCode, CountryInfo>,
);

export const COUNTRY_SHORT_NAME: Record<CountryCode, string> = COUNTRY_LIST.reduce(
  (acc, c) => {
    acc[c.code] = c.shortName;
    return acc;
  },
  {} as Record<CountryCode, string>,
);

export function isCountry(value: string): value is CountryCode {
  return Object.hasOwn(COUNTRY_INFO, value);
}

export function getCountry(value: string): CountryInfo | undefined {
  return isCountry(value) ? COUNTRY_INFO[value] : undefined;
}

/** True when this market has a verified tax engine and may show salary figures. */
export function hasTaxEngine(value: string): boolean {
  return getCountry(value)?.tier === 1;
}

export function formatMoney(amount: number, country: CountryCode): string {
  const info = COUNTRY_INFO[country];
  return new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** The word for the document in running text: "resume" in some markets, "CV" elsewhere. */
export function cvLabel(country: CountryCode): string {
  return COUNTRY_INFO[country].cvName;
}

/** Same word for the start of a sentence or a title: "Resume" or "CV". */
export function cvLabelTitle(country: CountryCode): string {
  const label = cvLabel(country);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
