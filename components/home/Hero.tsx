import Link from "next/link";
import { CountryLink } from "@/components/shell/CountryLink";
import { buttonStyles } from "@/components/ui/Button";
import { CvPreview } from "./CvPreview";

const FACTS = ["Free to use", "No signup needed", "Your CV stays on your device"];

export function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-4 pt-12 pb-12 md:px-6 md:pt-16 md:pb-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">For the UK, the US and India</p>
          <h1 className="mt-4 max-w-[14ch] font-display text-4xl leading-[1.05] tracking-tight md:text-5xl [overflow-wrap:anywhere]">
            Know your pay. Write your CV.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg text-muted">
            Work out what lands in your bank after tax, then put your experience on a clear page.
            Both run in your browser.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CountryLink path="/cv" className={buttonStyles("primary")}>
              Build a CV
            </CountryLink>
            <Link href="#calculator" className={buttonStyles("secondary")}>
              Check my take-home pay
            </Link>
          </div>
          <ul className="mt-8 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
            {FACTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-positive" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 justify-center rounded-card border border-border bg-surface-2 px-4 py-8 shadow-card md:px-6 md:py-10 lg:justify-end">
          <CvPreview label="Example CV page from the CV builder" />
        </div>
      </div>
    </section>
  );
}
