import {
  payInputSchema,
  ratesMissing,
  type EngineOutcome,
  type PayEngine,
  type PayInput,
  type PayLine,
} from "../types";
import { FILING_STATUSES, usRates, type FederalBand, type FilingStatus } from "./rates.2026";
import { usStates, type StateRule } from "./states.2026";

const SRC_FEDERAL = "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf";
const SRC_FICA = "https://www.irs.gov/taxtopics/tc751";
const SRC_ADDITIONAL_MEDICARE = "https://www.irs.gov/taxtopics/tc560";
const SRC_401K =
  "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500";

const WEEKS = 52;
const MONTHS = 12;
const DEFAULT_HOURS = 40;

const FREQUENCIES = {
  weekly: { periods: 52, label: "every week" },
  biweekly: { periods: 26, label: "every two weeks" },
  semimonthly: { periods: 24, label: "twice a month" },
  monthly: { periods: 12, label: "every month" },
} as const;
type Frequency = keyof typeof FREQUENCIES;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pos = (n: number) => (n > 0 ? n : 0);

function numberOption(v: PayInput["options"][string] | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
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

function federalTax(taxable: number, bands: readonly FederalBand[]): number {
  let lower = 0;
  let tax = 0;
  for (const b of bands) {
    const top = b.upTo ?? Number.POSITIVE_INFINITY;
    if (taxable > lower) tax += (Math.min(taxable, top) - lower) * b.rate;
    lower = top;
  }
  return tax;
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isStatus(v: unknown): v is FilingStatus {
  return FILING_STATUSES.some((s) => s === v);
}

function isFrequency(v: unknown): v is Frequency {
  return typeof v === "string" && Object.hasOwn(FREQUENCIES, v);
}

interface StateResult {
  tax: number;
  line: PayLine | null;
  notes: string[];
  /** True when the state tax is not counted, so the note goes first. */
  leading?: boolean;
}

function stateTax(
  rule: StateRule | undefined,
  status: FilingStatus,
  gross: number,
  retirement: number,
): StateResult {
  if (!rule) {
    return {
      tax: 0,
      line: null,
      notes: ["The state you chose is not covered yet, so no state income tax is counted."],
      leading: true,
    };
  }
  if (rule.kind === "none") {
    return {
      tax: 0,
      line: null,
      notes: [`${rule.name} has no state income tax on wages, so none is taken off.`],
    };
  }
  if (rule.kind === "pending") {
    return {
      tax: 0,
      line: null,
      notes: [
        `State income tax for ${rule.name} is not included in this estimate. Your result shows federal tax and payroll taxes only.`,
      ],
      leading: true,
    };
  }
  const deferralsTaxed = rule.taxesRetirementDeferrals.value;
  const federalIncome = gross - retirement;
  let base = deferralsTaxed ? gross : federalIncome;
  const notes: string[] = [];
  if (deferralsTaxed && retirement > 0) {
    notes.push(
      `${rule.name} taxes the pay you put into a 401(k), so your contribution does not lower your state tax.`,
    );
  }
  base -= rule.deduction.value[status];
  const ex = rule.exemption?.value;
  if (ex && federalIncome <= ex.incomeLimit[status]) {
    base -= ex.amount[status];
  }
  const taxable = pos(base);
  const ceiling = rule.kind === "graduated" ? rule.ceiling?.value[status] : undefined;
  if (ceiling !== undefined && taxable >= ceiling) {
    return {
      tax: 0,
      line: null,
      notes: [
        `State income tax for ${rule.name} is not included in this estimate at this income. Your result shows federal tax and payroll taxes only.`,
      ],
      leading: true,
    };
  }
  const taxBeforeCredit =
    rule.kind === "flat"
      ? taxable * rule.rate.value
      : federalTax(taxable, rule.brackets.value[status]);
  const tax = pos(taxBeforeCredit - (rule.credit?.value[status] ?? 0));
  if (rule.caution) notes.push(rule.caution);
  const source = rule.kind === "flat" ? rule.rate.source : rule.brackets.source;
  return {
    tax,
    line: {
      key: "stateTax",
      label: `${rule.name} income tax`,
      amount: round2(tax),
      source,
      sourceLabel: `${rule.name} revenue agency`,
    },
    notes,
  };
}

export const usEngine: PayEngine = (rawInput): EngineOutcome => {
  if (!usRates.loaded) return ratesMissing("us", usRates);
  const input = payInputSchema.parse(rawInput);
  const gross = round2(annualGross(input));

  const statusOption = input.options.filingStatus;
  const status: FilingStatus = isStatus(statusOption) ? statusOption : "single";
  const frequencyOption = input.options.payFrequency;
  const frequency: Frequency = isFrequency(frequencyOption) ? frequencyOption : "biweekly";

  const assumptions: string[] = [
    "Figures are for the 2026 tax year, January 1 to December 31, 2026.",
    "Federal tax uses the standard deduction for your filing status. No itemized deductions, credits or other income are counted.",
    "Pay is the same every period for the whole year, from one job.",
    "Local taxes are not included. That covers New York City, Philadelphia, Indiana county taxes, Kentucky local occupational taxes, and the city taxes in Ohio and Michigan.",
    "Your paycheck can differ from this estimate, because payroll withholding works from your Form W-4 and rounds each period.",
  ];
  if (statusOption !== undefined && !isStatus(statusOption)) {
    assumptions.push("The filing status was not recognized, so single is used.");
  }
  if (frequencyOption !== undefined && !isFrequency(frequencyOption)) {
    assumptions.push("The pay frequency was not recognized, so every two weeks is used.");
  }
  if (input.period === "hour" && input.hoursPerWeek === undefined) {
    assumptions.push(
      `No weekly hours given, so ${DEFAULT_HOURS} hours a week and 52 weeks are used.`,
    );
  } else if (input.period === "hour") {
    assumptions.push("Hourly pay is worked out over 52 weeks.");
  }

  // 401(k)
  const percent = Math.min(100, pos(numberOption(input.options.retirementPercent)));
  const wanted = round2((gross * percent) / 100);
  const limit = usRates.retirementDeferralLimit.value;
  const retirement = Math.min(wanted, limit);
  if (wanted > limit) {
    assumptions.push(
      "Your 401(k) contribution is capped at the 2026 limit of $24,500. Catch-up contributions for ages 50 and over are not counted.",
    );
  } else if (retirement > 0) {
    assumptions.push(
      "Your 401(k) is pre-tax. It lowers federal and state taxable pay but not Social Security or Medicare pay.",
    );
  }

  // Federal income tax
  const standardDeduction = usRates.standardDeduction.value[status];
  const taxable = pos(gross - retirement - standardDeduction);
  const income = federalTax(taxable, usRates.federalBrackets.value[status]);

  // FICA, on gross pay: a 401(k) does not reduce it.
  const socialSecurity =
    Math.min(gross, usRates.socialSecurityWageBase.value) * usRates.socialSecurityRate.value;
  const medicare = gross * usRates.medicareRate.value;
  const additional =
    pos(gross - usRates.additionalMedicareThreshold.value[status]) *
    usRates.additionalMedicareRate.value;
  if (additional > 0) {
    assumptions.push(
      "Additional Medicare tax is counted on pay over the threshold for your filing status. Employers start withholding it at $200,000, so a married couple may see it settled on their return.",
    );
  }

  // State
  const rule =
    input.region && Object.hasOwn(usStates, input.region) ? usStates[input.region] : undefined;
  const state = stateTax(rule, status, gross, retirement);
  if (state.leading) assumptions.unshift(...state.notes);
  else assumptions.push(...state.notes);

  const other = round2(pos(numberOption(input.options.otherDeductions)));
  if (other > 0) {
    assumptions.push("Other deductions are taken from your pay after tax, as a yearly total.");
  }

  const lines: PayLine[] = [
    {
      key: "federalTax",
      label: "Federal income tax",
      amount: round2(income),
      source: SRC_FEDERAL,
      sourceLabel: "IRS Revenue Procedure 2025-32",
    },
    {
      key: "socialSecurity",
      label: "Social Security",
      amount: round2(socialSecurity),
      source: SRC_FICA,
      sourceLabel: "IRS Topic 751",
    },
    {
      key: "medicare",
      label: "Medicare",
      amount: round2(medicare),
      source: SRC_FICA,
      sourceLabel: "IRS Topic 751",
    },
  ];
  if (additional > 0) {
    lines.push({
      key: "additionalMedicare",
      label: "Additional Medicare tax",
      amount: round2(additional),
      source: SRC_ADDITIONAL_MEDICARE,
      sourceLabel: "IRS Topic 560",
    });
  }
  if (state.line) lines.push(state.line);
  if (retirement > 0) {
    lines.push({
      key: "retirement",
      label: "401(k) contribution",
      amount: retirement,
      source: SRC_401K,
      sourceLabel: "IRS 401(k) limits for 2026",
    });
  }
  if (other > 0) {
    lines.push({
      key: "otherDeductions",
      label: "Other deductions",
      amount: other,
    });
  }

  const deductions = lines.reduce((s, l) => s + l.amount, 0);
  const net = round2(gross - deductions);

  const f = FREQUENCIES[frequency];
  assumptions.push(
    `Paid ${f.label}, ${f.periods} paychecks a year, about ${money(round2(net / f.periods))} each after tax.`,
  );

  return {
    status: "ready",
    result: {
      gross,
      lines,
      net,
      perPeriod: { year: net, month: round2(net / MONTHS), week: round2(net / WEEKS) },
      assumptions,
    },
  };
};
