import type { CountryCode } from "@/lib/countries";
import type { PayEngine, RatesFile } from "./types";
import { inRates } from "./in/rates.2026";
import { ukRates } from "./uk/rates.2026";
import { usRates } from "./us/rates.2026";

// Rates files are small and hold no logic, so they load together. Engines load one at a time.
const rates: Partial<Record<CountryCode, RatesFile>> = { uk: ukRates, us: usRates, in: inRates };

/** Loads only the engine for one country, so a page never carries all three. Returns null for
 *  markets without a verified tax engine. */
export async function loadEngine(country: CountryCode): Promise<PayEngine | null> {
  switch (country) {
    case "uk":
      return (await import("./uk/engine")).ukEngine;
    case "us":
      return (await import("./us/engine")).usEngine;
    case "in":
      return (await import("./in/engine")).inEngine;
    default:
      return null;
  }
}

/** The rates file for a market, or undefined when it has no verified tax rules. */
export const getRates = (country: CountryCode): RatesFile | undefined => rates[country];

/** The rates file for a market that must have one (tier 1). Throws otherwise, so a page that
 *  renders tax figures can never show a guess for a market with no rates. */
export function requireRates(country: CountryCode): RatesFile {
  const file = rates[country];
  if (!file) throw new Error(`No tax rates for ${country}`);
  return file;
}
