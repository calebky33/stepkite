import type { RatesFile } from "../types";

/** No figures yet. The tax-engine agent fetches them from HMRC and fills this file with sources and dates. */
export const ukRates: RatesFile = {
  taxYear: "2026",
  loaded: false,
  officialSources: [
    "https://www.gov.uk/income-tax-rates",
    "https://www.gov.uk/national-insurance-rates-letters",
  ],
};
