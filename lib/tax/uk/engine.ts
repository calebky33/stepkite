import { ratesMissing, type PayEngine } from "../types";
import { ukRates } from "./rates.2026";

/** Stub. Returns "rates missing" until ukRates.loaded is true and the real calculation lands. */
export const ukEngine: PayEngine = () => ratesMissing("uk", ukRates);
