import { ratesMissing, type PayEngine } from "../types";
import { inRates } from "./rates.2026";

/** Stub. Returns "rates missing" until inRates.loaded is true and the real calculation lands. */
export const inEngine: PayEngine = () => ratesMissing("in", inRates);
