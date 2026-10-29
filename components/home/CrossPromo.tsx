import { CountryLink } from "@/components/shell/CountryLink";
import Link from "next/link";

const LINK =
  "inline-flex min-h-11 items-center text-base font-semibold text-primary underline-offset-4 hover:underline";

export function CrossPromo() {
  return (
    <section
      aria-labelledby="next-step"
      className="mx-auto max-w-[1120px] px-4 py-12 md:px-6 md:py-16"
    >
      <h2
        id="next-step"
        className="font-display text-[28px] leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]"
      >
        Check your pay, then build your CV.
      </h2>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <p className="text-lg text-muted md:col-span-2">
          Work out what you take home, then put your experience into a clear CV.
        </p>
        <article className="flex flex-col rounded-card border border-border bg-surface-2 p-6 md:p-8">
          <h3 className="font-display text-[22px] leading-tight">
            Know what you&apos;ll take home.
          </h3>
          <p className="mt-2 text-base text-muted">
            See each deduction between your pay before tax and the money in your bank.
          </p>
          <Link href="#calculator" className={`${LINK} mt-auto pt-5`}>
            See the calculator
          </Link>
        </article>
        <article className="flex flex-col rounded-card border border-border bg-surface p-6 shadow-card md:p-8">
          <h3 className="font-display text-[22px] leading-tight">Put your experience into a CV.</h3>
          <p className="mt-2 text-base text-muted">
            See the page change as you type. Your work saves on this device.
          </p>
          <CountryLink path="/cv" className={`${LINK} mt-auto pt-5`}>
            Build a CV
          </CountryLink>
        </article>
      </div>
    </section>
  );
}
