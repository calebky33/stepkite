import { isTaxCountry, type CountryCode, type TaxCountry } from "@/lib/countries";
import type { PayEngine, RatesFile } from "./types";
import { inRates } from "./in/rates.2026";
import { ukRates } from "./uk/rates.2026";
import { usRates } from "./us/rates.2026";

// Rates files are small and hold no logic, so they load together. Engines load one at a time.
const rates: Record<TaxCountry, RatesFile> = { uk: ukRates, us: usRates, in: inRates };

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
export const getRates = (country: CountryCode): RatesFile | undefined =>
  isTaxCountry(country) ? rates[country] : undefined;

/** The rates file for a tax market. The compiler only allows uk, us and in here, so a page that
 *  renders tax figures can never be handed a market with no rates. */
export function requireRates(country: TaxCountry): RatesFile {
  return rates[country];
}
