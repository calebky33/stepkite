import type { RatesFile, Sourced } from "../types";

const VERIFIED = "2026-10-30";
const INCOME_TAX = "https://www.gov.uk/income-tax-rates";
const SCOTLAND = "https://www.gov.uk/scottish-income-tax";
const EMPLOYER_RATES =
  "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027";

function sourced<T>(value: T, source: string): Sourced<T> {
  return { value, source, verifiedOn: VERIFIED };
}

/** One slice of taxable income (income after allowance). `width` is null for the open top band. */
export interface TaxBand {
  name: string;
  width: number | null;
  rate: number;
}

export interface StudentLoanPlan {
  threshold: number;
  rate: number;
}

export interface UkRates extends RatesFile {
  personalAllowance: Sourced<number>;
  taperThreshold: Sourced<number>;
  /** Allowance falls by this much per pound over the threshold. */
  taperRate: Sourced<number>;
  /** rUK bands on taxable income. Widths follow from the published limits minus the allowance. */
  ruk: Sourced<readonly TaxBand[]>;
  scotland: Sourced<readonly TaxBand[]>;
  niPrimaryThreshold: Sourced<number>;
  niUpperEarningsLimit: Sourced<number>;
  niMainRate: Sourced<number>;
  niUpperRate: Sourced<number>;
  studentLoans: Sourced<
    Record<"plan-1" | "plan-2" | "plan-4" | "plan-5" | "postgraduate", StudentLoanPlan>
  >;
  /** Basic rate used for relief at source. */
  reliefAtSourceRate: Sourced<number>;
}

// rUK: basic band 37,700 (50,270 less 12,570); the additional rate starts at 125,140 of taxable income,
// so the higher band is 87,440 wide.
// Scotland: starter to 16,537, basic to 29,526, intermediate to 43,662, higher to 75,000, each less 12,570.
// Advanced runs up to 125,140 of taxable income, then the top rate.
export const ukRates: UkRates = {
  taxYear: "2026",
  loaded: true,
  verifiedOn: VERIFIED,
  officialSources: [INCOME_TAX, SCOTLAND, EMPLOYER_RATES],
  personalAllowance: sourced(12_570, INCOME_TAX),
  taperThreshold: sourced(100_000, INCOME_TAX),
  taperRate: sourced(0.5, INCOME_TAX),
  ruk: sourced(
    [
      { name: "basic", width: 37_700, rate: 0.2 },
      { name: "higher", width: 87_440, rate: 0.4 },
      { name: "additional", width: null, rate: 0.45 },
    ],
    INCOME_TAX,
  ),
  scotland: sourced(
    [
      { name: "starter", width: 3_967, rate: 0.19 },
      { name: "basic", width: 12_989, rate: 0.2 },
      { name: "intermediate", width: 14_136, rate: 0.21 },
      { name: "higher", width: 31_338, rate: 0.42 },
      { name: "advanced", width: 62_710, rate: 0.45 },
      { name: "top", width: null, rate: 0.48 },
    ],
    SCOTLAND,
  ),
  niPrimaryThreshold: sourced(12_570, EMPLOYER_RATES),
  niUpperEarningsLimit: sourced(50_270, EMPLOYER_RATES),
  niMainRate: sourced(0.08, EMPLOYER_RATES),
  niUpperRate: sourced(0.02, EMPLOYER_RATES),
  studentLoans: sourced(
    {
      "plan-1": { threshold: 26_900, rate: 0.09 },
      "plan-2": { threshold: 29_385, rate: 0.09 },
      "plan-4": { threshold: 33_795, rate: 0.09 },
      "plan-5": { threshold: 25_000, rate: 0.09 },
      postgraduate: { threshold: 21_000, rate: 0.06 },
    },
    EMPLOYER_RATES,
  ),
  reliefAtSourceRate: sourced(
    0.2,
    "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
  ),
};
