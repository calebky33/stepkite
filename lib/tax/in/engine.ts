import {
  payInputSchema,
  ratesMissing,
  type EngineOutcome,
  type PayEngine,
  type PayInput,
  type PayLine,
} from "../types";
import { inRates, type IncomeSlab, type RegimeKey, type SurchargeStep } from "./rates.2026";

const SRC_SLABS = "https://www.indiabudget.gov.in/doc/memo.pdf";
const SRC_PF = "https://www.epfindia.gov.in/site_en/FAQ.php";
const SRC_GRATUITY = inRates.gratuity.source;
const SRC_PT = "https://www.tgct.gov.in/tgportal/AllActs/APPT/APPTSchedule.aspx";

const WEEKS = 52;
const MONTHS = 12;
const DEFAULT_HOURS = 40;

const REGIMES: readonly RegimeKey[] = ["new", "old"];
const CITY_TYPES = ["metro", "other"] as const;
type CityType = (typeof CITY_TYPES)[number];

const rupees = new Intl.NumberFormat("en-IN");

/** True when v is one of the listed strings. Narrows v without a cast. */
function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && list.some((item) => item === v);
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pos = (n: number) => (n > 0 ? n : 0);

function numberOption(v: PayInput["options"][string] | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? pos(v) : 0;
}

function annualGross(input: PayInput): number {
  switch (input.period) {
    case "year":
      return input.gross;
    case "month":
      return input.gross * MONTHS;
    case "week":
      return input.gross * WEEKS;
    case "hour":
      return input.gross * (input.hoursPerWeek ?? DEFAULT_HOURS) * WEEKS;
  }
}

/** Tax on taxable income by slabs, before rebate, surcharge and cess. */
export function slabTax(taxable: number, slabs: readonly IncomeSlab[]): number {
  let tax = 0;
  let floor = 0;
  for (const s of slabs) {
    if (taxable <= floor) break;
    const top = s.upTo === null ? taxable : Math.min(taxable, s.upTo);
    tax += (top - floor) * s.rate;
    floor = s.upTo ?? taxable;
  }
  return tax;
}

function surchargeRate(income: number, steps: readonly SurchargeStep[]): number {
  let rate = 0;
  for (const s of steps) if (income > s.above) rate = s.rate;
  return rate;
}

export interface TaxBreakdown {
  /** Tax after rebate, before surcharge. */
  tax: number;
  surcharge: number;
  cess: number;
  rebate: number;
}

/**
 * Income tax for one regime on taxable income (total income after deductions).
 * Order: slabs, rebate (with marginal relief where the regime has it), surcharge with marginal relief, cess.
 */
export function incomeTaxFor(taxable: number, regime: RegimeKey): TaxBreakdown {
  const r = inRates.regimes[regime];
  const income = pos(taxable);
  const slabs = r.slabs.value;
  const gross = slabTax(income, slabs);

  const rb = r.rebate.value;
  let rebate = 0;
  if (income <= rb.incomeLimit) {
    rebate = Math.min(gross, rb.maxRebate);
  } else if (rb.marginalRelief) {
    // Just above the limit, tax cannot be more than the income over the limit.
    rebate = Math.min(pos(gross - (income - rb.incomeLimit)), rb.maxRebate, gross);
  }
  const tax = gross - rebate;

  // Surcharge. The rate comes from total income; marginal relief holds the extra tax to the extra income.
  const steps = r.surcharge.value;
  const rate = surchargeRate(income, steps);
  let surcharge = tax * rate;
  if (rate > 0) {
    const crossed = steps.filter((s) => income > s.above);
    const step = crossed[crossed.length - 1];
    const below = crossed.length > 1 ? crossed[crossed.length - 2].rate : 0;
    if (step) {
      const taxAtStep = slabTax(step.above, slabs);
      const capped = taxAtStep * (1 + below) + (income - step.above);
      surcharge = Math.min(surcharge, pos(capped - tax));
    }
  }
  const cess = (tax + surcharge) * inRates.cess.value;
  return { tax, surcharge, cess, rebate };
}

/** Basic pay, provident fund and gratuity from CTC. Provident fund is on basic pay, limited to the wage ceiling if asked. */
function structure(ctc: number, basicShare: number, capped: boolean) {
  const basic = ctc * basicShare;
  const pfRate = inRates.provident.value.rate;
  const monthlyBasic = basic / MONTHS;
  // The wage ceiling changed part way through the year, so each period uses its own ceiling.
  const periods = inRates.providentWageCeiling.value;
  const yearDays = periods.reduce((s, p) => s + p.days, 0);
  const pfWages = capped
    ? (periods.reduce((s, p) => s + Math.min(monthlyBasic, p.monthlyCeiling) * p.days, 0) /
        yearDays) *
      MONTHS
    : basic;
  const pf = pfWages * pfRate;
  const g = inRates.gratuity.value;
  const gratuity = (basic * g.days) / g.workingDays / g.monthsPerYear;
  return { basic, pf, gratuity };
}

/** Yearly professional tax from monthly salary, or null when the state schedule has not been checked. */
function professionalTax(region: string | undefined, monthlySalary: number): number | null {
  if (region === undefined || !Object.hasOwn(inRates.professionalTax, region)) return null;
  const bands = inRates.professionalTax[region].value;
  const band = bands.find((b) => b.upTo === null || monthlySalary <= b.upTo);
  return (band?.perMonth ?? 0) * MONTHS;
}

export const inEngine: PayEngine = (rawInput): EngineOutcome => {
  if (!inRates.loaded) return ratesMissing("in", inRates);
  const input = payInputSchema.parse(rawInput);
  const ctc = round2(annualGross(input));
  const region = input.region?.trim().toLowerCase() || undefined;
  const assumptions: string[] = [
    `Figures are for the financial year ${inRates.financialYear}, which is assessment year ${inRates.assessmentYear}. The Income-tax Act, 2025 calls it tax year ${inRates.taxYear2025Act}.`,
    "Your pay is worked out as a yearly CTC. Employer provident fund and gratuity sit inside it, so they come off before your in-hand pay.",
    "You are a resident under 60, with salary as your only income and one employer.",
    "Pay is the same every month for the whole year.",
    "Tax is not rounded to the nearest ten rupees as the tax return does. Your payslip can differ a little.",
    "Employer contributions to provident fund, pension and superannuation above the yearly limit are taxable in your hands. We do not work that out.",
  ];

  // Regime
  const regimeOption = input.options.regime;
  let regime: RegimeKey = "new";
  if (isOneOf(REGIMES, regimeOption)) {
    regime = regimeOption;
  } else if (regimeOption !== undefined) {
    assumptions.push("The tax regime was not recognised, so the new regime is used.");
  }
  assumptions.push(
    regime === "new"
      ? "New regime (section 202) applies. Only the standard deduction is allowed, so 80C, 80D, HRA and professional tax are not used."
      : "Old regime applies, with the deductions you entered.",
  );

  if (input.period === "hour" && input.hoursPerWeek === undefined) {
    assumptions.push(
      `No weekly hours given, so ${DEFAULT_HOURS} hours a week and 52 weeks are used.`,
    );
  } else if (input.period === "hour") {
    assumptions.push("Hourly pay is worked out over 52 weeks.");
  }
  if (numberOption(input.options.otherDeductions) > 0) {
    assumptions.push("Other deductions are not counted, so your payslip may show less.");
  }

  // Salary structure
  const shareOption = input.options.basicPercent;
  const shareValid =
    typeof shareOption === "number" &&
    Number.isFinite(shareOption) &&
    shareOption > 0 &&
    shareOption <= 100;
  const share = shareValid ? shareOption / 100 : inRates.structure.basicShareOfCtc;
  if (shareOption !== undefined && !shareValid) {
    assumptions.push("The basic pay share was not valid, so the default share is used.");
  }
  const capped = input.options.pfCapped === true;
  const { basic, pf, gratuity } = structure(ctc, share, capped);
  const ceilings = inRates.providentWageCeiling.value;
  assumptions.push(
    `Basic pay is ${round2(share * 100)} percent of CTC. This is our assumption, not a rule, so check your offer letter.`,
  );
  assumptions.push(
    capped
      ? `Provident fund is ${round2(inRates.provident.value.rate * 100)} percent of basic pay, limited to the monthly wage ceiling. The ceiling was ${rupees.format(ceilings[0].monthlyCeiling)} rupees until 16 September 2026 and ${rupees.format(ceilings[1].monthlyCeiling)} rupees after, so the year uses both. Your employer matches it inside your CTC.`
      : `Provident fund is ${round2(inRates.provident.value.rate * 100)} percent of your full basic pay, with no wage limit. Your employer matches it inside your CTC. If your employer limits it to the statutory wage ceiling, your in-hand pay will be higher.`,
  );
  assumptions.push(
    "Gratuity is 15 days of basic pay for every 26 working days, spread over the year, as set by the Code on Social Security, 2020. It is paid when you leave, so it is not in your in-hand pay.",
  );

  const taxableSalary = ctc - pf - gratuity; // employer provident fund and gratuity are not taxable pay
  const pt = professionalTax(region, taxableSalary / MONTHS);
  if (pt === null) {
    assumptions.push(
      "Professional tax is not included. We have only checked the official state schedule for Telangana so far.",
    );
  } else {
    assumptions.push(
      "Professional tax follows the state schedule on your monthly salary after employer provident fund and gratuity.",
    );
  }

  const r = inRates.regimes[regime];
  const standard = Math.min(r.standardDeduction.value, pos(taxableSalary));
  let deductions = standard;
  if (pt !== null && inRates.professionalTaxDeductible.value[regime]) {
    deductions += pt;
    assumptions.push("Professional tax lowers your taxable pay in the old regime.");
  }

  if (regime === "old") {
    const cityOption = input.options.metro;
    const city: CityType = isOneOf(CITY_TYPES, cityOption) ? cityOption : "metro";
    if (!isOneOf(CITY_TYPES, cityOption)) {
      assumptions.push("The city type was not given, so metro is used for HRA.");
    }
    // Most HRA that can be inside CTC: what is left after basic, employer provident fund and gratuity.
    const hraCeiling = pos(ctc - basic - pf - gratuity);
    const hraReceived = Math.min(numberOption(input.options.hraReceived), hraCeiling);
    const rent = numberOption(input.options.rentPaid);
    const h = inRates.hra.value;
    const hraExempt = Math.min(
      hraReceived,
      pos(rent - basic * h.rentExcessShare),
      basic * (city === "metro" ? h.metroShare : h.otherShare),
    );
    const c80 = Math.min(numberOption(input.options.section80c) + pf, inRates.section80cCap.value);
    const d80 = Math.min(numberOption(input.options.section80d), inRates.section80dCap.value);
    deductions += hraExempt + c80 + d80;
    const cities = `${h.metroCities.slice(0, -1).join(", ")} or ${h.metroCities[h.metroCities.length - 1]}`;
    assumptions.push(
      "80C (section 123 in the Income-tax Act, 2025) counts your provident fund first, then the amount you enter, up to the yearly limit.",
      `80D (section 126) is limited to ${rupees.format(inRates.section80dCap.value)} rupees, the limit for you and your family below 60. Parents and senior citizens are not counted.`,
      `HRA is the least of the HRA you receive, rent above 10 percent of basic pay, and ${city === "metro" ? "50" : "40"} percent of basic pay. Rent and HRA are taken as yearly totals, and HRA is limited to the pay left in your CTC after basic pay, provident fund and gratuity. Metro means ${cities}. We could not confirm this city list or the HRA rule text under the Income-tax Rules, 2026, so check them.`,
    );
    if (hraReceived > 0 && rent === 0) {
      assumptions.push("No rent was entered, so no HRA exemption is given.");
    }
    assumptions.push(
      `Deductions used: ${rupees.format(round2(deductions))} rupees including the standard deduction.`,
    );
  }

  const taxable = pos(taxableSalary - deductions);
  const t = incomeTaxFor(taxable, regime);
  assumptions.push(
    regime === "new"
      ? "Rebate under section 156 makes tax nil up to 12 lakh of taxable income. Just above that, tax is held to the income over 12 lakh."
      : "Rebate under section 156 makes tax nil up to 5 lakh of taxable income, and drops away sharply above it.",
  );
  if (t.surcharge > 0) {
    assumptions.push("Surcharge applies, with marginal relief near each threshold.");
  }

  const lines: PayLine[] = [
    {
      key: "incomeTax",
      label: "Income tax",
      amount: round2(t.tax),
      source: SRC_SLABS,
      sourceLabel: "Finance Bill 2026 memorandum, income tax rates",
    },
  ];
  if (t.surcharge > 0) {
    lines.push({
      key: "surcharge",
      label: "Surcharge",
      amount: round2(t.surcharge),
      source: SRC_SLABS,
      sourceLabel: "Finance Bill 2026 memorandum, surcharge",
    });
  }
  lines.push(
    {
      key: "cess",
      label: "Health and education cess",
      amount: round2(t.cess),
      source: SRC_SLABS,
      sourceLabel: "Finance Bill 2026 memorandum, cess",
    },
    {
      key: "employeePf",
      label: "Employee provident fund",
      amount: round2(pf),
      source: SRC_PF,
      sourceLabel: "EPFO provident fund FAQ",
    },
    {
      key: "employerPf",
      label: "Employer provident fund",
      amount: round2(pf),
      source: SRC_PF,
      sourceLabel: "EPFO provident fund FAQ",
    },
    {
      key: "gratuity",
      label: "Gratuity",
      amount: round2(gratuity),
      source: SRC_GRATUITY,
      sourceLabel: "Code on Social Security 2020, gratuity",
    },
  );
  if (pt !== null && pt > 0) {
    lines.push({
      key: "professionalTax",
      label: "Professional tax",
      amount: round2(pt),
      source: SRC_PT,
      sourceLabel: "Telangana Commercial Taxes professional tax schedule",
    });
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);
  const net = round2(ctc - total);
  return {
    status: "ready",
    result: {
      gross: ctc,
      lines,
      net,
      perPeriod: { year: net, month: round2(net / MONTHS), week: round2(net / WEEKS) },
      assumptions,
    },
  };
};
