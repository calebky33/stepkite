/**
 * One source of truth for Stepkite plans. The pricing page, Checkout and the webhook all read
 * from here. When the Supabase `plans` row lands, this file is replaced by a query that returns
 * the same shape, so nothing above or below has to change.
 *
 * See docs/MONETIZATION.md (Supabase schema: plans) and docs/RULES.md rules 11 and 15.
 */

export type PlanCode = "free" | "monthly" | "yearly" | "lifetime";
export type BillingCurrency = "USD";
export type Interval = "day" | "month" | "year";

/**
 * Stepkite charges through Paystack on a Kenyan merchant account, so every charge is actually
 * settled in KES. Prices are shown to customers in USD (the global default) and Paystack's
 * hosted checkout displays and charges the KES equivalent stored in `paystackAmountKobo`.
 * Update `paystackAmountKobo` when the USD/KES rate drifts materially; last calibrated
 * 2026-11-07 at an approximate rate of USD 1 = KES 130.
 */
export interface Plan {
  code: PlanCode;
  name: string;
  /** Display amount in USD cents. Zero on the Free plan. */
  amountCents: number;
  /** Display currency. Always USD at the moment; see docs/RULES.md rule 23. */
  currency: BillingCurrency;
  /** Amount in KES kobo (the currency Paystack actually charges). Zero on the Free plan. */
  paystackAmountKobo: number;
  /** The billing cadence. Null on Free (nothing is billed) and on Lifetime (one payment). */
  interval: Interval | null;
  features: readonly string[];
}

export const PLANS: readonly Plan[] = [
  {
    code: "free",
    name: "Free",
    amountCents: 0,
    currency: "USD",
    paystackAmountKobo: 0,
    interval: null,
    features: [
      "Full builder, unlimited edits",
      "Three saved CVs",
      "One recruiter-ready template",
      "Watermarked PDF export",
      "Local-only job tracker",
      "Light ads on the builder page",
    ],
  },
  {
    code: "monthly",
    name: "Monthly",
    amountCents: 999,
    currency: "USD",
    paystackAmountKobo: 130000,
    interval: "month",
    features: [
      "Everything in Free",
      "No ads",
      "All premium templates",
      "Server rendered PDF and Word",
      "Match your CV to a job ad",
      "Sync across your devices",
    ],
  },
  {
    code: "yearly",
    name: "Yearly",
    amountCents: 3900,
    currency: "USD",
    paystackAmountKobo: 510000,
    interval: "year",
    features: ["Everything in Monthly", "One charge for the year", "Fourteen day money back"],
  },
  {
    code: "lifetime",
    name: "Lifetime",
    amountCents: 14900,
    currency: "USD",
    paystackAmountKobo: 1950000,
    interval: null,
    features: ["Everything in Monthly", "Pay once, keep forever", "Fourteen day money back"],
  },
] as const;

/** Fast lookup for a known plan code. Throws when the code is not in PLANS, which cannot happen
 *  for a value typed as PlanCode. */
export function getPlan(code: PlanCode): Plan {
  const plan = PLANS.find((p) => p.code === code);
  if (!plan) throw new Error(`Unknown plan: ${code}`);
  return plan;
}

/** Price in whole units, formatted for the plan's currency. For the Free plan returns "Free". */
export function formatPrice(plan: Plan): string {
  if (plan.amountCents === 0) return "Free";
  const amount = plan.amountCents / 100;
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Short note that sits under the price: "per month", "per year", "one time", or empty. */
export function cadenceLabel(plan: Plan): string {
  if (plan.interval === "month") return "per month";
  if (plan.interval === "year") return "per year";
  if (plan.interval === "day") return "per day";
  if (plan.code === "lifetime") return "one time";
  return "";
}
