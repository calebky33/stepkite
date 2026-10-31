import type { RatesFile, Sourced } from "../types";
import {
  sourced,
  VERIFIED,
  type FederalBand,
  type StatusMap,
  REV_PROC,
  IRS_NEWS,
  IRS_TC751,
  IRS_TC560,
  IRS_401K,
  PA_RATE,
  PA_COMP,
  IL_RATE,
  IL_EXEMPT,
  GA_UPDATES,
  GA_GUIDE,
  FL_FAQ,
  TX_COMPTROLLER,
  MS_PUB,
  MS_INFO,
  KY_HANDBOOK,
  KY_STD,
  IN_NOTICE,
  IN_RATES,
  CO_DR1098,
  CO_GUIDE,
  DC_RATES,
  DC_D40ES,
  VA_TABLES,
  MO_GUIDE,
  WV_RATES,
  WV_TABLES,
  NV_INCOME,
  SD_TAXES,
  WA_INCOME,
  WY_ABOUT,
  AK_FACTS,
  NH_REPEAL,
  TN_HALL,
} from "./shared.2026";

export {
  FILING_STATUSES,
  type FederalBand,
  type FilingStatus,
  type StatusMap,
} from "./shared.2026";

export interface UsRates extends RatesFile {
  federalBrackets: Sourced<StatusMap<readonly FederalBand[]>>;
  standardDeduction: Sourced<StatusMap<number>>;
  socialSecurityRate: Sourced<number>;
  socialSecurityWageBase: Sourced<number>;
  medicareRate: Sourced<number>;
  additionalMedicareRate: Sourced<number>;
  /** Tax return thresholds. Employers start withholding at 200,000 for every status. */
  additionalMedicareThreshold: Sourced<StatusMap<number>>;
  /** Limit on employee 401(k) deferrals, not counting catch-up contributions. */
  retirementDeferralLimit: Sourced<number>;
}

export const usRates: UsRates = {
  taxYear: "2026",
  loaded: true,
  verifiedOn: VERIFIED,
  officialSources: [
    REV_PROC,
    IRS_NEWS,
    IRS_TC751,
    IRS_TC560,
    IRS_401K,
    // State pages behind every state figure or no-tax statement in states.2026.ts.
    PA_RATE,
    PA_COMP,
    IL_RATE,
    IL_EXEMPT,
    GA_UPDATES,
    GA_GUIDE,
    MS_PUB,
    MS_INFO,
    KY_HANDBOOK,
    KY_STD,
    IN_NOTICE,
    IN_RATES,
    CO_DR1098,
    CO_GUIDE,
    DC_RATES,
    DC_D40ES,
    VA_TABLES,
    MO_GUIDE,
    WV_RATES,
    WV_TABLES,
    NV_INCOME,
    SD_TAXES,
    WA_INCOME,
    WY_ABOUT,
    AK_FACTS,
    NH_REPEAL,
    TN_HALL,
    TX_COMPTROLLER,
    FL_FAQ,
  ],
  federalBrackets: sourced(
    {
      single: [
        { upTo: 12_400, rate: 0.1 },
        { upTo: 50_400, rate: 0.12 },
        { upTo: 105_700, rate: 0.22 },
        { upTo: 201_775, rate: 0.24 },
        { upTo: 256_225, rate: 0.32 },
        { upTo: 640_600, rate: 0.35 },
        { upTo: null, rate: 0.37 },
      ],
      "married-jointly": [
        { upTo: 24_800, rate: 0.1 },
        { upTo: 100_800, rate: 0.12 },
        { upTo: 211_400, rate: 0.22 },
        { upTo: 403_550, rate: 0.24 },
        { upTo: 512_450, rate: 0.32 },
        { upTo: 768_700, rate: 0.35 },
        { upTo: null, rate: 0.37 },
      ],
      "head-of-household": [
        { upTo: 17_700, rate: 0.1 },
        { upTo: 67_450, rate: 0.12 },
        { upTo: 105_700, rate: 0.22 },
        { upTo: 201_750, rate: 0.24 },
        { upTo: 256_200, rate: 0.32 },
        { upTo: 640_600, rate: 0.35 },
        { upTo: null, rate: 0.37 },
      ],
    },
    REV_PROC,
    { alsoSources: [IRS_NEWS] },
  ),
  standardDeduction: sourced(
    { single: 16_100, "married-jointly": 32_200, "head-of-household": 24_150 },
    REV_PROC,
    { alsoSources: [IRS_NEWS] },
  ),
  socialSecurityRate: sourced(0.062, IRS_TC751),
  socialSecurityWageBase: sourced(184_500, IRS_TC751),
  medicareRate: sourced(0.0145, IRS_TC751),
  additionalMedicareRate: sourced(0.009, IRS_TC560),
  additionalMedicareThreshold: sourced(
    { single: 200_000, "married-jointly": 250_000, "head-of-household": 200_000 },
    IRS_TC560,
  ),
  retirementDeferralLimit: sourced(24_500, IRS_401K),
};
