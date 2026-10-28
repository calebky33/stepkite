import type { RatesFile } from "../types";

/** No figures yet. The tax-engine agent fetches them from the IRS and state agencies and fills this file. */
export const usRates: RatesFile = {
  taxYear: "2026",
  loaded: false,
  officialSources: ["https://www.irs.gov/filing/federal-income-tax-rates-and-brackets"],
};
