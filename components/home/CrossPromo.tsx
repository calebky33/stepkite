import Link from "next/link";
import { CountryLink } from "@/components/shell/CountryLink";
import { buttonStyles } from "@/components/ui/Button";

export function CrossPromo() {
  return (
    <section
      aria-labelledby="next-step"
      className="mx-auto max-w-[1120px] px-4 py-12 md:px-6 md:py-16"
    >
      <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-xl">
          <h2
            id="next-step"
            className="font-display text-[28px] leading-tight tracking-tight [overflow-wrap:anywhere]"
          >
            Check your pay, then build your CV.
          </h2>
          <p className="mt-3 text-base text-muted">
            Know what you would take home, then put your experience on a page that updates as you
            type.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
          <Link href="#calculator" className={buttonStyles("secondary")}>
            See the calculator
          </Link>
          <CountryLink path="/cv" className={buttonStyles("primary")}>
            Build a CV
          </CountryLink>
        </div>
      </div>
    </section>
  );
}
