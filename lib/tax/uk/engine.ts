import {
  payInputSchema,
  ratesMissing,
  type EngineOutcome,
  type PayEngine,
  type PayInput,
  type PayLine,
} from "../types";
import { ukRates, type TaxBand } from "./rates.2026";

const SRC_TAX = "https://www.gov.uk/income-tax-rates";
const SRC_SCOT = "https://www.gov.uk/scottish-income-tax";
const SRC_NI = "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027";
const SRC_PENSION = "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief";

const WEEKS = 52;
const MONTHS = 12;
const DEFAULT_HOURS = 40;

const PENSION_TYPES = ["net-pay", "relief-at-source", "salary-sacrifice"] as const;
type PensionType = (typeof PENSION_TYPES)[number];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pos = (n: number) => (n > 0 ? n : 0);

export type ParsedCode = { kind: "allowance"; allowance: number } | { kind: "none" };

/** Reads an allowance tax code such as 1257L, K475, 0T or NT. Rate codes (BR, D0, D1) are not supported and return null. */
export function parseTaxCode(raw: string): ParsedCode | null {
  const code = raw.trim().toUpperCase().replace(/^[SC]/, "");
  if (code === "NT") return { kind: "none" };
  if (code === "0T") return { kind: "allowance", allowance: 0 };
  const k = /^K(\d{1,5})$/.exec(code);
  if (k) return { kind: "allowance", allowance: -Number(k[1]) * 10 };
  const m = /^(\d{1,5})[LMNPTY]$/.exec(code);
  if (m) return { kind: "allowance", allowance: Number(m[1]) * 10 };
  return null;
}

function taxOnBands(taxable: number, bands: readonly TaxBand[], extend: number): number {
  // Relief at source widens the band taxed at the relief rate (the basic rate band in both tables).
  const widenIndex = bands.findIndex((b) => b.rate === ukRates.reliefAtSourceRate.value);
  let left = pos(taxable);
  let tax = 0;
  bands.forEach((b, i) => {
    if (left <= 0) return;
    const width = b.width === null ? left : b.width + (i === widenIndex ? extend : 0);
    const slice = Math.min(left, width);
    tax += slice * b.rate;
    left -= slice;
  });
  return tax;
}

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

export const ukEngine: PayEngine = (rawInput): EngineOutcome => {
  if (!ukRates.loaded) return ratesMissing("uk", ukRates);
  const input = payInputSchema.parse(rawInput);
  const gross = round2(annualGross(input));
  const scottish = input.region === "scotland";
  const bands = scottish ? ukRates.scotland.value : ukRates.ruk.value;
  const taxSource = scottish ? SRC_SCOT : SRC_TAX;
  const assumptions: string[] = [
    "Figures are for the 2026 to 27 tax year, 6 April 2026 to 5 April 2027.",
    scottish
      ? "Scottish income tax bands apply. National Insurance is the same as the rest of the UK."
      : "Income tax bands for England, Wales and Northern Ireland apply.",
    "You are under State Pension age, in National Insurance category A, with one job.",
    "Pay is the same every period for the whole year.",
    "Your payslip can differ by a few pounds, because payroll works out tax per pay period and rounds loan deductions down.",
  ];
  if (input.period === "hour" && input.hoursPerWeek === undefined) {
    assumptions.push(
      `No weekly hours given, so ${DEFAULT_HOURS} hours a week and 52 weeks are used.`,
    );
  } else if (input.period === "hour") {
    assumptions.push("Hourly pay is worked out over 52 weeks.");
  }

  // Pension
  const pensionPercent = Math.min(100, pos(numberOption(input.options.pensionPercent)));
  const pensionOption = input.options.pensionType;
  const pensionType: PensionType =
    typeof pensionOption === "string" && PENSION_TYPES.some((t) => t === pensionOption)
      ? (pensionOption as PensionType)
      : "net-pay";
  const pension = round2((gross * pensionPercent) / 100);
  const sacrifice = pensionType === "salary-sacrifice" ? pension : 0;
  const netPay = pensionType === "net-pay" ? pension : 0;
  const ras = pensionType === "relief-at-source" ? pension : 0;
  if (pension > 0) {
    if (sacrifice > 0) {
      assumptions.push("Salary sacrifice lowers your pay before both tax and National Insurance.");
    } else if (netPay > 0) {
      assumptions.push("Net pay pension comes off before tax but not before National Insurance.");
    } else {
      assumptions.push(
        "Relief at source: the percentage is the full pension contribution. You pay 80 percent of it from take home pay and the provider adds the 20 percent basic rate relief. Extra relief for higher rate taxpayers is claimed through Self Assessment, and is counted here as if already received.",
      );
    }
  }

  const taxableGross = gross - sacrifice; // pay for tax and NI
  const niPay = taxableGross;
  const incomeForTax = taxableGross - netPay;

  // Allowance
  const codeRaw = typeof input.options.taxCode === "string" ? input.options.taxCode.trim() : "";
  const code = codeRaw ? parseTaxCode(codeRaw) : null;
  if (codeRaw && !code) {
    assumptions.push(
      `The tax code ${codeRaw} was not recognised or is not supported, so the standard allowance is used.`,
    );
  }
  let allowance: number;
  const adjustedNet = incomeForTax - ras;
  if (code?.kind === "allowance") {
    allowance = code.allowance;
    assumptions.push(
      `Tax code ${codeRaw.toUpperCase()} sets your allowance. The high income reduction is not applied.`,
    );
  } else if (code?.kind === "none") {
    allowance = Number.POSITIVE_INFINITY;
    assumptions.push("Tax code NT means no income tax is taken.");
  } else {
    // The allowance falls by whole pounds: 1 pound for every 2 over the threshold, rounded down.
    const reduction = pos(adjustedNet - ukRates.taperThreshold.value) * ukRates.taperRate.value;
    allowance = pos(ukRates.personalAllowance.value - Math.floor(reduction));
    if (reduction > 0) {
      assumptions.push(
        "Your personal allowance is reduced because your income is over 100,000 pounds.",
      );
    }
  }

  const taxable = allowance === Number.POSITIVE_INFINITY ? 0 : pos(incomeForTax - allowance);
  const incomeTax = taxOnBands(taxable, bands, ras);

  // National Insurance
  const pt = ukRates.niPrimaryThreshold.value;
  const uel = ukRates.niUpperEarningsLimit.value;
  const ni =
    pos(Math.min(niPay, uel) - pt) * ukRates.niMainRate.value +
    pos(niPay - uel) * ukRates.niUpperRate.value;

  // Student loan
  const plan = String(input.options.studentLoan ?? "none");
  const loans = ukRates.studentLoans.value;
  let loan = 0;
  let loanLabel = "Student loan";
  if (Object.hasOwn(loans, plan)) {
    const p = loans[plan as keyof typeof loans];
    loan = pos(niPay - p.threshold) * p.rate;
    loanLabel =
      plan === "postgraduate"
        ? "Postgraduate loan"
        : `Student loan ${plan.replace("plan-", "plan ")}`;
  }

    const lines: PayLine[] = [
    { key: "incomeTax", label: "Income tax", amount: round2(incomeTax), source: taxSource, sourceLabel: scottish ? "GOV.UK Scottish income tax" : "GOV.UK income tax rates" },
    { key: "ni", label: "National Insurance", amount: round2(ni), source: SRC_NI, sourceLabel: "GOV.UK rates and thresholds for employers" },
  ];
  if (loan > 0)
    lines.push({ key: "studentLoan", label: loanLabel, amount: round2(loan), source: SRC_NI, sourceLabel: "GOV.UK rates and thresholds for employers" });
  if (pension > 0) {
    // Relief at source: only 80 percent leaves your pay.
    const cost = ras > 0 ? pension * (1 - ukRates.reliefAtSourceRate.value) : pension;
    lines.push({
      key: "pension",
      label: pensionType === "salary-sacrifice" ? "Pension (salary sacrifice)" : "Pension",
      amount: round2(cost),
      source: SRC_PENSION,
      sourceLabel: "GOV.UK pension tax relief",
    });
  }

  const deductions = lines.reduce((s, l) => s + l.amount, 0);
  const net = round2(gross - deductions);

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
