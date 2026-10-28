import type { CountryCode } from "@/lib/countries";
import type { PayEngine, RatesFile } from "./types";
import { inRates } from "./in/rates.2026";
import { ukRates } from "./uk/rates.2026";
import { usRates } from "./us/rates.2026";

// Rates files are small and hold no logic, so they load together. Engines load one at a time.
const rates: Record<CountryCode, RatesFile> = { uk: ukRates, us: usRates, in: inRates };

/** Loads only the engine for one country, so a page never carries all three. */
export async function loadEngine(country: CountryCode): Promise<PayEngine> {
  switch (country) {
    case "uk":
      return (await import("./uk/engine")).ukEngine;
    case "us":
      return (await import("./us/engine")).usEngine;
    case "in":
      return (await import("./in/engine")).inEngine;
  }
}

export const getRates = (country: CountryCode): RatesFile => rates[country];
