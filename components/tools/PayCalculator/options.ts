import type { CountryCode } from "@/lib/countries";
import { MAX_GROSS } from "@/lib/tax/types";

/** Everything the country fields hold, as plain text. Parsed once by buildOptions. */
export type FieldValues = Record<string, string>;

export type BuiltOptions = {
  region: string | undefined;
  options: Record<string, string | number | boolean>;
  /** Field key to message. Empty when every field is fine. */
  errors: Record<string, string>;
};

export const DEFAULT_VALUES: Record<CountryCode, FieldValues> = {
  uk: {
    region: "england",
    pensionPercent: "",
    pensionType: "net-pay",
    studentLoan: "none",
    otherDeductions: "",
  },
  us: {
    region: "california",
    filingStatus: "single",
    retirementPercent: "",
    payFrequency: "biweekly",
    otherDeductions: "",
  },
  in: {
    regime: "new",
    region: "maharashtra",
    section80c: "",
    section80d: "",
    hraReceived: "",
    rentPaid: "",
    metro: "metro",
    otherDeductions: "",
  },
};

const PERCENT_KEYS: Record<CountryCode, readonly string[]> = {
  uk: ["pensionPercent"],
  us: ["retirementPercent"],
  in: [],
};

const AMOUNT_KEYS: Record<CountryCode, readonly string[]> = {
  uk: ["otherDeductions"],
  us: ["otherDeductions"],
  in: ["section80c", "section80d", "hraReceived", "rentPaid", "otherDeductions"],
};

/** Only the old regime reads these. */
const OLD_REGIME_KEYS = ["section80c", "section80d", "hraReceived", "rentPaid", "metro"] as const;

export const PERCENT_ERROR = "Enter a percentage from 0 to 100.";
export const AMOUNT_ERROR = "Enter an amount of 0 or more.";

function parse(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Turns field text into PayInput.region and PayInput.options. Empty number fields are left out. */
export function buildOptions(country: CountryCode, values: FieldValues): BuiltOptions {
  const options: BuiltOptions["options"] = {};
  const errors: Record<string, string> = {};
  const oldOnly = country === "in" && values.regime === "old";

  for (const [key, raw] of Object.entries(values)) {
    if (key === "region") continue;
    if (country === "in" && !oldOnly && (OLD_REGIME_KEYS as readonly string[]).includes(key)) {
      continue;
    }
    if (PERCENT_KEYS[country].includes(key)) {
      const n = parse(raw);
      if (n === null) continue;
      if (Number.isNaN(n) || n < 0 || n > 100) errors[key] = PERCENT_ERROR;
      else options[key] = n;
    } else if (AMOUNT_KEYS[country].includes(key)) {
      const n = parse(raw);
      if (n === null) continue;
      if (Number.isNaN(n) || n < 0 || n > MAX_GROSS) errors[key] = AMOUNT_ERROR;
      else options[key] = n;
    } else {
      options[key] = raw;
    }
  }

  return { region: values.region || undefined, options, errors };
}
