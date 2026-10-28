import { ratesMissing, type PayEngine } from "../types";
import { usRates } from "./rates.2026";

/** Stub. Returns "rates missing" until usRates.loaded is true and the real calculation lands. */
export const usEngine: PayEngine = () => ratesMissing("us", usRates);
