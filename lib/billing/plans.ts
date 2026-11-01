/**
 * One source of truth for Stepkite plans. The pricing page, Checkout and the webhook all read
 * from here. When the Supabase `plans` row lands, this file is replaced by a query that returns
 * the same shape, so nothing above or below has to change.
 *
 * See docs/MONETIZATION.md (Supabase schema: plans) and docs/RULES.md rules 11 and 15.
 */

export type PlanCode = "free" | "monthly" | "yearly" | "lifetime";
export type Currency = "USD" | "GBP" | "INR";
export type Interval = "day" | "month" | "year";

export interface Plan {
  code: PlanCode;
  name: string;
  /** Amount in the smallest unit of the currency (cents for USD). Zero on the Free plan. */
  amountCents: number;
  currency: Currency;
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
    interval: "year",
    features: ["Everything in Monthly", "One charge for the year", "Fourteen day money back"],
  },
  {
    code: "lifetime",
    name: "Lifetime",
    amountCents: 14900,
    currency: "USD",
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
  const locale = plan.currency === "GBP" ? "en-GB" : plan.currency === "INR" ? "en-IN" : "en-US";
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(locale, {
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
