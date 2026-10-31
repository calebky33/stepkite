import type { Sourced } from "../types";

export const VERIFIED = "2026-10-30";

export const FILING_STATUSES = ["single", "married-jointly", "head-of-household"] as const;
export type FilingStatus = (typeof FILING_STATUSES)[number];

// Official pages. Federal figures are in Rev. Proc. 2025-32 (read in full), section 4.01 for the
// tables and section 4.14 for the standard deduction.
export const REV_PROC = "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf";
export const IRS_NEWS =
  "https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers";
export const IRS_TC751 = "https://www.irs.gov/taxtopics/tc751";
export const IRS_TC560 = "https://www.irs.gov/taxtopics/tc560";
export const IRS_401K =
  "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500";
export const PA_RATE =
  "https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/personal-income-tax";
export const PA_COMP =
  "https://www.pa.gov/agencies/revenue/forms-and-publications/pa-personal-income-tax-guide/gross-compensation";
export const IL_RATE = "https://tax.illinois.gov/research/taxrates/income.html";
export const IL_EXEMPT = "https://tax.illinois.gov/questionsandanswers/answer.851.html";
export const GA_UPDATES = "https://dor.georgia.gov/taxes/important-tax-updates";
export const NC_RATES =
  "https://www.ncdor.gov/taxes-forms/individual-income-tax/tax-rate-schedules";
export const NC_DEDUCTION =
  "https://www.ncdor.gov/taxes-forms/individual-income-tax/filing-topics/north-carolina-standard-deduction-or-north-carolina-itemized-deductions";
export const NC_WITHHOLDING =
  "https://www.ncdor.gov/income-tax-withholding-tables-and-instructions-employers/open";
export const MI_RATE =
  "https://www.michigan.gov/treasury/reference/taxpayer-notices/2026/04/15/425-income-tax-rate-for-individuals-and-fiduciaries-in-2026-tax-year";
export const MI_WITHHOLDING =
  "https://www.michigan.gov/taxes/business-taxes/withholding/calendar-year-tax-information";
export const FL_FAQ = "https://floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1466";
export const TX_COMPTROLLER =
  "https://comptroller.texas.gov/economy/fiscal-notes/industry/2025/small-biz-info/";
export const CA_NEWS = "https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html";
export const NY_RATES = "https://www.tax.ny.gov/pit/file/tax-tables/default.htm";
export const OH_RATES = "https://tax.ohio.gov/individual/file-now/annual-tax-rates";
export const MS_PUB =
  "https://www.dor.ms.gov/sites/default/files/tax-forms/business/89700251revised1.13.2026.pdf";
export const GA_GUIDE =
  "https://dor.georgia.gov/document/document/2026-employers-tax-guide-updated-june-2026/download";
export const MS_INFO = "https://www.dor.ms.gov/general-information";
export const KY_STD =
  "https://revenue.ky.gov/News/Pages/Kentucky-DOR-Announces-2026-Standard-Deduction.aspx";
export const KY_HANDBOOK =
  "https://revenue.ky.gov/Software-Developer/Documents/TY2026%20E-File%20HandBook%20Publication%201345%20v1.0.pdf";
export const IN_NOTICE = "https://www.in.gov/dor/files/dn01.pdf";
export const CO_DR1098 =
  "https://tax.colorado.gov/sites/tax/files/documents/DR_1098_Colorado_Withholding_Worksheet_for_Employees.pdf";
export const DC_RATES = "https://otr.cfo.dc.gov/page/dc-individual-and-fiduciary-income-tax-rates";
export const DC_D40ES =
  "https://otr.cfo.dc.gov/sites/default/files/dc/sites/otr/publication/attachments/2026_D40ES_Book_wLinks04012026.pdf";
export const VA_TABLES =
  "https://www.tax.virginia.gov/sites/default/files/taxforms/withholding/any/employer-withholding-tables-july-2025-and-later-any.pdf";
export const OK_TABLES =
  "https://oklahoma.gov/content/dam/ok/en/tax/documents/resources/publications/businesses/withholding-tables/WHTables-2026.pdf";
export const OR_FORMULA =
  "https://www.oregon.gov/dor/forms/FormsPubs/withholding-tax-formulas_206-436_2026.pdf";
export const SC_TABLES = "https://dor.sc.gov/sites/dor/files/forms/WH1603_2026.pdf";
export const MO_GUIDE = "https://dor.mo.gov/forms/4282_2026.pdf";
export const WV_RATES = "https://tax.wv.gov/Individuals/Pages/PersonalIncomeTaxReductionBill.aspx";
export const WV_TABLES = "https://tax.wv.gov/Documents/Withholding/it100.2a.pdf";
export const NE_CIRCULAR =
  "https://revenue.nebraska.gov/sites/default/files/doc/business/Cir_En_2025/2026cir_en_whole.pdf";
export const NV_INCOME =
  "https://tax.nv.gov/about-nevada-department-of-taxation/income-tax-in-nevada/";
export const SD_TAXES = "https://dor.sd.gov/individuals/taxes/";
export const WA_INCOME = "https://dor.wa.gov/taxes-rates/income-tax";
export const WY_ABOUT = "https://www.wyo.gov/about-wyoming";
export const AK_FACTS =
  "https://www.commerce.alaska.gov/web/dcra/officeofthestateassessor/alaskataxfacts.aspx";
export const NH_REPEAL = "https://www.revenue.nh.gov/news-and-media/interest-dividends-tax-repeal";
export const TN_HALL =
  "https://revenue.support.tn.gov/hc/en-us/articles/360057828631-HIT-3-Hall-Income-Tax-Repealed-Beginning-January-1-2021";
export const IN_RATES =
  "https://www.in.gov/dor/resources/tax-rates-and-reports/rates-fees-and-penalties/";
export const IA_RATES =
  "https://revenue.iowa.gov/press-release/2025-10-21/idr-announces-2026-individual-income-tax-and-interest-rates";
export const LA_RATES =
  "https://revenue.louisiana.gov/tax-education-and-faqs/faqs/income-tax-reform/what-are-the-individual-income-tax-rates-and-brackets/";
export const CO_GUIDE = "https://tax.colorado.gov/individual-income-tax-guide";
export const MA_RATES = "https://www.mass.gov/info-details/massachusetts-tax-rates";
export const AZ_UPDATE = "https://azdor.gov/sites/default/files/document/IND_Updates-2602.pdf";
export const ID_TAX = "https://tax.idaho.gov/";
export const UT_TAX = "https://incometax.utah.gov/general-instructions/";
export const BLOCKED =
  "The page could not be fetched by the tool (blocked), so this rests on a search excerpt of the official page.";
export const NOT_READ =
  "Only the agency home page is cited. The state's 2026 schedule was not read on an official page.";
export const NOT_RESEARCHED = "The 2026 schedule is not confirmed yet, so no state tax is counted.";

export function sourced<T>(
  value: T,
  source: string,
  extra: { alsoSources?: readonly string[]; unverifiedNote?: string } = {},
): Sourced<T> {
  const { alsoSources, unverifiedNote } = extra;
  const base = alsoSources ? { value, source, alsoSources } : { value, source };
  // A note means the figure was not read in full, so it carries no verification date.
  return unverifiedNote === undefined
    ? { ...base, verifiedOn: VERIFIED }
    : { ...base, unverifiedNote };
}

/** One federal slice. `upTo` is the top of the slice in taxable income, null for the open top band. */
export interface FederalBand {
  upTo: number | null;
  rate: number;
}

export type StatusMap<T> = Record<FilingStatus, T>;
