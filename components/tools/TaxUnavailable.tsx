import Link from "next/link";
import { COUNTRY_INFO, cvLabelTitle, type CountryCode } from "@/lib/countries";

/** Shown on salary and comparison pages for markets with no verified tax engine. Never a
 *  guessed figure: the tool stays off until the rules are checked against an official source. */
export function TaxUnavailable({ country }: { country: CountryCode }) {
  const info = COUNTRY_INFO[country];
  return (
    <section aria-labelledby="tax-unavailable-heading" className="max-w-prose space-y-3">
      <h1 id="tax-unavailable-heading" className="font-display text-4xl">
        Salary tools are not available yet
      </h1>
      <p className="text-lg text-muted">
        We only show take-home pay where we have checked the tax rules against the official
        source, and we have not done that for {info.name} yet.
      </p>
      <p className="text-muted">
        In the meantime you can still build a {info.cvName} and keep track of your applications.
      </p>
      <Link
        href={`/${country}/cv`}
        className="inline-flex min-h-11 items-center rounded-input bg-primary px-4 py-2 text-base font-semibold text-primary-fg transition-colors hover:opacity-90"
      >
        Build your {cvLabelTitle(country)}
      </Link>
    </section>
  );
}
