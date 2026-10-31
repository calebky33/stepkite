import type { Sourced } from "../types";
import {
  sourced,
  type FederalBand,
  type StatusMap,
  REV_PROC,
  PA_RATE,
  PA_COMP,
  IL_RATE,
  IL_EXEMPT,
  GA_UPDATES,
  NC_RATES,
  MI_RATE,
  FL_FAQ,
  TX_COMPTROLLER,
  CA_NEWS,
  NY_RATES,
  OH_RATES,
  MS_PUB,
  GA_GUIDE,
  MS_INFO,
  KY_STD,
  KY_HANDBOOK,
  IN_NOTICE,
  CO_DR1098,
  DC_RATES,
  DC_D40ES,
  VA_TABLES,
  OK_TABLES,
  OR_FORMULA,
  SC_TABLES,
  MO_GUIDE,
  WV_RATES,
  WV_TABLES,
  NE_CIRCULAR,
  NV_INCOME,
  SD_TAXES,
  WA_INCOME,
  WY_ABOUT,
  AK_FACTS,
  NH_REPEAL,
  TN_HALL,
  IN_RATES,
  IA_RATES,
  LA_RATES,
  CO_GUIDE,
  MA_RATES,
  AZ_UPDATE,
  ID_TAX,
  UT_TAX,
  BLOCKED,
  NOT_READ,
  NOT_RESEARCHED,
} from "./shared.2026";

// DC rate table, tax years beginning after 12/31/2021, read in full on the OTR page.
const DC_BANDS: readonly FederalBand[] = [
  { upTo: 10_000, rate: 0.04 },
  { upTo: 40_000, rate: 0.06 },
  { upTo: 60_000, rate: 0.065 },
  { upTo: 250_000, rate: 0.085 },
  { upTo: 500_000, rate: 0.0925 },
  { upTo: 1_000_000, rate: 0.0975 },
  { upTo: null, rate: 0.1075 },
];
const VA_BANDS: readonly FederalBand[] = [
  { upTo: 3_000, rate: 0.02 },
  { upTo: 5_000, rate: 0.03 },
  { upTo: 17_000, rate: 0.05 },
  { upTo: null, rate: 0.0575 },
];
const MO_BANDS: readonly FederalBand[] = [
  { upTo: 1_348, rate: 0 },
  { upTo: 2_696, rate: 0.02 },
  { upTo: 4_044, rate: 0.025 },
  { upTo: 5_392, rate: 0.03 },
  { upTo: 6_740, rate: 0.035 },
  { upTo: 8_088, rate: 0.04 },
  { upTo: 9_436, rate: 0.045 },
  { upTo: null, rate: 0.047 },
];
const WV_BANDS: readonly FederalBand[] = [
  { upTo: 10_000, rate: 0.0211 },
  { upTo: 25_000, rate: 0.0281 },
  { upTo: 40_000, rate: 0.0316 },
  { upTo: 60_000, rate: 0.0422 },
  { upTo: null, rate: 0.0458 },
];

interface NoStateTax {
  kind: "none";
  name: string;
  note: Sourced<string>;
}

interface StateTaxBase {
  name: string;
  /** Standard deduction by filing status. Zero where the state has none. */
  deduction: Sourced<StatusMap<number>>;
  /** Personal exemption. Null where the state has none. */
  exemption: Sourced<{
    /** Total exemption by filing status. */
    amount: StatusMap<number>;
    /** No exemption when federal income is above this amount. */
    incomeLimit: StatusMap<number>;
  }> | null;
  /** Fixed credit by filing status, taken off the tax and never below zero. */
  credit?: Sourced<StatusMap<number>>;
  /** True when the state still taxes pay put into a 401(k). */
  taxesRetirementDeferrals: Sourced<boolean>;
  /** Shown as an assumption when the figures need a human check. */
  caution?: string;
}

interface FlatStateTax extends StateTaxBase {
  kind: "flat";
  rate: Sourced<number>;
}

interface GraduatedStateTax extends StateTaxBase {
  kind: "graduated";
  /** Taxable income slices by filing status. Same shape as the federal bands. */
  brackets: Sourced<StatusMap<readonly FederalBand[]>>;
  /** Above this taxable income the source switches method, so no state tax is counted. */
  ceiling?: Sourced<StatusMap<number>>;
}

/** A state whose 2026 schedule could not be read from an official page. No state tax is calculated. */
interface PendingStateTax {
  kind: "pending";
  name: string;
  reason: Sourced<string>;
}

export type StateRule = NoStateTax | FlatStateTax | GraduatedStateTax | PendingStateTax;

function pending(name: string, source: string, reason: string, note = NOT_READ): StateRule {
  return { kind: "pending", name, reason: sourced(reason, source, { unverifiedNote: note }) };
}

/** State rules, kept apart from the federal file so UK and India pages never load them. */
export const usStates: Record<string, StateRule> = {
  texas: {
    kind: "none",
    name: "Texas",
    note: sourced("Texas has no state income tax.", TX_COMPTROLLER, { unverifiedNote: BLOCKED }),
  },
  florida: {
    kind: "none",
    name: "Florida",
    note: sourced("Florida has no state income tax on wages.", FL_FAQ, {
      unverifiedNote: BLOCKED,
    }),
  },
  pennsylvania: {
    kind: "flat",
    name: "Pennsylvania",
    rate: sourced(0.0307, PA_RATE, {
      unverifiedNote:
        "The page does not name the tax year. The rate is set in law, but check it against the 2026 PA-40 instructions.",
    }),
    deduction: sourced({ single: 0, "married-jointly": 0, "head-of-household": 0 }, PA_RATE),
    exemption: null,
    taxesRetirementDeferrals: sourced(true, PA_COMP, { unverifiedNote: BLOCKED }),
  },
  illinois: {
    kind: "flat",
    name: "Illinois",
    rate: sourced(0.0495, IL_RATE),
    deduction: sourced({ single: 0, "married-jointly": 0, "head-of-household": 0 }, IL_EXEMPT),
    exemption: sourced(
      {
        amount: { single: 2_925, "married-jointly": 5_850, "head-of-household": 2_925 },
        incomeLimit: {
          single: 250_000,
          "married-jointly": 500_000,
          "head-of-household": 250_000,
        },
      },
      IL_EXEMPT,
    ),
    taxesRetirementDeferrals: sourced(false, IL_RATE, {
      unverifiedNote:
        "Illinois starts from federal adjusted gross income, which excludes 401(k) deferrals. Not read on an Illinois page.",
    }),
  },
  georgia: {
    kind: "flat",
    name: "Georgia",
    rate: sourced(0.0499, GA_UPDATES, { alsoSources: [GA_GUIDE] }),
    deduction: sourced(
      { single: 15_000, "married-jointly": 30_000, "head-of-household": 15_000 },
      GA_UPDATES,
      { alsoSources: [GA_GUIDE] },
    ),
    exemption: null,
    taxesRetirementDeferrals: sourced(false, GA_UPDATES, {
      unverifiedNote:
        "Georgia starts from federal adjusted gross income, which excludes 401(k) deferrals. Not read on a Georgia page.",
    }),
  },
  "north-carolina": pending(
    "North Carolina",
    NC_RATES,
    "North Carolina's 2026 standard deductions for joint and head of household filers were not found. Only 2025 amounts appeared, and July 2026 law changes may apply. No figure is used.",
    "Only the single 2026 deduction was confirmed.",
  ),
  michigan: pending(
    "Michigan",
    MI_RATE,
    "Michigan's 2026 rate and personal exemption are not confirmed yet. No figure is used.",
    BLOCKED,
  ),
  california: pending(
    "California",
    CA_NEWS,
    "California changed its 2026 schedules, and the full set for single, joint and head of household filers is not confirmed yet. No figure is used.",
    BLOCKED,
  ),
  "new-york": pending(
    "New York",
    NY_RATES,
    "New York changed its 2026 rate schedules (Chapter 59 of the Laws of 2025). The 2026 schedule and the income tax standard deduction were not read on an official page. No figure is used.",
    "Only the 2025 schedule is available, and it is out of date for 2026.",
  ),
  ohio: pending(
    "Ohio",
    OH_RATES,
    "Ohio's official pages disagree on the top rate. No figure is used.",
    "Rate page not confirmed.",
  ),
  nevada: {
    kind: "none",
    name: "Nevada",
    note: sourced("Nevada has no state income tax on wages.", NV_INCOME),
  },
  "south-dakota": {
    kind: "none",
    name: "South Dakota",
    note: sourced("South Dakota has no state income tax.", SD_TAXES),
  },
  washington: {
    kind: "none",
    name: "Washington",
    note: sourced(
      "Washington has no individual income tax on wages. Its 7 percent capital gains tax is on investment sales, not pay.",
      WA_INCOME,
    ),
  },
  wyoming: {
    kind: "none",
    name: "Wyoming",
    note: sourced("Wyoming has no individual income tax.", WY_ABOUT, {
      unverifiedNote: "Read on the state government portal, not on a Department of Revenue page.",
    }),
  },
  alaska: {
    kind: "none",
    name: "Alaska",
    note: sourced("Alaska has no state income tax on wages.", AK_FACTS, {
      unverifiedNote: BLOCKED,
    }),
  },
  "new-hampshire": {
    kind: "none",
    name: "New Hampshire",
    note: sourced(
      "New Hampshire has no state income tax on wages. Its interest and dividends tax ended on 1 January 2025 and never applied to pay.",
      NH_REPEAL,
      { unverifiedNote: BLOCKED },
    ),
  },
  tennessee: {
    kind: "none",
    name: "Tennessee",
    note: sourced(
      "Tennessee has no state income tax on wages. The Hall tax on investment income ended in 2021.",
      TN_HALL,
      { unverifiedNote: BLOCKED },
    ),
  },
  mississippi: {
    kind: "flat",
    name: "Mississippi",
    // Pub 89-700, tax year 2026: 0 percent on the first 10,000, 4.0 percent on the rest.
    rate: sourced(0.04, MS_PUB, { alsoSources: [MS_INFO] }),
    deduction: sourced(
      { single: 12_300, "married-jointly": 14_600, "head-of-household": 13_400 },
      MS_PUB,
      {
        unverifiedNote:
          "Each amount is the 10,000 zero bracket plus the standard deduction: 2,300 single, 4,600 married, 3,400 head of family.",
      },
    ),
    exemption: sourced(
      {
        amount: { single: 6_000, "married-jointly": 12_000, "head-of-household": 8_000 },
        incomeLimit: {
          single: Number.POSITIVE_INFINITY,
          "married-jointly": Number.POSITIVE_INFINITY,
          "head-of-household": Number.POSITIVE_INFINITY,
        },
      },
      MS_PUB,
      {
        unverifiedNote: "Head of family is 8,000. The extra 1,500 for a dependent is not counted.",
      },
    ),
    taxesRetirementDeferrals: sourced(false, MS_PUB, {
      unverifiedNote:
        "Mississippi starts from federal adjusted gross income. Not read on a Mississippi page.",
    }),
    caution: "Dependents are not counted in the Mississippi exemption, so the tax may be high.",
  },
  kentucky: {
    kind: "flat",
    name: "Kentucky",
    // Read in full in the Department of Revenue e-file handbook (PDF text extracted locally).
    rate: sourced(0.035, KY_HANDBOOK, { alsoSources: [KY_STD] }),
    deduction: sourced(
      { single: 3_360, "married-jointly": 3_360, "head-of-household": 3_360 },
      KY_HANDBOOK,
      {
        alsoSources: [KY_STD],
        unverifiedNote:
          "The handbook gives one amount. How it applies to a joint return was not read.",
      },
    ),
    exemption: null,
    taxesRetirementDeferrals: sourced(false, KY_HANDBOOK, {
      unverifiedNote:
        "Kentucky starts from federal adjusted gross income. Not read on a Kentucky page.",
    }),
  },
  indiana: {
    kind: "flat",
    name: "Indiana",
    // Departmental Notice #1 (R47 / 10-26), read in full: "For 2026, the state adjusted gross income tax rate for individuals is 2.95%."
    rate: sourced(0.0295, IN_NOTICE, { alsoSources: [IN_RATES] }),
    deduction: sourced({ single: 0, "married-jointly": 0, "head-of-household": 0 }, IN_NOTICE),
    exemption: sourced(
      {
        amount: { single: 1_000, "married-jointly": 2_000, "head-of-household": 1_000 },
        incomeLimit: {
          single: Number.POSITIVE_INFINITY,
          "married-jointly": Number.POSITIVE_INFINITY,
          "head-of-household": Number.POSITIVE_INFINITY,
        },
      },
      IN_NOTICE,
      {
        unverifiedNote:
          "The notice gives 1,000 per exemption claimed. Two exemptions for a joint return, and none for dependents, age or blindness, are assumed.",
      },
    ),
    taxesRetirementDeferrals: sourced(false, IN_NOTICE, {
      unverifiedNote:
        "Indiana starts from federal adjusted gross income. Not read on an Indiana page.",
    }),
    caution: "Dependents are not counted in the Indiana exemption, so the tax may be high.",
  },
  iowa: pending(
    "Iowa",
    IA_RATES,
    "Iowa's 2026 flat rate of 3.8 percent was read, but no 2026 standard deduction or exemption figure was found on an official page. No figure is used.",
    "Rate read on the page. Deductions not found.",
  ),
  louisiana: pending(
    "Louisiana",
    LA_RATES,
    "Louisiana's flat 3 percent rate was read, but the 2026 standard deduction, which moves with inflation, was not found. No figure is used.",
    "Rate read on the page. Deduction not found.",
  ),
  colorado: {
    kind: "flat",
    name: "Colorado",
    // DR 1098 (10/21/25), read in full: "Multiply line 2b by 4.40% (0.044)" for tax year 2026.
    rate: sourced(0.044, CO_DR1098, { alsoSources: [CO_GUIDE] }),
    // Colorado starts from federal taxable income, so the federal standard deduction applies.
    deduction: sourced(
      { single: 16_100, "married-jointly": 32_200, "head-of-household": 24_150 },
      REV_PROC,
      {
        alsoSources: [CO_GUIDE],
        unverifiedNote:
          "The guide says Colorado starts from federal taxable income. The state may add back some federal changes, which are not counted.",
      },
    ),
    exemption: null,
    taxesRetirementDeferrals: sourced(false, CO_GUIDE),
  },
  massachusetts: pending(
    "Massachusetts",
    MA_RATES,
    "Massachusetts' 5 percent rate, 4 percent surtax threshold and exemptions are not confirmed yet. No figure is used.",
    BLOCKED,
  ),
  arizona: pending(
    "Arizona",
    AZ_UPDATE,
    "Arizona's 2026 standard deduction was not found. Only 2025 amounts are available. No figure is used.",
    BLOCKED,
  ),
  idaho: pending(
    "Idaho",
    ID_TAX,
    "Idaho's 5.3 percent rate was documented for 2025 only, and no 2026 rate or deduction was read. No figure is used.",
  ),
  utah: pending(
    "Utah",
    UT_TAX,
    "Utah lowered its rate to 4.45 percent for 2026 according to draft instructions only, and the taxpayer tax credit was not confirmed. No figure is used.",
    "Draft forms only.",
  ),
  alabama: pending("Alabama", "https://www.revenue.alabama.gov/", NOT_RESEARCHED),
  arkansas: pending("Arkansas", "https://www.dfa.arkansas.gov/", NOT_RESEARCHED),
  connecticut: pending("Connecticut", "https://portal.ct.gov/drs", NOT_RESEARCHED),
  delaware: pending("Delaware", "https://revenue.delaware.gov/", NOT_RESEARCHED),
  "district-of-columbia": {
    kind: "graduated",
    name: "District of Columbia",
    brackets: sourced(
      {
        single: DC_BANDS,
        "married-jointly": DC_BANDS,
        "head-of-household": DC_BANDS,
      },
      DC_RATES,
    ),
    deduction: sourced(
      { single: 16_100, "married-jointly": 32_200, "head-of-household": 24_150 },
      DC_D40ES,
    ),
    exemption: null,
    taxesRetirementDeferrals: sourced(false, DC_RATES, {
      unverifiedNote: "DC starts from federal adjusted gross income. Not read on a DC page.",
    }),
  },
  hawaii: pending("Hawaii", "https://tax.hawaii.gov/", NOT_RESEARCHED),
  kansas: pending("Kansas", "https://www.ksrevenue.gov/", NOT_RESEARCHED),
  maine: pending("Maine", "https://www.maine.gov/revenue/", NOT_RESEARCHED),
  maryland: pending("Maryland", "https://www.marylandtaxes.gov/", NOT_RESEARCHED),
  minnesota: pending("Minnesota", "https://www.revenue.state.mn.us/", NOT_RESEARCHED),
  missouri: {
    kind: "graduated",
    name: "Missouri",
    // Form 4282 (revised 03-2026) percentage table, annual payroll: 0 to 1,348, then 1,348 wide steps
    // at 2, 2.5, 3, 3.5, 4 and 4.5 percent, then 4.7 percent above 9,436.
    brackets: sourced(
      { single: MO_BANDS, "married-jointly": MO_BANDS, "head-of-household": MO_BANDS },
      MO_GUIDE,
    ),
    deduction: sourced(
      { single: 16_100, "married-jointly": 32_200, "head-of-household": 24_150 },
      MO_GUIDE,
      {
        unverifiedNote:
          "The guide gives 32,200 for a married filer whose spouse does not work and 16,100 if the spouse works. Joint filers get 32,200 here.",
      },
    ),
    exemption: null,
    taxesRetirementDeferrals: sourced(false, MO_GUIDE, {
      unverifiedNote:
        "Missouri starts from federal adjusted gross income. Not read on a Missouri page.",
    }),
    caution:
      "The Missouri federal tax deduction is not counted, so the state tax shown may be high.",
  },
  nebraska: pending(
    "Nebraska",
    NE_CIRCULAR,
    "Nebraska's 2026 Circular EN was read, but it gives no standard deduction and folds it into its tables. No figure is used.",
    "Standard deduction not stated.",
  ),
  montana: pending(
    "Montana",
    "https://mtrevenue.gov/taxes/montana-tax-tables-and-deductions/",
    "Montana's tax tables page lists 2025 and earlier only. No figure is used.",
    "No 2026 entry on the page.",
  ),
  "new-jersey": pending("New Jersey", "https://www.nj.gov/treasury/taxation/", NOT_RESEARCHED),
  "new-mexico": pending("New Mexico", "https://www.tax.newmexico.gov/", NOT_RESEARCHED),
  "north-dakota": pending("North Dakota", "https://www.tax.nd.gov/", NOT_RESEARCHED),
  oklahoma: pending(
    "Oklahoma",
    OK_TABLES,
    "Oklahoma's 2026 withholding packet was read, but it gives rates on net wages and no return standard deduction. No figure is used.",
    "Standard deduction not found.",
  ),
  oregon: pending(
    "Oregon",
    OR_FORMULA,
    "Oregon's 2026 formula subtracts federal tax paid, which this estimate does not model, and its sources give two different standard deductions. No figure is used.",
    "Single standard deduction shows as 2,910 in one source and 2,900 in another.",
  ),
  "rhode-island": pending("Rhode Island", "https://tax.ri.gov/", NOT_RESEARCHED),
  "south-carolina": pending(
    "South Carolina",
    SC_TABLES,
    "South Carolina's only official 2026 table found is a draft that still shows the old 6 percent top rate, while 2026 law changed the rates. No figure is used.",
    "Draft table dated 30 October 2025.",
  ),
  vermont: pending("Vermont", "https://tax.vermont.gov/", NOT_RESEARCHED),
  virginia: {
    kind: "graduated",
    name: "Virginia",
    // Virginia withholding formula for wages paid after 1 July 2025, read in full:
    // 2 percent to 3,000; 60 plus 3 percent to 5,000; 120 plus 5 percent to 17,000; 720 plus 5.75 percent above.
    brackets: sourced(
      {
        single: VA_BANDS,
        "married-jointly": VA_BANDS,
        "head-of-household": VA_BANDS,
      },
      VA_TABLES,
    ),
    deduction: sourced(
      { single: 8_750, "married-jointly": 17_500, "head-of-household": 8_750 },
      VA_TABLES,
      {
        unverifiedNote:
          "The publication says the higher deduction ends after tax year 2026. Head of household is treated as single.",
      },
    ),
    exemption: sourced(
      {
        amount: { single: 930, "married-jointly": 1_860, "head-of-household": 930 },
        incomeLimit: {
          single: Number.POSITIVE_INFINITY,
          "married-jointly": Number.POSITIVE_INFINITY,
          "head-of-household": Number.POSITIVE_INFINITY,
        },
      },
      VA_TABLES,
      {
        unverifiedNote:
          "930 per personal exemption. Dependents, age and blindness are not counted.",
      },
    ),
    taxesRetirementDeferrals: sourced(false, VA_TABLES, {
      unverifiedNote:
        "Virginia starts from federal adjusted gross income. Not read on a Virginia page.",
    }),
    caution: "Dependents are not counted in the Virginia exemption, so the tax may be high.",
  },
  "west-virginia": {
    kind: "graduated",
    name: "West Virginia",
    // Rate table for everyone except married filing separately, read in full on the Tax Division page.
    brackets: sourced(
      { single: WV_BANDS, "married-jointly": WV_BANDS, "head-of-household": WV_BANDS },
      WV_RATES,
    ),
    deduction: sourced({ single: 0, "married-jointly": 0, "head-of-household": 0 }, WV_RATES, {
      unverifiedNote: "West Virginia has no standard deduction in the sources read.",
    }),
    exemption: sourced(
      {
        amount: { single: 2_000, "married-jointly": 4_000, "head-of-household": 2_000 },
        incomeLimit: {
          single: Number.POSITIVE_INFINITY,
          "married-jointly": Number.POSITIVE_INFINITY,
          "head-of-household": Number.POSITIVE_INFINITY,
        },
      },
      WV_TABLES,
      {
        unverifiedNote:
          "2,000 per exemption from the withholding table. Dependents are not counted.",
      },
    ),
    taxesRetirementDeferrals: sourced(false, WV_RATES, {
      unverifiedNote:
        "West Virginia starts from federal adjusted gross income. Not read on a West Virginia page.",
    }),
    caution: "Dependents are not counted in the West Virginia exemption, so the tax may be high.",
  },
  wisconsin: pending("Wisconsin", "https://www.revenue.wi.gov/", NOT_RESEARCHED),
};
