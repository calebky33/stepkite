export const COUNTRIES = ["uk", "us", "in"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export type Currency = "GBP" | "USD" | "INR";

export interface CountryInfo {
  code: CountryCode;
  name: string;
  currency: Currency;
  /** Locale for number and date formatting. India uses lakh grouping. */
  locale: "en-GB" | "en-US" | "en-IN";
  /** What people in this country call the document. */
  cvName: string;
  /** What people call the money that lands in the bank. */
  takeHomeTerm: string;
  paper: "A4" | "Letter";
  /** Amounts that get their own salary page. Page URLs only, not tax figures. */
  salaryLevels: readonly number[];
}

export const COUNTRY_INFO: Record<CountryCode, CountryInfo> = {
  uk: {
    code: "uk",
    name: "United Kingdom",
    currency: "GBP",
    locale: "en-GB",
    cvName: "CV",
    takeHomeTerm: "take-home pay",
    paper: "A4",
    salaryLevels: [20000, 25000, 30000, 40000, 50000, 60000],
  },
  us: {
    code: "us",
    name: "United States",
    currency: "USD",
    locale: "en-US",
    cvName: "résumé",
    takeHomeTerm: "take-home pay",
    paper: "Letter",
    salaryLevels: [40000, 60000, 80000, 100000, 150000],
  },
  in: {
    code: "in",
    name: "India",
    currency: "INR",
    locale: "en-IN",
    cvName: "CV",
    takeHomeTerm: "in-hand salary",
    paper: "A4",
    salaryLevels: [500000, 800000, 1200000, 1800000, 2500000],
  },
};

export function isCountry(value: string): value is CountryCode {
  return (COUNTRIES as readonly string[]).includes(value);
}

export function formatMoney(amount: number, country: CountryCode): string {
  const info = COUNTRY_INFO[country];
  return new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
