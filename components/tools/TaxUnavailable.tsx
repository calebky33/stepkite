import Link from "next/link";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";

/** Shown on salary and comparison pages for markets with no verified tax engine. Never a
 *  guessed figure: the tool stays off until the rules are checked against an official source. */
export function TaxUnavailable({ country }: { country: CountryCode }) {
  const info = COUNTRY_INFO[country];
  return (
    <section aria-labelledby="tax-unavailable-heading" className="max-w-prose space-y-3">
      <h1 id="tax-unavailable-heading" className="font-display text-4xl">
        No salary tools for {info.name} yet
      </h1>
      <p className="text-lg text-muted">
        We only show take-home pay once we&apos;ve checked the tax rules against the official
        source. We haven&apos;t done that for {info.name} yet.
      </p>
      <p className="text-muted">
        You can still build a {info.cvName} and track your applications here.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/${country}/cv`}
          className="inline-flex min-h-11 items-center rounded-input bg-primary px-4 py-2 text-base font-semibold text-primary-fg transition-[transform,scale,translate,opacity] duration-150 ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
        >
          Build your {info.cvName}
        </Link>
        <Link
          href={`/${country}/tracker`}
          className="inline-flex min-h-11 items-center rounded-input border border-border px-4 py-2 text-base font-semibold text-text transition-[transform,scale,translate,background-color] duration-150 ease-[var(--ease-out)] hover:bg-surface-2 active:scale-[0.97]"
        >
          Track your applications
        </Link>
      </div>
    </section>
  );
}
