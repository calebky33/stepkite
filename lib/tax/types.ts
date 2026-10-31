import { z } from "zod";
import { COUNTRIES, type CountryCode } from "@/lib/countries";

export const PAY_PERIODS = ["year", "month", "week", "hour"] as const;
export type PayPeriod = (typeof PAY_PERIODS)[number];

/** Bounds on what a visitor can type. Input limits, not tax figures. */
export const MIN_GROSS = 1;
export const MAX_GROSS = 10_000_000;

export const payInputSchema = z.object({
  country: z.enum(COUNTRIES),
  taxYear: z.string().min(1),
  gross: z.number().min(MIN_GROSS).max(MAX_GROSS),
  period: z.enum(PAY_PERIODS),
  hoursPerWeek: z.number().positive().max(168).optional(),
  region: z.string().min(1).optional(),
  options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
export type PayInput = z.infer<typeof payInputSchema>;

export interface PayLine {
  key: string;
  label: string;
  amount: number;
  /** Official page the rule comes from. Left out for amounts the user typed in. */
  source?: string;
  /** Short human name for the source link, for example "GOV.UK income tax rates". No dashes or slashes. */
  sourceLabel?: string;
}

export interface PayResult {
  gross: number;
  lines: PayLine[];
  net: number;
  perPeriod: { year: number; month: number; week: number };
  /** Plain-language assumptions shown to the user. */
  assumptions: string[];
}

/** A rate or threshold. Never added without a source and the date it was checked. */
interface SourcedBase<T> {
  value: T;
  source: string;
  /** More official pages that state the same rule. */
  alsoSources?: readonly string[];
}

/**
 * A value carries `verifiedOn` when it was read in full on an official page, or `unverifiedNote`
 * when it was not. Never both.
 */
export type Sourced<T> =
  | (SourcedBase<T> & { verifiedOn: string; unverifiedNote?: never })
  | (SourcedBase<T> & { unverifiedNote: string; verifiedOn?: never });

/** What a `rates.<year>.ts` file holds. `loaded` stays false until the tax-engine agent fetches official figures. */
export interface RatesFile {
  taxYear: string;
  loaded: boolean;
  /** ISO date the figures were last checked against the official sources. */
  verifiedOn?: string;
  /** Official pages the figures will come from. */
  officialSources: readonly string[];
}

export type EngineOutcome =
  | { status: "ready"; result: PayResult }
  | { status: "rates-missing"; country: CountryCode; reason: string };

export type PayEngine = (input: PayInput) => EngineOutcome;

export function ratesMissing(country: CountryCode, rates: RatesFile): EngineOutcome {
  return {
    status: "rates-missing",
    country,
    reason: `Rates for ${rates.taxYear} have not been checked against the official source yet.`,
  };
}
