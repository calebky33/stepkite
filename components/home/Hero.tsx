import { CountryLink, SavedCountryName, SavedExampleSalary } from "@/components/shell/CountryLink";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { CvPreview } from "./CvPreview";

const TRUST = ["Free to use", "Your data stays private", "No signup required"];

export function Hero() {
  return (
    <section className="border-b border-border bg-accent-soft">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <h1 className="max-w-[16ch] font-display text-4xl leading-[1.06] tracking-tight md:text-5xl [overflow-wrap:anywhere]">
            Make your next career move with confidence.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Write your CV in the browser and check what you take home after tax. Built for the UK,
            the US and India.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CountryLink path="/cv" className={buttonStyles("primary")}>
              Build a CV
            </CountryLink>
            <Link href="#calculator" className={buttonStyles("secondary")}>
              Try the take-home calculator
            </Link>
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
            {TRUST.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-positive" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative min-w-0 rounded-card on-ink bg-ink p-4 text-ink-fg shadow-pop md:p-6 lg:pb-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">CV builder</p>
            <Badge>Preview</Badge>
          </div>
          <div className="mt-4 flex justify-start overflow-hidden lg:pb-56">
            <CvPreview showCaption={false} compact label="Example CV page from the CV builder" />
          </div>
          <div
            role="group"
            aria-label="Example calculator"
            className="on-light mt-6 flex w-full max-w-xs flex-col gap-3 rounded-card border border-border bg-surface p-4 text-text shadow-dialog sm:ml-auto lg:absolute lg:right-6 lg:bottom-[-40px] lg:mt-0"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Take-home calculator</p>
              <Badge>Example</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted">Country</dt>
              <dd className="text-right font-medium">
                <SavedCountryName />
              </dd>
              <dt className="text-muted">Salary</dt>
              <dd className="text-right font-medium tabular-nums">
                <SavedExampleSalary /> a year
              </dd>
            </dl>
            <Link href="#calculator" className={buttonStyles("primary", "w-full")}>
              Calculate
            </Link>
            <p className="rounded-input bg-surface-2 px-3 py-2 text-sm text-muted">
              Rates not loaded yet
            </p>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="h-0 lg:h-10" />
    </section>
  );
}
