import Link from "next/link";
import { CurrentPlanPanel } from "@/components/billing/CurrentPlanPanel";
import { PageShell } from "@/components/shell/PageShell";
import { SITE_URL, stubMetadata } from "@/lib/seo";
import { PricingCards } from "./PricingCards";

export const metadata = stubMetadata({
  title: "Pricing",
  description:
    "Free is a full builder with one recruiter-ready template. Pro adds every template, server rendered PDF and Word, job matching and sync.",
  alternates: { canonical: `${SITE_URL}/pricing` },
});

export default function Pricing() {
  return (
    <PageShell
      title="Pricing"
      lead="Pick the plan that fits. The free plan is a full builder you can use forever."
    >
      <CurrentPlanPanel />
      <TrialCta />
      <PricingCards />
    </PageShell>
  );
}

/**
 * Signed-in Free users would see this at the top. There is no auth yet, so for now we show it
 * to every visitor and link to sign up. Later we wire the button to /api/trial/start.
 * See docs/MONETIZATION.md (Pages we add or refresh).
 */
function TrialCta() {
  return (
    <section
      aria-labelledby="trial-cta"
      className="mt-8 flex flex-col items-start gap-3 rounded-card border border-border bg-accent-soft p-5 shadow-card md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-col gap-1">
        <h2 id="trial-cta" className="text-base font-semibold">
          Try Pro for seven days, no card
        </h2>
        <p className="text-base text-muted">
          Full Pro for a week. Nothing is charged. You pick a plan on day eight, or stay free.
        </p>
      </div>
      <Link
        href={`/sign-up?next=/pricing`}
        className="inline-flex min-h-11 items-center justify-center rounded-input bg-primary px-4 py-2 text-base font-semibold text-primary-fg shadow-card transition-colors hover:opacity-90"
      >
        Start free trial
      </Link>
    </section>
  );
}
