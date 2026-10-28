import type { RatesFile } from "../types";

/** No figures yet. The tax-engine agent fetches them from the Income Tax Department and fills this file. */
export const inRates: RatesFile = {
  taxYear: "2026",
  loaded: false,
  officialSources: ["https://incometax.gov.in/iec/foportal/"],
};
