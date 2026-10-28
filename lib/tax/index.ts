import type { CountryCode } from "@/lib/countries";
import type { PayEngine, RatesFile } from "./types";
import { ukEngine } from "./uk/engine";
import { ukRates } from "./uk/rates.2026";
import { usEngine } from "./us/engine";
import { usRates } from "./us/rates.2026";
import { inEngine } from "./in/engine";
import { inRates } from "./in/rates.2026";

const engines: Record<CountryCode, PayEngine> = { uk: ukEngine, us: usEngine, in: inEngine };
const rates: Record<CountryCode, RatesFile> = { uk: ukRates, us: usRates, in: inRates };

export const getEngine = (country: CountryCode): PayEngine => engines[country];
export const getRates = (country: CountryCode): RatesFile => rates[country];
