import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PLANS, cadenceLabel, formatPrice, type Plan } from "@/lib/billing/plans";

/**
 * The four plan cards. Numbers come from lib/billing/plans.ts, which will swap for the Supabase
 * `plans` row when it lands. No Stripe calls are made from here: the Checkout link is server
 * side (docs/MONETIZATION.md, Routes we add).
 */
export function PricingCards() {
  return (
    <section aria-labelledby="plans-heading" className="mt-10 flex flex-col gap-6">
      <h2 id="plans-heading" className="sr-only">
        Plans
      </h2>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <li key={plan.code}>
            <PricingCard plan={plan} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  const cadence = cadenceLabel(plan);
  return (
    <Card aria-labelledby={`plan-${plan.code}-name`} className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3
          id={`plan-${plan.code}-name`}
          className="font-display text-xl leading-tight tracking-tight"
        >
          {plan.name}
        </h3>
        <p className="flex items-baseline gap-2">
          <span className="font-sans text-3xl font-semibold tabular-nums text-text">
            {formatPrice(plan)}
          </span>
          {cadence ? <span className="text-sm text-muted">{cadence}</span> : null}
        </p>
      </div>
      <ul className="flex flex-col gap-2 text-base">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden="true" className="text-muted">
              {"•"}
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        {plan.code === "free" ? (
          <p className="text-sm text-muted">Nothing to pay. Sign up to save your work.</p>
        ) : (
          <Link
            href={`/sign-up?next=/pricing`}
            className="inline-flex min-h-11 items-center justify-center rounded-input border border-border-strong bg-surface px-4 py-2 text-base font-semibold text-text shadow-card transition-colors hover:bg-surface-2"
          >
            Choose {plan.name}
          </Link>
        )}
      </div>
    </Card>
  );
}
