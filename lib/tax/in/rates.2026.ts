import type { RatesFile, Sourced } from "../types";

const VERIFIED = "2026-10-30";

// Law for this year: financial year 2026 to 27 is "tax year 2026-27" under the Income-tax Act, 2025,
// which replaced the Income-tax Act, 1961 from 1 April 2026. The Finance Bill 2026 memorandum states
// that the section 202 rates for tax year 2026-27 are unchanged from those already enacted.
const MEMO = "https://www.indiabudget.gov.in/doc/memo.pdf";
const SALARIED = "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1";
const DEDUCTIONS = "https://wm.incometaxindia.gov.in/w/deductions-allowable-to-tax-payer";
const THRESHOLDS = "https://wm.incometaxindia.gov.in/w/threshold-limits-under-income-tax-act";
const SECTION_156 = "https://www.incometaxindia.gov.in/w/section-156-84";
const SECTION_202 = "https://www.incometaxindia.gov.in/w/section-202-76";
const SECTION_123 = "https://www.incometaxindia.gov.in/w/section-123-96";
const SECTION_126 = "https://www.incometaxindia.gov.in/w/section-126-96";
const SECTION_19 = "https://wm.incometaxindia.gov.in/w/section-19-206";
const REBATE_GUIDE =
  "https://wm.incometaxindia.gov.in/w/what-is-rebate-under-section-87a-for-f.y-2025-26-and-who-can-claim-it-";
const HRA_GUIDE =
  "https://wm.incometaxindia.gov.in/w/deductions/allowances-allowed-to-a-salaried-employee";
const EPFO_FAQ = "https://www.epfindia.gov.in/site_en/FAQ.php";
const EPFO_CEILING_OLD = "https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/WageCeiling.pdf";
const EPFO_CEILING_NEW = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2313829&reg=48&lang=2";
const GAZETTE_CEILING =
  "https://www.labour.gov.in/static/uploads/2026/09/2b0f1dbbd3769fc388416186ec145328.pdf";
const SOCIAL_SECURITY_CODE = "https://www.indiacode.nic.in/bitstream/123456789/16823/1/aA2020-36.pdf";
const GRATUITY_ACT_1972 =
  "https://www.labour.gov.in/static/uploads/2025/06/23e3be0e31de495acd1698ed85007ec1.pdf";
const BLOCKED =
  "The page could not be fetched by the tool (blocked), so this rests on a search excerpt of the official page.";
const TELANGANA_PT = "https://www.tgct.gov.in/tgportal/AllActs/APPT/APPTSchedule.aspx";

function sourced<T>(
  value: T,
  source: string,
  extra: { alsoSources?: readonly string[]; unverifiedNote?: string } = {},
): Sourced<T> {
  return { value, source, verifiedOn: VERIFIED, ...extra };
}

/** One slice of taxable income. `upTo` is the top of the slice, null for the open top slice. */
export interface IncomeSlab {
  upTo: number | null;
  rate: number;
}

/** Surcharge applies to tax when income is above `above`. The highest threshold crossed sets the rate. */
export interface SurchargeStep {
  above: number;
  rate: number;
}

export interface Rebate {
  /** Taxable income at or below this gets the rebate. */
  incomeLimit: number;
  /** Most the rebate can be. */
  maxRebate: number;
  /** New regime only: above the limit, tax is held to the income over the limit. */
  marginalRelief: boolean;
}

export type RegimeKey = "new" | "old";

export interface RegimeRates {
  slabs: Sourced<readonly IncomeSlab[]>;
  standardDeduction: Sourced<number>;
  rebate: Sourced<Rebate>;
  surcharge: Sourced<readonly SurchargeStep[]>;
}

/** Professional tax: monthly salary bands. Tax per month is flat inside a band. */
export interface MonthlyPtBand {
  upTo: number | null;
  perMonth: number;
}

export interface InRates extends RatesFile {
  /** Label shown to the user. */
  financialYear: string;
  assessmentYear: string;
  taxYear2025Act: string;
  regimes: Record<RegimeKey, RegimeRates>;
  cess: Sourced<number>;
  /** Old regime only. */
  section80cCap: Sourced<number>;
  /** Self and family below 60. The UI has one 80D field, so parents and seniors are not modelled. */
  section80dCap: Sourced<number>;
  hra: Sourced<{
    metroShare: number;
    otherShare: number;
    rentExcessShare: number;
    /** Cities that get the metro share, as listed on the Income Tax Department HRA pages. */
    metroCities: readonly string[];
  }>;
  /** Whether professional tax comes off taxable salary (section 19 table, item 1). */
  professionalTaxDeductible: Sourced<Record<RegimeKey, boolean>>;
  provident: Sourced<{ rate: number }>;
  /** Monthly wage limit for provident fund. It changed on 17 September 2026, so the year has two periods. */
  providentWageCeiling: Sourced<readonly { monthlyCeiling: number; days: number }[]>;
  /** Gratuity per year of service: 15 days of wages for every 26 working days, spread over 12 months. */
  gratuity: Sourced<{ days: number; workingDays: number; monthsPerYear: number }>;
  /** States whose schedule was read from an official state page. Others add no professional tax. */
  professionalTax: Record<string, Sourced<readonly MonthlyPtBand[]>>;
  /** Stepkite modelling choices. Not law. */
  structure: { basicShareOfCtc: number };
}

const NEW_SURCHARGE: readonly SurchargeStep[] = [
  { above: 5_000_000, rate: 0.1 },
  { above: 10_000_000, rate: 0.15 },
  { above: 20_000_000, rate: 0.25 },
];

export const inRates: InRates = {
  taxYear: "2026",
  loaded: true,
  verifiedOn: VERIFIED,
  officialSources: [MEMO, SECTION_202, SALARIED, DEDUCTIONS, THRESHOLDS, REBATE_GUIDE],
  financialYear: "2026 to 27 (1 April 2026 to 31 March 2027)",
  assessmentYear: "2027 to 28",
  taxYear2025Act: "2026-27",
  regimes: {
    new: {
      slabs: sourced(
        [
          { upTo: 400_000, rate: 0 },
          { upTo: 800_000, rate: 0.05 },
          { upTo: 1_200_000, rate: 0.1 },
          { upTo: 1_600_000, rate: 0.15 },
          { upTo: 2_000_000, rate: 0.2 },
          { upTo: 2_400_000, rate: 0.25 },
          { upTo: null, rate: 0.3 },
        ],
        MEMO,
        { alsoSources: [SECTION_202] },
      ),
      standardDeduction: sourced(75_000, SECTION_19, { unverifiedNote: BLOCKED }),
      rebate: sourced(
        { incomeLimit: 1_200_000, maxRebate: 60_000, marginalRelief: true },
        SECTION_156,
        { alsoSources: [REBATE_GUIDE], unverifiedNote: BLOCKED },
      ),
      // Surcharge on the new regime is capped at 25 percent.
      surcharge: sourced(NEW_SURCHARGE, MEMO),
    },
    old: {
      slabs: sourced(
        [
          { upTo: 250_000, rate: 0 },
          { upTo: 500_000, rate: 0.05 },
          { upTo: 1_000_000, rate: 0.2 },
          { upTo: null, rate: 0.3 },
        ],
        MEMO,
      ),
      standardDeduction: sourced(50_000, SECTION_19),
      rebate: sourced({ incomeLimit: 500_000, maxRebate: 12_500, marginalRelief: false }, SECTION_156, {
        alsoSources: [SALARIED],
        unverifiedNote: BLOCKED,
      }),
      surcharge: sourced([...NEW_SURCHARGE, { above: 50_000_000, rate: 0.37 }], MEMO),
    },
  },
  cess: sourced(0.04, MEMO),
  // Section 123 replaces 80C and section 126 replaces 80D under the Income-tax Act, 2025.
  section80cCap: sourced(150_000, SECTION_123, {
    alsoSources: [DEDUCTIONS],
    unverifiedNote: `${BLOCKED} The 1.5 lakh figure was read in full on the older deductions page (80C).`,
  }),
  section80dCap: sourced(25_000, SECTION_126, {
    alsoSources: [DEDUCTIONS],
    unverifiedNote: `${BLOCKED} The 25,000 figure was read in full on the older deductions page (80D).`,
  }),
  hra: sourced(
    {
      metroShare: 0.5,
      otherShare: 0.4,
      rentExcessShare: 0.1,
      metroCities: ["Delhi", "Mumbai", "Kolkata", "Chennai"],
    },
    HRA_GUIDE,
    {
      unverifiedNote: `${BLOCKED} The Income-tax Rules, 2026 text for HRA was not found. The department pages still describe the rule under the old section 10(13A) wording. One older rule page lists eight cities, which conflicts with these four.`,
    },
  ),
  professionalTaxDeductible: sourced({ new: false, old: true }, SECTION_19, {
    unverifiedNote: `${BLOCKED} Item 1 of the section 19 table allows tax on employment. Whether the new regime allows it was not found on any page, so it is assumed not allowed, as under the old Act.`,
  }),
  provident: sourced({ rate: 0.12 }, EPFO_FAQ),
  // 15,000 a month from 1 September 2014 until 16 September 2026, then 25,000 (S.O. 5109(E)).
  // 1 April to 16 September 2026 is 169 days; 17 September 2026 to 31 March 2027 is 196 days.
  providentWageCeiling: sourced(
    [
      { monthlyCeiling: 15_000, days: 169 },
      { monthlyCeiling: 25_000, days: 196 },
    ],
    GAZETTE_CEILING,
    {
      alsoSources: [EPFO_CEILING_OLD, EPFO_CEILING_NEW],
      unverifiedNote: `${BLOCKED} The gazette PDF is partly in Hindi and its full text was not read.`,
    },
  ),
  // The Code on Social Security, 2020 section 53 applies to gratuity from 21 November 2025.
  gratuity: sourced({ days: 15, workingDays: 26, monthsPerYear: 12 }, SOCIAL_SECURITY_CODE, {
    alsoSources: [GRATUITY_ACT_1972],
    unverifiedNote: `${BLOCKED} The 15 days rate is in section 53(2) of the Code. The divisor of 26 working days comes from the Payment of Gratuity Act, 1972, and was not confirmed in the Code.`,
  }),
  professionalTax: {
    telangana: sourced(
      [
        { upTo: 15_000, perMonth: 0 },
        { upTo: 20_000, perMonth: 150 },
        { upTo: null, perMonth: 200 },
      ],
      TELANGANA_PT,
    ),
  },
  structure: { basicShareOfCtc: 0.5 },
};
